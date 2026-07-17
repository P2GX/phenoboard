import { Component, ElementRef, effect, input, output, viewChild } from '@angular/core';
import { HelpButtonComponent as HelpButtonComponent } from "ng-hpo-uikit";

export interface ConfirmDialogData {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  helpTitle?: string;
  helpLines?: string[];
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [HelpButtonComponent],
  template: `
    <dialog #nativeDialog (close)="onNativeClose()" (click)="onBackdropClick($event)" class="dialog">
      <div class="dialog__wrapper">

        <header class="dialog__header">
          <div class="dialog__title-group">
            <span class="dialog__icon">⚠️</span>
            <h2 class="dialog__title">{{ data().title || 'Confirm Action' }}</h2>
          </div>

          @if (data().helpTitle || data().helpLines) {
            <hpo-help-button
              [title]="data().helpTitle || ''"
              [lines]="data().helpLines || []" />
          }
        </header>

        <section class="dialog__body">
          <p class="dialog__message">{{ data().message }}</p>
        </section>

        <footer class="dialog__footer">
          <button type="button" class="btn-cancel" (click)="close(false)">
            {{ data().cancelText || 'Cancel' }}
          </button>
          <button type="button" class="btn-confirm" (click)="close(true)">
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
  private emitted = false;

  constructor() {
    effect(() => {
      const modal = this.dialogEl().nativeElement;
      if (this.isOpen()) {
        this.emitted = false; // reset guard each time it's (re)opened
        if (!modal.open) {
          modal.showModal();
        }
      } else if (modal.open) {
        modal.close();
      }
    });
  }

  /** Only entry point that should close the dialog — Esc and backdrop route here too. */
  close(confirmed: boolean): void {
    this.dialogEl().nativeElement.close(confirmed ? 'true' : 'false');
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogEl().nativeElement) {
      this.close(false);
    }
  }

  /** Single emission point: fires for button clicks, Esc, and backdrop click alike. */
  onNativeClose(): void {
    if (this.emitted) return;
    this.emitted = true;
    this.result.emit(this.dialogEl().nativeElement.returnValue === 'true');
  }
}