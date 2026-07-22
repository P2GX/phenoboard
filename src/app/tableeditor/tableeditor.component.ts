import { Component, computed, HostListener, inject, signal, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { ConfigService } from '../services/config.service';
import { CohortDtoService } from '../services/cohort_dto_service';
import { DiseaseData } from '../../../libs/ui/src/lib/models/cohort_dto';
import { MatDialog } from '@angular/material/dialog';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {
  HpoMappingResult,
  OntologyMatch,
  MinedCell,
  MiningConcept,
  TableFloatingControlsComponent,
  ColumnContextMenuComponent,
  EtlDataTableComponent,
} from '@workspace/ui';
import {
  ColumnDto,
  EtlCellStatus,
  EtlCellValue,
  EtlColumnHeader,
  EtlColumnType,
} from '@workspace/ui';
import { EtlSessionService } from '../services/etl_session_service';
import { HpoHeaderComponent } from '../hpoheader/hpoheader.component';
import { catchError, firstValueFrom, from, Observable, of } from 'rxjs';
import { NotificationService } from 'ng-hpo-uikit';
import { HpoTermDuplet } from '../../../libs/ui/src/lib/models/hpo_term_dto';
import { MultiHpoComponent } from '../multihpo/multihpo.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DeleteConfirmationDialogComponent } from './delete-confirmation.component';
import { removeAllWhitespace, sanitizeString } from '@workspace/ui';
import { AddConstantColumnDialogComponent } from './add-constant-column-dialog.component';
import { VariantDialogService } from '../services/hgvsManualEntryDialogService';
import { SvDialogService } from '../services/svManualEntryDialogService';
import { HgvsVariant, StructuralVariant } from '../../../libs/ui/src/lib/models/variant_dto';
import { ConfirmDialogComponent } from '../confirm/confirmation-dialog.component';
import { SplitColumnDialogComponent } from './split-column.component';
import { HelpService } from '../services/help.service';
import {
  TransformType,
  TransformCategory,
  StringTransformFn,
  columnTypeColors,
  TransformToColumnTypeMap,
} from '@workspace/ui';
import { CellReviewComponent } from '../cellreview/cellreview.component';
import { AppStatusService } from '../services/app_status_service';
import { AgeInputService } from '../services/age_service';
import { TableEditorHeader } from './table-editor-header';
import { EtlCellEditDialogComponent } from '../etl_cell/etl-cell-edit-dialog.component';
import { HpoPopupDialogComponent } from '@workspace/ui';
import { HpoMappingStepComponent } from '@workspace/ui';
import { TableProgressBarComponent } from '@workspace/ui';
import { HpoMiningDialogService } from '../services/hpo-mining-dialog.service';

export const RAW: EtlCellStatus = 'raw' as EtlCellStatus;
export const TRANSFORMED: EtlCellStatus = 'transformed' as EtlCellStatus;
export const ERROR: EtlCellStatus = 'error' as EtlCellStatus;

/**
 * Component for editing external Excel tables (e.g., supplemental files). The external tables are assumed to have lines or columns
 * that represent the attributes of an individual. The logic of the component is that the user transforms the tables one column
 * at a time.
 */
@Component({
  selector: 'app-tableeditor',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatIconModule,
    FormsModule,
    MatTooltipModule,
    ReactiveFormsModule,
    TableEditorHeader,
    TableProgressBarComponent,
    HpoPopupDialogComponent,
    HpoMappingStepComponent,
    TableFloatingControlsComponent,
    ColumnContextMenuComponent,
    EtlDataTableComponent,
  ],
  templateUrl: './tableeditor.component.html',
  styleUrl: './tableeditor.component.scss',
})
export class TableEditorComponent {
  constructor() {
    this.helpService.setHelpContext('table-editor');
  }
  Object = Object;

  private configService = inject(ConfigService);
  private ageService = inject(AgeInputService);
  private dialog = inject(MatDialog);
  public etl_service = inject(EtlSessionService);
  private notificationService = inject(NotificationService);
  private variantDialog = inject(VariantDialogService);
  private svDialog = inject(SvDialogService);
  private helpService = inject(HelpService);
  private cohortService = inject(CohortDtoService);
  public statusService = inject(AppStatusService);
  private miningService = inject(HpoMiningDialogService);
  readonly EtlCellStatus = EtlCellStatus;
  public readonly TransformType = TransformType;
  readonly diseaseDataSignal = signal<DiseaseData | null>(null);
  readonly isProcessing = signal<boolean>(false);

  readonly activeStep = signal<'NONE' | 'SELECT_TERM' | 'MAP_VALUES'>('NONE');

  readonly activeColIndex = signal<number | null>(null);
  readonly columnTitle = signal<string>('');
  readonly bestHpoMatch = signal<OntologyMatch | null>(null);
  readonly selectedHpoTerm = signal<HpoTermDuplet | null>(null);
  readonly uniqueValuesForMapping = signal<string[]>([]);

  diseaseData: DiseaseData | null = null;

  INVISIBLE = -1;
  // to delete
  contextMenuColHeader: EtlColumnHeader | null = null;
  contextMenuColType: string | null = null;

  editModeActive = false;
  visibleColIndex: number = this.INVISIBLE;
  transformedColIndex: number = this.INVISIBLE;

  /* All possible column types */
  etlTypes: EtlColumnType[] = Object.values(EtlColumnType);
  simpleColumnOperations = [EtlColumnType.Ignore, EtlColumnType.Raw];

  headerMenuState = signal<{
    x: number;
    y: number;
    colIdx: number;
    header: EtlColumnHeader;
  } | null>(null);
  cellMenuState = signal<{
    x: number;
    y: number;
    colIdx: number;
    rowIdx: number;
    cell: EtlCellValue;
  } | null>(null);
  contextMenuCellRow: number | null = null;
  contextMenuCellCol: number | null = null;
  contextMenuCellValue: EtlCellValue | null = null;

  errorMessage: string | null = null;
  columnBeingTransformed: number | null = null;
  // The following are used by the single-hpo table operation
  // which column, and what is the map from say "+" to observed etc.?
  readonly mappingColumnIndex = signal<number | null>(null);
  readonly uniqueValuesToMap = signal<string[]>([]);

  contextMenuCellVisible = false;
  contextMenuPosition = signal<{ x: number; y: number }>({ x: 200, y: 200 });
  editModalPosition = signal<{ x: number; y: number }>({ x: 200, y: 200 });
  contextMenuAnchor?: HTMLElement;

