import { ChangeDetectorRef, Component, HostListener, NgZone, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { ConfigService } from '../services/config.service';
import { TemplateBaseComponent } from '../templatebase/templatebase.component';
import { CohortDtoService } from '../services/cohort_dto_service';
import { CohortData, DiseaseData } from '../models/cohort_dto';
import { MatDialog } from '@angular/material/dialog';
import { EtlColumnEditComponent } from '../etl_column_edit/etl_column_edit.component';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from "@angular/material/icon";
import { HpoMappingResult } from "../models/hpo_mapping_result";
import { ColumnDto, ColumnTableDto, EtlCellStatus, EtlCellValue, EtlColumnHeader, EtlColumnType, EtlDto, fromColumnDto } from '../models/etl_dto';
import { EtlSessionService } from '../services/etl_session_service';
import { HpoHeaderComponent } from '../hpoheader/hpoheader.component';
import { ValueMappingComponent } from '../valuemapping/valuemapping.component';
import { firstValueFrom } from 'rxjs';
import { HpoDialogWrapperComponent } from '../hpoautocomplete/hpo-dialog-wrapper.component';
import { NotificationService } from '../services/notification.service';
import { HpoMappingRow, HpoStatus, HpoTermData, HpoTermDuplet } from '../models/hpo_term_dto';
import { MultiHpoComponent } from '../multihpo/multihpo.component';
import { TextAnnotationDto } from '../models/text_annotation_dto';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DeleteConfirmationDialogComponent } from './delete-confirmation.component';
import { ColumnTypeDialogComponent } from './column-type-dialog.component';
import { removeAllWhitespace, sanitizeString } from '../validators/validators';
import { defaultPmidDto, PmidDto } from '../models/pmid_dto';
import { PubmedComponent } from '../pubmed/pubmed.component';
import { MultipleHpoDialogComponent } from './multihpo-dialog-vis-component';
import { Router } from '@angular/router';
import { AddConstantColumnDialogComponent } from './add-constant-column-dialog.component';
import { VariantDialogService } from '../services/hgvsManualEntryDialogService';
import { SvDialogService } from '../services/svManualEntryDialogService';
import { HgvsVariant, StructuralVariant, VariantDto } from '../models/variant_dto';
import { HpoTwostepComponent } from '../hpotwostep/hpotwostep.component';
import { ConfirmationDialogComponent } from '../confirm/confirmation-dialog.component';
import { SplitColumnDialogComponent } from './split-column.component';
import { EtlCellComponent } from "../etl_cell/etlcell.component";

export const RAW: EtlCellStatus = 'raw' as EtlCellStatus;
export const TRANSFORMED: EtlCellStatus = 'transformed' as EtlCellStatus;
export const ERROR: EtlCellStatus = 'error' as EtlCellStatus;

type ColumnTypeColorMap = { [key in EtlColumnType]: string };
enum TransformType {
  SingleHpoTerm = "Single HPO Term",
  MultipleHpoTerm = "Multiple Hpo Terms",
  OnsetAge = 'Onset Age',
  LastEncounterAge = 'Age at last encounter',
  SexColumn = 'Sex column',
  SplitColumn = "Split column",
  StringSanitize = 'Sanitize (trim/ASCII)',
  RemoveWhitespace = "Remove all whitespace",
  ToUppercase = 'To Uppercase',
  ToLowercase = 'To Lowercase',
  ExtractNumbers = 'Extract Numbers',
  ReplaceUniqeValues = 'Replace Unique Values',
  OnsetAgeAssumeYears = "onsetAgeAssumeYears",
  LastEncounterAgeAssumeYears = "lastEncounterAgeAssumeYears",
  AnnotateVariants="Annotate variants",
  UpdateVariants="Assign keys to annotated variants",
  SetColumnType="Set Column Type ...",
  DeleteColumn="Delete Column",
  DuplicateColumn="Duplicate Column",
  ConstantColumn="Add constant column to right",
  MergeIndividualFamily="Merge family/individual columns",
  ToggleTransformed="Toggle transformed status",
  RawColumnType="raw",
  FamilyIdColumnType="Family ID",
  PatientIdColumnType="Individual ID",
  GeneSymbolColumnType="Gene symbol",
  VariantColumnType="Variant",
  DiseaseColumnType="Disease",
  AgeOfOnsetColumnType="Age of onset",
  AgeAtLastEncounterColumnType="Age at last encounter",
  SexColumnType="Sex",
  DeceasedColumnType="Deceased",
  IgnoreColumnType="Ignore"
}


/**
 * Component for editing external Excel tables (e.g., supplemental files). The external tables are assumed to have lines or columns
 * that represent the attributes of an individual. The logic of the component is that the user transforms the tables one column
 * at a time.
 */
