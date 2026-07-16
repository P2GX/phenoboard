import { Component, ElementRef, effect, input, output, viewChild } from '@angular/core';

export interface ConfirmDialogData {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  helpTitle?: string;
  helpLines?: string[];
  helpUrl?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,

  template: `
    <!-- Native dialog managed reactively by our open signal -->
    <dialog #nativeDialog (close)="onNativeClose($event)" class="dialog">
      <div class="dialog__wrapper">
        
        <!-- Header -->
        <header class="dialog__header">
          <div class="dialog__title-group">
            <span class="dialog__icon">⚠️</span>
            <h2 class="dialog__title">{{ data().title || 'Confirm Action' }}</h2>
          </div>
          
          @if (data().helpTitle || data().helpLines) {
            <p>a</p>
          }
        </header>

        <!-- Body Content -->
        <section class="dialog__body">
          <p class="dialog__message">{{ data().message }}</p>
        </section>

        <!-- Footer Actions -->
        <footer class="dialog__footer">
          <button class="btn-cancel" (click)="close(false)">
            {{ data().cancelText || 'Cancel' }}
          </button>
          <button class="btn-confirm" (click)="close(true)">
            {{ data().confirmText || 'Confirm' }}
          </button>
        </footer>

      </div>
    </dialog>
  `,
  styleUrl: './confirmdialog.component.scss'
})
export class ConfirmDialogComponent {
  data = input.required<ConfirmDialogData>();
  isOpen = input<boolean>(false);
  result = output<boolean>();

  private dialogEl = viewChild.required<ElementRef<HTMLDialogElement>>('nativeDialog');

  constructor() {
    effect(() => {
      const modal = this.dialogEl().nativeElement;
      if (this.isOpen()) {
        if (!modal.open) {
          modal.showModal(); // Standard API: blocks interaction with background
        }
      } else {
        if (modal.open) {
          modal.close();
        }
      }
    });
  }

  close(confirmed: boolean): void {
    this.result.emit(confirmed);
  }

  onNativeClose(event: Event): void {
    const modal = this.dialogEl().nativeElement;
    this.result.emit(modal.returnValue === 'true');
  }
}