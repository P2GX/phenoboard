import { Component, input, output, effect, viewChild, ElementRef, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-split-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './app-split-dialog.component.html',
  styleUrl: './app-split-dialog.component.scss',
})
export class SplitDialogComponent {
  text = input.required<string>();

  applied = output<string>();
  cancel = output<void>();

  private dialogElement = viewChild<ElementRef<HTMLDialogElement>>('nativeDialog');

  selectedDelimiter = signal<string>(',');
  customDelimiter = signal<string>('');

  previewParts = computed(() => {
    const d = this.getFinalDelimiter();
    if (!d) return [this.text()];
    return this.text()
      .split(d)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  });

  canApply = computed(() => this.previewParts().length >= 2);

  constructor() {
    effect(() => {
      const dialog = this.dialogElement()?.nativeElement;
      if (dialog && !dialog.open) {
        dialog.showModal();
      }
    });
  }

  getFinalDelimiter(): string {
    return this.selectedDelimiter() === 'custom' ? this.customDelimiter() : this.selectedDelimiter();
  }

  selectDelimiter(value: string) {
    this.selectedDelimiter.set(value);
  }

  apply() {
    if (!this.canApply()) return;
    this.dialogElement()?.nativeElement.close();
    this.applied.emit(this.getFinalDelimiter());
  }

  onCancel() {
    this.dialogElement()?.nativeElement.close();
    this.cancel.emit();
  }
}