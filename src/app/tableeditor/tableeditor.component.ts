import { ChangeDetectorRef, Component, HostListener, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { ConfigService } from '../services/config.service';
import { TemplateBaseComponent } from '../templatebase/templatebase.component';
import { CohortDtoService } from '../services/cohort_dto_service';
import { CohortData } from '../models/cohort_dto';
import { MatDialog } from '@angular/material/dialog';
import { EtlColumnEditComponent } from '../etl_column_edit/etl_column_edit.component';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from "@angular/material/icon";
import { HpoMappingResult } from "../models/hpo_mapping_result";
import { ColumnDto, ColumnTableDto, EtlColumnType } from '../models/etl_dto';
import { EtlSessionService } from '../services/etl_session_service';
import { HpoHeaderComponent } from '../hpoheader/hpoheader.component';
import { ValueMappingComponent } from '../valuemapping/valuemapping.component';
import { firstValueFrom } from 'rxjs';
import { HpoDialogWrapperComponent } from '../hpoautocomplete/hpo-dialog-wrapper.component';
import { NotificationService } from '../services/notification.service';
import { HpoMappingRow, HpoTermDuplet } from '../models/hpo_term_dto';
import { MultiHpoComponent } from '../multihpo/multihpo.component';
import { TextAnnotationDto } from '../models/text_annotation_dto';
import { HpoStatus } from '../models/hpo_term_dto';


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
    templateService: CohortDtoService,
    ngZone: NgZone,
    cdRef: ChangeDetectorRef,
    private dialog: MatDialog,
    private etl_service: EtlSessionService,
    private notificationService: NotificationService
  ) {
    super(templateService, ngZone, cdRef);
  }
  
  INVISIBLE: number = -1; 
  contextMenuColHeader: string | null = null;
  contextMenuColType: string | null = null;
  columnContextMenuVisible = false;
  columnContextMenuX = 0;
  columnContextMenuY = 0;
  editModeActive = false;
  visibleColIndex: number = this.INVISIBLE;
  transformedColIndex: number = this.INVISIBLE;
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

  /** A right click on a cell will open a modal dialog and allow us to change the value, which is stored here */
  editingValue: string = '';
  editModalVisible = false;

  // Which column is being previewed
  previewColumnIndex: number | null = null;
  // Data shown in preview modal
  previewOriginal: string[] = [];
  previewTransformed: string[] = [];
  // Name of the transform for modal header
  previewTransformName: string = "";
  // Pending metadata to apply if user confirms
  pendingHeader: string | null = null;
  pendingColumnType: EtlColumnType | null = null;
  // Modal state
  previewModalVisible: boolean = false;

  transformationMap: { [original: string]: string } = {};
  uniqueValuesToMap: string[] = [];

  /** These are transformations that we can apply to a column while editing. They appear on right click */
  transformOptions = [
    'Trim Whitespace',
    'To Uppercase',
    'To Lowercase',
    'Extract Numbers',
    'Iso8601 Age',
  ];

  transformHandlers: { [key: string]:(value: string | null | undefined) => string } = {
    'Trim Whitespace': (val) => (val ?? '').trim(),
    'To Uppercase': (val) => (val ?? '').toUpperCase(),
    'To Lowercase': (val) => (val ?? '').toLowerCase(),
    'Extract Numbers': (val) => ((val ?? '').match(/\d+/g)?.join(' ') || ''),
    'Iso8601 Age': (val) => this.etl_service.parseAgeToIso8601(val ),
  };

  columnMappingMemory: { [columnHeader: string]: HpoMappingResult } = {};

  override ngOnInit(): void {
    super.ngOnInit();
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
  }

  protected override onCohortDtoLoaded(template: CohortData): void {
    console.log("TableEditorComponent:onTemplateLoaded");
  }

  /** Load an external Excel file, e.g., a Supplementary Table from a publication
   * that describes a cohort of individuals (one per column).
   */
  async loadExcelColumnBased() {
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
        this.notificationService.showError("Could not retrieve external table");
      }
    } catch (error) {
        this.errorMessage = String(error);
        this.notificationService.showError(this.errorMessage);
    }
  }

  /** Load an external Excel file, e.g., a Supplementary Table from a publication
   * that describes a cohort of individuals (one per row).
   */
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
          this.notificationService.showError("Could not retrieve external table");
        }
      } catch (error) {
          this.errorMessage = String(error);
          this.notificationService.showError("Could not retrieve external table");
      }
  }

  /** Our internal representation has objects for each column. However, it
   * is easier to display an HTML table using a row-based architecture. Therefore,
   * this method takes the table data (source of truth) in this.externalData, and transforms
   * it into a matrix of strings.
   */
  async buildTableRows(): Promise<void> {
    if (this.externalTable == null) {
      return;
    }
    if (!this.externalTable?.columns?.length) {
      alert("Could not create table because externalTable had no columns");
      return;
    }
    const headers = this.externalTable.columns.map(col => col.header);
    const types = this.externalTable.columns.map(col => col.columnType);
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
  }

  /**
   * The point of this component is to transform columns one by one into the form
   * required for our curation tool. We display columns that have been already transformed
   * in a green color.
   * @param colIndex 
   * @returns true iff this column was already transformed
   */
  isTransformed(colIndex: number): boolean {
    if (this.externalTable == null) {
      return false;
    }
    return this.externalTable.columns[colIndex].transformed;
  }

  /**
   * TODO document me
   * @param index 
   * @returns 
   */
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

  /** We may not need this actually. */
  sendColumnToBackend(column: ColumnDto): void {
    console.log("TODO SEND TO BACKEND")
  }


  /** This method is called if the user right clicks on the header (first row) */
  onRightClickHeader(event: MouseEvent, colIndex: number): void {
    event.preventDefault();
    this.contextMenuColIndex = colIndex;
    this.contextMenuColHeader = this.externalTable?.columns?.[colIndex]?.header ?? null;
    this.contextMenuColType = this.externalTable?.columns?.[colIndex]?.columnType ?? null;
    this.columnContextMenuX = event.clientX;
    this.columnContextMenuY = event.clientY;
    this.columnContextMenuVisible = true;
  }

  
  /**
   * Show all columns again (after editing a specific column)
   */
  clearColumnFilter(): void {
    this.editModeActive = false;
    this.visibleColIndex = -1;
    this.columnContextMenuVisible = false;
  }

  /**
   * This method is used if we want to transform all occurences of sets of strings (e.g., male, female)
   * into the strings required for our template (e.g., M, F)
   * @param index 
   * @returns 
   */
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

  /**
   * This method will cause just the left-most column (with the individual identifiers)
   * and the column to be edited to be visible. The user clicks on the column header
   * to edit the specific column
   * @param index - index of the column to be edited
   */
  startEditColumn(index: number) {
    if (this.externalTable == null) {
      return;
    }
    this.editModeActive = true;
    this.visibleColIndex = index;
    this.buildTableRows(); // Rebuild the table display
  }

  /* Open an autocomplete dialog to change the header of the column to an HPO term label */
  async hpoAutoForColumnName(colIndex: number) {
    if (this.externalTable == null) {
      return;
    }
    const col = this.externalTable.columns[colIndex];
    const dialogRef = this.dialog.open(HpoDialogWrapperComponent, {
      width: '500px'
    });

    const selectedTerm = await firstValueFrom(dialogRef.afterClosed());
    if (selectedTerm) {
      console.log('User selected HPO term:', selectedTerm);
      const newHeader = `${selectedTerm} [original: ${col.header}]`;
      col.header = newHeader;
      this.buildTableRows();
    } else {
      console.log('User cancelled HPO selection');
    }
  }

  async hpoMultipleForColumnName(colIndex: number){
    if (this.externalTable == null) {
      return;
    }
    const col = this.externalTable.columns[colIndex];
    const colValues: string[] = col.values;
    const hpoAnnotations: TextAnnotationDto[] = await this.configService.mapColumnToHpo(colValues);
    /// Get the HPO hits and then create a string we can use for the module.
    const hpoTerms: HpoTermDuplet[] = hpoAnnotations
      .filter(t => t.termId && t.label)
      .map(t => {return {
        hpoId: t.termId,
        hpoLabel: t.label
      }});
    const dialogRef = this.dialog.open(MultiHpoComponent, {
      width: '1000px',
      data: { terms: hpoTerms, rows: colValues }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.previewColumnIndex = colIndex;
        this.previewOriginal = colValues.map(val => val ?? '');
        console.log("result.hpoMappings", result.hpoMappings);
        this.previewTransformName = "Multiple HPO mappings";
        this.pendingHeader = `${col.header} - transformed`;
        this.pendingColumnType = EtlColumnType.multipleHpoTerm;
        this.previewTransformed = result.hpoMappings.map(
          (row: HpoMappingRow) =>
            row
              .filter(entry => entry.status !== 'na')         // only include observed/excluded
              .map(entry => `${entry.term.hpoLabel} (${entry.status})`) // display label + status
              .join("; ")
        );
        this.showPreview( "multiple HPO transform");
      } else {
        this.notificationService.showError('User cancelled');
      }
    });
  }

