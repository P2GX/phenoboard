import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { invoke } from '@tauri-apps/api/core';

@Component({
  selector: 'app-hpoloader',
  standalone: true,
  imports: [CommonModule, MatTableModule],
  templateUrl: './pyphetools.component.html',
  styleUrls: ['./pyphetools.component.css'],
})
export class PyphetoolsComponent {
  objectKeys = Object.keys;
  constructor(private cdr: ChangeDetectorRef) {}
  // currently selected (by right click) row and column 
  contextMenuRow: number | null = null;
  contextMenuCol: number | null = null;
  // This is set to true by right click
  showContextMenu = false;
  // todo - probably we do not need to record this
  contextMenuPosition = { x: 0, y: 0 };
  contextMenuItems: string[] = ["edit this column", "edit this row", "na"];

  displayedColumns: string[] = ['name', 'value', 'type'];
  
  tableData = [
    { name: 'Gene1', value: '42', type: 'A' },
    { name: 'Gene2', value: '77', type: 'B' },
    { name: 'Gene3', value: '12', type: 'A' },
  ];

  
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
  this.cdr.detectChanges();  // Force Angular to update the view
  console.log("show ctm ",this.showContextMenu);
}

hideContextMenu(): void {
  this.showContextMenu = false;
}

onMenuItemClick(item: string): void {
  console.log('Selected:', item);
  console.log(`Clicked: ${item} at row ${this.contextMenuRow}, col ${this.contextMenuCol}`);

  this.showContextMenu = false;
  // Implement your backend call or further processing here
// Call the Rust function with the selected item as a parameter
  invoke('process_pyphetools_table_rclick', { parameter: item })
    .then(response => console.log('Response from Rust:', response))
    .catch(err => console.error('Error calling Rust function:', err));
}

}
