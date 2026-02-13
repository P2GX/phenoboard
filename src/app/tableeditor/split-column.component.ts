import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatRadioModule } from "@angular/material/radio";

@Component({
  selector: 'app-split-column-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatRadioModule, MatButtonModule, FormsModule],
  template: `
    <h2 mat-dialog-title class="!mb-0 text-slate-700">Split Column: {{data.originalHeader}}</h2>
    
    <mat-dialog-content class="!pt-4">
      <div class="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">Select Delimiter</div>
      <mat-radio-group 
        [ngModel]="selectedDelimiter()" 
        (ngModelChange)="selectedDelimiter.set($event)" 
        class="grid grid-cols-2 gap-2 mb-3">
        <mat-radio-button value="," class="compact-radio">Comma (,)</mat-radio-button>
        <mat-radio-button value="/" class="compact-radio">Slash (/)</mat-radio-button>
        <mat-radio-button value="." class="compact-radio">Period (.)</mat-radio-button>
        <mat-radio-button value=" " class="compact-radio">Space</mat-radio-button>
        <mat-radio-button value="custom" class="compact-radio col-span-2">
          <span [class.text-indigo-600]="selectedDelimiter() === 'custom'" class="font-medium">Custom</span>
        </mat-radio-button>
      </mat-radio-group>

      @if (selectedDelimiter() === 'custom') {
        <input 
          class="w-full border-b border-indigo-500 outline-none py-1 mb-4 text-sm bg-transparent"
          [ngModel]="customValue()"
          (ngModelChange)="customValue.set($event)"
          placeholder="e.g. ; or |"
          autofocus>
      }

      <div class="mt-4 p-3 bg-slate-900 rounded-lg shadow-inner overflow-hidden">
        <div class="text-[10px] text-indigo-300 uppercase font-black mb-2 tracking-widest">Row 1 Preview</div>
          <div class="flex-1">  
        <div class="text-[9px] text-slate-500 mb-1 uppercase tracking-tighter font-bold">Original: </div>
         <div class="px-2 py-1.5 bg-slate-800 rounded text-xs font-mono text-emerald-400 truncate border border-slate-700">
              {{data.example }}
             </div>
          </div>
        <div class="flex items-center gap-2">
           <div class="flex-1">
             <div class="text-[9px] text-slate-500 mb-1 uppercase tracking-tighter font-bold">Part A</div>
             <div class="px-2 py-1.5 bg-slate-800 rounded text-xs font-mono text-emerald-400 truncate border border-slate-700">
               {{ splitExample().a }}
             </div>
           </div>

           <div class="text-slate-600 font-bold self-end pb-1.5">→</div>

           <div class="flex-1">
             <div class="text-[9px] text-slate-500 mb-1 uppercase tracking-tighter font-bold">Part B</div>
             <div class="px-2 py-1.5 bg-slate-800 rounded text-xs font-mono text-emerald-400 truncate border border-slate-700">
               {{ splitExample().b }}
             </div>
           </div>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="!pb-4 !px-6">
      <button mat-button (click)="cancel()" class="text-slate-500 font-medium">Cancel</button>
      <button 
        mat-flat-button 
        (click)="confirm()" 
        [disabled]="!finalDelimiter()"
        class="!rounded-md !bg-indigo-600 shadow-md !text-white disabled:!bg-slate-200">
        Apply Split
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host { display: block; width: 350px; }
    .compact-radio {
      @apply border border-slate-200 rounded-md p-1 transition-all hover:bg-slate-50;
    }
    .mat-mdc-radio-button.mat-mdc-radio-checked {
      @apply border-indigo-500 bg-indigo-50/50;
    }
    ::ng-deep .mdc-label { font-size: 11px !important; }
  `],
})
export class SplitColumnDialogComponent {
  private dialogRef = inject(MatDialogRef<SplitColumnDialogComponent>);
  public data = inject(MAT_DIALOG_DATA) as { originalHeader: string, example: string };

  selectedDelimiter = signal<string>(',');
  customValue = signal<string>('');

  finalDelimiter = computed(() => {
    return this.selectedDelimiter() === 'custom' ? this.customValue() : this.selectedDelimiter();
  });
  
  splitExample = computed(() => {
    const sep = this.finalDelimiter();
    const orig = this.data.example || '';
    
    // If no separator is found in the string, show the whole thing in Part A and N/A in Part B
    if (!sep || !orig.includes(sep)) {
      return { a: orig || '---', b: 'n/a' };
    }

    const index = orig.indexOf(sep);
    return {
      a: orig.substring(0, index),
      b: orig.substring(index + sep.length)
    };
  });

  confirm() {
    this.dialogRef.close({ 
      separator: this.finalDelimiter()
    });
  }

  cancel() {
    this.dialogRef.close(null);
  }
}