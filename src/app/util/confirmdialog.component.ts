import { Component, Inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { openUrl } from '@tauri-apps/plugin-opener';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogContent, MatDialogActions, MatMenuModule, MatIconModule, MatButtonModule],
  template: `
    <div class="warn-banner">
      <div class="flex items-center gap-2">
        <span>⚠️ {{ data.title || 'Confirm' }}</span>
      </div>
      
      @if (data.helpTitle || data.helpLines) {
        <button [matMenuTriggerFor]="helpMenu" class="help-trigger-btn">
          <mat-icon>help_outline</mat-icon>
        </button>
      }
    </div>

    <mat-dialog-content>
      <p class="warn-message">{{ data.message }}</p>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="!gap-3 px-4 pb-4">
      <button class="btn-outline-cancel" (click)="onCancelClick()">
        {{ data.cancelText || 'Cancel' }}
      </button>
      <button class="btn-outline-primary" (click)="onConfirmClick()">
        {{ data.confirmText || 'OK' }}
      </button>
    </mat-dialog-actions>

    <mat-menu #helpMenu="matMenu" class="help-bubble-menu">
      <div class="help-content p-4 max-w-xs" (click)="$event.stopPropagation()">
        <h3 class="font-bold text-blue-800 mb-2">{{ data.helpTitle || 'Help' }}</h3>
        
        @for (line of data.helpLines; track line) {
          <p class="text-sm mb-1" [innerHTML]="line"></p>
        }

        @if (data.helpUrl) {
          <hr class="my-2 border-gray-200">
          <button mat-button color="primary" class="w-full justify-start px-0" (click)="openDocs()">
            <mat-icon class="scale-90">open_in_new</mat-icon>
            <span class="text-xs">Learn more</span>
          </button>
        }
      </div>
    </mat-menu>
  `,
  styles: [`
    .warn-banner {
      background-color: #fff3cd;
      color: #856404;
      border-left: 4px solid #ff9800;
      padding: 4px 12px; /* Adjusted padding to accommodate small button */
      border-radius: 4px;
      font-weight: 600;
      margin-bottom: 8px;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between; /* Put help button on far right */
    }

    .warn-message {
      color: #5c0000;
      font-weight: 500;
      margin-top: 0.5rem;
      font-size: 15px;
      line-height: 1.4;
    }

   .help-trigger-btn {
      all: unset; 
      box-sizing: border-box;
      
      width: 26px !important;
      height: 26px !important;
      border-radius: 50% !important;
      
      display: grid !important;
      place-items: center !important; 
      overflow: hidden !important; /* This kills the 'huge oval' effect */
      
      cursor: pointer;
      color: #856404 !important;
      background: rgba(133, 100, 4, 0.1) !important;
      transition: background 0.2s ease;

      /* Instead of a giant ripple, we just slightly darken the circle */
      &:hover { 
        background: rgba(133, 100, 4, 0.25) !important; 
      }

      mat-icon {
        width: 18px !important;
        height: 18px !important;
        font-size: 18px !important;
        line-height: 1 !important; 
        display: block !important;
        margin: 0 !important;
        
        animation: help-pulse 2s infinite ease-in-out;
      }
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onConfirmClick(): void { this.dialogRef.close(true); }
  onCancelClick(): void { this.dialogRef.close(false); }

  async openDocs() {
    if (this.data.helpUrl) {
      await openUrl(this.data.helpUrl);
    }
  }
}