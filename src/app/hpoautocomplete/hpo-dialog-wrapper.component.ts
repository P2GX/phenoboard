import { Component, Inject } from '@angular/core';
import { MatDialogRef, MatDialogContent, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HpoAutocompleteComponent } from './hpoautocomplete.component';
import { HpoTermDuplet } from '../models/hpo_term_dto';

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
        [initialValue]="data.bestMatch"
        (selected)="onSelected($event)">
      </app-hpoautocomplete>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="dialogRef.close()" class="btn-outline-cancel">Cancel</button>
    </mat-dialog-actions>
  `
})
export class HpoDialogWrapperComponent {
  constructor(
    public dialogRef: MatDialogRef<HpoDialogWrapperComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { bestMatch: string, title: string }
  ) {}

  onSelected(term: HpoTermDuplet) {
    this.dialogRef.close(term);
  }
}
