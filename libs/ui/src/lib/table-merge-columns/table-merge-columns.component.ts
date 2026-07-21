import { Component, input, output, model } from '@angular/core';
import { IconComponent } from "../svg-icons/svg-icon.component";



@Component({
  selector: 'app-table-merge-columns',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './table-merge-columns.component.html',
  styleUrl: './table-merge-columns.component.scss'
})
export class TableFloatingControlsComponent {

  colA = input.required<number | null>();
  colB = input.required<number | null>();
  
  separator = model.required<string>();
  labelColumns = model.required<boolean>();
  undoVisible = input.required<boolean>();

  mergeRequested = output<void>();
  cancelMerge = output<void>();
  undoRequested = output<void>();
  dismissUndo = output<void>();

  onSeparatorChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.separator.set(value);
  }

  onLabelCheckboxChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.labelColumns.set(checked);
  }
}