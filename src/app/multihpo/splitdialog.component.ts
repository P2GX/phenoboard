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
  styles: [`
    .delimiter-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 12px 0;
    }
    /* Hide the actual radio circle but keep accessibility */
    ::ng-deep .compact-radio .mdc-radio { display: none; }
    ::ng-deep .compact-radio .mdc-label { padding-left: 0 !important; width: 100%; text-align: center; }
    
    .radio-card {
      display: inline-block;
      padding: 8px 16px;
      border: 1px solid #e2e8f0; // $gray-200
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      min-width: 60px
      background: white;
      transition: all 0.2s ease;

    }
    .radio-card:hover { background: #f8fafc; } // $gray-50
    
    /* Highlight selected state */
    .mat-mdc-radio-button.mat-mdc-radio-checked .radio-card {
      background: #eff6ff; // Light blue
      border-color: #3b82f6; 
      color: #1e40af;
      font-weight: 600;
      box-shadow: 0 0 0 1px #3b82f6;
    }
  `],
  template: `
    <h2 mat-dialog-title style="margin-bottom: 0;">Split Text</h2>
    
    <mat-dialog-content>
      <div class="mb-3 px-2 py-1.5 bg-slate-100 rounded text-xs border-l-4 border-blue-500">
        <span class="text-gray-500 uppercase font-bold text-[10px] block mb-1">Original Text</span>
        <span class="font-mono text-gray-800">{{ data.text }}</span>
      </div>

      <div class="text-[10px] uppercase font-bold text-gray-400 mb-2">Select Delimiter</div>
      
      <mat-radio-group [ngModel]="selectedDelimiter()" (ngModelChange)="selectedDelimiter.set($event)" class="delimiter-grid">
        <mat-radio-button value="," class="compact-radio"><span class="radio-card">Comma (,)</span></mat-radio-button>
        <mat-radio-button value="/" class="compact-radio"><span class="radio-card">Slash (/)</span></mat-radio-button>
        <mat-radio-button value="." class="compact-radio"><span class="radio-card">Period (.)</span></mat-radio-button>
        <mat-radio-button value="and" class="compact-radio"><span class="radio-card">"and"</span></mat-radio-button>
        <mat-radio-button value="custom" class="compact-radio">
          <span class="radio-card" [class.border-blue-500]="selectedDelimiter() === 'custom'">
            Custom
          </span>
        </mat-radio-button>
      </mat-radio-group>

      @if (selectedDelimiter() === 'custom') {
        <div class="mb-4 animate-in fade-in slide-in-from-top-1">
          <input 
            class="w-full border-b-2 border-blue-500 outline-none py-1 text-sm bg-transparent placeholder:text-gray-300"
            [ngModel]="customDelimiter()"
            (ngModelChange)="customDelimiter.set($event)"
            placeholder="Type delimiter (e.g. ; or |)"
            autoFocus>
        </div>
      }

      <div class="p-3 bg-slate-50 border rounded-lg">
        <div class="text-[10px] uppercase font-bold text-gray-400 mb-2">Resulting Fragments ({{ previewParts().length }})</div>
        <div class="flex flex-wrap gap-1.5">
          @for (part of previewParts(); track part) {
            <span class="bg-white border border-gray-200 px-2 py-0.5 rounded text-xs text-blue-700 font-medium">
              {{ part }}
            </span>
          }
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="pt-2">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" 
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