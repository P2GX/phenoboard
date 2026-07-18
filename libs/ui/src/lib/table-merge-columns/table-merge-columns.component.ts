import { Component, input, output, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-table-merge-columns',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './table-merge-columns.component.html',
  styleUrl: './table-merge-columns.component.scss'
})
export class TableFloatingControlsComponent {
  // Staged targets inputs
  colA = input.required<number | null>();
  colB = input.required<number | null>();
  
  // Two-way model sync for local control configuration variables
  separator = model.required<string>();
  labelColumns = model.required<boolean>();
  undoVisible = input.required<boolean>();

  // Action event streams
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