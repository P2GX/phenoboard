import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { ConfigService } from '../services/config.service';


@Component({
  selector: 'app-hpoloader',
  standalone: true,
  imports: [CommonModule, MatTableModule],
  templateUrl: './pyphetools.component.html',
  styleUrls: ['./pyphetools.component.css'],
})
export class PyphetoolsComponent implements OnInit {
  objectKeys = Object.keys;
  constructor(private configService: ConfigService, private cdr: ChangeDetectorRef) {}
  
  // currently selected (by right click) row and column 
  contextMenuRow: number | null = null;
  contextMenuCol: number | null = null;
  // This is set to true by right click
  showContextMenu = false;
  showHpoContextMenu: boolean = false;
  // todo - probably we do not need to record this
  contextMenuPosition = { x: 0, y: 0 };
  contextMenuItems: string[] = ["edit column", "edit row", "delete column", "delete row"];
  hpoContextMenuItems: string[] = ["observed", "excluded", "na", "return to main"];

  tableData: string[][] = [];

  showMainTable: boolean = true;
  showRowTable: boolean = false;
  showColTable: boolean = false;

  summary: Record<string, string> = {};
  
  errorMessage: string | null = null;

  async ngOnInit() {
    try {
      this.tableData = await this.configService.getPhetoolsMatrix();
      console.log("ngOnInit-table length", this.tableData.length)
      console.log("ini pyphetools component")
      console.log(this.tableData);
    } catch (err) {
      console.error("Failed to load table data", err);
      return;
    }
    try {
      this.summary = await this.configService.getTemplateSummary();
    } catch (err) {
      console.error("Failed to load summary", err);
    }
  }

    
  getKeys(row: any): string[] {
      return Object.keys(row);
    }

    getValue(row: any, key: string): any {
      return (row as Record<string, any>)[key];
    }

    onRightClick(event: MouseEvent, rowIndex: number, colIndex: number): void {
      event.preventDefault();
      console.log(`Right-clicked on row ${rowIndex}, column ${colIndex}`);
      this.contextMenuPosition = { x: event.clientX, y: event.clientY };
      this.showContextMenu = true;
      this.contextMenuRow = rowIndex;
      this.contextMenuCol = colIndex;
      this.cdr.detectChanges();  // Force update of view
    }

    onRightClickHpo(event: MouseEvent, rowIndex: number, colIndex: number): void {
      event.preventDefault();
      console.log(`HPO Right-clicked on row ${rowIndex}, column ${colIndex}`);
      this.contextMenuPosition = { x: event.clientX, y: event.clientY };
      this.showHpoContextMenu = true;
      this.contextMenuRow = rowIndex;
      this.contextMenuCol = colIndex;
      this.cdr.detectChanges();  // Force update of view
    }

  hideContextMenu(): void {
    this.showContextMenu = false;
    this.showHpoContextMenu = false;
  }

  showColumnTable(): void {
    this.showMainTable = false;
    this.showRowTable = false;
    this.showColTable = true;
    this.cdr.detectChanges();  // Force update of view

  }

  showMainTableWithAllColumns(): void {
    this.showMainTable = true;
    this.showRowTable = false;
    this.showColTable = false;
    this.cdr.detectChanges();  // Force update of view
  }

  async onMenuItemClick(item: string): Promise<void> {
    console.log('onMenuItemClick: Selected:', item);
    console.log(`onMenuItemClick: Clicked: ${item} at row ${this.contextMenuRow}, col ${this.contextMenuCol}`);

    this.showContextMenu = false;
    // value, row, col
    if (this.contextMenuCol != null && this.contextMenuRow != null) {
      if (item =="edit column") {
        try {
          this.tableData = await this.configService.getPhetoolsColumn(this.contextMenuCol);
          this.showColumnTable();
        } catch (err) {
          console.error("Failed to load table data", err);
          this.showMainTableWithAllColumns();
        }
      } else {
        this.showMainTableWithAllColumns();
      }
    }
  }

  async onHpoMenuItemClick(item: string): Promise<void> {
    this.showHpoContextMenu = false;
    // value, row, col
    if (this.contextMenuCol != null && this.contextMenuRow != null) {
      if (item =="edit column") {
        try {
          console.log("todo -- what is the desired behavior?");
          this.showMainTableWithAllColumns();
        } catch (err) {
          console.error("Failed to load table data", err);
          this.showMainTableWithAllColumns();
        }
      } else if (item == "observed" || item == "excluded" || item == "na") {
        // switch the cell value to observed. We know what column we are in and need to pass the row
        try {
          this.configService.editCellOfCurrentColumn(item, this.contextMenuRow);
          this.tableData = await this.configService.getSelectedPhetoolsColumn(); // show the currently selected column again (with changes)
          this.cdr.detectChanges();
        } catch(err) {
          this.errorMessage = 'Could not set value: ' + (err instanceof Error ? err.message : 'Unknown error');
        }
        this.cdr.detectChanges();
      } else if (item == "return to main") {
        this.tableData = await this.configService.getPhetoolsMatrix();
        this.showMainTableWithAllColumns();
      }
    }
  }

  formatCell(cell: string): string {
    let displayValue = cell;
  
    // Highlight specific terms
    if (cell === 'observed') {
      displayValue = 'O';
    } else if (cell == 'excluded') {
      displayValue = 'X'
    } 
    // Truncate if necessary
    if (cell.length > 20) {
      const shortText = cell.slice(0, 17) + '...';
      return `<span class="cell-ellipsis" title="${cell}">${shortText}</span>`;
    }
  
    return displayValue;
  }

  getCellClass(value: string): string {
    if (value === "observed") {
      return "cell-observed";
    } else if (value === "excluded") {
      return "cell-excluded";
    } else if (value == "na" || value=="") {
      return "cell-na";
    }
    return "";
  }
  
}
