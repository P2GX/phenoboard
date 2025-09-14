// confirmation-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogModule } from '@angular/material/dialog';

export interface ConfirmationDialogData {
  columnName: string;
  uniqueValues: string[];
}

@Component({
  selector: 'app-confirmation-dialog',
  template: `
    <h2 mat-dialog-title>Delete Column</h2>
    <mat-dialog-content>
      <p>Are you sure you want to delete column <strong>{{ data.columnName }}</strong>?</p>
      <p><strong>Unique values in column:</strong></p>
      <div class="unique-values-container">
        @for (value of data.uniqueValues; track $index) {
            <span class="value-chip">{{ value }}</span>
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()" class="btn-outline-primary">Cancel</button>
      <button mat-raised-button color="warn" (click)="onConfirm()" class="btn-outline-primary">Delete</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .unique-values-container {
      max-height: 200px;
      overflow-y: auto;
      margin: 1rem 0;
    }
    .value-chip {
      display: inline-block;
      background: #e0e0e0;
      padding: 0.25rem 0.5rem;
      margin: 0.25rem;
      border-radius: 4px;
      font-size: 0.875rem;
    }
  `],
  imports: [MatDialogContent, MatDialogModule]
})
export class DeleteConfirmationDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DeleteConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}