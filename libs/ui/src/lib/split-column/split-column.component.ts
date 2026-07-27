import { Component, computed, inject, signal, ElementRef, ViewChild, AfterViewInit, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-split-column-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './split-column.component.html',
  styleUrls: ['./split-column.component.scss'],
})
export class SplitColumnDialogComponent implements AfterViewInit {
  readonly data = input<{ originalHeader: string; example: string }>({ originalHeader: '', example: '' });
  readonly closed = output<string | null>();

  @ViewChild('dialogEl') dialogEl!: ElementRef<HTMLDialogElement>;

  selectedDelimiter = signal<string>(',');
  customValue = signal<string>('');

  ngAfterViewInit() {
    if (this.dialogEl?.nativeElement) {
      this.dialogEl.nativeElement.showModal();
    }
  }

  finalDelimiter = computed(() => {
    return this.selectedDelimiter() === 'custom' ? this.customValue() : this.selectedDelimiter();
  });

  splitExample = computed(() => {
    const sep = this.finalDelimiter();
    const orig = this.data().example || '';

    if (!sep || !orig.includes(sep)) {
      return { a: orig || '---', b: 'n/a' };
    }

    const index = orig.indexOf(sep);
    return {
      a: orig.substring(0, index),
      b: orig.substring(index + sep.length),
    };
  });

  confirm() {
    this.dialogEl?.nativeElement.close();
    this.closed.emit(this.finalDelimiter());
  }

  cancel() {
    this.dialogEl?.nativeElement.close();
    this.closed.emit(null);
  }
}