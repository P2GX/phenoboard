import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(private snackBar: MatSnackBar) {}

  /** Show an error snackbar */
  showError(message: string, duration: number = 8000) {
    this.snackBar.open(message, 'Dismiss', {
      panelClass: ['error-snackbar'],
      duration,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  /** Show a success snackbar */
  showSuccess(message: string, duration: number = 4000) {
    this.snackBar.open(message, 'OK', {
      panelClass: ['success-snackbar'],
      duration,
      verticalPosition: 'bottom',
    });
  }

  showWarning(message: string, duration: number = 6000) {
    this.snackBar.open(message, 'Close', {
      panelClass: ['warning-snackbar'],
      duration,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  warnPmid(pmid: string) {
    const msg = `Warning: ${pmid} already in Cohort database`;
    this.showWarning(msg);
  }


}
