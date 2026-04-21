import { Component, inject, Inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { openUrl } from '@tauri-apps/plugin-opener';

export interface ConfirmDialogData {
  title?: string;
  message: string;          // Required, as the dialog needs content
  confirmText?: string;
  cancelText?: string;
  helpTitle?: string;
  helpLines?: string[];     // Array of strings for the @for loop
  helpUrl?: string;         // The URL for the Tauri opener
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogContent, MatDialogActions, MatMenuModule, MatIconModule, MatButtonModule],
  template: `
    <div class="warn-banner">
      <span>⚠️ {{ data.title || 'Confirm' }}</span>
      @if (data.helpTitle || data.helpLines) {
        <button [matMenuTriggerFor]="helpMenu" class="help-trigger-btn">
          <mat-icon>help_outline</mat-icon>
        </button>
      }
    </div>

    <mat-dialog-content>
      <p class="warn-message">{{ data.message }}</p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button class="btn-outline-cancel" (click)="onCancelClick()">
        {{ data.cancelText || 'Cancel' }}
      </button>
      <button class="btn-outline-primary" (click)="onConfirmClick()">
        {{ data.confirmText || 'OK' }}
      </button>
    </mat-dialog-actions>

    <mat-menu #helpMenu="matMenu" class="help-bubble-menu">
      <div class="help-content" (click)="$event.stopPropagation()">
        <h3 class="help-title">{{ data.helpTitle || 'Help' }}</h3>
        
        @for (line of data.helpLines; track line) {
          <p class="help-line" [innerHTML]="line"></p>
        }

        @if (data.helpUrl) {
          <hr class="help-divider">
          <button mat-button color="primary" class="help-docs-btn" (click)="openDocs()">
            <mat-icon>open_in_new</mat-icon>
            <span>Learn more</span>
          </button>
        }
      </div>
    </mat-menu>
  `,
  styleUrl: './confirmdialog.component.scss' 
})
export class ConfirmDialogComponent {

  public dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);
  public data = inject(MAT_DIALOG_DATA) as ConfirmDialogData;

  onConfirmClick(): void { this.dialogRef.close(true); }
  onCancelClick(): void { this.dialogRef.close(false); }

  async openDocs() {
    if (this.data.helpUrl) {
      await openUrl(this.data.helpUrl);
    }
  }
}