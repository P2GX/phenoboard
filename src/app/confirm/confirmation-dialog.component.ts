import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogActions } from '@angular/material/dialog';


export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogContent, MatDialogActions],
  templateUrl:'./confirmation-dialog.component.html',
 styleUrls: ['./confirmation-dialog.component.css']
})
export class ConfirmDialogComponent {
  public dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);
  public data = inject(MAT_DIALOG_DATA) as ConfirmDialogComponent;

  get title(): string {
    return this.data.title ?? 'Confirm';
  }

  get message(): string {
    return this.data.message;
  }

  get confirmText(): string {
    return this.data.confirmText ?? 'OK';
  }

  get cancelText(): string {
    return this.data.cancelText ?? 'Cancel';
  }

  onConfirmClick(): void {
    this.dialogRef.close(true);
  }

  onCancelClick(): void {
    this.dialogRef.close(false);
  }
}
