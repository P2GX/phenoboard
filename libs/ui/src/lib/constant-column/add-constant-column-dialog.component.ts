import { Component, ElementRef, ViewChild, AfterViewInit, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-constant-column-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-constant-column-dialog.component.html',
  styleUrls: ['./add-constant-column-dialog.component.scss'],
})
export class AddConstantColumnDialogComponent implements AfterViewInit {
  readonly data = input<{ columnName: string; constantValue: string }>({ columnName: '', constantValue: '' });
  readonly closed = output<{ columnName: string; constantValue: string } | null>();

  @ViewChild('dialogEl') dialogEl!: ElementRef<HTMLDialogElement>;

  columnName = '';
  constantValue = '';

  ngOnInit() {
    const initialData = this.data();
    if (initialData) {
      this.columnName = initialData.columnName ?? '';
      this.constantValue = initialData.constantValue ?? '';
    }
  }

  ngAfterViewInit() {
    if (this.dialogEl?.nativeElement) {
      this.dialogEl.nativeElement.showModal();
    }
  }

  onCancel(): void {
    this.dialogEl?.nativeElement.close();
    this.closed.emit(null);
  }

  onSave(): void {
    this.dialogEl?.nativeElement.close();
    this.closed.emit({
      columnName: this.columnName,
      constantValue: this.constantValue,
    });
  }
}