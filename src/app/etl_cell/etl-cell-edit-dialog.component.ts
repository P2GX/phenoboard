// etl-cell-edit-dialog.component.ts
import { Component, Inject } from "@angular/core";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { MatFormField } from "@angular/material/input";

@Component({
  selector: "etl-cell-edit-dialog",
  template: `
    <h3>Edit Cell</h3>
    <p>Original: {{ data.original }}</p>
    <mat-form-field style="width:100%">
      <input matInput [(ngModel)]="currentValue" placeholder="New value" />
    </mat-form-field>
    <div style="text-align:right; margin-top:8px;">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-button color="primary" (click)="save()">Save</button>
    </div>
  `,
  imports: [CommonModule, FormsModule, MatFormField],
})
export class EtlCellEditDialogComponent {
  currentValue: string;

  constructor(
    public dialogRef: MatDialogRef<EtlCellEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { original: string; current: string }
  ) {
    this.currentValue = data.current;
  }

  save() {
    this.dialogRef.close(this.currentValue);
  }

  cancel() {
    this.dialogRef.close();
  }
}