@Component({
  selector: 'app-tableeditor',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatIconModule, FormsModule, MatTooltipModule, ReactiveFormsModule, EtlCellComponent],
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
    private notificationService: NotificationService,
    private fb: FormBuilder,
    private variantDialog: VariantDialogService,
    private svDialog: SvDialogService,
    private router: Router,
  ) {
    super(templateService, ngZone, cdRef);
    this.pmidForm = this.fb.group({
      pmid: [defaultPmidDto()], 
    });
  }
  Object = Object;
  etlDto: EtlDto | null = null;
  displayColumns: ColumnDto[] = [];
  displayHeaders: EtlColumnHeader[] = [];
  displayRows: EtlCellValue[][] = [];

  pmidForm: FormGroup;

  pmid: string | null = null;
  title: string | null = null;
  diseaseData: DiseaseData | null = null;
  /** Strings such as P3Y, Congenital onset, that have been used so far to annotate onsets etc. */
  currentAgeStrings: string[] = [];
  
  INVISIBLE: number = -1; 
  contextMenuColHeader: EtlColumnHeader | null = null;
  contextMenuColType: string | null = null;
  columnContextMenuVisible = false;
  columnContextMenuX: number | null = null;
  columnContextMenuY: number | null = null;
  editModeActive = false;
  visibleColIndex: number = this.INVISIBLE;
  transformedColIndex: number = this.INVISIBLE;
  contextMenuColIndex: number | null = null;
  /* All possible column types */
  etlTypes: EtlColumnType[] = Object.values(EtlColumnType);
  etlTypeKeys = [EtlColumnType.Ignore, EtlColumnType.PatientId, EtlColumnType.FamilyId,
    EtlColumnType.AgeOfOnset, EtlColumnType.AgeAtLastEncounter, EtlColumnType.Variant,
    EtlColumnType.Sex, EtlColumnType.Deceased, EtlColumnType.Raw ]

  errorMessage: string | null = null;
  columnBeingTransformed: number | null = null;
  transformationPanelVisible: boolean = false;
  
  contextMenuCellVisible = false;
  contextMenuCellX = 0;
  contextMenuCellY = 0;
  contextMenuCellRow: number | null = null;
  contextMenuCellCol: number | null = null;
  contextMenuCellValue: string | null = null;
  contextMenuCellType: EtlColumnType | null = null;



  columnTypeColors: ColumnTypeColorMap = {
    [EtlColumnType.Raw]: '#ffffff',
    [EtlColumnType.FamilyId]: '#f0f8ff',
    [EtlColumnType.PatientId]: '#e6ffe6',
    [EtlColumnType.SingleHpoTerm]: '#fff0f5',
    [EtlColumnType.MultipleHpoTerm]: '#ffe4e1',
    [EtlColumnType.GeneSymbol]: '#f5f5dc',
    [EtlColumnType.Variant]: '#f0fff0',
    [EtlColumnType.Disease]: '#fdf5e6',
    [EtlColumnType.AgeOfOnset]: '#e0ffff',
    [EtlColumnType.AgeAtLastEncounter]: '#e0ffff',
    [EtlColumnType.Deceased]: '#f5f5f5',
    [EtlColumnType.Sex]: '#f5f5f5',
    [EtlColumnType.Ignore]: '#d3d3d3',
    [EtlColumnType.HpoTextMining]: '#e0ffff'
  };

  

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
  pendingHeader: EtlColumnHeader | null = null;
  pendingHeaderName: string | null = null;
  pendingColumnType: EtlColumnType | null = null;
  pendingColumnTransformed = false;

  transformationMap: { [original: string]: string } = {};
  uniqueValuesToMap: string[] = [];

  pmidDto: PmidDto = defaultPmidDto();



  columnTypeCategories: TransformType [] = [
    TransformType.RawColumnType,
    TransformType.FamilyIdColumnType,
    TransformType.PatientIdColumnType,
    TransformType.GeneSymbolColumnType,
    TransformType.VariantColumnType,
    TransformType.DiseaseColumnType,
    TransformType.AgeOfOnsetColumnType,
    TransformType.SexColumnType,
    TransformType.DeceasedColumnType,
    TransformType.IgnoreColumnType
  ]
 
  /** These are transformations that we can apply to a column while editing. They appear on right click */
  transformOptions = Object.values(TransformType);

  transformHandlers: { [key in TransformType]: (colIndex: number) => string[] | void } = {
    [TransformType.StringSanitize]: (colIndex) => this.transformColumnElementwise(colIndex, TransformType.StringSanitize),
    [TransformType.ToUppercase]: (colIndex) => this.transformColumnElementwise(colIndex, TransformType.ToUppercase),
    [TransformType.ToLowercase]: (colIndex) => this.transformColumnElementwise(colIndex, TransformType.ToLowercase),
    [TransformType.ExtractNumbers]: (colIndex) => this.transformColumnElementwise(colIndex, TransformType.ExtractNumbers),
    [TransformType.OnsetAge]: (colIndex) => this.transformColumnElementwise(colIndex, TransformType.OnsetAge),
    [TransformType.LastEncounterAge]: (colIndex) => this.transformColumnElementwise(colIndex, TransformType.LastEncounterAge),
    [TransformType.SexColumn]: (colIndex) => this.transformColumnElementwise(colIndex, TransformType.SexColumn),
    [TransformType.SingleHpoTerm]: (colIndex) => { this.applySingleHpoTransform(colIndex); },
    [TransformType.MultipleHpoTerm]: (colIndex: number) => { this.processMultipleHpoColumn(colIndex); },
    [TransformType.ReplaceUniqeValues]: (colIndex: number) => { this.editUniqueValuesInColumn(colIndex); },
    [TransformType.OnsetAgeAssumeYears]: (colIndex) => this.transformColumnElementwise(colIndex, TransformType.OnsetAgeAssumeYears),
    [TransformType.LastEncounterAgeAssumeYears]: (colIndex) => this.transformColumnElementwise(colIndex, TransformType.LastEncounterAgeAssumeYears),
    [TransformType.AnnotateVariants]: (colIndex) => { this.annotateVariants(colIndex); },
    [TransformType.UpdateVariants]: (colIndex) => { this.updateVariants(colIndex); },
    [TransformType.SplitColumn]: (colIndex) => { this.splitColumn(colIndex); },
    [TransformType.SetColumnType]: (colIndex) => { this.setColumnTypeDialog(colIndex); },
    [TransformType.DeleteColumn]: (colIndex) => { this.deleteColumn(colIndex); },
    [TransformType.DuplicateColumn]: (colIndex) => { this.duplicateColumn(colIndex); },
    [TransformType.ConstantColumn]: (colIndex) => { this.addConstantColumn(colIndex); },
    [TransformType.MergeIndividualFamily]: (colIndex) => { this.mergeIndividualAndFamilyColumns(); },
    [TransformType.ToggleTransformed]: (colIndex) => { this.toggleTransformed(colIndex); },
    [TransformType.RawColumnType]: (colIndex: number) => { this.setColumnType(colIndex, EtlColumnType.Raw); },
    [TransformType.FamilyIdColumnType]: (colIndex: number) => { this.setColumnType(colIndex, EtlColumnType.FamilyId); },
    [TransformType.PatientIdColumnType]: (colIndex: number) => { this.setColumnType(colIndex, EtlColumnType.PatientId); },
    [TransformType.GeneSymbolColumnType]: (colIndex: number) => { this.setColumnType(colIndex, EtlColumnType.GeneSymbol); },
    [TransformType.VariantColumnType]: (colIndex: number) => { this.setColumnType(colIndex, EtlColumnType.Variant); },
    [TransformType.DiseaseColumnType]: (colIndex: number) => { this.setColumnType(colIndex, EtlColumnType.Disease); },
    [TransformType.AgeOfOnsetColumnType]: (colIndex: number) => { this.setColumnType(colIndex, EtlColumnType.AgeOfOnset); },
    [TransformType.SexColumnType]: (colIndex: number) => { this.setColumnType(colIndex, EtlColumnType.Sex); },
    [TransformType.DeceasedColumnType]: (colIndex: number) => { this.setColumnType(colIndex, EtlColumnType.Deceased); },
    [TransformType.IgnoreColumnType]: (colIndex: number) => { this.setColumnType(colIndex, EtlColumnType.Ignore); },
    [TransformType.RemoveWhitespace]: (colIndex: number) =>  { this.setColumnType(colIndex, EtlColumnType.Raw); }
  };

 

  override ngOnInit(): void {
    super.ngOnInit();
    this.etl_service.etlDto$.subscribe(dto => { this.etlDto = dto});
    this.pmidForm.valueChanges.subscribe(value => {
      console.log('Form value:', value);
    });
  }

  protected override onCohortDtoLoaded(template: CohortData): void {
    // no-op
  }


  /** Reset if user clicks outside of defined elements. */
  @HostListener('document:click')
  onClickAnywhere(): void {
    this.columnContextMenuVisible = false;
    this.editModalVisible = false;
  }


  override ngOnDestroy(): void {
    super.ngOnDestroy();
  }

  async loadExcelColumnBased() {
    this.errorMessage = null;
    try {
      const table: ColumnTableDto | null = await this.configService.loadExternalExcel();
      if (!table) {
        this.notificationService.showError("Could not retrieve external table");
        return;
      }
      this.etlDto = fromColumnDto(table);
    } catch (error) {
      this.errorMessage = String(error);
      this.notificationService.showError(this.errorMessage);
    }
  }

  async loadExcelRowBased() {
    this.errorMessage = null;
    try {
      const table = await this.configService.loadExternalExcelRowBased();
      if (!table) {
        this.notificationService.showError("Could not retrieve external table");
        return;
      }
      this.etlDto = fromColumnDto(table);
    } catch (error) {
      this.errorMessage = String(error);
      this.notificationService.showError("Could not retrieve external table");
    }
  }


  reRenderTableRows(): void {
    if (!this.etlDto) return;

    const columns = this.etlDto.table.columns;
    const rowCount = Math.max(...columns.map(c => c.values.length));

    this.displayRows = Array.from({ length: rowCount }, (_, i) =>
      columns.map(c => c.values[i] ?? { original: '', current: '', status: RAW })
    );

    this.displayColumns = columns;
    this.displayHeaders = columns.map(c => c.header);
  }

  /**
   * Update a single EtlCellValue.
   * Can set value, status, and error.
   */
  updateCell(
    cell: EtlCellValue,
    newValue: string,
    status: EtlCellStatus = TRANSFORMED,
    error?: string
  ): void {
    cell.current = newValue;
    cell.status = status;
    cell.error = error;
  }

  /**
   * Transform a column and update each cell.
   */
  transformColumn(colIndex: number, transformFn: (val: string) => string, validateFn?: (val: string) => boolean) {
    if (!this.etlDto) return;

    const column = this.etlDto.table.columns[colIndex];

    column.values.forEach(cell => {
      const newValue = transformFn(cell.original);
      if (validateFn && !validateFn(newValue)) {
        this.updateCell(cell, cell.current, ERROR, 'Invalid value');
      } else {
        this.updateCell(cell, newValue, TRANSFORMED);
      }
    });

    column.transformed = true;
  }

  /* Used for manual cell edits (by right click on a cell), which are assumed to be correct (they will be QC'd by backend) */
  onCellEdited(event: { rowIndex: number, colIndex: number, newValue: string }) {
    const cell = this.displayRows[event.rowIndex][event.colIndex];
    this.updateCell(cell, event.newValue, TRANSFORMED);
  }

  /* Call this method to clear right-click context */
  resetRightClick(): void {
    this.contextMenuColIndex = null;
    this.contextMenuColHeader =  null;  
    this.contextMenuColType =  null;
    this.columnContextMenuX = -1;
    this.columnContextMenuY = -1;
    this.columnContextMenuVisible = false;
  }

  /**
 * Adjusts a menu position to ensure it stays within the viewport.
 * @param x Initial X coordinate (usually mouse event clientX)
 * @param y Initial Y coordinate (usually mouse event clientY)
 * @param menuWidth Width of the menu in pixels
 * @param menuHeight Height of the menu in pixels
 * @param padding Minimum distance from viewport edges (default 10px)
 * @returns { x: number; y: number } Adjusted coordinates
 */
  private adjustMenuPosition(
    x: number,
    y: number,
    menuWidth: number,
    menuHeight: number,
    padding: number = 10
  ): { x: number; y: number } {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - padding;
    }
    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - padding;
    }

    x = Math.max(padding, x);
    y = Math.max(padding, y);

    return { x, y };
  }


  /** This method is called if the user right clicks on the header (first row) */
  onRightClickHeader(event: MouseEvent, colIndex: number): void {
    event.preventDefault();
    console.log('right-clicked header index', colIndex);
    this.contextMenuColIndex = colIndex;
    this.contextMenuColHeader = this.displayHeaders[colIndex] ?? null; 
    this.contextMenuColType = this.displayHeaders[colIndex]?.columnType ?? null;
    const menuDims = { width: 350, height: 400 };
    const adjusted = this.adjustMenuPosition(event.clientX, event.clientY, menuDims.width, menuDims.height);
    this.columnContextMenuX = adjusted.x;
    this.columnContextMenuY = adjusted.y;
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
   * Returns the unique, trimmed, non-empty values from a column
   */
  private extractUniqueValues(column: EtlCellValue[]): string[] {
    return Array.from(new Set(column.map(v => v.original.trim()).filter(Boolean)));
  }

  editUniqueValuesInColumn(index: number): void {
    if (!this.etlDto) {
      this.notificationService.showError("No table loaded");
      return;
    }

    const column = this.etlDto.table.columns[index];
    const header = this.displayHeaders[index];

    if (!column || !header) {
      this.notificationService.showError(`Invalid column/header at index ${index}`);
      return;
    }

    const unique = this.extractUniqueValues(column.values);

    this.transformationMap = Object.fromEntries(unique.map(val => [val, val]));

    this.contextMenuColIndex = index;
    this.contextMenuColHeader = header;
    this.contextMenuColType = header.columnType;
    this.uniqueValuesToMap = unique;
    this.transformationPanelVisible = true;
  }

  getUniqueValues(colIndex: number): string[] {
    if (!this.etlDto) return [];
    const column = this.etlDto.table.columns[colIndex];
    if (!column) return [];
    return this.extractUniqueValues(column.values);
  }




  /**
   * This method will cause just the left-most column (with the individual identifiers)
   * and the column to be edited to be visible. The user clicks on the column header
   * to edit the specific column
   * @param index - index of the column to be edited
   */
  startEditColumn(index: number) {
    if (this.etlDto == null) {
      return;
    }
    this.editModeActive = true;
    this.visibleColIndex = index;
    this.reRenderTableRows(); // Rebuild the table display
  }


  /* This function, as well as cancelCellEdit, are used by the preview */
  applyPlannedCellUpdate(cell: EtlCellValue, newValue: string, validationFn?: (val: string) => boolean) {
    if (!validationFn) validationFn = () => true;

    if (!validationFn(newValue)) {
      cell.status = ERROR;
      cell.error = "Invalid value";
      return;
    }

    cell.status = TRANSFORMED;
    cell.error = undefined;
    cell.current = newValue;
  }

  cancelCellEdit(cell: EtlCellValue) {
    cell.current = ""; // or cell.original if you prefer
    cell.status = RAW;
    cell.error = undefined;
  }

  /** Use Variant Validator in the backend to annotate each variant string in the column. Upon successful validation, add the variant key
   * to the ETL DTO. If all entries are validated, mark the column green (transformed). 
   */
  async annotateVariants(colIndex: number | null): Promise<void> {
    const etlDto = this.etlDto;
    if (etlDto == null) {
      return;
    }
    this.notificationService.showError("need to refactor annotateVariants");

  }
  
  updateVariants(colIndex: number | null): string[] {
     this.notificationService.showError("need to refactor updateVariants");
    return [];
  }

    
async applySingleHpoTransform(colIndex: number) {
  if (!this.etlDto) return;
  const column = this.etlDto.table.columns[colIndex];
  const columnTitle = column.header.original || "n/a";

  // Get the best HPO match
  let bestHpoMatch = "";
  try {
    bestHpoMatch = (await this.configService.getBestHpoMatch(columnTitle)) ?? "";
  } catch {
    bestHpoMatch = "";
  }

  // Ask user to confirm/select HPO term
  const selectedTerm: HpoTermDuplet = await firstValueFrom(
    this.dialog.open(HpoDialogWrapperComponent, {
      width: '500px',
      data: { bestMatch: bestHpoMatch, title: columnTitle },
    }).afterClosed()
  );

  if (!selectedTerm) {
    this.notificationService.showError("User cancelled HPO selection");
    return;
  }

  // Update column header metadata
  column.header.columnType = EtlColumnType.SingleHpoTerm;
  column.header.hpoTerms = [selectedTerm];

  // Get unique current values for mapping
  const uniqueValues = Array.from(new Set(column.values.map(v => v.current.trim())));
  const mapping: HpoMappingResult | undefined = await firstValueFrom(
    this.dialog.open(ValueMappingComponent, {
      data: {
        header: column.header.original,
        hpoTerm: selectedTerm,
        hpoLabel: selectedTerm.hpoLabel,
        uniqueValues,
      },
    }).afterClosed()
  );

  // Apply mapping or mark cells as error
  column.values.forEach(cell => {
    if (!mapping) {
      cell.status = ERROR;
      cell.error = "Mapping cancelled";
    } else {
      const newValue = mapping.valueToStateMap[cell.current] ?? cell.current;
      cell.current = newValue;
      cell.status = TRANSFORMED;
      cell.error = undefined;
    }
  });
}


  async processMultipleHpoColumn(colIndex: number): Promise<void> {
    if (!this.etlDto) return;
    const col = this.etlDto.table.columns[colIndex];
    if (!col) return;

    const originalEntries = col.values.map(v => v.original);
    const hpoAnnotations: TextAnnotationDto[] = await this.configService.mapColumnToHpo(originalEntries);

    const hpoTerms: HpoTermDuplet[] = Array.from(
      new Map(
        hpoAnnotations
          .filter(t => t.isFenominalHit && t.termId && t.label)
          .map(t => [t.termId, { hpoId: t.termId, hpoLabel: t.label }])
      ).values()
    );

    const dialogRef = this.dialog.open(MultiHpoComponent, {
      width: '1000px',
      data: { terms: hpoTerms, rows: col.values, title: col.header.original }
    });

    const result = await firstValueFrom(dialogRef.afterClosed());

    // Apply mapping or mark error
    col.values.forEach((cell, i) => {
      if (!result) {
        cell.status = ERROR;
        cell.error = 'User cancelled';
        // Keep current
      } else {
        //const mappingRow = result.hpoMappings[i] || [];
        const mappingRow: { term: HpoTermDuplet; status: HpoStatus }[] = result.hpoMappings[i] || [];
        if (!mappingRow.length) {
          cell.status = ERROR;
          cell.error = "No mapping found";
          return;
        }
        const mappedValue = mappingRow
          .filter(entry => entry.status !== 'na')
          .map(entry => `${entry.term.hpoId}-${entry.status}`)
          .join(";");
        cell.current = mappedValue;
        cell.status = TRANSFORMED;
        cell.error = undefined;
      }
    });

    // Save pending header metadata
    col.header.hpoTerms = result?.allHpoTerms ?? [];
    col.header.columnType = EtlColumnType.MultipleHpoTerm;
  }




  /** This methods sets up some context variables as sets contextMenuCellVisible to true, which opens up a list of options
   * (1) editCellValueManually (2) useValueFromAbove, and (3) openVariantEditor, (4) delete row
   */
  onRightClickCell(event: MouseEvent, rowIndex: number, colIndex: number): void {
    event.preventDefault();
    if (this.etlDto == null) {
      return; 
    }
    const columnTableDto = this.etlDto.table;
    
    if (!columnTableDto.columns[colIndex]) return;
    if (!this.displayHeaders[colIndex]) {
      this.notificationService.showError(`Null header for index ${colIndex}`);
      return;
    }
    const header = this.displayHeaders[colIndex];

    const col = this.etlDto.table.columns[colIndex];
    this.contextMenuCellX = event.clientX;
    this.contextMenuCellY = event.clientY;
    this.contextMenuCellVisible = true;
    this.contextMenuCellRow = rowIndex;
    this.contextMenuCellCol = colIndex;
    const cell = col.values[rowIndex];
    this.contextMenuCellValue = cell ? cell.current : '';
    this.contextMenuCellType = header.columnType;
  }

  deleteRowAtI(etl: EtlDto, i: number): EtlDto {
    const newColumns = etl.table.columns.map(col => ({
      ...col,
      values: [
        ...col.values.slice(0, i),
        ...col.values.slice(i + 1)
      ]
    }));
    return {
      ...etl,
      table: {
        ...etl.table,
        columns: newColumns
      }
    };
  }

  async deleteRow() {
    const etlDto = this.etlDto;
    if (!etlDto) return;

    const rowIndex = this.contextMenuCellRow;
    if (rowIndex == null) {
      this.notificationService.showError("Could not delete row because we could not get context menu cell row index.");
      return;
    }

    const firstCell = etlDto.table.columns[0].values[rowIndex]?.current ?? '';

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: { message: `Delete row ${rowIndex}`, subMessage: firstCell }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.etlDto = this.deleteRowAtI(etlDto, rowIndex);
        // this.reRenderTableRows(); // maybe not needed with signals
      } else {
        this.notificationService.showError("Did not delete row");
      }
    });
  }



  /**
   * Open a modal dialog to allow the user to manually edit the cell that was clicked. The function
   * will cause a modal to appear that will activate the function saveManualEdit to perform the save.
   */
  async editCellValueManually() {
    const cell = this.contextMenuCellValue;
    const colIndex = this.contextMenuCellCol;
    if (!cell || colIndex == null) {
      this.notificationService.showError("Could not edit cell: missing context.");
      return;
    }
    let col = this.etlDto?.table.columns[colIndex];
    if (! col ) {
      this.notificationService.showError("Could not edit cell because we could not get context menu cell column.");
      return;
    }

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
    const etlDto = this.etlDto;
    if (etlDto == null) {
      this.notificationService.showError("Could not save JSON because data table is not initialized");
      return;
    }
    if (etlDto.disease == null) {
      this.notificationService.showError("Could not save JSON because disease data is not initialized");
      return;
    }
    if (etlDto.disease.geneTranscriptList.length == 0) {
      this.notificationService.showError("Empty geneTranscriptList");
      return;
    }
    if (etlDto.disease.geneTranscriptList.length > 1) {
      this.notificationService.showError("Unexpected length of geneTranscriptList > 1");
      return;
    }
    const gt = etlDto.disease.geneTranscriptList[0];
    if (gt == null) {
      this.notificationService.showError("geneTranscript. was null");
      return;
    }
    const validationError = this.etl_service.validateEtlDto(etlDto);
    if (validationError) {
      this.notificationService.showError(`Validation failed: ${validationError}`);
      return;
    }
    this.configService.saveJsonExternalTemplate(etlDto)
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
        this.etlDto = table;
        this.reRenderTableRows();
      });
      
    } catch(error) {
      this.errorMessage = String(error);
    }
  }


  /**
   * Determine which table columns should be visible.
   * - In normal mode: show all columns (or filtered by selected top-level HPO).
   * - In edit mode: show only the first column and the edit/transformed columns.
   * 
   * @returns array of column indices to display
   */
  getVisibleColumns(): number[] {
    if (this.etlDto == null) {
      this.notificationService.showError("Attempt to focus on columns with null ETL table");
      return [];
    }
    if (!this.editModeActive) {
      const n_columns = this.etlDto.table.columns.length;
      return Array.from({length: n_columns}, (_, i) => i); // Show all columns normally
    }

    const indices = [0]; // Always show first column

    if (this.visibleColIndex >= 0) indices.push(this.visibleColIndex);
    if (this.transformedColIndex >= 0) indices.push(this.transformedColIndex);

    return indices;
  }


  /**
   * External templates often have columns with no relevant information that we can delete.
   * @param index 
   * @returns 
   */
  deleteColumn(index: number | null) {
    if (index === null || this.etlDto == null) return;
    const uniqueValues: string[] = this.getUniqueValues(index);
    const columnName = this.etlDto.table.columns[index].header.original || `Column ${index}`;
    const dialogRef = this.dialog.open(DeleteConfirmationDialogComponent, {
        width: '500px',
        data: {
          columnName: columnName,
          uniqueValues: uniqueValues
        }
      });
      dialogRef.afterClosed().subscribe(result => {
        if (result === true && this.etlDto != null) {
          // User confirmed deletion
          this.etlDto.table.columns.splice(index, 1);
          this.reRenderTableRows();
        }
        // If result is false or undefined, do nothing (cancelled)
      });
  }

  duplicateColumn(index: number | null) {
    const etlDto = this.etlDto;
    if (!etlDto || index === null) return;

    const originalColumn = etlDto.table.columns[index];
    if (!originalColumn) return;

    console.log("Duplicating column", index, "with contents", originalColumn.values);

    // Deep clone the column
    const clonedColumn: ColumnDto = {
      ...JSON.parse(JSON.stringify(originalColumn)),
      id: crypto.randomUUID(),
      header: {
        ...originalColumn.header,
        original: `B. ${originalColumn.header.original}`
      }
    };

    // Create a new columns array with the cloned column inserted
    const newColumns = [
      ...etlDto.table.columns.slice(0, index + 1),
      clonedColumn,
      ...etlDto.table.columns.slice(index + 1)
    ];

    // Immutable update to trigger Angular change detection
    this.etlDto = {
      ...etlDto,
      table: {
        ...etlDto.table,
        columns: newColumns
      }
    };

    this.reRenderTableRows();
  }


