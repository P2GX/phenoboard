import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColumnDto, columnTypeColors, EtlCellValue, EtlColumnHeader, EtlColumnType } from '../models/transform-operations'; 
import { EtlCellStatus } from '../models/transform-operations';

@Component({
  selector: 'app-etl-data-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './etl-data-table.component.html',
  styleUrl: './etl-data-table.component.scss'
})
export class EtlDataTableComponent {
  columns = input.required<ColumnDto[]>();

  headerContextMenuRequested = output<{ event: MouseEvent; index: number; header: EtlColumnHeader }>();
  cellContextMenuRequested = output<{ event: MouseEvent; rowIdx: number; colIdx: number; cell: EtlCellValue }>();
  cellDoubleClicked = output<{ rowIdx: number; colIdx: number; cell: EtlCellValue }>();

  protected readonly EtlColumnType = EtlColumnType;
  
  rowIndices = computed<number[]>(() => {
    const cols = this.columns();
    if (!cols || cols.length === 0) return [];
    const maxRows = Math.max(...cols.map(c => c.values?.length || 0));
    return Array.from({ length: maxRows }, (_, i) => i);
  });

  getColumnColor(type: EtlColumnType): string {
    return columnTypeColors[type] || '#ffffff';
  }

  readonly CELL_COLORS: Record<EtlCellStatus | 'COLUMN_IGNORE', string> = {
    [EtlCellStatus.Error]: '#fee2e2',       // Soft red backdrop
    [EtlCellStatus.Transformed]: '#dcfce7', // Soft green backdrop
    [EtlCellStatus.Raw]: 'transparent',     // Default clean fallback
    [EtlCellStatus.Ignored]: '#f3f4f6',     // Soft grey backdrop
    COLUMN_IGNORE: '#f3f4f6'                // Column wide override grey
  };

  onHeaderContextMenu(event: MouseEvent, index: number, header: EtlColumnHeader): void {
    event.preventDefault();
    this.headerContextMenuRequested.emit({ event, index, header });
  }

  onCellContextMenu(event: MouseEvent, rowIdx: number, colIdx: number, cell: EtlCellValue): void {
    event.preventDefault();
    this.cellContextMenuRequested.emit({ event, rowIdx, colIdx, cell });
  }
}