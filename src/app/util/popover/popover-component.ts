import { Component, input, model, output } from '@angular/core';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';

@Component({
  selector: 'app-popover',
  standalone: true,
  imports: [OverlayModule],
  host: {
    'style': 'display: contents;'
  },
  template: `
    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="trigger()"
      [cdkConnectedOverlayOpen]="isOpen()"
      [cdkConnectedOverlayPositions]="positions"
      [cdkConnectedOverlayPush]="true"
      [cdkConnectedOverlayHasBackdrop]="true"
      cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop"
      (backdropClick)="isOpen.set(false)"
      (overlayOutsideClick)="isOpen.set(false)"
    >
      <div class="bg-white border border-gray-300 shadow-xl rounded-lg p-2 z-50">
        <ng-content></ng-content>
      </div>
    </ng-template>
  `
})
export class PopoverComponent {
  trigger = input.required<any>(); 
  isOpen = model<boolean>(false);

  // Best-practice positions: try bottom-right, then bottom-left, then top
  positions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -8 }
  ];
}