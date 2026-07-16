import { Component, ElementRef, effect, output, viewChild } from '@angular/core';

@Component({
  selector: 'app-native-dialog',
  standalone: true,
  template: `
    <dialog #dialogEl class="app-dialog" (close)="handleNativeClose()" (click)="handleBackdropClick($event)">
      <div class="dialog-content">
        <ng-content></ng-content>
      </div>
    </dialog>
  `,
  styleUrl: './native-dialog.component.scss',
})
export class NativeDialogComponent<T = unknown> {
  closed = output<T | null>();

  private dialogEl = viewChild.required<ElementRef<HTMLDialogElement>>('dialogEl');
  private pendingResult: T | null = null;

  constructor() {
    effect(() => {
      const el = this.dialogEl().nativeElement;
      if (!el.open) {
        el.showModal();
      }
    });
  }

  /** Called by the host dialog's own submit/cancel logic. */
  close(result: T | null) {
    this.pendingResult = result;
    this.dialogEl().nativeElement.close();
  }

  /** Fires on Esc, backdrop click, or .close() — single emission point. */
  handleNativeClose() {
    this.closed.emit(this.pendingResult);
    this.pendingResult = null;
  }

  handleBackdropClick(event: MouseEvent) {
    if (event.target === this.dialogEl().nativeElement) {
      this.close(null);
    }
  }
}