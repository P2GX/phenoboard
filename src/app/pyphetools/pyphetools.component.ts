import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { invoke } from '@tauri-apps/api/core';
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
  // todo - probably we do not need to record this
  contextMenuPosition = { x: 0, y: 0 };
  contextMenuItems: string[] = ["edit this column", "edit this row", "na"];

  tableData: string[][] = [];
  


  async ngOnInit() {
    try {
      this.tableData = await this.configService.getPhetoolsMatrix();
      console.log("ini pyphetools component")
      console.log(this.tableData)
    } catch (err) {
      console.error("Failed to load table data", err);
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

  hideContextMenu(): void {
    this.showContextMenu = false;
  }

  onMenuItemClick(item: string): void {
    console.log('Selected:', item);
    console.log(`Clicked: ${item} at row ${this.contextMenuRow}, col ${this.contextMenuCol}`);

    this.showContextMenu = false;
    invoke('process_pyphetools_table_rclick', { 
            parameter: item, 
            row: this.contextMenuRow,
            col: this.contextMenuCol })
      .then(response => console.log('Response from Rust:', response))
      .catch(err => console.error('Error calling Rust function:', err));
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
    } else if (value == "na") {
      return "cell-na";
    }
    return "";
  }
  
}