/** Split a column into two according to a token such as "/" or ":" */
  splitColumn(index: number | null) {
    const etlDto = this.etlDto;
    if (!etlDto || index === null) return;

    const columns = etlDto.table.columns;
    const originalColumn = columns[index];
    if (!originalColumn) return;

    const dialogRef = this.dialog.open(SplitColumnDialogComponent, {
      width: '400px',
      data: { separator: '/' }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return; // user cancelled

      let separator = String(result.separator ?? '').trim();
      if (!separator) separator = " "; // default split

      let columnAPosition = Number(result.sexPosition);
      let columnBPosition = Number(result.agePosition);
      if (![0, 1].includes(columnAPosition)) columnAPosition = 0;
      if (![0, 1].includes(columnBPosition)) columnBPosition = 1;

      // deep copy original column
      const columnA: ColumnDto = JSON.parse(JSON.stringify(originalColumn));
      const columnB: ColumnDto = JSON.parse(JSON.stringify(originalColumn));
      columnA.id = crypto.randomUUID();
      columnB.id = crypto.randomUUID();

      columnA.header = { ...columnA.header, original: `Sex (${originalColumn.header.original})` };
      columnB.header = { ...columnB.header, original: `Age (${originalColumn.header.original})` };

      // convert split strings into EtlCellValue objects
      columnA.values = originalColumn.values.map(cell => {
        const text = cell?.original ?? '';
        const part = (text.split(separator)[columnAPosition]?.trim() || 'U');
        return { ...cell, original: part, current: part, status: RAW, error: undefined };
      });

      columnB.values = originalColumn.values.map(cell => {
        const text = cell?.original ?? '';
        const part = (text.split(separator)[columnBPosition]?.trim() || 'na');
        return { ...cell, original: part, current: part, status:RAW, error: undefined };
      });

      // update columns array
      columns.splice(index + 1, 0, columnB);
      columns[index] = columnA;

      this.etlDto = {
        ...etlDto,
        table: {
          ...etlDto.table,
          columns: [...columns],
        }
      };

      this.reRenderTableRows();
    });
  }


  /**
   * 
   * @param index Used by the angular code to determine if a column is transformed and
   * thus should be displayed differently
   * @returns true iff column is transformed
   */
  isTransformedColumn(index: number): boolean {
    return !!this.etlDto?.table.columns[index]?.transformed;
  }



  hasValueAbove(): boolean {
    return (
      this.contextMenuCellRow !== null &&
      this.contextMenuCellRow > 0 &&
      this.contextMenuCellCol !== null &&
      this.displayColumns[this.contextMenuCellCol].values[this.contextMenuCellRow - 1] !== undefined
    );
  }


  /* Copy the value from the cell right above this one */
  useValueFromAbove() {
    if (this.etlDto == null) return;
    const columnTableDto = this.etlDto.table;
    if (!this.hasValueAbove()) return;
    if (this.contextMenuCellCol == null ) {
      this.notificationService.showError("context menu column is null");
      return;
    }
    if (this.contextMenuCellRow == null ) {
      this.notificationService.showError("context menu row is null");
      return;
    }
    const aboveValue =
      this.displayColumns[this.contextMenuCellCol].values[this.contextMenuCellRow - 1];
    const col = columnTableDto.columns[this.contextMenuCellCol];
    if (col) {
      const rowIndex = this.contextMenuCellRow;
      if (rowIndex >= 0 && rowIndex < col.values.length) {
        col.values[rowIndex] = aboveValue;
        this.contextMenuCellValue = this.editingValue;
        this.reRenderTableRows();
      }
    }
    this.editModalVisible = false;
  }


  /**
   * Save a manual edit to a table cell
   */
  async saveManualEdit(): Promise<void> {
    if (this.etlDto == null) return;
    const colIndex = this.contextMenuCellCol;
    const rowIndex = this.contextMenuCellRow;
    if (colIndex == null || rowIndex == null) {
      this.notificationService.showError("Could not save value: missing row or column index");
      return;
    }
    const col = this.etlDto.table.columns[colIndex];
    if (col) {
      const oldCell = col.values[rowIndex];
      if (!oldCell) return;

      // Update the cell safely
      const newCell: EtlCellValue = {
        ...oldCell,
        original: oldCell.original,      // keep original
        current: this.editingValue.trim(),
        status: TRANSFORMED,
        error: undefined,
      };

      col.values[rowIndex] = newCell;
      this.contextMenuCellValue = newCell.current; // update context menu to reflect new cell
      this.reRenderTableRows();
      this.editModalVisible = false;
    }
  }


  // Organized transform structure
