import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { ConfigService } from '../services/config.service';


@Component({
  selector: 'app-tableeditor',
  standalone: true,
  imports: [CommonModule, MatTableModule],
  templateUrl: './tableeditor.component.html',
  styleUrls: ['./tableeditor.component.css'],
})
export class TableEditorComponent implements OnInit {
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
      console.log("ini pyphetools refactor")
    } catch (err) {
      console.error("Failed to load table data", err);
      return;
    }
  }

  
}
