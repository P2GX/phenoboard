import { Component, inject, Inject } from '@angular/core';
import { MatDialogRef, MatDialogContent, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HpoAutocompleteComponent } from './hpoautocomplete.component';
import { HpoTermDuplet } from '../models/hpo_term_dto';
import { HpoMatch } from '../models/hpo_mapping_result';

/** A wrapper that allows the autocomplete to be used as a modal dialog */
@Component({
  selector: 'app-hpo-dialog-wrapper',
  standalone: true,
  imports: [HpoAutocompleteComponent, MatDialogContent, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{data.title}}</h2>
    <p  class="text-sm text-gray-500 italic">Select HPO term</p>
    <mat-dialog-content>
      <app-hpoautocomplete
        [inputString]="data.bestMatch.label"
        (selected)="onSelected($event)">
      </app-hpoautocomplete>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="dialogRef.close()" class="btn-outline-cancel">Cancel</button>
    </mat-dialog-actions>
  `
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
