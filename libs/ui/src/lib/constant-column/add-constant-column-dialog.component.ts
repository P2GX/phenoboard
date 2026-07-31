import { Component, ElementRef, ViewChild, AfterViewInit, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


export interface ConstantColumnData {
  colIndex:number;
  columnName: string;
  constantValue: string;
}


@Component({
  selector: 'app-add-constant-column-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-constant-column-dialog.component.html',
  styleUrls: ['./add-constant-column-dialog.component.scss'],
})
export class AddConstantColumnDialogComponent implements AfterViewInit {
  colindex = input.required<number>();
  closed = output<ConstantColumnData | null>();

  @ViewChild('dialogEl') dialogEl!: ElementRef<HTMLDialogElement>;

  columnName = '';
  constantValue = '';

  ngOnInit() {
    const initialData = this.colindex();
    if (initialData) {
      this.columnName = '';
      this.constantValue = '';
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
    const data: ConstantColumnData = {
      colIndex: this.colindex(),
      columnName: this.columnName,
      constantValue: this.constantValue
    };
    this.closed.emit(data);
  }
}