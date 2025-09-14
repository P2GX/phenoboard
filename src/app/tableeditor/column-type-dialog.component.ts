// column-type-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogModule } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-column-type-dialog',
  template: `
    <h2 mat-dialog-title>Select Column Type</h2>
    <mat-dialog-content>
      <mat-radio-group [formControl]="selectedType">
        @for (type of data.etlTypes; track type){
            <mat-radio-button
            [value]="type"
            style="display: block; margin: 6px 0;"
            >
            {{ type }}
            </mat-radio-button>
        }
      </mat-radio-group>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()"  class="btn-outline-primary">Cancel</button>
      <button
        mat-raised-button
         class="btn-outline-primary"
        (click)="dialogRef.close(selectedType.value)"
      >
        Confirm
      </button>
    </mat-dialog-actions>
  `,
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogContent,
    MatDialogModule,
    MatRadioModule
  ]
})
export class ColumnTypeDialogComponent {
  selectedType = new FormControl(this.data.currentType);

  constructor(
    public dialogRef: MatDialogRef<ColumnTypeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { etlTypes: string[]; currentType: string }
  ) {}
}