  // The following mark columns for merging
  colAforMerge = signal<number | null>(null);
  colBforMerge = signal<number | null>(null);

  contextMenuCellType: EtlColumnType | null = null;

  // For undoing the merge op
  private lastSnapshot = signal<any[] | null>(null);
  undoVisible = signal(false);
  mergeSeparator = signal<string>(' ');
  // if this is true, add (A) original A value (B) original B value
  labelMergedColumn = signal<boolean>(false);

  columnTypeCategories: TransformType[] = [
    TransformType.RAW_COLUMN_TYPE,
    TransformType.FAMILY_ID_COLUMN_TYPE,
    TransformType.INDIVIDUAL_ID_COLUMN_TYPE,
    TransformType.GENE_SYMBOL_COLUMN_TYPE,
    TransformType.DISEASE_COLUMN_TYPE,
    TransformType.SEX_COLUMN_TYPE,
    TransformType.DECEASED_COLUMN_TYPE,
    TransformType.IGNORE_COLUMN_TYPE,
  ];

  /* Functions that perform a fixed operation on cells and do NOT expect the column type to change */
  readonly TIDY_CELL_FN_MAP: Partial<Record<TransformType, StringTransformFn>> = {
    [TransformType.TO_UPPERCASE]: (val) => val.toUpperCase(),
    [TransformType.TO_LOWERCASE]: (val) => val.toLowerCase(),
    [TransformType.REMOVE_WHITESPACE]: (val) => val.replace(/\s+/g, ''),
    [TransformType.STRING_SANITIZE]: (val) => val.trim(), // simplified example
  };

  /* Functions that perform a fixed operation on cells and DO expect the column type to change */
  readonly ELEMENTWISE_MAP: Partial<Record<TransformType, StringTransformFn>> = {
    [TransformType.ONSET_AGE]: (val) => this.ageService.mapEtlAgeString(val),
    [TransformType.LAST_ENCOUNTER_AGE]: (val) => this.ageService.mapEtlAgeString(val),
    [TransformType.ONSET_AGE_ASSUME_YEARS]: (val) => this.ageService.numericYearToIso(val),
    [TransformType.LAST_ECOUNTER_AGE_ASSUME_YEARS]: (val) => this.ageService.numericYearToIso(val),
    [TransformType.SEX_COLUMN]: (val) => this.etl_service.parseSexColumn(val),
    [TransformType.SEX_COLUMN_TYPE]: (val) => this.etl_service.parseSexColumn(val),
    [TransformType.INDIVIDUAL_ID_COLUMN_TYPE]: (val) => sanitizeString(val),
    [TransformType.FAMILY_ID_COLUMN_TYPE]: (val) => sanitizeString(val),
    [TransformType.DECEASED_COLUMN_TYPE]: (val) => this.etl_service.parseDeceasedColumn(val),
  };

  /** A right click on a cell will open a modal dialog and allow us to change the value, which is stored here */
  editingValue: EtlCellValue | null = null;
  editingString = '';
  editModalVisible = signal(false);

  transformationMap: { [original: string]: string } = {};

  /** These are transformations that we can apply to a column while editing. They appear on right click */
  transformOptions = Object.values(TransformType);

  /** Reset if user clicks outside of defined elements. */
  @HostListener('document:click')
  onClickAnywhere(): void {
    this.editModalVisible.set(false);
  }

