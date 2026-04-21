// compare-dialog.component.ts
import { Component, inject, output, signal } from '@angular/core';
import { open } from '@tauri-apps/plugin-dialog';
import { NotificationService } from '../../services/notification.service';
import { MatDialogModule } from "@angular/material/dialog";

export interface CompareFiles {
  path1: string;
  path2: string;
}

@Component({
  selector: 'app-compare-dialog',
  template: `
    <h2 mat-dialog-title>Compare Phenopackets</h2>
    <mat-dialog-content>
    <p class="dialog-hint">Select two JSON phenopackets to find differences.</p>  
    <div class="file-selectors">
        <div class="file-row">
          <button mat-stroked-button  (click)="selectFile(1)">
            Select File 1
          </button>
          <span class="file-path">
            {{ file1() || 'No file selected' }}
          </span>
        </div>
        <div class="file-row">
          <button mat-stroked-button  (click)="selectFile(2)">
            Select File 2
          </button>
          <span class="file-path">
            {{ file2() || 'No file selected' }}
          </span>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary"
              [disabled]="!file1() || !file2()"
              (click)="compare()">
        Compare
      </button>
    </mat-dialog-actions>
  `,
  imports: [MatDialogModule]
})
export class CompareDialogComponent {
  file1 = signal<string | null>(null);
  file2 = signal<string | null>(null);
  compareRequested = output<CompareFiles>();
  cancelRequested = output<void>();
  notificationService = inject(NotificationService);

  async selectFile(num: number) {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });

    if (selected && typeof selected === 'string') {
      num === 1 ? this.file1.set(selected) : this.file2.set(selected);
    }
  }

  compare() {
    if (! this.file1() ) {
        this.notificationService.showError("File 1 not initialized!");
        return;
    }
    if (! this.file2()) {
         this.notificationService.showError("File 2 not initialized!");
        return;
    }
    const path1 = this.file1();
    const path2 = this.file2();
    
    if (path1 && path2) {
      this.compareRequested.emit({ path1, path2 });
    }
  }

  onCancel() {
    this.cancelRequested.emit();
  }
}