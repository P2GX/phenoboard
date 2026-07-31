import { Component, effect, ElementRef, input, output, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SourcePmid } from '@workspace/ui';


@Component({
  selector: 'app-pmid-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pmid-dialog.component.html',
  styleUrls: ['./pmid-dialog.component.scss'],
})
export class PmidDialogComponent {
  citations = input.required<SourcePmid[]>();
  open = input<boolean>(false);
  closed = output<void>();

  private dialogEl = viewChild.required<ElementRef<HTMLDialogElement>>('nativeDialog');

  constructor() {
    effect(() => {
      const modal = this.dialogEl()?.nativeElement;
      if (!modal) return;
      if (this.open() && !modal.open) {
        modal.showModal();
      } else if (!this.open() && modal.open) {
        modal.close();
      }
    });
  }

  close(): void {
    const modal = this.dialogEl().nativeElement;
    if (modal.open) modal.close();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogEl().nativeElement) {
      this.close();
    }
  }

  getPmid(item: SourcePmid) {
    return item.pmid.split(':')[1];
  }


}
