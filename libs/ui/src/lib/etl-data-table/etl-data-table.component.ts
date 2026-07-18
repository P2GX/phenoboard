import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColumnDto, columnTypeColors, EtlCellValue, EtlColumnHeader, EtlColumnType } from '../models/transform-operations'; 


@Component({
  selector: 'app-etl-data-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './etl-data-table.component.html',
  styleUrl: './etl-data-table.component.scss'
})
export class EtlDataTableComponent {
  // Input your actual array of columns directly
  columns = input.required<ColumnDto[]>();

  // Event emitters matching your parent coordinates trackers
  headerContextMenuRequested = output<{ event: MouseEvent; index: number; header: EtlColumnHeader }>();
  cellContextMenuRequested = output<{ event: MouseEvent; rowIdx: number; colIdx: number; cell: EtlCellValue }>();
  cellDoubleClicked = output<{ rowIdx: number; colIdx: number; cell: EtlCellValue }>();

  // Computed helper track to automatically find the longest row boundary inside the columns
  rowIndices = computed<number[]>(() => {
    const cols = this.columns();
    if (!cols || cols.length === 0) return [];
    const maxRows = Math.max(...cols.map(c => c.values?.length || 0));
    return Array.from({ length: maxRows }, (_, i) => i);
  });

  getColumnColor(type: EtlColumnType): string {
    return columnTypeColors[type] || '#ffffff';
  }

  onHeaderContextMenu(event: MouseEvent, index: number, header: EtlColumnHeader): void {
    event.preventDefault();
    this.headerContextMenuRequested.emit({ event, index, header });
  }

  onCellContextMenu(event: MouseEvent, rowIdx: number, colIdx: number, cell: EtlCellValue): void {
    event.preventDefault();
    this.cellContextMenuRequested.emit({ event, rowIdx, colIdx, cell });
  }
}