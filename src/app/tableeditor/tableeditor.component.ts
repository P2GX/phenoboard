import { Component, computed, HostListener, inject, OnDestroy, OnInit, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { ConfigService } from '../services/config.service';
import { CohortDtoService } from '../services/cohort_dto_service';
import { DiseaseData } from '../models/cohort_dto';
import { MatDialog } from '@angular/material/dialog';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from "@angular/material/icon";
import { ClinicalStatus, HpoMappingResult, HpoMatch, MinedCell, MiningConcept, MiningStatus } from "../models/hpo_mapping_result";
import { ColumnDto, ColumnTableDto, EtlCellStatus, EtlCellValue, EtlColumnHeader, EtlColumnType, EtlDto, fromColumnDto } from '../models/etl_dto';
import { EtlSessionService } from '../services/etl_session_service';
import { HpoHeaderComponent } from '../hpoheader/hpoheader.component';
import { ValueMappingComponent } from '../valuemapping/valuemapping.component';
import { firstValueFrom } from 'rxjs';
import { HpoDialogWrapperComponent } from '../hpoautocomplete/hpo-dialog-wrapper.component';
import { NotificationService } from '../services/notification.service';
import { HpoTermData, HpoTermDuplet } from '../models/hpo_term_dto';
import { MultiHpoComponent } from '../multihpo/multihpo.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DeleteConfirmationDialogComponent } from './delete-confirmation.component';
import { removeAllWhitespace, sanitizeString } from '../validators/validators';
import { defaultPmidDto, PmidDto } from '../models/pmid_dto';
import { PubmedComponent } from '../pubmed/pubmed.component';
import { Router } from '@angular/router';
import { AddConstantColumnDialogComponent } from './add-constant-column-dialog.component';
import { VariantDialogService } from '../services/hgvsManualEntryDialogService';
import { SvDialogService } from '../services/svManualEntryDialogService';
import { HgvsVariant, StructuralVariant, VariantDto } from '../models/variant_dto';
import { HpoTwostepComponent } from '../hpotwostep/hpotwostep.component';
import { ConfirmDialogComponent } from '../confirm/confirmation-dialog.component';
import { SplitColumnDialogComponent } from './split-column.component';
import { EtlCellComponent } from "../etl_cell/etlcell.component";
import { HelpService } from '../services/help.service';
import { TransformType, TransformCategory, StringTransformFn, columnTypeColors, TransformToColumnTypeMap } from './etl-metadata';
import { CellReviewComponent } from '../cellreview/cellreview.component';

export const RAW: EtlCellStatus = 'raw' as EtlCellStatus;
export const TRANSFORMED: EtlCellStatus = 'transformed' as EtlCellStatus;
export const ERROR: EtlCellStatus = 'error' as EtlCellStatus;

/* Used to hold the context menu x and y position */
interface OverlayPosition {
  x: number;
  y: number;
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
export class TableEditorComponent implements OnInit, OnDestroy {
  constructor() {
    this.pmidForm = this.fb.group({
      pmid: [defaultPmidDto()],
    });
    this.helpService.setHelpContext("table-editor");
  }
  Object = Object;

  private configService = inject(ConfigService);
  private dialog = inject(MatDialog);
  public etl_service = inject(EtlSessionService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);
  private variantDialog = inject(VariantDialogService);
  private svDialog = inject(SvDialogService);
  private router = inject(Router);
  private helpService = inject(HelpService);
  private cohortService = inject(CohortDtoService);

  readonly EtlCellStatus = EtlCellStatus;
  public readonly TransformType = TransformType;

  pmidForm: FormGroup;

 
  diseaseData: DiseaseData | null = null;
  /** Strings such as P3Y, Congenital onset, that have been used so far to annotate onsets etc. */
  currentAgeStrings: string[] = [];

  INVISIBLE = -1;
  contextMenuColHeader: EtlColumnHeader | null = null;
  contextMenuColType: string | null = null;
  columnContextMenuVisible = false;
  columnContextMenuX: number | null = null;
  columnContextMenuY: number | null = null;
  editModeActive = false;
  visibleColIndex: number = this.INVISIBLE;
  transformedColIndex: number = this.INVISIBLE;
  contextMenuColIndex: number | null = null;
  contextMenuRowIndex: number | null = null;
  /* All possible column types */
  etlTypes: EtlColumnType[] = Object.values(EtlColumnType);
  simpleColumnOperations = [EtlColumnType.Ignore, EtlColumnType.Raw]

  errorMessage: string | null = null;
  columnBeingTransformed: number | null = null;

  contextMenuCellVisible = false;
  contextMenuPosition: OverlayPosition | null = null;
  contextMenuAnchor?: HTMLElement;

  editModalPosition: OverlayPosition | null = null;



  contextMenuCellRow: number | null = null;
  contextMenuCellCol: number | null = null;
  contextMenuCellValue: EtlCellValue | null = null;
  contextMenuCellType: EtlColumnType | null = null;




  columnTypeCategories: TransformType[] = [
    TransformType.RAW_COLUMN_TYPE,
    TransformType.FAMILY_ID_COLUMN_TYPE,
    TransformType.INDIVIDUAL_ID_COLUMN_TYPE,
    TransformType.GENE_SYMBOL_COLUMN_TYPE,
    TransformType.DISEASE_COLUMN_TYPE,
    TransformType.AGE_OF_ONSET_COLUMN_TYPE,
    TransformType.SEX_COLUMN_TYPE,
    TransformType.DECEASED_COLUMN_TYPE,
    TransformType.IGNORE_COLUMN_TYPE
  ]


  /* Functions that perform a fixed operation on cells and do NOT expect the column type to change */
  readonly TIDY_CELL_FN_MAP: Partial<Record<TransformType, StringTransformFn>> = {
    [TransformType.TO_UPPERCASE]: (val) => val.toUpperCase(),
    [TransformType.TO_LOWERCASE]: (val) => val.toLowerCase(),
    [TransformType.REMOVE_WHITESPACE]: (val) => val.replace(/\s+/g, ''),
    [TransformType.STRING_SANITIZE]: (val) => val.trim(), // simplified example
  }

  /* Functions that perform a fixed operation on cells and DO expect the column type to change */
  readonly ELEMENTWISE_MAP: Partial<Record<TransformType, StringTransformFn>> = {
    [TransformType.ONSET_AGE]: (val) => this.etl_service.parseAgeToIso8601(val),
    [TransformType.SEX_COLUMN]: (val) => this.etl_service.parseSexColumn(val),
    [TransformType.SEX_COLUMN_TYPE]: (val) => this.etl_service.parseSexColumn(val),
    [TransformType.INDIVIDUAL_ID_COLUMN_TYPE]: (val) => sanitizeString(val),
    [TransformType.FAMILY_ID_COLUMN_TYPE]: (val) => sanitizeString(val),
    [TransformType.DECEASED_COLUMN_TYPE]: (val) => this.etl_service.parseDeceasedColumn(val),
    [TransformType.AGE_OF_ONSET_COLUMN_TYPE]: (val) => this.etl_service.validateAgeEntry(val),
    [TransformType.AGE_AT_LAST_ENCOUNTER_COLUMN_TYPE]: (val) => this.etl_service.validateAgeEntry(val),
  };

  /* These functions are more involved -- they open dialogs, combine columns, etc. (everything else) 
    TODO
    */
  readonly ACTION_MAP: Partial<Record<TransformType, (colIndex: number) => void>> = {
    // Column Type Setters
    [TransformType.FAMILY_ID_COLUMN_TYPE]: (idx) => this.simpleColumnOp(idx, EtlColumnType.FamilyId),
    
  };

  /** A right click on a cell will open a modal dialog and allow us to change the value, which is stored here */
  editingValue: EtlCellValue | null = null;
  editingString  = '';
  editModalVisible = false;

  // Which column is being previewed
  previewColumnIndex: number | null = null;
  // Data shown in preview modal
  previewOriginal: string[] = [];
  previewTransformed: string[] = [];
  // Name of the transform for modal header
  previewTransformName = "";
  // Pending metadata to apply if user confirms
  pendingHeader: EtlColumnHeader | null = null;
  pendingHeaderName: string | null = null;
  pendingColumnType: EtlColumnType | null = null;
  pendingColumnTransformed = false;

  transformationMap: { [original: string]: string } = {};
  uniqueValuesToMap: string[] = [];

  /** These are transformations that we can apply to a column while editing. They appear on right click */
  transformOptions = Object.values(TransformType);

  transformHandlers: { [key in TransformType]: (colIndex: number) => string[] | void } = {
    [TransformType.STRING_SANITIZE]: (colIndex) => this.transformColumnElementwise(colIndex, TransformType.STRING_SANITIZE),
    [TransformType.TO_UPPERCASE]: (colIndex) => this.transformColumnElementwise(colIndex, TransformType.TO_UPPERCASE),
    [TransformType.TO_LOWERCASE]: (colIndex) => this.transformColumnElementwise(colIndex, TransformType.TO_LOWERCASE),
    [TransformType.EXTRACT_NUMBERS]: (colIndex) => this.transformColumnElementwise(colIndex, TransformType.EXTRACT_NUMBERS),
    [TransformType.ONSET_AGE]: (colIndex) => this.transformColumnElementwise(colIndex, TransformType.ONSET_AGE),
    [TransformType.LAST_ENCOUNTER_AGE]: (colIndex) => this.transformColumnElementwise(colIndex, TransformType.LAST_ENCOUNTER_AGE),
    [TransformType.SEX_COLUMN]: (colIndex) => this.transformColumnElementwise(colIndex, TransformType.SEX_COLUMN),
    [TransformType.SINGLE_HPO_TERM]: (colIndex) => { this.applySingleHpoTransform(colIndex); },
    [TransformType.MULTIPLE_HPO_TERM]: (colIndex: number) => { this.processMultipleHpoColumn(colIndex); },
    [TransformType.REPLACE_UNIQUE_VALUES]: (colIndex: number) => { this.editUniqueValuesInColumn(colIndex); },
    [TransformType.ONSET_AGE_ASSUME_YEARS]: (colIndex) => this.transformColumnElementwise(colIndex, TransformType.ONSET_AGE_ASSUME_YEARS),
    [TransformType.LAST_ECOUNTER_AGE_ASSUME_YEARS]: (colIndex) => this.transformColumnElementwise(colIndex, TransformType.LAST_ECOUNTER_AGE_ASSUME_YEARS),
    [TransformType.SPLIT_COLUMN]: (colIndex) => { this.splitColumn(colIndex); },
    [TransformType.DELETE_COLUMN]: (colIndex) => { this.deleteColumn(colIndex); },
    [TransformType.DUPLICATE_COLUMN]: (colIndex) => { this.duplicateColumn(colIndex); },
    [TransformType.CONSTANT_COLUMN]: (colIndex) => { this.addConstantColumn(colIndex); },
    [TransformType.MERGE_INDIVIDUAL_FAMILY]: (colIndex) => { this.mergeIndividualAndFamilyColumns(); },
    [TransformType.RAW_COLUMN_TYPE]: (colIndex: number) => { this.simpleColumnOp(colIndex, EtlColumnType.Raw); },
    [TransformType.FAMILY_ID_COLUMN_TYPE]: (colIndex: number) => { this.simpleColumnOp(colIndex, EtlColumnType.FamilyId); },
    [TransformType.INDIVIDUAL_ID_COLUMN_TYPE]: (colIndex: number) => { this.simpleColumnOp(colIndex, EtlColumnType.PatientId); },
    [TransformType.GENE_SYMBOL_COLUMN_TYPE]: (colIndex: number) => { this.simpleColumnOp(colIndex, EtlColumnType.GeneSymbol); },
    [TransformType.DISEASE_COLUMN_TYPE]: (colIndex: number) => { this.simpleColumnOp(colIndex, EtlColumnType.Disease); },
    [TransformType.AGE_OF_ONSET_COLUMN_TYPE]: (colIndex: number) => { this.transformColumnElementwise(colIndex, TransformType.AGE_OF_ONSET_COLUMN_TYPE); },
    [TransformType.SEX_COLUMN_TYPE]: (colIndex: number) => { this.simpleColumnOp(colIndex, EtlColumnType.Sex); },
    [TransformType.DECEASED_COLUMN_TYPE]: (colIndex: number) => { this.simpleColumnOp(colIndex, EtlColumnType.Deceased); },
    [TransformType.IGNORE_COLUMN_TYPE]: (colIndex: number) => { this.simpleColumnOp(colIndex, EtlColumnType.Ignore); },
    [TransformType.REMOVE_WHITESPACE]: (colIndex: number) => { this.simpleColumnOp(colIndex, EtlColumnType.Raw); },
    [TransformType.AGE_AT_LAST_ENCOUNTER_COLUMN_TYPE]: (colIndex: number) => { this.transformColumnElementwise(colIndex, TransformType.AGE_AT_LAST_ENCOUNTER_COLUMN_TYPE); },
    [TransformType.ANNOTATE_VARIANTS]: (colIndex: number) => { this.annotateVariants(colIndex); }

  };



   ngOnInit(): void {
  
    this.pmidForm.valueChanges.subscribe(value => {
      console.log('Form value:', value);
    });
  }

 


  /** Reset if user clicks outside of defined elements. */
  @HostListener('document:click')
  onClickAnywhere(): void {
    this.columnContextMenuVisible = false;
    this.editModalVisible = false;
  }


   ngOnDestroy(): void {
  }
 
  /* Load an external Excel file (e.g., supplemental table from a publication). 
   * We support column (individuals incolumns) or row (individuals iun rows) and normalize such that the 
   * individuals are in rows. */
  async loadExcel(rowBased: boolean = false) {
    this.errorMessage = null;
    try {
      const table: ColumnTableDto | null = rowBased
        ? await this.configService.loadExternalExcelRowBased()
        : await this.configService.loadExternalExcel();

      if (!table) {
        this.notificationService.showError("Could not retrieve external table");
        return;
      }
      const dto = fromColumnDto(table);
      this.etl_service.setEtlDto(dto);
    } catch (error) {
      this.errorMessage = String(error);
      this.notificationService.showError("Could not retrieve external table");
    }
  }


  
  // Row-oriented data for template iteration
  displayRows: Signal<EtlCellValue[][]> = computed(() => {
    const dto = this.etl_service.etlDto();
    if (!dto) return [];
    const columns = dto.table.columns;
    if (columns.length === 0) return [];
    const rowCount = Math.max(...columns.map(c => c.values.length));
    return Array.from({ length: rowCount }, (_, i) =>
      columns.map(c => c.values[i] ?? { original: '', current: '', status: RAW })
    );
  });

  // Column list for template headers
  displayColumns: Signal<ColumnDto[]> = computed(() => {
    const dto = this.etl_service.etlDto();
    return dto?.table.columns ?? [];
  });

  // Column headers for template headers (tooltips, labels)
  displayHeaders: Signal<EtlColumnHeader[]> = computed(() => {
    const dto = this.etl_service.etlDto();
    return dto?.table.columns.map(c => c.header) ?? [];
  });


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
   * Updates a single column in the ETL DTO immutably.
   *
   * This method creates a new array of cells for the specified column by applying
   * `updateCellFn` to each cell. It then replaces the column in a new columns array
   * and sets a new DTO in the `EtlSessionService` signal. This ensures that all
   * reactivity mechanisms (signals/computed properties) are triggered without
   * mutating the original DTO or cells.
   *
   * @param colIndex - The zero-based index of the column to update.
   * @param updateCellFn - A function that receives an `EtlCellValue` and returns
   *   a new `EtlCellValue`. Use this function to transform or validate each cell.
   *
   * @example
   * // Transform all cells in column 2 to uppercase:
   * updateColumn(2, cell => ({ ...cell, current: cell.current.toUpperCase() }));
   *
   * @example
   * // Mark cells as error if empty
   * updateColumn(0, cell => ({
   *   ...cell,
   *   status: cell.current ? EtlCellStatus.Transformed : EtlCellStatus.Error
   * }));
   */
  private updateColumn(
    colIndex: number,
    updateCellFn: (cell: EtlCellValue) => EtlCellValue
  ): void {
    const dto = this.etl_service.etlDto();
    if (!dto) return;

    const column = dto.table.columns[colIndex];
    const newValues = column.values.map(updateCellFn);
    const newColumns = [...dto.table.columns];
    newColumns[colIndex] = { ...column, values: newValues };
    this.etl_service.updateColumns(newColumns);
  }

  


  /**
   * Transform a column and update each cell. Note that we update the column
   * immutably to trigger the signal
   */
  transformColumn(
    colIndex: number, 
    transformFn: (val: string) => string, validateFn?: (val: string) => boolean): void {
      this.updateColumn(colIndex, cell => {
      const newValue = transformFn(cell.original);
      const isValid = validateFn ? validateFn(newValue) : true;
      return {
        ...cell,
        current: isValid ? newValue : cell.current,
        status: isValid ? EtlCellStatus.Transformed : EtlCellStatus.Error,
        errorMessage: isValid ? undefined : 'Invalid value'
      };
    });
  }

  /* Used for manual cell edits (by right click on a cell), which are assumed to be correct (they will be QC'd by backend) */
  onCellEdited(event: { rowIndex: number, colIndex: number, newValue: string }): void {
    const rows = this.displayRows(); 
    const cell = rows[event.rowIndex][event.colIndex];
    this.updateCell(cell, event.newValue, TRANSFORMED);
  }

  /* Call this method to clear right-click context */
  resetRightClick(): void {
    this.contextMenuColIndex = null;
    this.contextMenuColHeader = null;
    this.contextMenuColType = null;
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
    padding = 10
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

  visibleColumnsComputed = computed(() => {
    const dto = this.etl_service.etlDto();
    if (!dto) return [];
    // Use your existing logic to determine visible column indices
    if (!this.editModeActive) {
      return dto.table.columns.map((_, i) => i); // all columns
    }
    const indices = [0]; // always show first
    if (this.visibleColIndex >= 0) indices.push(this.visibleColIndex);
    if (this.transformedColIndex >= 0) indices.push(this.transformedColIndex);
    return indices;
  });

  columnsToRender = computed(() => {
    const dto = this.etl_service.etlDto();
    if (!dto) return [];
    return this.visibleColumnsComputed().map(i => dto.table.columns[i]).filter(Boolean);
  });

  trackColumn = (index: number, col: ColumnDto) => {
    return col.id; // if your columns have an `id` field
  };


  /** This method is called if the user right clicks on the header (first row) */
  onRightClickHeader(event: MouseEvent, colIndex: number): void {
    event.preventDefault();
    this.contextMenuColIndex = colIndex;
    const headers = this.displayHeaders();  
    this.contextMenuColHeader = headers[colIndex] ?? null;
    this.contextMenuColType = headers[colIndex]?.columnType ?? null;
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

  /* get the unique strings values from the column. 
   * The values will go into transformationPanelVisible */
  editUniqueValuesInColumn(index: number): void {
    const dto = this.etl_service.etlDto();
    if (!dto) return;
    const column = dto.table.columns[index];
    const headers = this.displayHeaders();
    const header = headers[index];
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
  }

  getUniqueValues(colIndex: number): string[] {
    const dto = this.etl_service.etlDto();
    if (! dto) return [];
    const column = dto.table.columns[colIndex];
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
    const dto = this.etl_service.etlDto();
    if (! dto) return;
    this.editModeActive = true;
    this.visibleColIndex = index;
  }



  async applySingleHpoTransform(colIndex: number): Promise<void> {
    const dto = this.etl_service.etlDto();
    if (! dto) return;
    const column = dto.table.columns[colIndex];
    const columnTitle = column.header.original || "n/a";

    // Get the best HPO match
    let bestHpoMatch: HpoMatch | null = null;
    try {
      bestHpoMatch = (await this.configService.getBestHpoMatch(columnTitle)) ?? "";
    } catch {
      this.notificationService.showError("could not get HPO match");
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
    const uniqueValues = Array.from(new Set(column.values.map(v => v.original.trim())));
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
    this.updateColumnWithMap(colIndex, mapping);
  }

  /**
   * Updates a column by applying a value mapping to each cell.
   *
   * If the mapping is null, all cells are marked as error.
   * If a value cannot be mapped, the cell is marked as error.
   * Otherwise, the cell is updated with the mapped value and status Transformed.
   *
   * @param colIndex - The zero-based index of the column to update.
   * @param mapping - The HPO mapping result (value-to-state map). If null, all cells are errors.
   */
  private updateColumnWithMap(
    colIndex: number,
    mapping: HpoMappingResult | undefined
  ): void {
    const dto = this.etl_service.etlDto();
    if (!dto) return;

    this.updateColumn(colIndex, cell => {
      if (!mapping) {
        return { ...cell, current: '', status: EtlCellStatus.Error, errorMessage: 'User cancelled mapping' };
      }
      const newValue = mapping.valueToStateMap[cell.original];
      if (newValue) {
        return { ...cell, current: newValue, status: EtlCellStatus.Transformed, errorMessage: undefined };
      } else {
        return { ...cell, current: '', status: EtlCellStatus.Error, errorMessage: `Could not map ${cell.original}` };
      }
    });
  }


  /* We receive a multi-HPO column, which has one string for each row of the table. Each cell can have zero, one, or multiple
   * phrases that correspond to HPO terms. (1) mapColumnToMiningConcepts splits the original text on ";" and newline, and returns
   * a list of MiningConcept objects, each of which retains the original row number. (2) We then create a uniqueDictionary of
   * MiningConcept objects with no duplicates. For these objects, the row number is set to zero and is meaningless. 
   * (3) We then open the MultiHpoComponent, which allows us to update/correct/delete/confirm the automatic mappings. Optionally,
   * we can also split the strings (the original strings were split on ";" and newline, but sometimes a human user will see that
   * the resulting strings need to be further split, e.g., on comma). (4) We keep track of the original string in a column using the
   * ancestorString field, and this allows us to distribute the mappings back the each specific row.
   */
  private async getInitialMultipleHpoMapping(col: ColumnDto): Promise<MinedCell[]> {
    const originalEntries = col.values.map(v => v.original);
    const initialConcepts: MiningConcept[] = await this.configService.mapColumnToMiningConcepts(originalEntries);
    const uniqueDictionary: MiningConcept[] = await this.configService.create_canonical_dictionary(initialConcepts);
    const globalRef = this.dialog.open(MultiHpoComponent, {
      width: '1100px',
      data: { concepts: uniqueDictionary, title: col.header.original }
    });
    const confirmedDictionary: MiningConcept[] = await firstValueFrom(globalRef.afterClosed());
    if (!confirmedDictionary) return [];
    const cellMappings = this.configService.createCellMappings(confirmedDictionary, originalEntries);
    return cellMappings;
  }


  /* Process a column whose cells each may contain zero, one, or multiple HPO terms */
  async processMultipleHpoColumn(colIndex: number): Promise<void> {
    const dto = this.etl_service.etlDto();
    if (!dto ) return;
    const col = dto.table.columns[colIndex];
    if (!col) return;
    try {
      // Stage 1. Divide the cell entries into individual word groups (";" and new line) and
      // map each one
      const minedCellList: MinedCell[] = await this.getInitialMultipleHpoMapping(col);
      const cellReviewRef = this.dialog.open(CellReviewComponent, {
        width: '1100px',
        disableClose: true,
        data: { 
          minedCells: minedCellList, // Mappings for each uniquq string in the original column
          title: col.header.original 
        }
      });
      const finalResults: MinedCell[] = await firstValueFrom(cellReviewRef.afterClosed());
      if (!finalResults) return;
      /// Assign the concepts to the corresponding rows
      const rowMultiHpoStrings = await this.configService.getMultiHpoStrings(finalResults);
      

      // --- STAGE 3: DATA APPLICATION ---
      const newColumns: ColumnDto[] = dto.table.columns.map((column, i) => {
        if (i !== colIndex) return column;
        const newValues: EtlCellValue[] = column.values.map((cell, rowIndex) => {
          const mappedValue = rowMultiHpoStrings[rowIndex];
          return {
            ...cell,
            current: mappedValue,
            status: EtlCellStatus.Transformed,
            error: undefined
          };
        });
        const updatedCol = {...column};
        updatedCol.header.columnType = EtlColumnType.MultipleHpoTerm;
        updatedCol.header.hpoTerms = this.extractUniqueHpoTerms(finalResults);
        return updatedCol;
      });
      this.etl_service.updateColumns(newColumns);
       } catch (error) {
        this.notificationService.showError(`Mapping Error: ${error}`);
       }
    }

    // Helper to keep the main function clean
    private extractUniqueHpoTerms(concepts: MinedCell[]): HpoTermDuplet[] {
      const unique = new Map<string, HpoTermDuplet>();
        concepts.forEach(c => {
          c.mappedTermList.forEach(duplet => {
            unique.set(duplet.hpoId, { hpoId: duplet.hpoId, hpoLabel: duplet.hpoLabel});
          });
      });
      return Array.from(unique.values());
  }


  deleteRowAtI(i: number): void {
    const dto = this.etl_service.etlDto();
    if (! dto) return;
    const newColumns = dto.table.columns.map(col => ({
      ...col,
      values: [
        ...col.values.slice(0, i),
        ...col.values.slice(i + 1)
      ]
    }));
    this.etl_service.updateColumns(newColumns);
  }

  async deleteRow() {
    const etlDto = this.etl_service.etlDto();
    if (!etlDto) return;

    const rowIndex = this.contextMenuCellRow;
    if (rowIndex == null) {
      this.notificationService.showError("Could not delete row because we could not get context menu cell row index.");
      return;
    }

    const firstCell = etlDto.table.columns[0].values[rowIndex]?.current ?? '';

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title:  `Delete row ${rowIndex}`,
        message: firstCell,
        confirmText: "delete",
        cancelText: "cancel"
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteRowAtI(rowIndex);
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
    this.contextMenuCellVisible = false;
    if (! this.contextMenuAnchor) return;
    const dto = this.etl_service.etlDto();
    if (! dto) return;
    const rect = this.contextMenuAnchor.getBoundingClientRect();
    const modalHeight = 300;
    const margin = 8;

    let top = rect.top + window.scrollY;
    let left = rect.left + window.scrollX;
    // Flip above if needed
    if (top + modalHeight > window.scrollY + window.innerHeight) {
      top = rect.bottom + window.scrollY - modalHeight - margin;
    }

  this.editModalPosition = { x:left, y: top };
  this.editModalVisible = true;

    const cell = this.contextMenuCellValue;
    this.editingValue = cell;
    const colIndex = this.contextMenuCellCol;
    if (!cell || colIndex == null) {
      this.notificationService.showError("Could not edit cell: missing context.");
      return;
    }
    this.editingString = cell.original;
    const col = dto.table.columns[colIndex];
    if (!col) {
      this.notificationService.showError("Could not edit cell because we could not get context menu cell column.");
      return;
    }

    this.editModalVisible = true;
   
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
  async saveExternalTemplateJson(): Promise<void> {
    this.errorMessage = null;
    const etlDto = this.etl_service.etlDto();
    if (! etlDto) {
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
  async loadExternalTemplateJson(): Promise<void> {
    this.errorMessage = null;
    try {
      const dto: EtlDto = await this.configService.loadJsonExternalTemplate();
      if (dto == null) {
        this.notificationService.showError("Could not retrieve external template json");
        return;
      }
      this.etl_service.setEtlDto(dto);
    } catch (error) {
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
  visibleColumns = computed(() => {
    const dto = this.etl_service.etlDto();
    if (!dto) {
      this.notificationService.showError("Attempt to focus on columns with null ETL table");
      return [];
    }
    if (!this.editModeActive) {
      return dto.table.columns.map((_, i) => i); // show all
    }

    const indices = [0]; // always show first column

    if (this.visibleColIndex >= 0) indices.push(this.visibleColIndex);
    if (this.transformedColIndex >= 0) indices.push(this.transformedColIndex);

    return indices;
  });


  /**
   * External templates often have columns with no relevant information that we can delete.
   * @param index 
   * @returns 
   */
  deleteColumn(index: number | null): void {
    const dto = this.etl_service.etlDto();
    if (! dto) return;
    if (index === null) return;
    const uniqueValues: string[] = this.getUniqueValues(index);
    const columnName = dto.table.columns[index].header.original || `Column ${index}`;
    const dialogRef = this.dialog.open(DeleteConfirmationDialogComponent, {
      width: '500px',
      data: {
        columnName: columnName,
        uniqueValues: uniqueValues
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        // User confirmed deletion
        const newColumns = dto.table.columns.filter((_, i) => i !== index);
        this.etl_service.updateColumns(newColumns);
      }
      // If result is false or undefined, do nothing (probably, user cancelled)
    });
  }

  duplicateColumn(index: number | null): void {
    const dto = this.etl_service.etlDto();
    if (!dto || index === null) return;

    const originalColumn = dto.table.columns[index];
    if (!originalColumn) return;
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
      ...dto.table.columns.slice(0, index + 1),
      clonedColumn,
      ...dto.table.columns.slice(index + 1)
    ];
    this.etl_service.updateColumns(newColumns);
  }


  /** Split a column into two according to a token such as "/" or ":" */
  splitColumn(index: number | null): void {
    const dto = this.etl_service.etlDto();
    if (!dto || index === null) return;
    const columns = dto.table.columns;
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
        return { ...cell, original: part, current: part, status: RAW, error: undefined };
      });

      // update columns array
      columns.splice(index + 1, 0, columnB);
      columns[index] = columnA;
      this.etl_service.updateColumns(columns);
    });
  }

   /** Use Variant Validator in the backend to annotate each variant string in the column. 
    * Upon successful validation, add the variant key to the ETL DTO.  
   */
  async annotateVariants(colIndex: number): Promise<void> {
    const dto = this.etl_service.etlDto();
    if (dto == null) return;
    const new_dto = await this.configService.processAlleleColumn(dto, colIndex);
    this.etl_service.setEtlDto(new_dto);
  }


  /**
   * 
   * @param index Used by the angular code to determine if a column is transformed and
   * thus should be displayed differently
   * @returns true iff column is transformed
   */
  isTransformedColumn(index: number): boolean {
    const dto = this.etl_service.etlDto();
    if (! dto) return false;
    const column = dto.table.columns[index];
    if (!column?.values?.length) {
      return false;
    }

    return column.values.every(
      cell => cell.status === EtlCellStatus.Transformed
    );
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

  /* Is there a row above the current one and if so is the column value valid? */
  hasValueAbove(): boolean {
    const dcolumns = this.displayColumns();
    return (
      this.contextMenuCellRow !== null &&
      this.contextMenuCellRow > 0 &&
      this.contextMenuCellCol !== null &&
      dcolumns[this.contextMenuCellCol].values[this.contextMenuCellRow - 1] !== undefined
    );
  }


  /* Copy the value from the cell right above this one */
  useValueFromAbove() {
    const dto = this.etl_service.etlDto();
    if (! dto) return;
    const cell = this.contextMenuCellValue;
    this.editingValue = cell;
    const colIndex = this.contextMenuCellCol;
    const rowIndex = this.contextMenuCellRow;
    if (! colIndex || ! rowIndex) {
      const emsg = `Index information incomplete: col: ${colIndex} - row: ${rowIndex}`
      this.notificationService.showError(emsg);
      return;
    }
    if (!cell) {
      this.notificationService.showError("Could not edit cell: missing context.");
      return;
    }
    if (!this.hasValueAbove()) return;
    if (this.contextMenuCellCol == null) {
      this.notificationService.showError("contextMenuCellCol is null");
      return;
    }
    const dcolumns = this.displayColumns();
    const aboveCell: EtlCellValue = dcolumns[colIndex].values[rowIndex - 1];
    const aboveVal = aboveCell.current;
    const newColumns = dto.table.columns.map((col, i) => {
      if (i !== colIndex) return col; // leave other columns unchanged
      // Update the specific cell immutably
      const newValues = col.values.map((cell, j) => {
            if (j !== rowIndex) return cell;
            return {
              ...cell,
              original: aboveVal,
              current: aboveVal,
              status: TRANSFORMED, // assume manual edit is correct
              errorMessage: undefined
            };
          });
          return { ...col, values: newValues };
        });
    
    this.contextMenuCellValue = newColumns[colIndex].values[rowIndex];
    this.editModalVisible = false;
    this.etl_service.updateColumns(newColumns);
    this.editModalVisible = false;
  }


  /* Get positions for the context menu */
  private calculateContextMenuPosition(
    anchor: HTMLElement,
    menuWidth = 260,
    menuHeight = 240,
    margin = 6
  ): OverlayPosition {
    const rect = anchor.getBoundingClientRect();

    const viewportTop = window.scrollY;
    const viewportBottom = viewportTop + window.innerHeight;
    const viewportLeft = window.scrollX;
    const viewportRight = viewportLeft + window.innerWidth;

    // Default: below, left-aligned to cell
    let top = rect.bottom + window.scrollY + margin;
    let left = rect.left + window.scrollX;

    // Flip vertically if overflowing bottom
    if (top + menuHeight > viewportBottom) {
      top = rect.top + window.scrollY - menuHeight - margin;
    }

    // Clamp vertically
    if (top < viewportTop + margin) {
      top = viewportTop + margin;
    }

    // Clamp horizontally
    if (left + menuWidth > viewportRight) {
      left = viewportRight - menuWidth - margin;
    }
    if (left < viewportLeft + margin) {
      left = viewportLeft + margin;
    }

    return { y:top, x: left };
  }
  /* Activated by a right click on a table cell */
  onCellContextMenu(event: {
    event: MouseEvent;
    cell: EtlCellValue;
    rowIndex: number;
    colIndex: number;
  }) {
   
    const mouseEvent = event.event;
    this.contextMenuAnchor = mouseEvent.currentTarget as HTMLElement;
    this.contextMenuCellVisible = true;
     // Position the context menu
    this.contextMenuPosition = this.calculateContextMenuPosition(this.contextMenuAnchor);

    this.contextMenuCellRow = event.rowIndex;
    this.contextMenuCellCol = event.colIndex;
    this.contextMenuCellValue = event.cell;

    // Determine the type / other data from parent state
    const headers = this.displayHeaders();
    const header = headers[event.colIndex];
    this.contextMenuCellType = header.columnType;
  }


  /**
   * Save a manual edit to a table cell. Note that we assume that any manual
   * edit is correct and apply the "TRANSFORMED" state. Everything will be Q/C'd
   * one more time with the conversion to CohortData as well!
   */
  async saveManualEdit(): Promise<void> {
    const dto = this.etl_service.etlDto();
    if (! dto) return;
    const colIndex = this.contextMenuCellCol;
    const rowIndex = this.contextMenuCellRow;
    if (colIndex == null || rowIndex == null) {
      this.notificationService.showError("Could not save value: missing row or column index");
      return;
    }
    const col = dto.table.columns[colIndex];
    if (! col) return;
      const oldCell = col.values[rowIndex];
      if (!oldCell) return;
      if (! this.editingValue) {
        this.notificationService.showError("Could not find edit value");
        return;
      }
    const newColumns = dto.table.columns.map((col, i) => {
      if (i !== colIndex) return col; // leave other columns unchanged
      // Update the specific cell immutably
      const newValues = col.values.map((cell, j) => {
            if (j !== rowIndex) return cell;
            return {
              ...cell,
              original: this.editingString.trim(),
              current: this.editingString.trim(),
              status: TRANSFORMED, // assume manual edit is correct
              errorMessage: undefined
            };
          });
          return { ...col, values: newValues };
        });
    
      this.contextMenuCellValue = newColumns[colIndex].values[rowIndex];
      this.editModalVisible = false;
      this.etl_service.updateColumns(newColumns);
    
    
  }


  // Structure to be used in the context menu
  readonly transformCategories: TransformCategory[] = [
    {
      label: 'Set/QC columns',
      transforms: [
        TransformType.INDIVIDUAL_ID_COLUMN_TYPE,
        TransformType.FAMILY_ID_COLUMN_TYPE,
        TransformType.SEX_COLUMN,
        TransformType.DECEASED_COLUMN_TYPE,
        TransformType.AGE_OF_ONSET_COLUMN_TYPE,
        TransformType.AGE_AT_LAST_ENCOUNTER_COLUMN_TYPE,
      ]
    },
    {
      label: 'Basic Transforms',
      transforms: [
        TransformType.STRING_SANITIZE,
        TransformType.REMOVE_WHITESPACE,
        TransformType.TO_UPPERCASE,
        TransformType.TO_LOWERCASE,
        TransformType.EXTRACT_NUMBERS,
        TransformType.REPLACE_UNIQUE_VALUES,
      ]
    },
    {
      label: 'Age Transforms',
      transforms: [
        TransformType.ONSET_AGE,
        TransformType.ONSET_AGE_ASSUME_YEARS,
        TransformType.LAST_ENCOUNTER_AGE,
        TransformType.LAST_ECOUNTER_AGE_ASSUME_YEARS
      ]
    },
    {
      label: 'HPO Transforms',
      transforms: [
        TransformType.SINGLE_HPO_TERM,
        TransformType.MULTIPLE_HPO_TERM
      ]
    },
    {
      label: "Alleles/variants",
      transforms: [
        TransformType.ANNOTATE_VARIANTS,
      ]
    },
    {
      label: "Column operations",
      transforms: [
        TransformType.IGNORE_COLUMN_TYPE,
        TransformType.DELETE_COLUMN,
        TransformType.DUPLICATE_COLUMN,
        TransformType.CONSTANT_COLUMN,
        TransformType.MERGE_INDIVIDUAL_FAMILY,
        TransformType.SPLIT_COLUMN,
      ]
    }
  ];




  // Helper method to get transform display name
  getTransformDisplayName(transform: TransformType): string {
    const displayNames: { [key in TransformType]: string } = {
      [TransformType.STRING_SANITIZE]: 'Sanitize (trim/ASCII)',
      [TransformType.REMOVE_WHITESPACE]: "Remove all whitespace",
      [TransformType.TO_UPPERCASE]: 'To Uppercase',
      [TransformType.TO_LOWERCASE]: 'To Lowercase',
      [TransformType.EXTRACT_NUMBERS]: 'Extract Numbers',
      [TransformType.REPLACE_UNIQUE_VALUES]: 'Replace Unique Values',
      [TransformType.ONSET_AGE]: 'Onset Age',
      [TransformType.ONSET_AGE_ASSUME_YEARS]: 'Onset Age (assume years)',
      [TransformType.LAST_ENCOUNTER_AGE]: 'Last Encounter Age',
      [TransformType.LAST_ECOUNTER_AGE_ASSUME_YEARS]: 'Last Encounter Age (assume years)',
      [TransformType.SEX_COLUMN]: 'Sex Column',
      [TransformType.SPLIT_COLUMN]: 'Split Column',
      [TransformType.SINGLE_HPO_TERM]: 'Single HPO Term',
      [TransformType.MULTIPLE_HPO_TERM]: 'Multiple HPO Terms',
      [TransformType.DELETE_COLUMN]: 'Delete column',
      [TransformType.DUPLICATE_COLUMN]: 'Duplicate column',
      [TransformType.CONSTANT_COLUMN]: 'Add constant column',
      [TransformType.MERGE_INDIVIDUAL_FAMILY]: 'Merge individual and family columns',
      [TransformType.RAW_COLUMN_TYPE]: 'Raw',
      [TransformType.FAMILY_ID_COLUMN_TYPE]: 'Family ID',
      [TransformType.INDIVIDUAL_ID_COLUMN_TYPE]: 'Individual ID',
      [TransformType.GENE_SYMBOL_COLUMN_TYPE]: 'Gene symbol',
      [TransformType.DISEASE_COLUMN_TYPE]: 'Disease',
      [TransformType.AGE_OF_ONSET_COLUMN_TYPE]: 'Age of onset',
      [TransformType.SEX_COLUMN_TYPE]: 'Sex',
      [TransformType.DECEASED_COLUMN_TYPE]: 'Deceased',
      [TransformType.IGNORE_COLUMN_TYPE]: 'Ignore',
      [TransformType.AGE_AT_LAST_ENCOUNTER_COLUMN_TYPE]: 'Age at last encounter',
      [TransformType.ANNOTATE_VARIANTS]: 'Annotate variants'
    };
    return displayNames[transform] || transform;
  }

  /** Transform a single column in-place using signals */
  transformColumnElementwise(colIndex: number, transform: TransformType) {
    const dto = this.etl_service.etlDto();
    if (! dto) return;
    const col = dto.table.columns[colIndex];
    if (!col || !col.values) return;
    const newColumnns = 

    col.values.forEach(cell => {
      const original = cell.original ?? '';
      let transformed: string | undefined;
      switch (transform) {
        case TransformType.STRING_SANITIZE:
        case TransformType.INDIVIDUAL_ID_COLUMN_TYPE:
        case TransformType.FAMILY_ID_COLUMN_TYPE:
          transformed = sanitizeString(original);
          break;
        case TransformType.REMOVE_WHITESPACE:
          transformed = removeAllWhitespace(original);
          break;
        case TransformType.TO_UPPERCASE:
          transformed = original.toUpperCase();
          break;
        case TransformType.TO_LOWERCASE:
          transformed = original.toLowerCase();
          break;
        case TransformType.EXTRACT_NUMBERS:
          transformed = original.match(/\d+/g)?.join(' ') || '';
          break;
        case TransformType.ONSET_AGE:
        case TransformType.LAST_ENCOUNTER_AGE:
          transformed = this.etl_service.parseAgeToIso8601(original);
          break;
        case TransformType.ONSET_AGE_ASSUME_YEARS:
        case TransformType.LAST_ECOUNTER_AGE_ASSUME_YEARS:
          transformed = this.etl_service.parseDecimalYearsToIso8601(original);
          break;
        case TransformType.SEX_COLUMN:
          transformed = this.etl_service.parseSexColumn(original);
          break;
        default:
          transformed = original;
      }
      if (transformed) {
        cell.current = transformed;
        cell.status = TRANSFORMED;
        cell.error = undefined;
        console.log(`set cell.current to {cell.current}`)
      } else {
        cell.current = '';
        cell.status = ERROR;
        cell.error = `Could not map "${original}"`
      }
    });
  }

  /** Change the column header type and refresh. */
  private setColumnMetadata(colIndex: number, type: EtlColumnType) {
    const dto = this.etl_service.etlDto();
    if (!dto) return;
    const col = dto.table.columns[colIndex];
    col.header.columnType = type;
  }

  async ignoreColumn(colIndex: number) {
    const dto = this.etl_service.etlDto();
    if (!dto) return;
    const newColumns = dto.table.columns.map((col, i) => {
      if (i !== colIndex) return col; // leave other columns unchanged
      const newValues = col.values.map(cell => ({
        ...cell,
        status: EtlCellStatus.Ignored,
        errorMessage: undefined
      }));
      const newHeader = {
        ...col.header,
        columnType: EtlColumnType.Ignore
      };
      return {
        ...col,
        values: newValues,
        header: newHeader
      };
    });
    this.etl_service.updateColumns(newColumns);
  }

  async resetColumn(colIndex: number): Promise<void> {
    const dto = this.etl_service.etlDto();
    if (!dto) return;
    const newColumns = dto.table.columns.map((col, i) => {
      if (i !== colIndex) return col; // leave other columns unchanged
      const newValues = col.values.map(cell => ({
        ...cell,
        status: EtlCellStatus.Raw,
        current: '',
        error: undefined
      }));
      const newHeader = {
        ...col.header,
        columnType: EtlColumnType.Raw
      };
      return {
        ...col,
        values: newValues,
        header: newHeader
      };
    });
    this.etl_service.updateColumns(newColumns);
  }

  /* change a single element. We use this, for instance, after manually editing the 
   * value of one cell. We change both the original value (not current), because we expect that
   * the use will need to re-run the actual transform to confirm (and this would start
   * from original!). */
  async runElementwiseEngine(colIndex: number, transform: TransformType, fn: StringTransformFn): Promise<void> {
    const dto = this.etl_service.etlDto();
    if (!dto) return;
    const newColumnType = TransformToColumnTypeMap[transform];

    if (newColumnType) {
      this.setColumnMetadata(colIndex, newColumnType);
    } else {
      this.notificationService.showError(`Could not identify column type for ${transform}. Aborting operation.`);
      return;
    }
    const newColumns = dto.table.columns.map((col, i) => {
      if (i !== colIndex) return col; // leave other columns unchanged

      // Transform each cell
      const newValues = col.values.map(cell => {
        try {
          const result = fn(cell.original ?? '');
          if (!result) {
            return {
              ...cell,
              current: '',
              status: EtlCellStatus.Error,
              errorMessage: `Could not map ${cell.original}`
            };
          } else {
            return {
              ...cell,
              original: result,
              current: result,
              status: EtlCellStatus.Transformed,
              errorMessage: undefined
            };
          }
        } catch (e) {
          return {
            ...cell,
            status: EtlCellStatus.Error,
            errorMessage: String(e)
          };
        }
      });
      const newHeader = { ...col.header, columnType: newColumnType };
      return { ...col, values: newValues, header: newHeader };
    });
    this.etl_service.updateColumns(newColumns);
  }

  /* USed for operations such as ASCII-sanitization, UPPER-CASE, and trim */
  async runTidyColumn(colIndex: number | null, fn: StringTransformFn) {
    const dto = this.etl_service.etlDto();
    if (!dto || !colIndex) return;
    const col = dto.table.columns[colIndex];
    const newColumns = dto.table.columns.map((col, i) => {
      if (i !== colIndex) return col; // leave other columns unchanged
      const newValues = col.values.map(cell => {
        const input = cell.original ?? '';
        const output: string | undefined = fn(input);
        if (output) {
          return {
            ...cell,
            current: output,
            error: ''
          }
        } else {
          return {
            ...cell,
            current: '',
            status: ERROR,
            error: `Could not map "${input}"`
          }
        }
      });
      return { ...col, values: newValues };
    });
    this.etl_service.updateColumns(newColumns);
  }

  async applyNamedTransform(colIndex: number | null, transform: TransformType): Promise<void> {
    const dto = this.etl_service.etlDto();
    if (colIndex == null || !dto) return;

    const transformFn = this.ELEMENTWISE_MAP[transform]; // cell-wise transforms, e.g. Age, Sex, Deceased
    if (transformFn) {
      this.runElementwiseEngine(colIndex, transform, transformFn);
      return;
    }
    const tidyFn = this.TIDY_CELL_FN_MAP[transform]; // "tidy" functions such as toLowerCase.
    if (tidyFn) {
      this.runTidyColumn(colIndex, tidyFn);
      return;
    }
    // Interactive / structural transforms
    switch (transform) {
      case TransformType.IGNORE_COLUMN_TYPE:
        await this.ignoreColumn(colIndex);
        return;
      case TransformType.SINGLE_HPO_TERM:
        await this.applySingleHpoTransform(colIndex);
        return;
      case TransformType.MULTIPLE_HPO_TERM:
        await this.processMultipleHpoColumn(colIndex);
        return;
      case TransformType.SPLIT_COLUMN:
        this.splitColumn(colIndex);
        return;
      case TransformType.DELETE_COLUMN:
        this.deleteColumn(colIndex);
        return;
      case TransformType.CONSTANT_COLUMN:
        this.addConstantColumn(colIndex);
        return;
      case TransformType.MERGE_INDIVIDUAL_FAMILY:
        this.mergeIndividualAndFamilyColumns();
        return;
      case TransformType.ONSET_AGE:
      case TransformType.LAST_ENCOUNTER_AGE:
      case TransformType.LAST_ECOUNTER_AGE_ASSUME_YEARS:
      case TransformType.ONSET_AGE_ASSUME_YEARS:
        this.applyElementwiseTransform(colIndex, transform);
        break;
      case TransformType.ANNOTATE_VARIANTS:
        this.annotateVariants(colIndex);
        break;
      case TransformType.DUPLICATE_COLUMN:
        this.duplicateColumn(colIndex);
        break;
      default:
        this.notificationService.showError(`Did not recognize transformation type "${transform}"`)

    }
  }

  getNewCellValue(cell: EtlCellValue, transform: TransformType): EtlCellValue  {
    const input = cell.original ?? '';
    let output: string | undefined = input;
    switch (transform) {
      case TransformType.STRING_SANITIZE:
        output = sanitizeString(input);
        break;
      case TransformType.REMOVE_WHITESPACE:
        output = removeAllWhitespace(input);
        break;
      case TransformType.TO_UPPERCASE:
        output = input.toUpperCase();
        break;
      case TransformType.TO_LOWERCASE:
        output = input.toLowerCase();
        break;
      case TransformType.ONSET_AGE:
        output = this.etl_service.parseAgeToIso8601(input);
        break;
      case TransformType.LAST_ENCOUNTER_AGE:
        output = this.etl_service.parseAgeToIso8601(input);
        break;
      case TransformType.SEX_COLUMN:
        output = this.etl_service.parseSexColumn(input);
        break;
      case TransformType.ONSET_AGE_ASSUME_YEARS:
      case TransformType.LAST_ECOUNTER_AGE_ASSUME_YEARS:
        output = this.etl_service.parseDecimalYearsToIso8601(input);
        break;
    }
    if (output) {
      return {
        ...cell,
        current: output,
        status: TRANSFORMED,
        error: undefined
      };
    } else {
      return {
        ...cell,
        current: '',
        status: ERROR,
        error: `Could not map "${input}"`
      };
    }
  }

  /* these are "deterministic transforms such as Age, Sex, IndividualId" */
  applyElementwiseTransform(colIndex: number, transform: TransformType): void {
    const dto = this.etl_service.etlDto();
    if (! dto) return;
    const newColumns = dto.table.columns.map((col, i) => {
      if (i !== colIndex) return col; // leave other columns unchanged
      const newValues = col.values.map(cell => this.getNewCellValue(cell, transform));
      switch (transform) {
        case TransformType.AGE_AT_LAST_ENCOUNTER_COLUMN_TYPE:
        case TransformType.LAST_ECOUNTER_AGE_ASSUME_YEARS:
        case TransformType.LAST_ENCOUNTER_AGE:
          const newHeader = {
            ...col.header,
            columnType: EtlColumnType.AgeAtLastEncounter
          };
          return {
            ...col,
            header: newHeader,
            values: newValues
           };
        case TransformType.AGE_OF_ONSET_COLUMN_TYPE:
        case TransformType.ONSET_AGE:
        case TransformType.ONSET_AGE_ASSUME_YEARS:
          const newHeader2 = {
            ...col.header,
            columnType: EtlColumnType.AgeOfOnset
          };
          return {
            ...col,
            header: newHeader2,
            values: newValues
           };
        default:
          return {
            ...col,
            values: newValues
           };
      }
    });
    this.etl_service.updateColumns(newColumns);
  }

  async mergeIndividualAndFamilyColumns(): Promise<void> {
    const dto = this.etl_service.etlDto();
    if (!dto) return;

    try {
      const famIdx = await this.getEtlColumnIndex(EtlColumnType.FamilyId);
      const indIdx = await this.getEtlColumnIndex(EtlColumnType.PatientId);
      if (famIdx < 0 || indIdx < 0) {
        this.notificationService.showError(
          "Could not locate FamilyId or PatientId column"
        );
        return;
      }
      const famCol = dto.table.columns[famIdx];
      const indCol = dto.table.columns[indIdx];

      if (famCol.values.length !== indCol.values.length) {
        this.notificationService.showError(
          "Family and patient columns have different lengths"
        );
        return;
      }

      const mergedIndColumn = {
        ...indCol,
        header: {
          ...indCol.header,
          columnType: EtlColumnType.PatientId
        },
        values: indCol.values.map((cell, i) => {
          const fam = famCol.values[i]?.original ?? '';
          const ind = cell.original ?? '';
          const merged = `${fam} ${ind}`.trim();

          return {
            ...cell,
            current: merged,
            status: EtlCellStatus.Transformed,
            errorMessage: undefined
          };
        })
      };

      // Remove FamilyId column and replace PatientId column
      let newColumns = dto.table.columns
        .filter((_, i) => i !== famIdx)
        .map((col, i) =>
          i === (indIdx > famIdx ? indIdx - 1 : indIdx)
            ? mergedIndColumn
            : col
        );

      // Move merged PatientId column to first position
      const mergedIdx = newColumns.findIndex(
        c => c.header.columnType === EtlColumnType.PatientId
      );

      if (mergedIdx > 0) {
        const [col] = newColumns.splice(mergedIdx, 1);
        newColumns.unshift(col);
      }

      // Commit update
      this.etl_service.updateColumns(newColumns);

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
    const dto = this.etl_service.etlDto();
    if (!dto) {
      this.notificationService.showError("Could not apply transform because external table was null");
      throw new Error("Missing table");
    }

    const indices = dto.table.columns
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
    const dto = this.etl_service.etlDto();
    if (!dto) {
      this.notificationService.showError(
        "Attempting to apply HPO mapping with null ETL table"
      );
      return;
    }
    const newColumns = dto.table.columns.map((col, i) => {
      if (i !== colIndex) return col;
      const newValues = col.values.map(cell => {
        const key = (cell.original ?? '').trim();
        const mapped = mapping.valueToStateMap[key];
        if (mapped === undefined) {
          // No mapping → error, keep original
          return {
            ...cell,
            current: cell.original ?? '',
            status: EtlCellStatus.Error,
            errorMessage: `No mapping for value "${key}"`
          };
        } else {
          return {
            ...cell,
            current: mapped,
            status: EtlCellStatus.Transformed,
            errorMessage: undefined
          };
        }
      });
      const newHeader = {
        ...col.header,
        columnType: EtlColumnType.SingleHpoTerm,
        current: `${mapping.hpoLabel} - ${mapping.hpoId}`
      };
      return {
        ...col,
        values: newValues,
        header: newHeader
      };
    });
    this.etl_service.updateColumns(newColumns);
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
    const dto = this.etl_service.etlDto();
    if (colIndex == null || !dto || colIndex < 0) {
      this.notificationService.showError("Invalid column index");
      return;
    }
    const column = dto.table.columns[colIndex];
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
    this.updateColumnWithMap(colIndex, mapping);
    console.log("consider more code to update title of column");
  }


  /** Reset column to RAW and trigger cell signals if needed */
  resetColumnToRaw(colIndex: number | null): void {
    const dto = this.etl_service.etlDto();
    if (colIndex == null || !dto) return;
    const newColumns = dto.table.columns.map((col, i) => {
      if (i !== colIndex) return col;
      const newValues = col.values.map(cell => ({
        ...cell,
        current: '',
        status: EtlCellStatus.Raw,
        errorMessage: undefined
      }));
      const newHeader = {
        ...col.header,
        columnType: EtlColumnType.Raw,
        current: col.header.original // optional: reset display label
      };
      return {
        ...col,
        values: newValues,
        header: newHeader
      };
    });
    this.etl_service.updateColumns(newColumns);
  }



  /* The column types (e.g., individual, HPO,...) have different colors. Default is white. */
  getColumnColor(type: EtlColumnType): string {
    return columnTypeColors[type] ?? '#ffffff'; // default white
  }

  /** Allows the user to manually set the column type */
  async simpleColumnOp(colIndex: number | null, coltype: string): Promise<void> {
    const dto = this.etl_service.etlDto();
    if (colIndex == null || !dto || colIndex < 0) {
      this.notificationService.showError("Invalid column index");
      return;
    }
    if (coltype == EtlColumnType.Ignore) {
      this.ignoreColumn(colIndex);
    } else if (coltype == EtlColumnType.Raw) {
      this.resetColumn(colIndex);
    }
  }


  importCohortDiseaseData(): void {
    const dto = this.etl_service.etlDto();
    if (! dto) return;
    const cohort = this.cohortService.getCohortData();
    if (cohort == null) {
      this.notificationService.showError("Attempt to import DiseaseData from cohort but cohort was null");
      return;
    }
    if (cohort.cohortType != 'mendelian') {
      this.notificationService.showError(`External ETL only available for mendelian but you tried ${cohort.cohortType}`);
      return;
    }
    if (cohort.diseaseList.length != 1) {
      this.notificationService.showError(`External ETL only available for mendelian but you had ${cohort.diseaseList.length} DiseaseData objects`);
      return;
    }
    const diseaseData = cohort.diseaseList[0];
    this.etl_service.setDisease(diseaseData);
    this.notificationService.showSuccess("Imported cohort data");
  }

  /** Indexing for rows in template forloops. row identity is its index */
  trackRow(index: number, cell: unknown): number {
    return index;
  }


  /** Add the PMID to the ETL DTO; open a modal dialog with our PMID widget */
  openPubmedDialog(): void {
    const dto = this.etl_service.etlDto();
    const dialogRef = this.dialog.open(PubmedComponent, {
      width: '600px',
      data: { pmidDto: null } // optional initial data
    });

    dialogRef.afterClosed().subscribe((result: PmidDto | null) => {
      if (result && dto ) {
        const pmidDto = result;
        this.etl_service.setPmidData(pmidDto);
      } else {
        console.log('User cancelled');
      }
    });
  }
  /** Add the data from the external data to the current CohortData object. If there is no
     * current CohortData object, then initialize it. If there is an error in the ETL data, do nothing
     * except for showing the error.
     */
  async addToCohortData(): Promise<void> {
    const dto = this.etl_service.etlDto();
    if (dto == null) {
      this.notificationService.showError("Could not create CohortData because etlDto was not initialized");
      return;
    }
    const cohort_previous = this.cohortService.getCohortData();
    if (! cohort_previous) {
      this.notificationService.showError("No Cohort data available");
      return;
    }

    try { 
      const cohort_dto_new = await this.configService.transformToCohortData(dto);
      // i.e., the previous cohort has patient data
      if (cohort_previous.rows.length > 0) {
        const merged_cohort = await this.configService.mergeCohortData(cohort_previous, cohort_dto_new);
        this.cohortService.setCohortData(merged_cohort);
        this.router.navigate(['/pttemplate']);
      } else {
        // If we are creating a new cohort, the previous cohort will be empty (zero rows)
        // but it should still contain the cohort acronym
        const acronym = cohort_previous.cohortAcronym ?? '';
        cohort_dto_new.cohortAcronym = acronym;
        this.cohortService.setCohortData(cohort_dto_new);
        this.router.navigate(['/pttemplate']);
      }
    } catch (err: unknown) {
      this.notificationService.showError(
        `addToCohortData-error-Could not create CohortData: ${err instanceof Error ? err.message : err}`
      );
    }
  }

  async processVariantColumn(index: number): Promise<void> {
    const dto = this.etl_service.etlDto();
    if (! dto) return;
    console.log("processVariantColumn etl=", dto);
    try {
      const processed_etl = await this.configService.processAlleleColumn(dto, index);
      this.etl_service.setEtlDto(processed_etl); 
      console.log("processVariantColumn processed_etl=", processed_etl);
    } catch (err) {
      let message = err instanceof Error ? err.message : String(err);
      message = `Could not process alleles: "${message}"`;
      this.notificationService.showError(message);
      console.error("ERROR", message);
    }
  }

  /** Add a new column with a constant value in each cell */
  async addConstantColumn(index: number | null): Promise<void> {
    const dto = this.etl_service.etlDto();
    if (!dto) {
      this.notificationService.showError("Cannot add column - no table loaded");
      return;
    }
    if (index === null) {
      this.notificationService.showError("Cannot add column - no index");
      return;
    }

    const dialogRef = this.dialog.open(AddConstantColumnDialogComponent, {
      width: '400px',
      data: { columnName: '', constantValue: '' }
    });

    const result = await firstValueFrom(dialogRef.afterClosed());

    if (!result || !result.columnName?.trim()) {
      this.notificationService.showError("Constant column creation cancelled or invalid");
      return;
    }

    const { columnName, constantValue } = result;
    const rowCount = Math.max(...dto.table.columns.map(col => col.values.length));
    // A convenience function to create an EtlCellValue with the same string val
    const makeCell = (value: string): EtlCellValue => ({
      original: value,
      current: '',
      status: EtlCellStatus.Raw,
    });
    // Each cell of the column now gets its own copy of this EtlCellValue
    const newValues = Array.from({ length: rowCount }, () => makeCell(constantValue));
    const newColumn: ColumnDto = {
        id: crypto.randomUUID(),
        header: {
          original: columnName.trim(),
          current: columnName.trim(),
          columnType: EtlColumnType.Raw
        },
        values: newValues
      };
      const newColumns = [
        ...dto.table.columns.slice(0, index + 1),
        newColumn,
        ...dto.table.columns.slice(index + 1)
      ];
    this.etl_service.updateColumns(newColumns);
  }



  async openHgvsEditor(): Promise<void> {
    const dto = this.etl_service.etlDto();
    if (!dto) return;
    const colIndex = this.contextMenuCellCol;
    if (colIndex === null) {
      this.notificationService.showError("context menu column is null");
      return;
    }
    const rowIndex = this.contextMenuCellRow;
    if (rowIndex == null) {
      return;
    }
    try {
      const hgvs: HgvsVariant | null = await this.variantDialog.openVariantDialog();

      if (hgvs) {
        const vkey = hgvs.variantKey;
        if (!vkey) {
          this.notificationService.showError(`Could not get key from HGVS object ${hgvs}`);
          return;
        }
        const newHgvsVariants = {
          ...dto.hgvsVariants,
          [vkey]: hgvs
        };
        const newColumns = dto.table.columns.map((col, cIdx) => {
          if (cIdx !== colIndex) return col;
          const newValues = col.values.map((cell, rIdx) => {
            if (rIdx !== rowIndex) return cell;

            return {
              ...cell,
              current: vkey,
              status: EtlCellStatus.Transformed, // optional: mark as transformed
              errorMessage: undefined
            };
          });

          return {
              ...col,
              values: newValues
            };
          });

          this.etl_service.setEtlDto({
            ...dto,
            hgvsVariants: newHgvsVariants,
            table: {
              ...dto.table,
              columns: newColumns
            }
          });
        }
      } catch (error) {
        const errMsg = String(error);
        this.notificationService.showError(errMsg);
      }
    }


  async openSvEditor(): Promise<void> {
    const dto = this.etl_service.etlDto();
    if (!dto) return;
    const colIndex = this.contextMenuCellCol;
    if (colIndex === null) {
      this.notificationService.showError("context menu column is null");
      return;
    }
    const rowIndex = this.contextMenuCellRow;
    if (rowIndex == null) {
      return;
    }
    const cell_contents = dto.table.columns[colIndex].values[rowIndex];
    const diseaseData = dto.disease;
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
    try {
      const sv: StructuralVariant | null = await this.svDialog.openSvDialog(gt, cell_contents.original, chr);
      if (sv) {
        const vkey = sv.variantKey;
        if (!vkey) {
          this.notificationService.showError(`Could not get key from Structural Variant object ${sv}`);
          return;
        }
        const newStructuralVariants = {
          ...dto.structuralVariants,
          [vkey]: sv
        };
          const newColumns = dto.table.columns.map((col, cIdx) => {
          if (cIdx !== colIndex) return col;
          const newValues = col.values.map((cell, rIdx) => {
            if (rIdx !== rowIndex) return cell;
            return {
              ...cell,
              current: vkey,
              status: EtlCellStatus.Transformed, // optional: mark as transformed
              errorMessage: undefined
            };
          });

          return {
              ...col,
              values: newValues
            };
          });

          this.etl_service.setEtlDto({
            ...dto,
            structuralVariants: newStructuralVariants,
            table: {
              ...dto.table,
              columns: newColumns
            }
          });
        }
      } catch (error) {
        const errMsg = String(error);
        this.notificationService.showError(errMsg);
      }
  }

  isHpoTextMiningColumn(colIndex: number): boolean {
    const dto = this.etl_service.etlDto();
    if (! dto) {
      return false;
    }
    const column = dto.table.columns[colIndex];
    if (!column) {
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

  openHpoMiningDialog(colIndex: number, rowIndex: number): void {
    const dto = this.etl_service.etlDto();
    if (! dto) {
        this.notificationService.showError("Could not add mining results because ETL DTO not initialized");
        return;
    };
    const dialogRef = this.dialog.open(HpoTwostepComponent, {
      width: '1200px',
      height: '900px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log("HMINING result=", result);
        
        const col = dto.table.columns[colIndex];
        if (!col) {
          this.notificationService.showError("Could not add mining results because column not defined");
          return;
        }
        const jsonized_cell_calue = JSON.stringify(result);
        col.values[rowIndex].current = jsonized_cell_calue;
        col.values[rowIndex].status = TRANSFORMED;
        col.values[rowIndex].error = undefined;
      }
    });
    
  }

  private getHpoCellData(colIndex: number, rowIndex: number): HpoTermData[] {
    const drows = this.displayRows();
    const cell = drows[rowIndex][colIndex].current;
    if (!cell) return [];
    if (Array.isArray(cell)) return cell;
    try {
      return JSON.parse(cell);
    } catch {
      this.notificationService.showError(`Invalid HPO data in cell: "${cell}"`);
      return [];
    }
  }

  /* Clear HPO textmining and rest state to pristine */
  clearHpoMining(colIndex: number, rowIndex: number): void {
    this.etl_service.updateCell(colIndex, rowIndex, cell => ({
      ...cell,
      current: '',
      status: EtlCellStatus.Raw,    
      errorMessage: undefined  
    }));
  }

  // Compute the current column values for the transformation panel
  get currentColumnCells(): EtlCellValue[] {
    const dto = this.etl_service.etlDto();
    if (!dto|| this.contextMenuColIndex == null) return [];
    return dto.table.columns[this.contextMenuColIndex].values;
  }

  // show the status of an ETL Cell
  getStatusSymbol(val: EtlCellValue | null): string {
    if (! val)  return '❓';
    const status = val.status; 
    switch (status) {
      case EtlCellStatus.Raw:         return '⚪';
      case EtlCellStatus.Transformed: return '✨';
      case EtlCellStatus.Error:       return '❌';
      case EtlCellStatus.Ignored:     return '🚫';
      default:                        return '❓';
    }
  }


}

