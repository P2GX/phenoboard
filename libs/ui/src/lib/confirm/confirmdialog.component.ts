import { AfterViewInit, Component, ElementRef, afterNextRender, input, output, viewChild } from '@angular/core';
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
      @if (data(); as resolvedData) {
        <div class="dialog__wrapper">

          <header class="dialog__header">
            <div class="dialog__title-group">
              <span class="dialog__icon">⚠️</span>
              <h2 class="dialog__title">{{ resolvedData.title || 'Confirm Action' }}</h2>
            </div>

            @if (resolvedData.helpTitle || resolvedData.helpLines) {
              <hpo-help-button
                [title]="resolvedData.helpTitle || ''"
                [lines]="resolvedData.helpLines || []" />
            }
          </header>

          <section class="dialog__body">
            <p class="dialog__message">{{ resolvedData.message }}</p>
          </section>

          <footer class="dialog__footer">
            <button type="button" class="btn-cancel" (click)="close(false)">
              {{ resolvedData.cancelText || 'Cancel' }}
            </button>
            <button type="button" class="btn-confirm" (click)="close(true)">
              {{ resolvedData.confirmText || 'Confirm' }}
            </button>
          </footer>

        </div>
        }
    </dialog>
  `,
  styleUrl: './confirmdialog.component.scss'
})
export class ConfirmDialogComponent implements AfterViewInit {
  data = input<ConfirmDialogData>();
  result = output<boolean>();

  private dialogEl = viewChild.required<ElementRef<HTMLDialogElement>>('nativeDialog');
  private emitted = false;

  ngAfterViewInit(): void {
    this.emitted = false;
    const modal = this.dialogEl().nativeElement;
    if (! modal.open) {
      modal.showModal();
    }
  }

  /** Only entry point that should close the dialog — Esc and backdrop route here too. */
  close(confirmed: boolean): void {
    const modal = this.dialogEl().nativeElement;
    if (modal.open) {
      modal.close(confirmed ? 'true' : 'false');
    }
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