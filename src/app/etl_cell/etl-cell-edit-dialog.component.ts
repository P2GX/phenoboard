import { Component, ElementRef, ViewChild, afterNextRender, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from 'ng-hpo-uikit';

export interface CellEditData {
  original: string;
  current: string;
}

@Component({
  selector: 'etl-cell-edit-dialog',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './etl-cell-edit-dialog.component.html',
  styleUrl: './etl-cell-edit-dialog.component.scss',
})
export class EtlCellEditDialogComponent {
  data = input.required<CellEditData>();
  saved = output<string>();
  cancelled = output<void>();

  currentValue = '';

  @ViewChild('dialogEl') dialogEl!: ElementRef<HTMLDialogElement>;
  @ViewChild('inputEl') inputEl?: ElementRef<HTMLInputElement>;

  constructor() {
    afterNextRender(() => {
      this.currentValue = this.data().current;
      this.dialogEl?.nativeElement.showModal();
      this.inputEl?.nativeElement.focus();
    });
  }

  save() {
    this.dialogEl?.nativeElement.close();
    this.saved.emit(this.currentValue);
  }

  cancel() {
    this.dialogEl?.nativeElement.close();
    this.cancelled.emit();
  }
}