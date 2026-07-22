import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HpoTwostepMiningComponent, NotificationService, HpoTwostepData } from 'ng-hpo-uikit';

@Component({
  selector: 'app-hpo-dialog-wrapper',
  standalone: true,
  imports: [HpoTwostepMiningComponent],
  template: `
    <lib-hpo-twostep-mining
      [config]="dialogData"
      (curationComplete)="dialogRef.close($event)"
      (cancelled)="dialogRef.close()"
      (errorOccurred)="handleError($event)"
    >
    </lib-hpo-twostep-mining>
  `,
})
export class HpoDialogWrapperComponent {
  protected readonly dialogRef = inject(MatDialogRef<HpoDialogWrapperComponent>);
  protected readonly dialogData = inject<HpoTwostepData>(MAT_DIALOG_DATA);
  private notificationService = inject(NotificationService);

  handleError(msg: string) {
    this.notificationService.showError(msg);
  }
}
