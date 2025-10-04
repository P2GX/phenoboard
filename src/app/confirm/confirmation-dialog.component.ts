import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogContent, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-confirmation-dialog',
  template: `
    <h2 mat-dialog-title>Confirm Action</h2>
    <mat-dialog-content >
      <p class="text-sm text-red-700 space-y-2 py-2">{{ data.message }}</p>
      @if (data.subMessage) {
      <p class="text-red-500 text-xs italic">
        {{ data.subMessage }}
      </p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()" class="btn-outline-cancel">Cancel</button>
      <button mat-raised-button color="warn" (click)="onConfirm()" class="btn-outline-primary">Confirm</button>
    </mat-dialog-actions>
  `,
  imports: [MatDialogContent, MatDialogModule],
})
export class ConfirmationDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { message: string, subMessage: string }
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