transformCategories = {
  basic: {
    label: 'Basic Transforms',
    transforms: [
      TransformType.StringSanitize,
      TransformType.RemoveWhitespace,
      TransformType.ToUppercase,
      TransformType.ToLowercase,
      TransformType.ExtractNumbers,
      TransformType.ReplaceUniqeValues,
      TransformType.SexColumn
    ]
  },
  age: {
    label: 'Age Transforms',
    transforms: [
      TransformType.OnsetAge,
      TransformType.OnsetAgeAssumeYears,
      TransformType.LastEncounterAge,
      TransformType.LastEncounterAgeAssumeYears
    ]
  },
  hpo: {
    label: 'HPO Transforms',
    transforms: [
      TransformType.SingleHpoTerm,
      TransformType.MultipleHpoTerm
    ]
  },
  alleles: {
    label: "Alleles/variants",
    transforms: [
      TransformType.AnnotateVariants,
      TransformType.UpdateVariants
    ]
  },
  columnOps: {
    label: "Column operations",
    transforms: [
        TransformType.SetColumnType,
        TransformType.DeleteColumn,
        TransformType.DuplicateColumn,
        TransformType.ConstantColumn,
        TransformType.MergeIndividualFamily,
        TransformType.ToggleTransformed,
        TransformType.SplitColumn,
    ]
  }
};

