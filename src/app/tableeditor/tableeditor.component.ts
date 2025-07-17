import { ChangeDetectorRef, Component, HostListener, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {  MatTableModule } from '@angular/material/table';
import { ConfigService } from '../services/config.service';
import { TemplateBaseComponent } from '../templatebase/templatebase.component';
import { TemplateDtoService } from '../services/template_dto_service';
import { TemplateDto } from '../models/template_dto';
import { MatDialog } from '@angular/material/dialog';
import { EtlColumnEditComponent } from '../etl_column_edit/etl_column_edit.component';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from "@angular/material/icon";


import { ColumnDto, ColumnTableDto, EtlColumnType } from '../models/etl_dto';
import { EtlSessionService } from '../services/etl_session_service';

type ColumnTypeColorMap = { [key in EtlColumnType]: string };

/**
 * Component for editing external tables (e.g., supplemental files)
 */
@Component({
  selector: 'app-tableeditor',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatIconModule, FormsModule],
  templateUrl: './tableeditor.component.html',
  styleUrls: ['./tableeditor.component.css'],
})
export class TableEditorComponent extends TemplateBaseComponent implements OnInit, OnDestroy {


 
  constructor(private configService: ConfigService, 
    templateService: TemplateDtoService,
    ngZone: NgZone,
    cdRef: ChangeDetectorRef,
    private dialog: MatDialog,
    private etl_service: EtlSessionService,
  ) {
    super(templateService, ngZone, cdRef);
  }
  

contextMenuColHeader: string | null = null;
contextMenuColType: string | null = null;
columnContextMenuVisible = false;
columnContextMenuX = 0;
columnContextMenuY = 0;

editModeActive = false;
visibleColIndex: number = -1;
transformedColIndex: number = -1;
contextMenuColIndex: number | null = null;
  displayRows: string[][] = [];
  externalTable: ColumnTableDto  | null = null;
  errorMessage: string | null = null;


  columnBeingTransformed: number | null = null;
  transformationPanelVisible: boolean = false;
  editPreviewColumnVisible: boolean = false;
  
contextMenuCellVisible = false;
contextMenuCellX = 0;
contextMenuCellY = 0;
contextMenuCellRow: number | null = null;
contextMenuCellCol: number | null = null;
contextMenuCellValue: string | null = null;
contextMenuCellType: EtlColumnType | null = null;
transformedColumnValues: string[] = [];

columnTypeColors: ColumnTypeColorMap = {
  raw: '#ffffff',
  familyId: '#f0f8ff',
  patientId: '#e6ffe6',
  singleHpoTerm: '#fff0f5',
  multipleHpoTerm: '#ffe4e1',
  geneSymbol: '#f5f5dc',
  variant: '#f0fff0',
  disease: '#fdf5e6',
  age: '#e0ffff',
  sex: '#f5f5f5',
  ignore: '#d3d3d3'
};

  etlTypes: EtlColumnType[] = Object.values(EtlColumnType);
  
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
    this.errorMessage = null;
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
  this.errorMessage = null;
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
  this.visibleColIndex = -1;
  this.columnContextMenuVisible = false;
}

editUniqueValuesInColumn(index: number) {
  if (!this.externalTable) return;

  const column = this.externalTable.columns[index];
  const values = column.values || [];

  // Step 1: Get unique, non-empty values
  const unique = Array.from(new Set(values.map(v => v.trim()))).filter(v => v !== '');

  // Step 2: Populate the transformation map with identity mappings
  this.transformationMap = {};
  unique.forEach(val => {
    this.transformationMap[val] = val;
  });

  // Step 3: Set UI control variables
  this.contextMenuColIndex = index;
  this.contextMenuColHeader = column.header;
  this.contextMenuColType = column.columnType;
  this.uniqueValuesToMap = unique;
  this.transformationPanelVisible = true;
  this.columnBeingTransformed = index;

  console.debug("Preparing transformation for:", this.contextMenuColHeader);
}


getUniqueValues(colIndex: number): string[] {
  if (!this.externalTable) return [];

  const column = this.externalTable.columns[colIndex];
  if (!column) return [];

  const uniqueSet = new Set(column.values);
  return Array.from(uniqueSet);
}

transformationMap: { [original: string]: string } = {};
uniqueValuesToMap: string[] = [];

startTransformColumn(colIndex: number) {
  console.log("calling startTransformColumn, colIndex=", colIndex);
  this.uniqueValuesToMap = this.getUniqueValues(colIndex);
  this.transformationMap = {};
  this.uniqueValuesToMap.forEach(val => {
    this.transformationMap[val] = val; // default to same value
  });
  this.columnBeingTransformed = colIndex;
  this.transformationPanelVisible = true;
}



finalizeColumnTransformation() {
  if (this.columnBeingTransformed == null || !this.externalTable) return;
  this.externalTable.columns[this.columnBeingTransformed].values = [...this.transformedColumnValues];
  this.transformationPanelVisible = false;
  this.editPreviewColumnVisible = false;
  this.columnBeingTransformed = null;
}

applyValueReplacements(replacements: Record<string, string>) {
  if (this.transformedColIndex === -1) return;

  const targetCol = this.externalTable?.columns[this.visibleColIndex];
  const transformedCol = this.externalTable?.columns[this.transformedColIndex];

  if (!targetCol || !transformedCol) return;

  transformedCol.values = targetCol.values.map(v => replacements[v] ?? v);
  this.buildTableRows();
}

