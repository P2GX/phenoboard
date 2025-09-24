import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatInputModule } from "@angular/material/input";
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-add-constant-column-dialog',
  template: `
    <h1 mat-dialog-title>Add Constant Column</h1>
    <div mat-dialog-content>
      <mat-form-field appearance="fill" class="w-full">
        <mat-label>Column Name</mat-label>
        <input matInput [(ngModel)]="data.columnName" />
      </mat-form-field>

      <mat-form-field appearance="fill" class="w-full">
        <mat-label>Constant Value</mat-label>
        <input matInput [(ngModel)]="data.constantValue" />
      </mat-form-field>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-flat-button color="primary" (click)="onSave()">Add</button>
    </div>
  `,
  imports: [MatInputModule, CommonModule, FormsModule]
})
export class AddConstantColumnDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<AddConstantColumnDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { columnName: string; constantValue: string }
  ) {}

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSave(): void {
    this.dialogRef.close(this.data);
  }
}