// Helper method to get transform display name
getTransformDisplayName(transform: TransformType): string {
  const displayNames: { [key in TransformType]: string } = {
    [TransformType.StringSanitize]: 'Sanitize (trim/ASCII)',
    [TransformType.RemoveWhitespace]: "Remove all whitespace",
    [TransformType.ToUppercase]: 'To Uppercase',
    [TransformType.ToLowercase]: 'To Lowercase',
    [TransformType.ExtractNumbers]: 'Extract Numbers',
    [TransformType.ReplaceUniqeValues]: 'Replace Unique Values',
    [TransformType.OnsetAge]: 'Onset Age',
    [TransformType.OnsetAgeAssumeYears]: 'Onset Age (assume years)',
    [TransformType.LastEncounterAge]: 'Last Encounter Age',
    [TransformType.LastEncounterAgeAssumeYears]: 'Last Encounter Age (assume years)',
    [TransformType.SexColumn]: 'Sex Column',
    [TransformType.SplitColumn]: 'Split Column',
    [TransformType.SingleHpoTerm]: 'Single HPO Term',
    [TransformType.MultipleHpoTerm]: 'Multiple HPO Terms',
    [TransformType.AnnotateVariants]: 'Annotate variants',
    [TransformType.UpdateVariants]: 'Update alleles to variant keys if possible',
    [TransformType.SetColumnType]: 'Set column type',
    [TransformType.DeleteColumn]: 'Delete column',
    [TransformType.DuplicateColumn]: 'Duplicate column',
    [TransformType.ConstantColumn]: 'Add constant column',
    [TransformType.MergeIndividualFamily]: 'Merge individual and family columns',
    [TransformType.ToggleTransformed]: 'Toggle transformed status',
    [TransformType.RawColumnType]: 'Raw',
    [TransformType.FamilyIdColumnType]: 'Family ID',
    [TransformType.PatientIdColumnType]: 'Individual ID',
    [TransformType.GeneSymbolColumnType]: 'Gene symbol',
    [TransformType.VariantColumnType]: 'Variant',
    [TransformType.DiseaseColumnType]: 'Disease',
    [TransformType.AgeOfOnsetColumnType]: 'Age of onset',
    [TransformType.SexColumnType]: 'Sex',
    [TransformType.DeceasedColumnType]: 'Deceased',
    [TransformType.IgnoreColumnType]: 'Ignore'
  };
  return displayNames[transform] || transform;
}

