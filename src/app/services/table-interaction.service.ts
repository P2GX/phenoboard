import { computed, Injectable, signal } from '@angular/core';
import { CellValue } from '@workspace/ui';







/**
 * Represents the coordinate and data context of a table interaction.
 */
export interface TableContext {
  rowId: string;       // Unique ID of the row (e.g., individual ID)
  colIndex: number;    // The column index in the table
  rowIndex: number;    // The row index of the table
  cell: CellValue;     // The data object associated with the clicked cell
  x: number;           // Horizontal mouse coordinate
  y: number;           // Vertical mouse coordinate
}

@Injectable({ providedIn: 'root' })
export class TableInteractionService {
  private readonly MENU_OFFSET_X = 300;
  private readonly MENU_OFFSET_Y = 100;

  /**
   * Internal signal holding the current menu context. 
   * Null indicates that no menu is currently open.
   */
  private _activeContext = signal<TableContext | null>(null);

  /**
   * Read-only exposure of the current interaction state for the UI to consume.
   */
  readonly activeContext = this._activeContext.asReadonly();
  readonly activeCell = computed(() => this._activeContext()?.cell ?? null);

  /**
   * Opens the context menu at the provided coordinates.
   * 
   * @param rowId The unique identifier of the clicked row.
   * @param colIndex The index of the column to perform actions on.
   * @param rowIndex The index of the row to perform actions on.
   * @param cell The data object containing the current cell's state.
   * @param event The original MouseEvent to prevent default browser behavior and capture position.
   */
  open(rowId: string, colIndex: number, rowIndex: number, cell: CellValue, event: MouseEvent): void {
    // We prevent the default browser context menu from appearing
    event.preventDefault(); 
    this._activeContext.set({
      rowId,
      colIndex,
      rowIndex,
      cell,
      x: this.MENU_OFFSET_X,
      y: this.MENU_OFFSET_Y
    });
  }


  updateActiveCell(newValue: CellValue): void {
    this._activeContext.update(ctx => ctx ? { ...ctx, cell: newValue } : ctx);
    }

 getActivateCell(): CellValue | null {
    return this.activeCell();
  }

  /**
   * Closes any active context menu by clearing the state.
   */
  close(): void {
    this._activeContext.set(null);
  }
}