/**
 * This function is called upon right click in the editing window when the user indicates
 * to replace values with the correctly formated values, e.g., "Female" => "F"
 */
async confirmValueTransformation() {
  if (
    this.externalTable == null ||
    this.previewColumnIndex == null ||
    !this.previewTransformed.length
  ) {
    this.notificationService.showError("Could not confirm value transformation because table or column was null");
    return;
  }
  console.log("confirmValueTransformation")

  const colIndex = this.previewColumnIndex;
  const col = this.externalTable.columns[colIndex];

  // Apply transformed values
  col.values = [...this.previewTransformed];
  col.transformed = true;

  // Apply pending metadata
  if (this.pendingHeader) {
    col.header = this.pendingHeader;
  }
  if (this.pendingColumnType) {
    col.columnType = this.pendingColumnType;
  }

  // Reset preview state
  this.previewOriginal = [];
  this.previewTransformed = [];
  this.previewModalVisible = false;
  this.pendingHeader = null;
  this.pendingColumnType = null;

  this.buildTableRows();
  this.notificationService.showSuccess(`✅ Transformation applied to ${col.header}`);
}

cancelValueTransformation() {
  // Reset everything staged in preview
  this.previewOriginal = [];
  this.previewTransformed = [];
  this.previewModalVisible = false;
  this.pendingHeader = null;
  this.pendingColumnType = null;
  this.previewColumnIndex = null;
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

  /**
   * Open a modal dialog to allow the user to manually edit the cell that was clicked
   */
  async editCellValueManually() {
    if (this.contextMenuCellValue == null) {
      this.notificationService.showError("Could not edit cell because we could not get context menu cell value.");
      return;
    }
    this.editingValue = this.contextMenuCellValue;
    this.editModalVisible = true;
    this.contextMenuCellVisible = false;
  }

  /**
   * This will close the modal dialog opened by editCellValueManually
   */
  @HostListener('document:click')
  onDocumentClick() {
    this.columnContextMenuVisible = false;
  }

  /**
   * Save the current template data to file
   */
  async saveExternalTemplateJson() {
    this.errorMessage = null;
    if (this.externalTable == null) {
      this.notificationService.showError("Could not save JSON because data table is not initialized");
      return;
    }
    this.configService.saveJsonExternalTemplate(this.externalTable)
  }

  /**
   * Load a template data from file (usually this means we previously 
   * saved an intermediate result and now want to continue work)
   */
  async loadExternalTemplateJson() {
    this.errorMessage = null;
    try {
      const table = await this.configService.loadJsonExternalTemplate();
      if (table == null) {
        this.notificationService.showError("Could not retrieve external template json");
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

  /**
   * Assign one of the column types (which will be key to transforming to phenopacket rows)
   * @param type 
   */
  assignColumnType(type: EtlColumnType) {
    if (this.contextMenuColIndex !== null && this.externalTable) {
      this.externalTable.columns[this.contextMenuColIndex].columnType = type;
      this.contextMenuCellVisible = false;
      this.buildTableRows(); // re-render if needed
    }
  }

  /**
   * This is used to hide all columns except the first and the edit column, 
   * or to show all columns, depending on this.editModeActive
   * @param row 
   * @returns array of indices of columns that should be made visible
   */
  getVisibleColumns(row: string[]): number[] {
    if (!this.editModeActive) {
      return row.map((_, i) => i); // Show all columns normally
    }

    const indices = [0]; // Always show first column

    if (this.visibleColIndex >= 0) indices.push(this.visibleColIndex);
    if (this.transformedColIndex >= 0) indices.push(this.transformedColIndex);

    return indices;
  }

  /** This is shown with the preview transformation window. If we cancel, nothing happens to the original data */
  cancelTransformation() {
    this.transformedColumnValues = [];
    this.transformationPanelVisible = false;
    this.editPreviewColumnVisible = false;
  }

  /**
   * External templates often have columns with no relevant information that we can delete.
   * @param index 
   * @returns 
   */
  deleteColumn(index: number | null) {
    if (index === null || this.externalTable == null) return;
    // Remove the column from the array
    this.externalTable.columns.splice(index, 1);
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

  /**
   * Save a manual edit to a table cell
   */
  async saveManualEdit(): Promise<void> {
    if (this.contextMenuCellCol == null) {
      this.notificationService.showError("Could not save value because contextMenuCellCol was null");
      return;
    }
    if (this.contextMenuCellRow == null) {
      this.notificationService.showError("Could not save value because contextMenuCellRow was null");
      return;
    }
    const col = this.externalTable?.columns?.[this.contextMenuCellCol];
    if (col) {
      const rowIndex = this.contextMenuCellRow - 2;
      if (rowIndex >= 0 && rowIndex < col.values.length) {
        col.values[rowIndex] = this.editingValue;
        this.contextMenuCellValue = this.editingValue;
        this.buildTableRows(); // if your table needs refreshing
      }
    }
    this.editModalVisible = false;
  }

  /**
 * This function is called upon right click in the editing window when the user indicates
 * to replace values with the correctly formated values, e.g., "Female" => "F"
 */
applyValueTransform() {
  if (this.externalTable == null) {
    // should never happen
    this.notificationService.showError("Attempt to apply value transform with externalTable being null");
    return;
  }
  if (this.visibleColIndex == null) {
    this.notificationService.showError("Attempt to apply value transform with columnBeingTransformed being null");
    return;
  } 
  const colIndex = this.visibleColIndex;
  const column = this.externalTable.columns[colIndex];
  const transformedValues = column.values.map(val => this.transformationMap[val.trim()] || val);
  this.externalTable.columns[colIndex].values = [...transformedValues];
  this.transformationPanelVisible = false;
  this.editPreviewColumnVisible = false;
  // rebuild the table
  this.buildTableRows();
}

  applyNamedTransform(colIndex: number | null, transformName: string): void {
    if (colIndex === null || !this.externalTable) return;

    const handler = this.transformHandlers[transformName];
    if (!handler) return;
    const col = this.externalTable.columns[colIndex];
    const originalValues = col.values.map(v => v ?? '');
    const transformedValues = originalValues.map(v => handler(v));
    this.previewColumnIndex = colIndex;
    this.previewOriginal = col.values.map(v => v ?? '');
    this.previewTransformed = transformedValues;
    this.previewColumnIndex = colIndex;
    this.previewOriginal = originalValues;
    this.pendingHeader = col.header;
    this.pendingColumnType = col.columnType;
    this.showPreview(transformName);
    // if user clicks confirm, applyTransformConfirmed is executed
  }

  /** After the user applies a transform to a column, the user sees a model dialog with
   * the results. If all is good, the user presses confirm, which causes this method to
   * run and change the contents of the original column.
   */
  async applyTransformConfirmed(): Promise<void> {
    const previewIdx = this.previewColumnIndex;
    console.log(`applyTransformConfirmed preview ID=${previewIdx}`);
    console.log("original",this.previewOriginal);
     console.log("transformed",this.previewTransformed);
    if (previewIdx == null) {
      this.notificationService.showError("Could not apply transform because index was not initialized");
      return;
    }
    if (!this.externalTable || previewIdx < 0) {
      // should never happen, but...
      this.notificationService.showError("Could not apply transform because external table/preview column was null");
      return;
    } 
    if (this.pendingColumnType == null) {
       this.notificationService.showError("Could not apply transform because column type was not set");
      return;
    }

    const sourceCol = this.externalTable.columns[previewIdx];

    const newColumn: ColumnDto = {
      columnType: this.pendingColumnType,
      transformed: true,
      header: sourceCol.header, 
      values: this.previewTransformed
    };
    console.log("newColumn", newColumn);
    this.externalTable.columns[previewIdx] = newColumn;
    this.transformedColIndex = this.INVISIBLE;
    this.buildTableRows();
    this.resetPreviewModal();

  }

  /**
   * Open a dialog with a preview of the transformed data that the user can accept or cancel
   * Returns true if user accepts.
   * @param colIndex index of the column with the data being transformed
   * @param transformedValues The new (trasnformed) cell contents
   * @param transformName Name of the procedure used to trasnform
   */
  showPreview(transformName: string): void {
    const colIndex = this.previewColumnIndex;
    if (this.previewTransformed == null || this.previewTransformed.length == 0) {
      this.notificationService.showError("Preview Transform column not initialized");
      return;
    }
    if (this.previewOriginal.length != this.previewTransformed.length) {
      const errMsg = `Length mismatch: preview-original: ${this.previewOriginal.length} and preview-transformed ${this.previewTransformed.length}`;
      this.notificationService.showError(errMsg);
      this.previewModalVisible = false;
      return;
    }
    console.log("showPreview",transformName);
    this.previewTransformName = transformName;
    this.previewColumnIndex = colIndex;
    this.previewModalVisible = true;
    this.contextMenuCellVisible = false;
    return;
  }

  /* close the preview modal dialog */
  resetPreviewModal(): void {
    this.previewModalVisible = false;
    this.previewColumnIndex = -1;
    this.editModalVisible = false;
  }

  /** If the original data has separate columns for family and individual id, we
   * merge them to get a single individual identifier.
   */
  async mergeIndividualAndFamilyColumns(): Promise<void> {
    if (this.externalTable == null) {
      return;
    }
    const columns = this.externalTable.columns;
    try {
      const fam_idx = await this.getEtlColumnIndex(EtlColumnType.familyId);
      const individual_idx = await this.getEtlColumnIndex(EtlColumnType.patientId);
      const fam_col = columns[fam_idx];
      const individual_col = columns[individual_idx];
      if (fam_col.values.length !== individual_col.values.length) {
        this.notificationService.showError("familyId and patientId columns have different lengths.");
        return;
      }
      const mergedValues = individual_col.values.map((ind, i) => `${fam_col.values[i] ?? ''} ${ind ?? ''}`);
      const updatedPatientCol: ColumnDto = {
        ...individual_col,
        values: mergedValues,
        transformed: true,
        header: individual_col.header
      };
      columns[individual_idx] = updatedPatientCol;

      // Move updated patientId column to index 0 if needed
      if (individual_idx !== 0) {
        const [col] = columns.splice(individual_idx, 1);
        columns.unshift(col);
      }
    } catch (e) {
      this.notificationService.showError("Could not merge family/id columns: " + String(e));
    }
    this.buildTableRows(); 
  }
  
  /**
   * Extract a specific column index or show an error
   * @param columns  
   * @returns 
   */
 async getEtlColumnIndex(columnType: EtlColumnType): Promise<number> {
  if (!this.externalTable) {
    this.notificationService.showError("Could not apply transform because external table was null");
    throw new Error("Missing table");
  }

  const indices = this.externalTable.columns
    .map((col, index) => ({ col, index }))
    .filter(entry => entry.col.columnType === columnType);

  if (indices.length === 0) {
    throw new Error(`No column with type "${columnType}" found.`);
  }

  if (indices.length > 1) {
    throw new Error(`Multiple columns with type "${columnType}" found.`);
  }

  return indices[0].index;
}

  /** Get a string like Ptosis - HP:0000508 from backend. */
  async identifyHpoFromHeader(header: string): Promise<{ hpoId: string, label: string }> {
    if (this.externalTable == null) {
      throw Error("External table null");
    }
    try {
      let hit = await this.configService.getBestHpoMatch(header);
      if (!hit.includes("HP:")) {
        alert("Could not parse {header}");
        return {"hpoId":"n/a", "label": "n/a"};
      }
      console.log("identifyHpoFromHeader header=", header);
      const [label, hpoId] = hit.split('-').map(part => part.trim());
      console.log("identifyHpoFromHeader returning ", label, hpoId);
      return { hpoId, label};
    } catch(error) {
      console.error("Could not get HPO", error);
    } 
    return {hpoId: '', label: '' };
  }

  /** apply a mapping for a column that has single-HPO term, e.g., +=> observed */
  applyHpoMapping(colIndex: number, mapping: HpoMappingResult): void {
    if (this.externalTable == null) {
      return; // should never happen
    }
    
    const col = this.externalTable.columns[colIndex];
    const transformedValues = col.values.map(val => {
      const mapped = mapping.valueToStateMap[val];
      return mapped !== undefined ? mapped : val; // keep original if no mapping
    });
    // show dialog with transformed data that the user can accept or cancel.
    this.previewColumnIndex = colIndex;
    this.previewTransformed = transformedValues;
    const originalValues = col.values.map(v => v ?? '');
    this.previewOriginal = originalValues;
    this.previewTransformName = "single HPO column";
    this.pendingHeader =  `${mapping.hpoLabel} - ${mapping.hpoId}`;
    this.pendingColumnType = EtlColumnType.singleHpoTerm;
    this.showPreview("single HPO column");
  }



  /** Process a column that refers to a single HPO term  */ 
  async processSingleHpoColumn(colIndex: number | null): Promise<void> {
    if (colIndex == null) {
      alert("Null column index");
      return;
    }
    if (!this.externalTable || colIndex < 0) {
      alert("table not initialized");
      return;
    }
    const column = this.externalTable.columns[colIndex];
    let input = column.header;
    // Some of our column names were transformed, and we retain the original label
    // we extract the label of the HPO term so that the text mining works
    const match = input.match(/^HP:\d+\s*-\s*(.+?)\s*\[original:/);
    input = match ? match[1] : input;
  

    try {
      // 1. Identify HPO term 
      const bestMatch = await this.configService.getBestHpoMatch(input);
      if (! bestMatch.includes("HP:")) {
        alert(`Could not retrieve HPO match for header : '"${bestMatch}"'`);
        return;
      }
       console.log("processSingleHpoColumn input=", input);
      const [hpoId, label] = bestMatch.split('-').map(part => part.trim()); 
      // 2. Extract unique values from the column of the original table (e.g., +, -, ?)
      const uniqueValues = Array.from(new Set(column.values.map(v => v.trim())));
      // 3. Open dialog to map values to observed/excluded/etc.
      const dialogRef = this.dialog.open(ValueMappingComponent, {
          data: {
            header: column.header,
            hpoId,
            hpoLabel: label,
            uniqueValues
          }
        });

        dialogRef.afterClosed().subscribe((mapping: HpoMappingResult | undefined) => {
          if (mapping) {
            this.columnMappingMemory[column.header] = mapping;
            this.applyHpoMapping(colIndex, mapping);
          }
        });
    } catch (error) {
      alert("Could not identify HPO term: " + error);
    }
  }




  async processHpoColumn(colIndex: number | null): Promise<void> {
    if (colIndex == null) {
       alert("Null column index");
      return;
    }
    if (!this.externalTable || colIndex < 0) {
      alert("Invalid column index");
      return;
    }

  const column = this.externalTable.columns[colIndex];

  // Skip if already processed
  if (column.header.includes("HP:")) {
    alert("This column has already been processed.");
    return;
  }

  try {
    // 1. Identify HPO term
    const { hpoId, label } = await this.identifyHpoFromHeader(column.header);

    // 2. Extract unique values (e.g., +, -, ?)
    const uniqueValues = Array.from(new Set(column.values.map(v => v.trim())));

    // 3. Open dialog to map values to observed/excluded/etc.
    const dialogRef = this.dialog.open(HpoHeaderComponent, {
      data: {
        header: column.header,
        hpoId,
        hpoLabel: label,
        uniqueValues
      }
    });

    dialogRef.componentInstance.mappingConfirmed.subscribe((mapping: HpoMappingResult) => {
      this.columnMappingMemory[column.header] = mapping;
      this.applyHpoMapping(colIndex, mapping);
      dialogRef.close();
    });

    dialogRef.componentInstance.cancelled.subscribe(() => dialogRef.close());

  } catch (error) {
    alert("Could not identify HPO term: " + error);
  }
}

  markTransformed(colIndex: number | null) {
    if (colIndex == null) {
      return; // should never happen
    }
    if (this.externalTable == null) {
      return;
    }
    let col = this.externalTable.columns[colIndex];
    col.transformed = true;
    this.buildTableRows();
  }

}