/** Transform a single column in-place using signals */
transformColumnElementwise(colIndex: number, transform: TransformType) {
  if (!this.etlDto) {
    this.notificationService.showError("Attempt to transform column with null ETL DTO");
    return;
  }
  const col = this.etlDto.table.columns[colIndex];
  if (!col || !col.values) return;

  col.values.forEach(cell => {
    const original = cell.original ?? '';

    let transformed: string;
    switch (transform) {
      case TransformType.StringSanitize:
        transformed = sanitizeString(original);
        break;
      case TransformType.RemoveWhitespace:
        transformed = removeAllWhitespace(original);
        break;
      case TransformType.ToUppercase:
        transformed = original.toUpperCase();
        break;
      case TransformType.ToLowercase:
        transformed = original.toLowerCase();
        break;
      case TransformType.ExtractNumbers:
        transformed = original.match(/\d+/g)?.join(' ') || '';
        break;
      case TransformType.OnsetAge:
      case TransformType.LastEncounterAge:
        transformed = this.etl_service.parseAgeToIso8601(original);
        break;
      case TransformType.OnsetAgeAssumeYears:
      case TransformType.LastEncounterAgeAssumeYears:
        transformed = this.etl_service.parseDecimalYearsToIso8601(original);
        break;
      case TransformType.SexColumn:
        transformed = this.etl_service.parseSexColumn(original);
        break;
      default:
        transformed = original;
    }

    cell.current = transformed;
    cell.status = TRANSFORMED;
    cell.error = undefined;
  });
}

async applyNamedTransform(colIndex: number | null, transform: TransformType) {
  if (colIndex == null || !this.etlDto) return;
  const col = this.etlDto.table.columns[colIndex];

  // Interactive / structural transforms (UNCHANGED)
  switch (transform) {
    case TransformType.SingleHpoTerm:
      await this.applySingleHpoTransform(colIndex);
      return;

    case TransformType.MultipleHpoTerm:
      await this.processMultipleHpoColumn(colIndex);
      return;

    case TransformType.DeleteColumn:
      this.deleteColumn(colIndex);
      return;

    case TransformType.SplitColumn:
      this.splitColumn(colIndex);
      return;

    // ... keep the rest
  }

  // Element-wise transforms (NEW path)
  this.applyElementwiseTransform(colIndex, transform);
}

  applyElementwiseTransform(colIndex: number, transform: TransformType) {
  if (!this.etlDto) return;
  const col = this.etlDto.table.columns[colIndex];

  col.values.forEach(cell => {
    try {
      const input = cell.original ?? '';
      let output = input;

      switch (transform) {
        case TransformType.StringSanitize:
          output = sanitizeString(input);
          break;
        case TransformType.RemoveWhitespace:
          output = removeAllWhitespace(input);
          break;
        case TransformType.ToUppercase:
          output = input.toUpperCase();
          break;
        case TransformType.ToLowercase:
          output = input.toLowerCase();
          break;
        case TransformType.OnsetAge:
          output = this.etl_service.parseAgeToIso8601(input);
          break;
        case TransformType.SexColumn:
          output = this.etl_service.parseSexColumn(input);
          break;
      }

      cell.current = output;
      cell.status = TRANSFORMED;
      cell.error = undefined;

    } catch (e) {
      cell.status = ERROR;
      cell.error = String(e);
    }
  });

  col.transformed = true;
}

