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
  colAforMerge = input<number | null>(null);
  colBforMerge = input<number | null>(null);

  headerContextMenuRequested = output<{ event: MouseEvent; index: number; header: EtlColumnHeader }>();
  cellContextMenuRequested = output<{ event: MouseEvent; rowIdx: number; colIdx: number; cell: EtlCellValue }>();
  cellDoubleClicked = output<{ rowIdx: number; colIdx: number; cell: EtlCellValue }>();

  protected readonly EtlColumnType = EtlColumnType;
  protected readonly EtlCellStatus = EtlCellStatus;
  
  rowIndices = computed<number[]>(() => {
    const cols = this.columns();
    if (!cols || cols.length === 0) return [];
    const maxRows = Math.max(...cols.map(c => c.values?.length || 0));
    return Array.from({ length: maxRows }, (_, i) => i);
  });

  getColumnColor(type: EtlColumnType): string {
    return columnTypeColors[type] || '#ffffff';
  }


  readonly CELL_COLORS: Record<string, string> = {
    'transformed': '#dcfce7', // Matches EtlCellStatus.Transformed ("transformed")
    'error': '#fee2e2',       // Matches EtlCellStatus.Error ("error")
    'raw': 'transparent',     // Matches EtlCellStatus.Raw ("raw")
    'ignored': '#f3f4f6',     // Matches EtlCellStatus.Ignored ("ignored")
    'COLUMN_IGNORE': '#f3f4f6'
  };

  /**
   * Handles right-click events on the table column headers.
   * 
   * @param event The native mouse event triggered by the context click.
   * @param index The zero-based index of the column within the active grid array.
   * @param header The metadata configuration structure for the target column.
   */
  onHeaderContextMenu(event: MouseEvent, index: number, header: EtlColumnHeader): void {
    event.preventDefault();
    console.log("onHeaderContextMenu ", index, header);
    this.headerContextMenuRequested.emit({ event, index, header });
  }

  onCellContextMenu(event: MouseEvent, rowIdx: number, colIdx: number, cell: EtlCellValue): void {
    event.preventDefault();
    this.cellContextMenuRequested.emit({ event, rowIdx, colIdx, cell });
  }


  getDisplayValue(cell: EtlCellValue, columnType: EtlColumnType): string {
    if (columnType === EtlColumnType.HpoTextMining && cell.status === EtlCellStatus.Transformed && cell.current) {
      try {
        const parsedTerms = JSON.parse(cell.current);
        if (Array.isArray(parsedTerms)) {
          const count = parsedTerms.length;
          return `${count} HPO Term${count === 1 ? '' : 's'} added`;
        }
      } catch (e) {
        console.error("Failed to parse stringified HPO data cell", e);
      }
    }
    return cell.current || cell.original || '';
  }
}