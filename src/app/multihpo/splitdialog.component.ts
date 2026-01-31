import { CommonModule } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA, MatDialogModule } from "@angular/material/dialog";
import { MatInputModule } from "@angular/material/input";
import { MatRadioModule } from "@angular/material/radio";

@Component({
  selector: 'app-split-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatRadioModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Split Text Fragment</h2>
    <mat-dialog-content>
      <div class="mb-4 text-sm text-gray-600">
        Original: <span class="font-mono font-bold text-blue-700">"{{ data.text }}"</span>
      </div>

      <mat-radio-group [ngModel]="selectedDelimiter()" (ngModelChange)="selectedDelimiter.set($event)" class="flex flex-col gap-3 my-4">
        <mat-radio-button value=",">Comma ( , )</mat-radio-button>
        <mat-radio-button value="/">Slash ( / )</mat-radio-button>
        <mat-radio-button value=".">Period ( . )</mat-radio-button>
        <mat-radio-button value="custom">
          Custom:
          <input 
            class="ml-2 border-b border-gray-300 outline-none w-20 px-1 text-center focus:border-blue-500"
            [ngModel]="customDelimiter()"
            (ngModelChange)="customDelimiter.set($event)"
            [disabled]="selectedDelimiter() !== 'custom'"
            placeholder="e.g. ;"
            spellcheck="false"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="none">
        </mat-radio-button>
      </mat-radio-group>

      <div class="mt-4 p-3 bg-slate-50 border rounded-lg">
        <div class="text-[10px] uppercase font-bold text-gray-400 mb-2">Preview</div>
        <div class="flex flex-wrap gap-2">
          @for (part of previewParts(); track part) {
            <span class="bg-white border px-2 py-1 rounded text-xs shadow-sm">
              {{ part }}
            </span>
          }
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" 
              [mat-dialog-close]="getFinalDelimiter()"
              [disabled]="previewParts().length < 2">
        Apply Split
      </button>
    </mat-dialog-actions>
  `
})
export class SplitDialogComponent {
  public data = inject(MAT_DIALOG_DATA) as { text: string };

  selectedDelimiter = signal<string>(',');
  customDelimiter = signal<string>('');

  previewParts = computed(() => {
    const d = this.getFinalDelimiter();
    if (!d) return [this.data.text];
    
    return this.data.text
      .split(d)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  });

  getFinalDelimiter(): string {
    return this.selectedDelimiter() === 'custom' 
      ? this.customDelimiter() 
      : this.selectedDelimiter();
  }
}