async mergeIndividualAndFamilyColumns(): Promise<void> {
  if (!this.etlDto) return;

  try {
    const columns = this.etlDto.table.columns;
    const famIdx = await this.getEtlColumnIndex(EtlColumnType.FamilyId);
    const indIdx = await this.getEtlColumnIndex(EtlColumnType.PatientId);

    const famCol = columns[famIdx];
    const indCol = columns[indIdx];

    if (famCol.values.length !== indCol.values.length) {
      this.notificationService.showError(
        "Family and patient columns have different lengths"
      );
      return;
    }

    indCol.values.forEach((cell, i) => {
      const fam = famCol.values[i]?.original ?? '';
      const ind = cell.original ?? '';
      cell.current = `${fam} ${ind}`.trim();
      cell.status = TRANSFORMED;
      cell.error = undefined;
    });

    indCol.transformed = true;
    indCol.header.columnType = EtlColumnType.PatientId;

    // Move to first column if needed
    if (indIdx !== 0) {
      const [col] = columns.splice(indIdx, 1);
      columns.unshift(col);
    }

  } catch (e) {
    this.notificationService.showError(
      "Could not merge family/id columns: " + String(e)
    );
  }
}

  /**
   * Extract a specific column index for a column type that we expect to exist exactly once
   * @param columns  
   * @returns 
   */
  async getEtlColumnIndex(columnType: EtlColumnType): Promise<number> {
    if (!this.etlDto) {
      this.notificationService.showError("Could not apply transform because external table was null");
      throw new Error("Missing table");
    }

    const indices = this.etlDto.table.columns
      .map((col, index) => ({ col, index }))
      .filter(entry => entry.col.header.columnType === columnType);

    if (indices.length === 0) {
      throw new Error(`No column with type "${columnType}" found.`);
    }

    if (indices.length > 1) {
      throw new Error(`Multiple columns with type "${columnType}" found.`);
    }

    return indices[0].index;
  }

  /** Apply a mapping for a column with a single HPO term */
  applyHpoMapping(colIndex: number, mapping: HpoMappingResult): void {
    if (!this.etlDto) {
      this.notificationService.showError(
        "Attempting to apply HPO mapping with null ETL table"
      );
      return;
    }
    const col = this.etlDto.table.columns[colIndex];
    col.values.forEach(cell => {
      const key = (cell.original ?? '').trim();
      const mapped = mapping.valueToStateMap[key];

      if (mapped === undefined) {
        // No mapping → error, keep original
        cell.current = cell.original ?? '';
        cell.status = ERROR;
        cell.error = `No mapping for value "${key}"`;
      } else {
        cell.current = mapped;
        cell.status = TRANSFORMED;
        cell.error = undefined;
      }
    });

    // Update column metadata
    col.header.columnType = EtlColumnType.SingleHpoTerm;
    col.header.current = `${mapping.hpoLabel} - ${mapping.hpoId}`;
    col.transformed = true;
  }

  /** parse a string like Strabismus[HP:0000486;original: Strabismus] from the single HPO term header */
  parseHpoString(input: string): HpoTermDuplet | null {
    const match = input.match(/^([^\[]+)\[([^\];]+);.*\]$/);
    if (!match) return null;

    const label = match[1].trim();    // before the [
    const hpoId = match[2].trim();    // before the ;
    
    return { hpoLabel: label, hpoId: hpoId };
  }

  /** Retrieve the single HPO term associated with a column header */
  getSingleHpoTerm(header: EtlColumnHeader): HpoTermDuplet {
    if (header.columnType !== EtlColumnType.SingleHpoTerm) {
      throw new Error("Header is not a single HPO term column");
    }
    if (!header.hpoTerms || header.hpoTerms.length === 0) {
      throw new Error("No HPO term found in header metadata");
    }
    return header.hpoTerms[0];
  }

  async processHpoColumn(colIndex: number | null): Promise<void> {
    if (colIndex == null || !this.etlDto || colIndex < 0) {
      this.notificationService.showError("Invalid column index");
      return;
    }
    const column = this.etlDto.table.columns[colIndex];
    let hpoTerm: HpoTermDuplet;
    try {
      hpoTerm = this.getSingleHpoTerm(column.header);
    } catch (e) {
      this.notificationService.showError(String(e));
      return;
    }
    // Unique values from ORIGINAL data
    const uniqueValues = Array.from(
      new Set(column.values.map(v => v.original.trim()).filter(Boolean))
    );
    const dialogRef = this.dialog.open(HpoHeaderComponent, {
      data: {
        header: column.header.original,
        hpoId: hpoTerm.hpoId,
        hpoLabel: hpoTerm.hpoLabel,
        uniqueValues,
      }
    });

    const mapping: HpoMappingResult | undefined = await firstValueFrom(dialogRef.afterClosed());

    if (!mapping) {
      column.values.forEach(cell => {
        cell.status = ERROR;
        cell.error = "HPO mapping cancelled";
        cell.current = cell.original;
      });
      return;
    }

    column.values.forEach(cell => {
      const mapped = mapping.valueToStateMap[cell.original.trim()];
      if (mapped === undefined) {
        cell.status = ERROR;
        cell.error = `No HPO mapping for value: ${cell.original}`;
        cell.current = cell.original;
      } else {
        cell.current = mapped;
        cell.status = TRANSFORMED;
        cell.error = undefined;
      }
    });

    // Column metadata
    column.header.current = `${hpoTerm.hpoLabel} (${hpoTerm.hpoId})`;
    column.transformed = true;
  }

  /** TODO -- REMOVE/REFACOTR*/
  toggleTransformed(colIndex: number | null): void{
   this.resetColumnToRaw(colIndex);
  }
  /** Reset column to RAW and trigger cell signals if needed */
  resetColumnToRaw(colIndex: number | null) {
    if (colIndex == null || !this.etlDto) return;
    const column = this.etlDto.table.columns[colIndex];
    column.values.forEach(cell => {
      cell.current = '';
      cell.status = RAW;
      cell.error = undefined;
    });
    column.transformed = false;
    column.header.columnType = EtlColumnType.Raw;
  }



  getColumnClass(colIndex: number): string {
    if (this.isTransformedColumn(colIndex)) {
      return 'transformed-column';
    } else if (colIndex === this.visibleColIndex) {
      return 'visible-column';
    } else {
      return 'normal-column';
    }
  }

  /* The column types (e.g., individual, HPO,...) have different colors. Default is white. */
  getColumnColor(type: EtlColumnType): string {
    return this.columnTypeColors[type] ?? '#ffffff'; // default white
  }

  /** Allows the user to manually set the column type */
  async setColumnType(colIndex: number | null, coltype: string) {
    const etlDto = this.etlDto;
    if (etlDto == null) {
      return;
    }
    if (colIndex === null || colIndex === undefined) {
      this.notificationService.showError(`Column index was null, attempt to set column to ${coltype}`);
      return;
    }
    if (this.etlTypeKeys.includes(coltype as EtlColumnType)) {
      const enumValue = Object.entries(EtlColumnType)
        .find(([key]) => key.toLowerCase() === coltype.toLowerCase())
        ?.[1];
      if (! enumValue) {
        this.notificationService.showError(`Could not find column type ${coltype}`);
        return;
      }
      etlDto.table.columns[colIndex].header.columnType = enumValue;
      this.reRenderTableRows();
    } else {
      this.notificationService.showError(`Could not find column type ${coltype}`);
      console.log("available types:", this.etlTypeKeys);
    }
  }

  async setColumnTypeDialog(colIndex: number) {
    console.log("setColumnTypeDialog coli=", colIndex);
    const etlDto = this.etlDto;
    if (etlDto == null) {
      return;
    }
    const currentType = etlDto.table.columns[colIndex].header.columnType;
    const dialogRef = this.dialog.open(ColumnTypeDialogComponent, {
      width: '400px',
      data: {
        etlTypes: this.etlTypes,      
        currentType
      }
    });
    const selectedType = await firstValueFrom(
      dialogRef.afterClosed()
    );
    if (selectedType) {
      etlDto.table.columns[colIndex].header.columnType = selectedType;
      this.contextMenuCellVisible = false;
      this.reRenderTableRows();
    }
  }

  importCohortDiseaseData() {
    const cohort = this.cohortService.getCohortData();
    if (cohort == null) {
      this.notificationService.showError("Attempt to import DiseaseData from cohort but cohort was null");
      return;
    }
    if (cohort.cohortType != 'mendelian' ) {
      this.notificationService.showError(`External ETL only available for mendelian but you tried ${cohort.cohortType}`);
      return;
    }
    if (cohort.diseaseList.length != 1) {
       this.notificationService.showError(`External ETL only available for mendelian but you had ${cohort.diseaseList.length} DiseaseData objects`);
      return;
    }
    if (this.etlDto == null) {
       this.notificationService.showError(`External ETL was null`);
      return;
    }
    const diseaseData = cohort.diseaseList[0];
    this.etlDto.disease = diseaseData;
    this.notificationService.showSuccess("Imported cohort data");
  }

  /** Indexing for rows in template forloops. row identity is its index */
  trackRow(index: number, row: any): number {
    return index; 
  }

 
  /** Add the PMID to the ETL DTO; open a modal dialog with our PMID widget */
  openPubmedDialog() {
    const dialogRef = this.dialog.open(PubmedComponent, {
      width: '600px',
      data: { pmidDto: null } // optional initial data
    });

    dialogRef.afterClosed().subscribe((result: PmidDto | null) => {
      if (result && this.etlDto) {

        console.log('User chose', result);
        this.pmidDto = result;
        this.etlDto.pmid = this.pmidDto.pmid;
        this.etlDto.title = this.pmidDto.title;

      } else {
        console.log('User cancelled');
      }
    });
  }
