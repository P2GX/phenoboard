import { ChangeDetectorRef, Component, HostListener, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { ConfigService } from '../services/config.service';
import { TemplateBaseComponent } from '../templatebase/templatebase.component';
import { TemplateDtoService } from '../services/template_dto_service';
import { TemplateDto } from '../models/template_dto';
import { MatDialog } from '@angular/material/dialog';
import { EtlColumnEditComponent } from '../etl_column_edit/etl_column_edit.component';


import { MatIconModule } from "@angular/material/icon";


import { ColumnDto, ColumnTableDto, EtlColumnType } from '../models/etl_dto';

/**
 * Component for editing external tables (e.g., supplemental files)
 */
@Component({
  selector: 'app-tableeditor',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatIconModule],
  templateUrl: './tableeditor.component.html',
  styleUrls: ['./tableeditor.component.css'],
})
export class TableEditorComponent extends TemplateBaseComponent implements OnInit, OnDestroy {

 
  constructor(private configService: ConfigService, 
    templateService: TemplateDtoService,
    ngZone: NgZone,
    cdRef: ChangeDetectorRef,
    private dialog: MatDialog
  ) {
    super(templateService, ngZone, cdRef);
  }
  
contextMenuColIndex: number | null = null;
contextMenuColHeader: string | null = null;
contextMenuColType: string | null = null;
columnContextMenuVisible = false;
columnContextMenuX = 0;
columnContextMenuY = 0;

editModeActive = false;
visibleColIndex: number | null = null;

  displayRows: string[][] = [];
  externalTable: ColumnTableDto  | null = null;
  errorMessage: string | null = null;
  
  override ngOnInit(): void {
    super.ngOnInit();
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
  }

  protected override onTemplateLoaded(template: TemplateDto): void {
    console.log("TableEditorComponent:onTemplateLoaded");
  }

 
  async loadExcel() {
    console.log('loadExcel');
    try {
      const table = await this.configService.loadExternalExcel();
      if (table != null) {
        this.externalTable = table;
        console.log("Got the table", this.externalTable);
        this.ngZone.run(() => {
          this.buildTableRows();
        });
      } else {
        this.errorMessage = "Could not retrieve external table";
      }
    } catch (error) {
        this.errorMessage = String(error);
        console.log("Error table", this.errorMessage);
    }
}

async loadExcelRowBased() {
  try {
      const table = await this.configService.loadExternalExcel();
      if (table != null) {
        this.externalTable = table;
        console.log("Got the table", this.externalTable);
        this.ngZone.run(() => {
        this.buildTableRows();
        });
      } else {
        this.errorMessage = "Could not retrieve external table";
      }
    } catch (error) {
        this.errorMessage = String(error);
        console.log("Error table", this.errorMessage);
    }
}

buildTableRows(): void {
  if (this.externalTable == null) {
    return;
  }
  if (!this.externalTable?.columns?.length) {
    console.log("Could not create table because externalTable had no columns");
    return;
  }
  console.log("buildTableRows - len",this.externalTable?.columns?.length)
  const headers = this.externalTable.columns.map(col => col.header);
  const types = this.externalTable.columns.map(col => col.columnType);
  console.log("type=",types);
  const rowCount = Math.max(...this.externalTable.columns.map(col => col.values.length));
  const valueRows: string[][] = [];

  for (let i = 0; i < rowCount; i++) {
    const row: string[] = this.externalTable.columns.map(col => col.values[i] ?? '');
    valueRows.push(row);
  }

    this.displayRows = [
      headers,
      types,
      ...valueRows
    ];
    console.log("got display rows", this.displayRows);
  }

  isTransformed(colIndex: number): boolean {
    if (this.externalTable == null) {
      return false;
    }
    return this.externalTable.columns[colIndex].transformed;
  }

openColumnDialog(index: number): void {
  if (this.externalTable == null) {
      return;
    }
  const column = this.externalTable.columns[index];

  const dialogRef = this.dialog.open(EtlColumnEditComponent, {
    data: { column: structuredClone(column) }, // clone to avoid mutating until confirmed
    width: '500px'
  });

  dialogRef.afterClosed().subscribe((updatedColumn: ColumnDto | undefined) => {
    if (updatedColumn && this.externalTable != null) {
      this.externalTable.columns[index] = updatedColumn;
      this.sendColumnToBackend(updatedColumn);
    }
  });
}


sendColumnToBackend(column: ColumnDto): void {
  console.log("TODO SEND TO BACKEND")
}



onRightClickHeader(event: MouseEvent, colIndex: number): void {
  event.preventDefault();
  this.contextMenuColIndex = colIndex;
  this.contextMenuColHeader = this.externalTable?.columns?.[colIndex]?.header ?? null;
  this.contextMenuColType = this.externalTable?.columns?.[colIndex]?.columnType ?? null;
  this.columnContextMenuX = event.clientX;
  this.columnContextMenuY = event.clientY;
  this.columnContextMenuVisible = true;
}

// Show only selected column (plus first column)
showOnlyColumn(colIndex: number | null): void {
  if (colIndex !== null) {
    this.editModeActive = true;
    this.visibleColIndex = colIndex;
    this.columnContextMenuVisible = false;
  }
}

// Show all columns again
clearColumnFilter(): void {
  this.editModeActive = false;
  this.visibleColIndex = null;
  this.columnContextMenuVisible = false;
}

// Placeholder for edit logic
startEditColumn(colIndex: number | null): void {
  this.showOnlyColumn(colIndex);
  console.log("Start editing column", colIndex);
  // Add editing UI or input field logic here
}

// Example transform: trim + uppercase all strings in selected column
applyTransform(colIndex: number | null): void {
  if (colIndex !== null && this.externalTable?.columns?.[colIndex]) {
    const col = this.externalTable.columns[colIndex];
    col.values = col.values.map(v => v.trim().toUpperCase());
    this.buildTableRows(); // rebuild display after transformation
  }
  this.columnContextMenuVisible = false;
}

contextMenuCellVisible = false;
contextMenuCellX = 0;
contextMenuCellY = 0;
contextMenuCellRow: number | null = null;
contextMenuCellCol: number | null = null;
contextMenuCellValue: string | null = null;
contextMenuCellType: EtlColumnType | null = null;

onRightClickCell(event: MouseEvent, rowIndex: number, colIndex: number): void {
  event.preventDefault();
  if (!this.externalTable?.columns?.[colIndex]) return;

  const col = this.externalTable.columns[colIndex];
  this.contextMenuCellX = event.clientX;
  this.contextMenuCellY = event.clientY;
  this.contextMenuCellVisible = true;
  this.contextMenuCellRow = rowIndex;
  this.contextMenuCellCol = colIndex;
  this.contextMenuCellValue = col.values[rowIndex - 2] ?? ''; // offset for headers
  this.contextMenuCellType = col.columnType;
}

editValueManually() {
  alert("Manual edit placeholder. Implement input modal.");
  this.contextMenuCellVisible = false;
}

  @HostListener('document:click')
  onDocumentClick() {
    this.columnContextMenuVisible = false;
  }


  saveExternalTemplateJson() {
  console.log("💾 Save external template as JSON");
  // You can implement download using Blob and FileSaver
}

loadExternalTemplateJson() {
  console.log("📂 Load external template from JSON");
  // Implement a file input or dialog
}
  
}