  // Row-oriented data for template iteration
  displayRows: Signal<EtlCellValue[][]> = computed(() => {
    const dto = this.etl_service.etlDto();
    if (!dto) return [];
    const columns = dto.table.columns;
    if (columns.length === 0) return [];
    const rowCount = Math.max(...columns.map((c) => c.values.length));
    return Array.from({ length: rowCount }, (_, i) =>
      columns.map((c) => c.values[i] ?? { original: '', current: '', status: RAW }),
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
    return dto?.table.columns.map((c) => c.header) ?? [];
  });

  /**
   * Update a single EtlCellValue.
   * Can set value, status, and error.
   */
  updateCell(
    cell: EtlCellValue,
    newValue: string,
    status: EtlCellStatus = TRANSFORMED,
    error?: string,
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
  private updateColumn(colIndex: number, updateCellFn: (cell: EtlCellValue) => EtlCellValue): void {
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
    transformFn: (val: string) => string,
    validateFn?: (val: string) => boolean,
  ): void {
    this.updateColumn(colIndex, (cell) => {
      const newValue = transformFn(cell.original);
      const isValid = validateFn ? validateFn(newValue) : true;
      return {
        ...cell,
        current: isValid ? newValue : cell.current,
        status: isValid ? EtlCellStatus.Transformed : EtlCellStatus.Error,
        errorMessage: isValid ? undefined : 'Invalid value',
      };
    });
  }

  /* Used for manual cell edits (by right click on a cell), which are assumed to be correct (they will be QC'd by backend) */
  onCellEdited(event: { rowIndex: number; colIndex: number; newValue: string }): void {
    const rows = this.displayRows();
    const cell = rows[event.rowIndex][event.colIndex];
    this.updateCell(cell, event.newValue, TRANSFORMED);
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
    return this.visibleColumnsComputed()
      .map((i) => dto.table.columns[i])
      .filter(Boolean);
  });

  trackColumn = (index: number, col: ColumnDto) => {
    return col.id; // if your columns have an `id` field
  };

  /**
   * Returns the unique, trimmed, non-empty values from a column
   */
  private extractUniqueValues(column: EtlCellValue[]): string[] {
    return Array.from(new Set(column.map((v) => v.original.trim()).filter(Boolean)));
  }

  /* get the unique strings values from the column.
   * The values will go into transformationPanelVisible */
  editUniqueValuesInColumn(index: number): void {
    const dto = this.etl_service.etlDto();
    if (!dto) return;
    const column = dto.table.columns[index];
    if (!column) {
      this.notificationService.showError(`Invalid column at index ${index}`);
      return;
    }
    const unique = this.extractUniqueValues(column.values);
    this.transformationMap = Object.fromEntries(unique.map((val) => [val, val]));
    this.activeColIndex.set(index);
    this.headerMenuState.set({
      x: 0,
      y: 0,
      colIdx: index,
      header: column.header,
    });
  }

  getUniqueValues(colIndex: number): string[] {
    const dto = this.etl_service.etlDto();
    if (!dto) return [];
    const column = dto.table.columns[colIndex];
    if (!column) return [];
    return this.extractUniqueValues(column.values);
  }

  /* This method is called from the Popup dialog associated with
   * activeStep() === 'SELECT_TERM'. When we get here, the user will have
   * chosen the HPO term corresponding to the current column, which is a
   * single-HPO column. The current method find all unuque
   * values in the column and put them into uniqueValuesForMapping. It then
   * switches the active step to MAP_VALUES, which will allow the user to
   * map e.g. +/-/? or yes/no/unknown to observed/excluded/na
   */
  onHpoTermSelected(selectedTerm: HpoTermDuplet | null): void {
    if (!selectedTerm) {
      this.notificationService.showError('User cancelled HPO selection');
      this.resetWizard();
      return;
    }
    const colIndex = this.activeColIndex();
    if (colIndex === null) {
      this.notificationService.showError(
        `Could not retrieve column index for column mapping of ${selectedTerm.hpoLabel}.`,
      );
      return;
    }
    const dto = this.etl_service.etlDto();
    if (!dto) return;
    const column = dto.table.columns[colIndex];
    this.selectedHpoTerm.set(selectedTerm);
    // Update column header metadata
    column.header.columnType = EtlColumnType.SingleHpoTerm;
    column.header.hpoTerms = [selectedTerm];
    // Extract values for the next step mapping stage
    const uniqueVals = Array.from(new Set(column.values.map((v) => v.original.trim())));
    this.uniqueValuesToMap.set(uniqueVals);
    // Advance the state machine to the Mapping Screen
    this.activeStep.set('MAP_VALUES');
  }

  onMappingCompleted(mapping: HpoMappingResult | undefined | null): void {
    if (!mapping) {
      this.notificationService.showError('Could not retrieve mappings for HPO column');
      return;
    }
    const colIndex = this.activeColIndex();
    if (colIndex === null) return;

    this.updateColumnWithMap(colIndex, mapping);

    this.resetWizard();
  }

  resetWizard(): void {
    this.activeStep.set('NONE');
    this.activeColIndex.set(null);
    this.selectedHpoTerm.set(null);
    this.bestHpoMatch.set(null);
  }

  performHpoAutocomplete = (query: string): Observable<OntologyMatch[]> => {
    return from(this.configService.performHpoAutocomplete(query)).pipe(
      catchError((err) => {
        this.notificationService.showError(String(err));
        return of([]);
      }),
    );
  };

  /* This method is called upon right click of a header. The goal of the
   * method is the set the HPO term the column is about. After this, the
   * dialog is opened to set the correspondences of symbols in the column,
   * e.g., +,- or yes/no to observed/excluded
   * By setting activeStep to SELECT_TERM we open up a dialog to search for the HPO term.
   * When this method returns, it calls onHpoTermSelected.
   */
  async applySingleHpoTransform(colIndex: number): Promise<void> {
    const dto = this.etl_service.etlDto();
    if (!dto) return;
    const column = dto.table.columns[colIndex];
    const title = column.header.original || 'n/a';

    let bestMatch: OntologyMatch | null = null;
    try {
      bestMatch = (await this.configService.getBestHpoMatch(title)) ?? null;
    } catch {
      this.notificationService.showError('Could not retrieve HPO match suggestion.');
    }

    // Defer the state updates to a fresh macrotask cycle so the rendering loop settles
    setTimeout(() => {
      this.columnTitle.set(title);
      this.activeColIndex.set(colIndex);
      this.bestHpoMatch.set(bestMatch);
      this.activeStep.set('SELECT_TERM');
    });
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
  private updateColumnWithMap(colIndex: number, mapping: HpoMappingResult | undefined): void {
    const dto = this.etl_service.etlDto();
    if (!dto) return;

    this.updateColumn(colIndex, (cell) => {
      if (!mapping) {
        return {
          ...cell,
          current: '',
          status: EtlCellStatus.Error,
          errorMessage: 'User cancelled mapping',
        };
      }
      const newValue = mapping.valueToStateMap[cell.original];
      if (newValue) {
        return {
          ...cell,
          current: newValue,
          status: EtlCellStatus.Transformed,
          errorMessage: undefined,
        };
      } else {
        return {
          ...cell,
          current: '',
          status: EtlCellStatus.Error,
          errorMessage: `Could not map ${cell.original}`,
        };
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
    const originalEntries = col.values.map((v) => v.current || v.original); // Use the current value if available (this means the user update the original value)
    const initialConcepts: MiningConcept[] =
      await this.configService.mapColumnToMiningConcepts(originalEntries);
    const uniqueDictionary: MiningConcept[] =
      await this.configService.create_canonical_dictionary(initialConcepts);
    const globalRef = this.dialog.open(MultiHpoComponent, {
      width: '1200px',
      maxWidth: '95vw',
      data: { concepts: uniqueDictionary, title: col.header.original },
    });
    const confirmedDictionary: MiningConcept[] = await firstValueFrom(globalRef.afterClosed());
    if (!confirmedDictionary) return [];
    const cellMappings = this.configService.createCellMappings(
      confirmedDictionary,
      originalEntries,
    );
    return cellMappings;
  }

  /* Process a column whose cells each may contain zero, one, or multiple HPO terms */
  async processMultipleHpoColumn(colIndex: number): Promise<void> {
    const dto = this.etl_service.etlDto();
    if (!dto) return;
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
          title: col.header.original,
        },
      });
      const finalResults: MinedCell[] = await firstValueFrom(cellReviewRef.afterClosed());
      if (!finalResults) return;
      /// Assign the concepts to the corresponding rows
      const rowMultiHpoStrings = await this.configService.getMultiHpoStrings(finalResults);

      const newColumns: ColumnDto[] = dto.table.columns.map((column, i) => {
        if (i !== colIndex) return column;
        const newValues: EtlCellValue[] = column.values.map((cell, rowIndex) => {
          const mappedValue = rowMultiHpoStrings[rowIndex];
          return {
            ...cell,
            current: mappedValue,
            status: EtlCellStatus.Transformed,
            error: undefined,
          };
        });
        const updatedCol = { ...column };
        updatedCol.values = newValues;
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
    concepts.forEach((c) => {
      c.mappedTermList.forEach((duplet) => {
        unique.set(duplet.hpoId, { hpoId: duplet.hpoId, hpoLabel: duplet.hpoLabel });
      });
    });
    return Array.from(unique.values());
  }

  deleteRowAtI(i: number): void {
    const dto = this.etl_service.etlDto();
    if (!dto) return;
    const newColumns = dto.table.columns.map((col) => ({
      ...col,
      values: [...col.values.slice(0, i), ...col.values.slice(i + 1)],
    }));
    this.etl_service.updateColumns(newColumns);
  }

  async deleteRow() {
    const etlDto = this.etl_service.etlDto();
    if (!etlDto) return;

    const rowIndex = this.contextMenuCellRow;
    if (rowIndex == null) {
      this.notificationService.showError(
        'Could not delete row because we could not get context menu cell row index.',
      );
      return;
    }

    const firstCell = etlDto.table.columns[0].values[rowIndex]?.current ?? '';

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: `Delete row ${rowIndex}`,
        message: firstCell,
        confirmText: 'delete',
        cancelText: 'cancel',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.deleteRowAtI(rowIndex);
      } else {
        this.notificationService.showError('Did not delete row');
      }
    });
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
      this.notificationService.showError('Attempt to focus on columns with null ETL table');
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
    if (!dto) return;
    if (index === null) return;
    const uniqueValues: string[] = this.getUniqueValues(index);
    const columnName = dto.table.columns[index].header.original || `Column ${index}`;
    const dialogRef = this.dialog.open(DeleteConfirmationDialogComponent, {
      width: '500px',
      data: {
        columnName: columnName,
        uniqueValues: uniqueValues,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
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
        original: `B. ${originalColumn.header.original}`,
      },
    };
    // Create a new columns array with the cloned column inserted
    const newColumns = [
      ...dto.table.columns.slice(0, index + 1),
      clonedColumn,
      ...dto.table.columns.slice(index + 1),
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
    if (originalColumn.values.length < 1) return;
    const example = originalColumn.values[0].original;

    const dialogRef = this.dialog.open(SplitColumnDialogComponent, {
      width: '400px',
      data: { originalHeader: originalColumn.header.original, example: example },
    });

    dialogRef.afterClosed().subscribe((result: string) => {
      if (!result) return; // user cancelled
      const separator = result;

      // deep copy original column
      const columnA: ColumnDto = JSON.parse(JSON.stringify(originalColumn));
      const columnB: ColumnDto = JSON.parse(JSON.stringify(originalColumn));
      columnA.id = crypto.randomUUID();
      columnB.id = crypto.randomUUID();

      columnA.header = { ...columnA.header, original: `(A): ${originalColumn.header.original}` };
      columnB.header = { ...columnA.header, original: `(B): ${originalColumn.header.original}` };

      originalColumn.values.forEach((cell, i) => {
        const text = cell?.original ?? '';
        const firstIdx = text.indexOf(separator);
        let valA: string;
        let valB: string;
        if (firstIdx === -1 || separator === '') {
          valA = text || 'na';
          valB = 'na';
        } else {
          valA = text.substring(0, firstIdx).trim() || 'na';
          valB = text.substring(firstIdx + separator.length).trim() || 'na';
        }
        columnA.values[i] = { ...cell, original: valA, current: valA, status: RAW };
        columnB.values[i] = { ...cell, original: valB, current: valB, status: RAW };
      });

      const newColumns = [...columns];
      newColumns.splice(index, 1, columnA, columnB);
      this.etl_service.updateColumns(newColumns);
    });
  }

  /** Use Variant Validator in the backend to annotate each variant string in the column.
   * Upon successful validation, add the variant key to the ETL DTO.  
   */
  async annotateVariants(colIndex: number): Promise<void> {
    const dto = this.etl_service.etlDto();
    if (dto == null) return;
    this.isProcessing.set(true);
    this.statusService.progress.set(1);
    // Give the UI thread a moment to render the progress bar
    await new Promise((resolve) => setTimeout(resolve, 20));
    try {
      const new_dto = await this.configService.processAlleleColumn(dto, colIndex);
      this.etl_service.setEtlDto(new_dto);
    } catch (error) {
      const errMsg = String(error);
      this.notificationService.showError(errMsg);
    } finally {
      this.isProcessing.set(false);
    }
  }

  /**
   *
   * @param index Used by the angular code to determine if a column is transformed and
   * thus should be displayed differently
   * @returns true iff column is transformed
   */
  isTransformedColumn(index: number): boolean {
    const dto = this.etl_service.etlDto();
    if (!dto) return false;
    const column = dto.table.columns[index];
    if (!column?.values?.length) {
      return false;
    }

    return column.values.every((cell) => cell.status === EtlCellStatus.Transformed);
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
    if (!dto) return;
    const cell = this.contextMenuCellValue;
    this.editingValue = cell;
    const colIndex = this.contextMenuCellCol;
    const rowIndex = this.contextMenuCellRow;
    if (!colIndex || !rowIndex) {
      const emsg = `Index information incomplete: col: ${colIndex} - row: ${rowIndex}`;
      this.notificationService.showError(emsg);
      return;
    }
    if (!cell) {
      this.notificationService.showError('Could not edit cell: missing context.');
      return;
    }
    if (!this.hasValueAbove()) return;
    if (this.contextMenuCellCol == null) {
      this.notificationService.showError('contextMenuCellCol is null');
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
          errorMessage: undefined,
        };
      });
      return { ...col, values: newValues };
    });

