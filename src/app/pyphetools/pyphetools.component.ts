import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-hpoloader',
  standalone: true,
  imports: [CommonModule, MatTableModule],
  templateUrl: './pyphetools.component.html',
  styleUrls: ['./pyphetools.component.css'],
})
export class PyphetoolsComponent {
  displayedColumns: string[] = ['name', 'value', 'type'];
  tableData = [
    { name: 'Gene1', value: '42', type: 'A' },
    { name: 'Gene2', value: '77', type: 'B' },
    { name: 'Gene3', value: '12', type: 'A' },
  ];

  showContextMenu = false;
  contextMenuPosition = { x: 0, y: 0 };
  contextMenuItems: string[] = [];

  onRightClick(event: MouseEvent, element: any, column: string): void {
    event.preventDefault();
    this.contextMenuPosition = { x: event.clientX, y: event.clientY };
    this.contextMenuItems = this.getMenuItems(column, element);
    this.showContextMenu = true;
  }

  onMenuItemClick(item: string): void {
    console.log('Selected:', item);
    this.showContextMenu = false;
    // Implement your backend call or further processing here
  }

  getMenuItems(column: string, element: any): string[] {
    switch (column) {
      case 'name':
        return ['Option 1', 'Option 2', 'Option 3'];
      case 'value':
        return ['Analyze', 'Plot', 'Inspect'];
      case 'type':
        return ['Type A Details', 'Type B Details'];
      default:
        return ['Unknown Option'];
    }
  }
}
