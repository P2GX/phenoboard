import { Component, inject, output, signal, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { open } from '@tauri-apps/plugin-dialog';
import { NotificationService, IconComponent } from 'ng-hpo-uikit';

export interface CompareFiles {
  path1: string;
  path2: string;
}

@Component({
  selector: 'app-compare-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <dialog #dialogEl class="orcid-modal compare-modal">
      <div class="dialog-content">
        <div class="review-header">
          <h2>Compare Phenopackets</h2>
        </div>

        <div class="dialog-body">
          <p class="dialog-hint">Select two JSON phenopackets to find differences.</p>
          <div class="file-selectors">
            <div class="file-row">
              <button type="button" class="btn-outline-cancel" (click)="selectFile(1)">Select File 1</button>
              <span class="file-path">
                {{ file1() || 'No file selected' }}
              </span>
            </div>
            <div class="file-row">
              <button type="button" class="btn-outline-cancel" (click)="selectFile(2)">Select File 2</button>
              <span class="file-path">
                {{ file2() || 'No file selected' }}
              </span>
            </div>
          </div>
        </div>

        <div class="dialog-actions">
          <button type="button" class="btn-outline-cancel" (click)="onCancel()">Cancel</button>
          <button
            type="button"
            class="btn-outline-primary"
            [disabled]="!file1() || !file2()"
            (click)="compare()"
          >
            Compare
          </button>
        </div>
      </div>
    </dialog>
  `,
  styleUrl: './compare-dialog.component.scss',
})
export class CompareDialogComponent implements AfterViewInit {
  file1 = signal<string | null>(null);
  file2 = signal<string | null>(null);
  compareRequested = output<CompareFiles>();
  cancelRequested = output<void>();
  notificationService = inject(NotificationService);

  @ViewChild('dialogEl') dialogEl!: ElementRef<HTMLDialogElement>;

  ngAfterViewInit() {
    if (this.dialogEl?.nativeElement) {
      this.dialogEl.nativeElement.showModal();
    }
  }

  async selectFile(num: number) {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (selected && typeof selected === 'string') {
      num === 1 ? this.file1.set(selected) : this.file2.set(selected);
    }
  }

  compare() {
    if (!this.file1()) {
      this.notificationService.showError('File 1 not initialized!');
      return;
    }
    if (!this.file2()) {
      this.notificationService.showError('File 2 not initialized!');
      return;
    }
    const path1 = this.file1();
    const path2 = this.file2();

    if (path1 && path2) {
      this.dialogEl?.nativeElement.close();
      this.compareRequested.emit({ path1, path2 });
    }
  }

  onCancel() {
    this.dialogEl?.nativeElement.close();
    this.cancelRequested.emit();
  }
}