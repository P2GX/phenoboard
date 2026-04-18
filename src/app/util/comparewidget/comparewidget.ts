// compare-dialog.component.ts
import { Component, inject, output, signal } from '@angular/core';
import { open } from '@tauri-apps/plugin-dialog';
import { NotificationService } from '../../services/notification.service';

export interface CompareFiles {
  path1: string;
  path2: string;
}

@Component({
  selector: 'app-compare-dialog',
  template: `
    <div class="p-6 bg-white rounded-lg shadow-xl">
      <h2 class="text-xl font-bold mb-4">Compare Phenopackets</h2>
      <p class="mb-4 text-sm text-gray-600">Select two JSON phenopackets to find differences.</p>
      
      <div class="space-y-4">
        <div class="flex items-center gap-3">
          <button (click)="selectFile(1)" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded border">
            Select File 1
          </button>
          <span class="text-xs truncate max-w-[200px] text-blue-600 italic">
            {{ file1() || 'No file selected' }}
          </span>
        </div>

        <div class="flex items-center gap-3">
          <button (click)="selectFile(2)" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded border">
            Select File 2
          </button>
          <span class="text-xs truncate max-w-[200px] text-blue-600 italic">
            {{ file2() || 'No file selected' }}
          </span>
        </div>
      </div>

      <div class="mt-6 flex justify-end gap-2">
        <button (click)="onCancel()" class="px-4 py-2 text-gray-500">Cancel</button>
        <button 
          [disabled]="!file1() || !file2()"
          (click)="compare()" 
          class="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
          Compare
        </button>
      </div>
    </div>
  `
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