startEditColumn(index: number) {
  if (this.externalTable == null) {
    return;
  }
  this.editModeActive = true;
  this.visibleColIndex = index;

  // Generate a third column by copying current values for editing
  const newTransformed = this.externalTable?.columns[index]?.values.map(v => v ?? '');

  const newColumn: ColumnDto = {
    columnType: this.externalTable?.columns[index]?.columnType || 'raw' as EtlColumnType,
    transformed: true,
    header: `${this.externalTable?.columns[index]?.header}_edited`,
    values: newTransformed || []
  };

  this.externalTable?.columns.push(newColumn);
  this.transformedColIndex = this.externalTable.columns.length - 1;

  this.buildTableRows(); // Rebuild the table display
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

/**
 * This function is called up right click in the editing window when the user indicates
 * to replace values with the correctly formated values, e.g., "Female" => "F"
 */
applyValueTransform() {
  if (this.externalTable == null) {
    // should never happen
    console.error("Attempt to apply value transform with externalTable being null");
    return;
  }
  if (this.columnBeingTransformed == null) {
    console.error("Attempt to apply value transform with columnBeingTransformed being null");
    return;
  } 
  const colIndex = this.columnBeingTransformed;
  const column = this.externalTable.columns[colIndex];
  const transformedValues = column.values.map(val => this.transformationMap[val.trim()] || val);
  this.externalTable.columns[this.columnBeingTransformed].values = [...transformedValues];
  this.transformedColumnValues = transformedValues;
  this.transformationPanelVisible = false;
  this.editPreviewColumnVisible = true;
  // rebuild the table
  this.buildTableRows();
}

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


  async saveExternalTemplateJson() {
    this.errorMessage = null;
    if (this.externalTable == null) {
      await alert("Data table is not initialized");
      return;
    }
    this.configService.saveJsonExternalTemplate(this.externalTable)
}

  async loadExternalTemplateJson() {
    this.errorMessage = null;
    try {
      const table = await this.configService.loadJsonExternalTemplate();
      if (table == null) {
        await alert("Could not retrieve external template json");
        return;
      }
      this.ngZone.run(() => {
        this.externalTable = table;
        this.buildTableRows();
      });
      
    } catch(error) {
      this.errorMessage = String(error);
    }
  }


assignColumnType(type: EtlColumnType) {
  if (this.contextMenuColIndex !== null && this.externalTable) {
    this.externalTable.columns[this.contextMenuColIndex].columnType = type;
    this.contextMenuCellVisible = false;
    this.buildTableRows(); // re-render if needed
  }
}

getVisibleColumns(row: string[]): number[] {
  if (!this.editModeActive) {
    return row.map((_, i) => i); // Show all columns normally
  }

  const indices = [0]; // Always show first column

  if (this.visibleColIndex >= 0) indices.push(this.visibleColIndex);
  if (this.transformedColIndex >= 0) indices.push(this.transformedColIndex);

  return indices;
}

async confirmValueTransformation() {
  if (
    this.externalTable == null ||
    this.columnBeingTransformed == null ||
    !this.transformedColumnValues.length
  ) {
    // should never happen...
    await alert("Could not confirm value transformation because table or column was null");
    return;
  }
  const col = this.externalTable.columns[this.columnBeingTransformed];
  col.values = [...this.transformedColumnValues];
  col.transformed = true;
  const orig_col = this.externalTable.columns[this.visibleColIndex];
  orig_col.values = col.values;
  orig_col.transformed = true;
  this.transformedColIndex = -1; // make it invisible

  // Reset preview
  this.transformedColumnValues = [];
  this.editPreviewColumnVisible = false;
 

  // Refresh table
  this.buildTableRows();
  console.log("✅ Transformation applied to original column");
}



cancelTransformation() {
  this.transformedColumnValues = [];
  this.transformationPanelVisible = false;
  this.editPreviewColumnVisible = false;
}

deleteColumn(index: number | null) {
  if (index === null || this.externalTable == null) return;

  // Remove the column from the array
  this.externalTable.columns.splice(index, 1);

  // Update metadata
  this.externalTable.totalColumns = this.externalTable.columns.length;

  // Optional: Update totalRows if needed (usually rows remain unchanged)

  // Rebuild the table display
  this.buildTableRows();
}
  /**
   * 
   * @param index Used by the angular code to determine if a column is transformed and
   * thus should be displayed differently
   * @returns true iff column is transformed
   */
  isTransformedColumn(index: number): boolean {
    return !!this.externalTable?.columns[index]?.transformed;
  }

  applyIso8601AgeTransform() {
  if (this.externalTable == null || this.columnBeingTransformed == null) {
    console.error("No column selected or data missing");
    return;
  }

  const colIndex = this.columnBeingTransformed;
  const column = this.externalTable.columns[colIndex];

  const transformed = column.values.map((val, idx) => {
    const iso = this.etl_service.parseAgeToIso8601(val);
    if (!iso) {
      console.warn(`Could not parse age value "${val}" at row ${idx}`);
    }
    return iso ?? val; // fallback to original if parsing fails
  });

  this.transformedColumnValues = transformed;
  this.editPreviewColumnVisible = true;
}
  
}