    this.contextMenuCellValue = newColumns[colIndex].values[rowIndex];
    this.editModalVisible.set(false);
    this.etl_service.updateColumns(newColumns);
  }

  /* for the right-click context menu on edit cells */
  handleMenuAction(action: () => void) {
    action();
    setTimeout(() => {
      this.contextMenuCellVisible = false;
      console.log('Menu closed after action');
    }, 0);
    console.log('handle menu');
  }

  /**
   * Open a modal dialog to allow the user to manually edit the cell that was clicked. The function
   * will cause a modal to appear that will activate the function saveManualEdit to perform the save.
   */
  async editCellValueManually(): Promise<void> {
    const dto = this.etl_service.etlDto();
    const cell = this.contextMenuCellValue;
    const colIndex = this.contextMenuCellCol;
    if (!cell || colIndex == null || !dto) {
      this.notificationService.showError('Could not edit cell: missing context.');
      this.contextMenuCellVisible = false; // Close it anyway since we can't act
      return;
    }

    const dialogRef = this.dialog.open(EtlCellEditDialogComponent, {
      data: { original: cell.original, current: cell.current },
      width: '400px',
    });
    const result = await firstValueFrom(dialogRef.afterClosed());
    if (result !== undefined) {
      this.saveManualEdit(result);
    }

    this.contextMenuCellVisible = false;
  }

  /**
   * Save a manual edit to a table cell.
   * @param newValue The string returned from the dialog or input
   */
  async saveManualEdit(newValue: string): Promise<void> {
    const dto = this.etl_service.etlDto();
    if (!dto) return;

    const colIndex = this.contextMenuCellCol;
    const rowIndex = this.contextMenuCellRow;

    if (colIndex == null || rowIndex == null) {
      this.notificationService.showError('Could not save value: missing row or column index');
      return;
    }

    const newColumns = dto.table.columns.map((col, i) => {
      if (i !== colIndex) return col;

      const newValues = col.values.map((cell, j) => {
        if (j !== rowIndex) return cell;

        return {
          ...cell,
          // Overwrite original value
          original: newValue.trim(),
          current: newValue.trim(),
          status: EtlCellStatus.Transformed,
          errorMessage: undefined,
        };
      });
      return { ...col, values: newValues };
    });

    this.etl_service.updateColumns(newColumns);

    this.editModalVisible.set(false);
    this.contextMenuCellVisible = false;
  }

  // Structure to be used in the context menu
  readonly transformCategories: TransformCategory[] = [
    {
      label: 'Set/QC columns',
      transforms: [
        TransformType.INDIVIDUAL_ID_COLUMN_TYPE,
        TransformType.FAMILY_ID_COLUMN_TYPE,
        TransformType.SEX_COLUMN,
        TransformType.ONSET_AGE,
        TransformType.ONSET_AGE_ASSUME_YEARS,
        TransformType.LAST_ENCOUNTER_AGE,
        TransformType.LAST_ECOUNTER_AGE_ASSUME_YEARS,
        TransformType.DECEASED_COLUMN_TYPE,
      ],
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
      ],
    },
    {
      label: 'HPO Transforms',
      transforms: [TransformType.SINGLE_HPO_TERM, TransformType.MULTIPLE_HPO_TERM],
    },
    {
      label: 'Alleles/variants',
      transforms: [TransformType.ANNOTATE_VARIANTS],
    },
    {
      label: 'Column operations',
      transforms: [
        TransformType.IGNORE_COLUMN_TYPE,
        TransformType.DELETE_COLUMN,
        TransformType.DUPLICATE_COLUMN,
        TransformType.CONSTANT_COLUMN,
        TransformType.SPLIT_COLUMN,
      ],
    },
  ];

  // Helper method to get transform display name
  getTransformDisplayName(transform: TransformType): string {
    const displayNames: { [key in TransformType]: string } = {
      [TransformType.STRING_SANITIZE]: 'Sanitize (trim/ASCII)',
      [TransformType.REMOVE_WHITESPACE]: 'Remove all whitespace',
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
      [TransformType.RAW_COLUMN_TYPE]: 'Raw',
      [TransformType.FAMILY_ID_COLUMN_TYPE]: 'Family ID',
      [TransformType.INDIVIDUAL_ID_COLUMN_TYPE]: 'Individual ID',
      [TransformType.GENE_SYMBOL_COLUMN_TYPE]: 'Gene symbol',
      [TransformType.DISEASE_COLUMN_TYPE]: 'Disease',
      [TransformType.SEX_COLUMN_TYPE]: 'Sex',
      [TransformType.DECEASED_COLUMN_TYPE]: 'Deceased',
      [TransformType.IGNORE_COLUMN_TYPE]: 'Ignore',
      [TransformType.ANNOTATE_VARIANTS]: 'Annotate variants',
    };
    return displayNames[transform] || transform;
  }

  /** Transform a single column in-place using signals */
  transformColumnElementwise(colIndex: number, transform: TransformType) {
    const dto = this.etl_service.etlDto();
    if (!dto) return;
    const col = dto.table.columns[colIndex];
    if (!col || !col.values) return;
    col.values.forEach((cell) => {
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
          transformed =
            this.ageService.mapEtlAgeString(original) ?? `Could not convert ${original}`;
          break;
        case TransformType.ONSET_AGE_ASSUME_YEARS:
        case TransformType.LAST_ECOUNTER_AGE_ASSUME_YEARS:
          transformed =
            this.ageService.numericYearToIso(original) ?? `Could not convert ${original}`;
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
      } else {
        cell.current = '';
        cell.status = ERROR;
        cell.error = `Could not map "${original}"`;
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
      const newValues = col.values.map((cell) => ({
        ...cell,
        status: EtlCellStatus.Ignored,
        errorMessage: undefined,
      }));
      const newHeader = {
        ...col.header,
        columnType: EtlColumnType.Ignore,
      };
      return {
        ...col,
        values: newValues,
        header: newHeader,
      };
    });
    this.etl_service.updateColumns(newColumns);
  }

  async resetColumn(colIndex: number): Promise<void> {
    const dto = this.etl_service.etlDto();
    if (!dto) return;
    const newColumns = dto.table.columns.map((col, i) => {
      if (i !== colIndex) return col; // leave other columns unchanged
      const newValues = col.values.map((cell) => ({
        ...cell,
        status: EtlCellStatus.Raw,
        current: '',
        error: undefined,
      }));
      const newHeader = {
        ...col.header,
        columnType: EtlColumnType.Raw,
      };
      return {
        ...col,
        values: newValues,
        header: newHeader,
      };
    });
    this.etl_service.updateColumns(newColumns);
  }

  /* change a single element. We use this, for instance, after manually editing the
   * value of one cell. We change both the original value (not current), because we expect that
   * the use will need to re-run the actual transform to confirm (and this would start
   * from original!). */
  async runElementwiseEngine(
    colIndex: number,
    transform: TransformType,
    fn: StringTransformFn,
  ): Promise<void> {
    const dto = this.etl_service.etlDto();
    if (!dto) return;
    const newColumnType = TransformToColumnTypeMap[transform];

    if (newColumnType) {
      this.setColumnMetadata(colIndex, newColumnType);
    } else {
      this.notificationService.showError(
        `Could not identify column type for ${transform}. Aborting operation.`,
      );
      return;
    }
    const newColumns = dto.table.columns.map((col, i) => {
      if (i !== colIndex) return col; // leave other columns unchanged

      // Transform each cell
      const newValues = col.values.map((cell) => {
        try {
          const result = fn(cell.original ?? '');
          if (!result) {
            return {
              ...cell,
              current: '',
              status: EtlCellStatus.Error,
              errorMessage: `Could not map ${cell.original}`,
            };
          } else {
            return {
              ...cell,
              current: result,
              status: EtlCellStatus.Transformed,
              errorMessage: undefined,
            };
          }
        } catch (e) {
          return {
            ...cell,
            status: EtlCellStatus.Error,
            errorMessage: String(e),
          };
        }
      });
      const newHeader = { ...col.header, columnType: newColumnType };
      return { ...col, values: newValues, header: newHeader };
    });
    this.etl_service.updateColumns(newColumns);
  }

  /* Used for operations such as ASCII-sanitization, UPPER-CASE, and trim */
  async runTidyColumn(colIndex: number | null, fn: StringTransformFn) {
    const dto = this.etl_service.etlDto();
    if (!dto || !colIndex) return;
    const col = dto.table.columns[colIndex];
    const newColumns = dto.table.columns.map((col, i) => {
      if (i !== colIndex) return col; // leave other columns unchanged
      const newValues = col.values.map((cell) => {
        const input = cell.original ?? '';
        const output: string | undefined = fn(input);
        if (output) {
          return {
            ...cell,
            current: output,
            error: '',
          };
        } else {
          return {
            ...cell,
            current: '',
            status: ERROR,
            error: `Could not map "${input}"`,
          };
        }
      });
      return { ...col, values: newValues };
    });
    this.etl_service.updateColumns(newColumns);
  }

  /*
   * This is applied from the app-column-context-menu component depending on the choice of the user.
   */
  async applyNamedTransform(colIndex: number | null, rawTransform: TransformType): Promise<void> {
    console.log('applyNamedTransform rawtransform = ', rawTransform);
    const dto = this.etl_service.etlDto();
    if (colIndex == null || !dto) return;
    let transform: TransformType = rawTransform;
    if (typeof rawTransform === 'string' && !(rawTransform in TransformType)) {
      const matchingKey = Object.keys(TransformType).find(
        (key) => TransformType[key as keyof typeof TransformType] === rawTransform,
      );
      console.log('Matchking key', matchingKey);
      if (matchingKey) {
        transform = TransformType[matchingKey as keyof typeof TransformType];
      }
    }
    // 1. Check cell-wise transforms (Age, Sex, Deceased mappings handled globally)
    const transformFn = this.ELEMENTWISE_MAP[transform];
    if (transformFn) {
      this.runElementwiseEngine(colIndex, transform, transformFn);
      return;
    }

    // 2. Check "tidy" format functions (e.g., toLowerCase, removeWhitespace)
    const tidyFn = this.TIDY_CELL_FN_MAP[transform];
    if (tidyFn) {
      this.runTidyColumn(colIndex, tidyFn);
      return;
    }

    // 3. Interactive, modal-driven, or structural layouts
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

      case TransformType.ANNOTATE_VARIANTS:
        this.annotateVariants(colIndex);
        return;

      case TransformType.DUPLICATE_COLUMN:
        this.duplicateColumn(colIndex);
        return;

      default:
        setTimeout(() => {
          this.notificationService.showError(
            `[TableEditorComponent::applyNamedTransform] Did not recognize transformation type "${transform}"`,
          );
        });
        return;
    }
  }

  getNewCellValue(cell: EtlCellValue, transform: TransformType): EtlCellValue {
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
      case TransformType.SEX_COLUMN:
        output = this.etl_service.parseSexColumn(input);
        break;
      case TransformType.ONSET_AGE:
      case TransformType.LAST_ENCOUNTER_AGE:
        output = this.ageService.mapEtlAgeString(input);
        break;
      case TransformType.ONSET_AGE_ASSUME_YEARS:
      case TransformType.LAST_ECOUNTER_AGE_ASSUME_YEARS:
        output = this.ageService.numericYearToIso(input);
        break;
    }
    if (output) {
      return {
        ...cell,
        current: output,
        status: TRANSFORMED,
        error: undefined,
      };
    } else {
      return {
        ...cell,
        current: '',
        status: ERROR,
        error: `Could not map "${input}"`,
      };
    }
  }

  /* these are "deterministic transforms such as Age, Sex, IndividualId" */
  applyElementwiseTransform(colIndex: number, transform: TransformType): void {
    const dto = this.etl_service.etlDto();
    if (!dto) return;
    const newColumns = dto.table.columns.map((col, i) => {
      if (i !== colIndex) return col; // leave other columns unchanged
      const newValues = col.values.map((cell) => this.getNewCellValue(cell, transform));
      switch (transform) {
        case TransformType.LAST_ECOUNTER_AGE_ASSUME_YEARS:
        case TransformType.LAST_ENCOUNTER_AGE:
          const newHeader = {
            ...col.header,
            columnType: EtlColumnType.AgeAtLastEncounter,
          };
          return {
            ...col,
            header: newHeader,
            values: newValues,
          };
        case TransformType.ONSET_AGE:
        case TransformType.ONSET_AGE_ASSUME_YEARS:
          const newHeader2 = {
            ...col.header,
            columnType: EtlColumnType.AgeOfOnset,
          };
          return {
            ...col,
            header: newHeader2,
            values: newValues,
          };
        default:
          return {
            ...col,
            values: newValues,
          };
      }
    });
    this.etl_service.updateColumns(newColumns);
  }

  executeTransform(colIndex: number, transform: any): void {
    this.headerMenuState.set(null);

    // 2. Defer execution slightly to allow Angular's change detection cycle to complete safely
    setTimeout(() => {
      this.applyNamedTransform(colIndex, transform);
    }, 0);
  }

  async executeMerge(): Promise<void> {
    const idxA = this.colAforMerge();
    const idxB = this.colBforMerge();
    const dto = this.etl_service.etlDto();

    if (idxA === null || idxB === null || !dto) {
      this.notificationService.showError(
        'Could not merge columns - Be sure to set both column A and B',
      );
      return;
    }
    this.lastSnapshot.set([...dto.table.columns]);
    const sep = this.mergeSeparator();
    const labelAB = this.labelMergedColumn();
    try {
      const colA = dto.table.columns[idxA];
      const colB = dto.table.columns[idxB];
      const mergedColumn = {
        ...colA,
        header: {
          ...colA.header,
          label: `${colA.header.original}_merged`,
          columnType: EtlColumnType.Raw, // Reset so user can re-classify the merged result
        },
        values: colA.values.map((cell, i) => {
          const valA = cell.original ?? '';
          const valB = colB.values[i]?.original ?? '';
          const mergedValue = labelAB
            ? `(A) ${valA} ${sep} (B) ${valB}`.trim()
            : `${valA}${sep}${valB}`.trim();
          return {
            ...cell,
            original: mergedValue,
            status: EtlCellStatus.Transformed,
          };
        }),
      };
      // Build the new column array:
      // 1. Remove both old columns
      // 2. Insert the merged one at the position of A
      let newColumns = [...dto.table.columns];

      // We remove the higher index first so the lower index remains stable
      const firstToRemove = Math.max(idxA, idxB);
      const secondToRemove = Math.min(idxA, idxB);

      newColumns.splice(firstToRemove, 1);
      newColumns.splice(secondToRemove, 1);

      // Insert merged column at the original position of A (or adjusted)
      const insertIdx = idxA > firstToRemove ? idxA - 1 : idxA > secondToRemove ? idxA - 1 : idxA;
      newColumns.splice(insertIdx, 0, mergedColumn);

      this.etl_service.updateColumns(newColumns);

      // Success & Reset
      this.notificationService.showSuccess('Columns merged successfully');
      this.colAforMerge.set(null);
      this.colBforMerge.set(null);
      this.undoVisible.set(true);
      setTimeout(() => this.undoVisible.set(false), 10000);
    } catch (e) {
      this.notificationService.showError('Merge failed: ' + String(e));
    }
  }
  undoMerge(): void {
    const snapshot = this.lastSnapshot();
    if (snapshot) {
      this.etl_service.updateColumns(snapshot);
      this.lastSnapshot.set(null);
      this.undoVisible.set(false);
      this.notificationService.showSuccess('Merge undone.');
    }
  }

  /** Apply a mapping for a column with a single HPO term */
  applyHpoMapping(colIndex: number, mapping: HpoMappingResult): void {
    const dto = this.etl_service.etlDto();
    if (!dto) {
      this.notificationService.showError('Attempting to apply HPO mapping with null ETL table');
      return;
    }
    const newColumns = dto.table.columns.map((col, i) => {
      if (i !== colIndex) return col;
      const newValues = col.values.map((cell) => {
        const key = (cell.original ?? '').trim();
        const mapped = mapping.valueToStateMap[key];
        if (mapped === undefined) {
          // No mapping → error, keep original
          return {
            ...cell,
            current: cell.original ?? '',
            status: EtlCellStatus.Error,
            errorMessage: `No mapping for value "${key}"`,
          };
        } else {
          return {
            ...cell,
            current: mapped,
            status: EtlCellStatus.Transformed,
            errorMessage: undefined,
          };
        }
      });
      const newHeader = {
        ...col.header,
        columnType: EtlColumnType.SingleHpoTerm,
        current: `${mapping.hpoLabel} - ${mapping.hpoId}`,
      };
      return {
        ...col,
        values: newValues,
        header: newHeader,
      };
    });
    this.etl_service.updateColumns(newColumns);
  }

  /** Retrieve the single HPO term associated with a column header */
  getSingleHpoTerm(header: EtlColumnHeader): HpoTermDuplet {
    if (header.columnType !== EtlColumnType.SingleHpoTerm) {
      throw new Error('Header is not a single HPO term column');
    }
    if (!header.hpoTerms || header.hpoTerms.length === 0) {
      throw new Error('No HPO term found in header metadata');
    }
    return header.hpoTerms[0];
  }

  async processHpoColumn(colIndex: number | null): Promise<void> {
    const dto = this.etl_service.etlDto();
    if (colIndex == null || !dto || colIndex < 0) {
      this.notificationService.showError('Invalid column index');
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
      new Set(column.values.map((v) => v.original.trim()).filter(Boolean)),
    );
    const dialogRef = this.dialog.open(HpoHeaderComponent, {
      data: {
        header: column.header.original,
        hpoId: hpoTerm.hpoId,
        hpoLabel: hpoTerm.hpoLabel,
        uniqueValues,
      },
    });

    const mapping: HpoMappingResult | undefined = await firstValueFrom(dialogRef.afterClosed());
    this.updateColumnWithMap(colIndex, mapping);
    console.log('consider more code to update title of column');
  }

  /** Reset column to RAW and trigger cell signals if needed */
  resetColumnToRaw(colIndex: number | null): void {
    const dto = this.etl_service.etlDto();
    if (colIndex == null || !dto) return;
    const newColumns = dto.table.columns.map((col, i) => {
      if (i !== colIndex) return col;
      const newValues = col.values.map((cell) => ({
        ...cell,
        current: '',
        status: EtlCellStatus.Raw,
        errorMessage: undefined,
      }));
      const newHeader = {
        ...col.header,
        columnType: EtlColumnType.Raw,
        current: col.header.original, // optional: reset display label
      };
      return {
        ...col,
        values: newValues,
        header: newHeader,
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
      this.notificationService.showError('Invalid column index');
      return;
    }
    if (coltype == EtlColumnType.Ignore) {
      this.ignoreColumn(colIndex);
    } else if (coltype == EtlColumnType.Raw) {
      this.resetColumn(colIndex);
    }
  }

  async processVariantColumn(index: number): Promise<void> {
    const dto = this.etl_service.etlDto();
    if (!dto) return;
    try {
      const processed_etl = await this.configService.processAlleleColumn(dto, index);
      this.etl_service.setEtlDto(processed_etl);
    } catch (err) {
      let message = err instanceof Error ? err.message : String(err);
      message = `Could not process alleles: "${message}"`;
      this.notificationService.showError(message);
    }
  }

  /** Add a new column with a constant value in each cell */
  async addConstantColumn(index: number | null): Promise<void> {
    const dto = this.etl_service.etlDto();
    if (!dto) {
      this.notificationService.showError('Cannot add column - no table loaded');
      return;
    }
    if (index === null) {
      this.notificationService.showError('Cannot add column - no index');
      return;
    }

    const dialogRef = this.dialog.open(AddConstantColumnDialogComponent, {
      width: '400px',
      data: { columnName: '', constantValue: '' },
    });

    const result = await firstValueFrom(dialogRef.afterClosed());

    if (!result || !result.columnName?.trim()) {
      this.notificationService.showError('Constant column creation cancelled or invalid');
      return;
    }

    const { columnName, constantValue } = result;
    const rowCount = Math.max(...dto.table.columns.map((col) => col.values.length));
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
        columnType: EtlColumnType.Raw,
      },
      values: newValues,
    };
    const newColumns = [
      ...dto.table.columns.slice(0, index + 1),
      newColumn,
      ...dto.table.columns.slice(index + 1),
    ];
    this.etl_service.updateColumns(newColumns);
  }

  async openHgvsEditor(): Promise<void> {
    const dto = this.etl_service.etlDto();
    if (!dto) return;
    const colIndex = this.contextMenuCellCol;
    if (colIndex === null) {
      this.notificationService.showError('context menu column is null');
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
          [vkey]: hgvs,
        };
        const newColumns = dto.table.columns.map((col, cIdx) => {
          if (cIdx !== colIndex) return col;
          const newValues = col.values.map((cell, rIdx) => {
            if (rIdx !== rowIndex) return cell;

            return {
              ...cell,
              current: vkey,
              status: EtlCellStatus.Transformed, // optional: mark as transformed
              errorMessage: undefined,
            };
          });

          return {
            ...col,
            values: newValues,
          };
        });

        this.etl_service.setEtlDto({
          ...dto,
          hgvsVariants: newHgvsVariants,
          table: {
            ...dto.table,
            columns: newColumns,
          },
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
      this.notificationService.showError('context menu column is null');
      return;
    }
    const rowIndex = this.contextMenuCellRow;
    if (rowIndex == null) {
      return;
    }
    const cell_contents = dto.table.columns[colIndex].values[rowIndex];
    const diseaseData = dto.disease;
    if (diseaseData == null) {
      this.notificationService.showError('Disease data not initialized');
      return;
    }
    if (diseaseData.geneTranscriptList.length != 1) {
      this.notificationService.showError(
        'Currently this module requires a single gene/transcript object',
      );
      return;
    }
    const gt = diseaseData.geneTranscriptList[0];
    const chr: string = this.cohortService.getChromosome();
    try {
      const sv: StructuralVariant | null = await this.svDialog.openSvDialog(
        gt,
        cell_contents.original,
        chr,
      );
      if (sv) {
        const vkey = sv.variantKey;
        if (!vkey) {
          this.notificationService.showError(
            `Could not get key from Structural Variant object ${sv}`,
          );
          return;
        }
        const newStructuralVariants = {
          ...dto.structuralVariants,
          [vkey]: sv,
        };
        const newColumns = dto.table.columns.map((col, cIdx) => {
          if (cIdx !== colIndex) return col;
          const newValues = col.values.map((cell, rIdx) => {
            if (rIdx !== rowIndex) return cell;
            return {
              ...cell,
              current: vkey,
              status: EtlCellStatus.Transformed, // optional: mark as transformed
              errorMessage: undefined,
            };
          });

          return {
            ...col,
            values: newValues,
          };
        });

        this.etl_service.setEtlDto({
          ...dto,
          structuralVariants: newStructuralVariants,
          table: {
            ...dto.table,
            columns: newColumns,
          },
        });
      }
    } catch (error) {
      const errMsg = String(error);
      this.notificationService.showError(errMsg);
    }
  }

  /* This is for the HPO mining column where we can add additional data from narrative texts if they are available in addition to the table */
  openHpoMiningDialog(colIndex: number, rowIndex: number): void {
    const dto = this.etl_service.etlDto();
    if (!dto) {
      this.notificationService.showError(
        'Could not add mining results because ETL DTO not initialized',
      );
      return;
    }
    this.miningService.openHpoTwoStepDialog().subscribe((hpoTermDataList) => {
      if (!hpoTermDataList) return;
      console.log('HMINING result structure parsed successfully:', hpoTermDataList);
      const jsonizedCellValue = JSON.stringify(hpoTermDataList);
      const newColumns = dto.table.columns.map((col, cIdx) => {
        if (cIdx !== colIndex) return col;
        const newValues = col.values.map((cell, rIdx) => {
          if (rIdx !== rowIndex) return cell;
          return {
            ...cell,
            current: jsonizedCellValue,
            status: EtlCellStatus.Transformed,
            error: undefined,
          };
        });
        return { ...col, values: newValues };
      });
      this.etl_service.updateColumns(newColumns);
    });
  }

  // show the status of an ETL Cell
  getStatusSymbol(val: EtlCellValue | null): string {
    if (!val) return '❓';
    const status = val.status;
    switch (status) {
      case EtlCellStatus.Raw:
        return '⚪';
      case EtlCellStatus.Transformed:
        return '✨';
      case EtlCellStatus.Error:
        return '❌';
      case EtlCellStatus.Ignored:
        return '🚫';
      default:
        return '❓';
    }
  }

  /** This method is wired to the EtlDataTableComponent componet -- when the user rightclicks on a column header. We open
   * a context menu here so that the user can say what type of column it is and trigger processing. A dialog is opened
   * in the template by " @if (headerMenuState();", which in turn opens the component ColumnContextMenuComponent, which is a relatively
   * simple component with three outputs that are connected to simpleColumnOp, applyNamedTransform, and a merge Action that
   * is implemented in the template itself.
   */
  openHeaderMenu(data: { event: MouseEvent; index: number; header: any }): void {
    console.log('openHeaderMenu data=', data);
    this.headerMenuState.set({
      x: data.event.clientX,
      y: data.event.clientY,
      colIdx: data.index,
      header: data.header,
    });
  }

  openCellMenu(data: { event: MouseEvent; rowIdx: number; colIdx: number; cell: any }): void {
    this.contextMenuCellValue = data.cell;
    this.contextMenuCellValue = data.cell;
    this.contextMenuCellCol = data.colIdx;
    this.contextMenuCellRow = data.rowIdx;
    this.contextMenuPosition.set({ x: data.event.clientX, y: data.event.clientY });
    this.contextMenuCellVisible = true;
  }

  triggerInlineCellEdit(data: { rowIdx: number; colIdx: number; cell: any }): void {
    this.contextMenuCellValue = data.cell;
    this.contextMenuCellCol = data.colIdx;
    this.contextMenuCellRow = data.rowIdx;
    this.editCellValueManually();
  }

  onCellDoubleClicked(eventData: { rowIdx: number; colIdx: number; cell: EtlCellValue }): void {
    const dto = this.etl_service.etlDto();
    if (!dto) return;
    const targetColumn = dto.table.columns[eventData.colIdx];
    const colType: EtlColumnType = targetColumn?.header.columnType;

    if (colType === EtlColumnType.HpoTextMining) {
      this.openHpoMiningDialog(eventData.colIdx, eventData.rowIdx);
    } else {
      this.triggerInlineCellEdit(eventData);
    }
  }
}
