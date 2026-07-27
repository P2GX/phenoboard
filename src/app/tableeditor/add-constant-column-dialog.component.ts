import { Component, ElementRef, ViewChild, AfterViewInit, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-constant-column-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <dialog #dialogEl class="orcid-modal add-constant-column-modal">
      <div class="dialog-content">
        <div class="review-header">
          <h2>Add Constant Column</h2>
        </div>

        <div class="dialog-body">
          <div class="form-field">
            <label for="columnName">Column Name</label>
            <input
              id="columnName"
              [(ngModel)]="columnName"
              autofocus
              autocapitalize="none"
              spellcheck="false"
              autocomplete="off"
              name="columnName"
              type="text"
            />
          </div>

          <div class="form-field">
            <label for="constantValue">Constant Value</label>
            <input
              id="constantValue"
              [(ngModel)]="constantValue"
              autocapitalize="none"
              spellcheck="false"
              autocomplete="off"
              name="constantValue"
              type="text"
            />
          </div>
        </div>

        <div class="dialog-actions">
          <button type="button" class="btn-outline-cancel" (click)="onCancel()">Cancel</button>
          <button type="button" class="btn-outline-primary" (click)="onSave()">Add</button>
        </div>
      </div>
    </dialog>
  `,
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