/** Add the data from the external data to the current CohortData object. If there is no
   * current CohortData object, then initialize it. If there is an error in the ETL data, do nothing
   * except for showing the error.
   */
  async addToCohortData() {
    const etl_dto = this.etlDto;
    if (etl_dto == null) {
      this.notificationService.showError("Could not create CohortData because etlDto was not initialized");
      return;
    }
    
    try {
      const cohort_dto_new = await this.configService.transformToCohortData(etl_dto);
      if (this.cohortService.currentCohortContainsData()) {
        const cohort_previous = this.cohortService.getCohortData();
        if (cohort_previous === null) {
          this.notificationService.showError("Cohort data not retrieved");
          return;
        }
        const merged_cohort = await this.configService.mergeCohortData(cohort_previous, cohort_dto_new);
        this.cohortService.setCohortData(merged_cohort);
        this.router.navigate(['/pttemplate']);
      } else {
        console.log("Setting to new cohort: ", cohort_dto_new);
        this.cohortService.setCohortData(cohort_dto_new);
        this.router.navigate(['/pttemplate']);
      }
    } catch (err: any) {
      console.error("Error creating CohortData:", err);
      this.notificationService.showError(
        `Could not create CohortData: ${err?.message ?? err}`
      );
    }
  }

  /** Add a new column with a constant value in each cell */
  async addConstantColumn(index: number | null): Promise<string[]> {
    if (!this.etlDto) {
      this.notificationService.showError("Cannot add column - no table loaded");
      return [];
    }
    if (index === null) {
      this.notificationService.showError("Cannot add column - no index");
      return [];
    }

    const dialogRef = this.dialog.open(AddConstantColumnDialogComponent, {
      width: '400px',
      data: { columnName: '', constantValue: '' }
    });

    const result = await firstValueFrom(dialogRef.afterClosed());

    if (!result || !result.columnName?.trim()) {
      this.notificationService.showError("Constant column creation cancelled or invalid");
      return [];
    }

    const { columnName, constantValue } = result;
    const rowCount = Math.max(...this.etlDto.table.columns.map(col => col.values.length));

    // Preview values
    const newValues = Array(rowCount).fill(constantValue);
    const header = {
      original: columnName.trim(),
      current: columnName.trim(),
      columnType: EtlColumnType.Raw,
    };
    const column: ColumnDto = {
      id: crypto.randomUUID(),
      transformed: false,
      header: header,
      values: newValues
    };
    this.etlDto.table.columns.splice(index + 1, 0, column);
    this.reRenderTableRows();

    return [];
  }



  async openHgvsEditor(): Promise<void> {
    const etlDto = this.etlDto;
    if (! etlDto) return; 
    const colIndex = this.contextMenuCellCol;
    if (colIndex === null) {
      this.notificationService.showError("context menu column is null");
      return;
    }
    const rowIndex = this.contextMenuCellRow;
    if (rowIndex == null) {
      return;
    }
    try{
      const hgvs: HgvsVariant | null = await this.variantDialog.openVariantDialog();
      
      if (hgvs) {
        const vkey = hgvs.variantKey;
        if (! vkey) {
          this.notificationService.showError(`Could not get key from HGVS object ${hgvs}`);
          return;
        }
        etlDto.hgvsVariants[vkey] = hgvs;
        let col = etlDto.table.columns[colIndex];
        col.values[rowIndex].current = vkey;
        this.reRenderTableRows();
      }
    } catch (error) {
      const errMsg = String(error);
      this.notificationService.showError(errMsg);
    }
  }


  async openSvEditor(): Promise<void> {
    const etlDto = this.etlDto;
    if (! etlDto) return; 
    const colIndex = this.contextMenuCellCol;
    if (colIndex === null) {
      this.notificationService.showError("context menu column is null");
      return;
    }
    const rowIndex = this.contextMenuCellRow;
    if (rowIndex == null) {
      return;
    }
    const cell_contents = etlDto.table.columns[colIndex].values[rowIndex];
    const diseaseData = etlDto.disease;
    if (diseaseData == null) {
      this.notificationService.showError("Disease data not initialized");
      return;
    }
    if (diseaseData.geneTranscriptList.length != 1) {
      this.notificationService.showError("Currently this module requires a single gene/transcript object");
      return;
    }
    const gt = diseaseData.geneTranscriptList[0];
    const chr: string = this.cohortService.getChromosome();
    try{
      const sv: StructuralVariant | null = await this.svDialog.openSvDialog(gt, cell_contents.original, chr);
      if (sv) {
        const vkey = sv.variantKey;
        if (! vkey) {
          this.notificationService.showError(`Could not get key from Structural Variant object ${sv}`);
          return;
        }
        etlDto.structuralVariants[vkey] = sv;
        let col = etlDto.table.columns[colIndex];
        col.values[rowIndex].current = vkey;
        this.reRenderTableRows();
      }
    } catch (error) {
      const errMsg = String(error);
      this.notificationService.showError(errMsg);
    }
  }

  isHpoTextMiningColumn(colIndex: number): boolean {
    if (this.etlDto === null) {
      return false;
    }
    const column = this.etlDto.table.columns[colIndex];
    if (! column ) {
      return false;
    }
    return column.header.columnType === EtlColumnType.HpoTextMining;
  }

  getHpoTermCount(colIndex: number, rowIndex: number): number {
    const cellData: HpoTermData[] = this.getHpoCellData(colIndex, rowIndex);
    return cellData?.length ?? 0;
  }

  getHpoTooltipContent(colIndex: number, rowIndex: number): string {
    const cellData: HpoTermData[] = this.getHpoCellData(colIndex, rowIndex);
    if (!cellData || cellData.length === 0) return 'No terms';

    return cellData
      .map(term => {
        const value = term.entry;
        switch (value.type) {
          case 'Observed':
          case 'Excluded':
          case 'Na':
            return `${term.termDuplet.hpoLabel}: ${value.type}`;
          case 'OnsetAge':
          case 'Modifier':
            return `${term.termDuplet.hpoLabel}: ${value.data} (${value.type})`;
          default:
            return `${term.termDuplet.hpoLabel}: unknown`;
        }
      })
      .join('\n');
    }

  openHpoMiningDialog(colIndex: number, rowIndex: number) {
    
    const dialogRef = this.dialog.open(HpoTwostepComponent, {
      width: '1200px',
      height: '900px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const etlDto = this.etlDto;
        if (! etlDto) {
          this.notificationService.showError("Could not add mining results because ETL DTO not initialized");
          return;
        }
        const col = etlDto.table.columns[colIndex];
        if (! col) {
          this.notificationService.showError("Could not add mining results because column not defined");
          return;
        }
        const jsonized_cell_calue = JSON.stringify(result);
        col.values[rowIndex].current = jsonized_cell_calue;
        //this.displayRows[rowIndex][colIndex] = jsonized_cell_calue;
        this.reRenderTableRows();
      }
    });
  }

  private getHpoCellData(colIndex: number, rowIndex: number): HpoTermData[] {
    const cell = this.displayRows[rowIndex][colIndex];
    if (!cell) return [];
    if (Array.isArray(cell)) return cell;
    try {
      return JSON.parse(cell.original);
    } catch {
      this.notificationService.showError(`Invalid HPO data in cell: "${cell}"`);
      return [];
    }
  }

  clearHpoMining(colIndex: number, rowIndex: number) {
    this.displayRows[rowIndex][colIndex].current = "";
  }

// Compute the current column values for the transformation panel
get currentColumnCells(): EtlCellValue[] {
  if (!this.etlDto || this.contextMenuColIndex == null) return [];
  return this.etlDto.table.columns[this.contextMenuColIndex].values;
}


}
  
