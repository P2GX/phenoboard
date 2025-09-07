import { Component } from '@angular/core';
import { MatDialogRef, MatDialogContent, MatDialogModule } from '@angular/material/dialog';
import { HpoAutocompleteComponent } from './hpoautocomplete.component';
import { HpoTermDuplet } from '../models/hpo_term_dto';

/** A wrapper that allows the autocomplete to be used as a modal dialog */
@Component({
  selector: 'app-hpo-dialog-wrapper',
  standalone: true,
  imports: [HpoAutocompleteComponent, MatDialogContent, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Select HPO Term</h2>
    <mat-dialog-content>
      <app-hpoautocomplete (selected)="onSelected($event)"></app-hpoautocomplete>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="dialogRef.close()">Cancel</button>
    </mat-dialog-actions>
  `
})
export class HpoDialogWrapperComponent {
  constructor(public dialogRef: MatDialogRef<HpoDialogWrapperComponent>) {}

  onSelected(term: HpoTermDuplet) {
    this.dialogRef.close(term);
  }
}
