import { Component, ElementRef, afterNextRender, inject, input, output, viewChild } from '@angular/core';
import { HpoTwostepMiningComponent, NotificationService, HpoTwostepData, PolishedHpoAnnotation } from 'ng-hpo-uikit';

@Component({
  selector: 'app-hpo-dialog-wrapper',
  standalone: true,
  imports: [HpoTwostepMiningComponent],
  template: `
    <dialog #nativeDialog (close)="onNativeClose()" class="dialog">
      <lib-hpo-twostep-mining
        [config]="dialogData()"
        (curationComplete)="onCurationComplete($event)"
        (cancelled)="close()"
        (errorOccurred)="handleError($event)"
      >
      </lib-hpo-twostep-mining>
    </dialog>
  `,
  styleUrl: './hpo-dialog-wrapper.component.scss'
})
export class HpoDialogWrapperComponent {
  dialogData = input.required<HpoTwostepData>();
  result = output<PolishedHpoAnnotation[] | undefined>();

  private notificationService = inject(NotificationService);
  private dialogEl = viewChild.required<ElementRef<HTMLDialogElement>>('nativeDialog');
  private emitted = false;
  private pendingResult?: PolishedHpoAnnotation[];

  constructor() {
    afterNextRender(() => {
      const modal = this.dialogEl().nativeElement;
      if (!modal.open) {
        modal.showModal();
      }
    });
  }

  onCurationComplete(annotations: PolishedHpoAnnotation[]): void {
    this.pendingResult = annotations;
    this.close();
  }

  /** Only entry point that should close the dialog — Esc and backdrop route here too. */
  close(): void {
    const modal = this.dialogEl().nativeElement;
    if (modal.open) {
      modal.close();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogEl().nativeElement) {
      this.close();
    }
  }

  /** Single emission point: fires for completion, cancel, Esc, and backdrop alike. */
  onNativeClose(): void {
    if (this.emitted) return;
    this.emitted = true;
    this.result.emit(this.pendingResult);
  }

  handleError(msg: string): void {
    this.notificationService.showError(msg);
  }
}