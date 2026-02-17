import { Component, inject } from '@angular/core';
import { MatDialogRef, MatDialogContent, MatDialogModule, MAT_DIALOG_DATA, MatDialogActions } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HpoAutocompleteComponent } from './hpoautocomplete.component';
import { HpoTermDuplet } from '../models/hpo_term_dto';
import { HpoMatch } from '../models/hpo_mapping_result';

/** A wrapper that allows the autocomplete to be used as a modal dialog with a modern UI */
@Component({
  selector: 'app-hpo-dialog-wrapper',
  standalone: true,
  imports: [
    HpoAutocompleteComponent, 
    MatDialogContent, 
    MatDialogModule, 
    MatDialogActions, 
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="flex flex-col max-w-[500px]">
      <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <h2 class="text-xl font-semibold text-slate-800 m-0 flex items-center gap-2">
          <mat-icon class="text-blue-600">manage_search</mat-icon>
          {{data.title}}
        </h2>
        <p class="text-xs text-slate-500 mt-1 uppercase tracking-tight font-medium">
          Confirm or refine the Phenotype Term
        </p>
      </div>

      <mat-dialog-content class="!m-0 !p-6 overflow-visible">
        <div class="space-y-4">
          <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-100">
            <app-hpoautocomplete
              [inputString]="data.bestMatch.label"
              (selected)="onSelected($event)">
            </app-hpoautocomplete>
          </div>
          
          <div class="flex items-center gap-2 px-1">
            <mat-icon class="text-slate-400 !w-4 !h-4 !text-[16px]">help_outline</mat-icon>
            <span class="text-[11px] text-slate-400 italic">
              Results are pulled directly from the Human Phenotype Ontology.
            </span>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="!px-6 !pb-6 !pt-2">
        <button 
          mat-button 
          (click)="dialogRef.close()" 
          class="!text-slate-500 hover:!bg-slate-100 !px-4 !rounded-lg">
          Cancel
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    /* Crucial: prevents the autocomplete dropdown from being hidden by the dialog's scroll container */
    :host ::ng-deep .mat-mdc-dialog-content {
      overflow: visible !important;
    }
  `]
})
export class HpoDialogWrapperComponent {
  public dialogRef = inject(MatDialogRef<HpoDialogWrapperComponent>);
  public data = inject(MAT_DIALOG_DATA) as { bestMatch: HpoMatch, title: string };

  onSelected(term: HpoMatch) {
    const duplet: HpoTermDuplet = {
      hpoLabel: term.label,
      hpoId: term.id
    };
    this.dialogRef.close(duplet);
  }
}