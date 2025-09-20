import { ChangeDetectorRef, Component, HostListener, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
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
import { ColumnDto, ColumnTableDto, EtlColumnHeader, EtlColumnType, EtlDto, fromColumnDto } from '../models/etl_dto';
import { EtlSessionService } from '../services/etl_session_service';
import { HpoHeaderComponent } from '../hpoheader/hpoheader.component';
import { ValueMappingComponent } from '../valuemapping/valuemapping.component';
import { firstValueFrom } from 'rxjs';
import { HpoDialogWrapperComponent } from '../hpoautocomplete/hpo-dialog-wrapper.component';
import { NotificationService } from '../services/notification.service';
import { HpoMappingRow, HpoTermDuplet } from '../models/hpo_term_dto';
import { MultiHpoComponent } from '../multihpo/multihpo.component';
import { TextAnnotationDto } from '../models/text_annotation_dto';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DeleteConfirmationDialogComponent } from './delete-confirmation.component';
import { ColumnTypeDialogComponent } from './column-type-dialog.component';
import { sanitizeString } from '../validators/validators';
import { defaultPmidDto, PmidDto } from '../models/pmid_dto';
import { PubmedComponent } from '../pubmed/pubmed.component';
import { MultipleHpoDialogComponent } from './multihpo-dialog-vis-component';
import { Router } from '@angular/router';



type ColumnTypeColorMap = { [key in EtlColumnType]: string };
enum TransformType {
  SingleHpoTerm = "Single HPO Term",
  MultipleHpoTerm = "Multiple Hpo Terms",
  onsetAge = 'Onset Age',
  lastEncounterAge = 'Age at last encounter',
  SexColumn = 'Sex column',
  StringSanitize = 'Sanitize (trim/ASCII)',
  ToUppercase = 'To Uppercase',
  ToLowercase = 'To Lowercase',
  ExtractNumbers = 'Extract Numbers',
  ReplaceUniqeValues = 'Replace Unique Values',
}

/**
 * Component for editing external tables (e.g., supplemental files)
 */
@Component({
  selector: 'app-tableeditor',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatIconModule, FormsModule, MatTooltipModule, ReactiveFormsModule],
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
    private router: Router,
  ) {
    super(templateService, ngZone, cdRef);
    this.pmidForm = this.fb.group({
      pmid: [defaultPmidDto()],  // or null if you allow null
    });
  }

  pmidForm: FormGroup;

  displayColumns: ColumnDto[] = [];
  displayHeaders: EtlColumnHeader[] = [];
  displayRows: string[][] = [];
  /* This is the core of the ETL DTO with the table columns */
  etlDto: EtlDto | null = null;


  pmid: string | null = null;
  title: string | null = null;
  diseaseData: DiseaseData | null = null;
  
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
    ageOfOnset: '#e0ffff',
    ageAtLastEncounter: '#e0ffff',
    deceased: '#f5f5f5',
    sex: '#f5f5f5',
    ignore: '#d3d3d3'
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
  pendingColumnType: EtlColumnType | null = null;
  pendingColumnTransformed = false;
  // Modal state
  previewModalVisible: boolean = false;

  transformationMap: { [original: string]: string } = {};
  uniqueValuesToMap: string[] = [];

  pmidDto: PmidDto = defaultPmidDto();


 
  /** These are transformations that we can apply to a column while editing. They appear on right click */
  transformOptions = Object.values(TransformType);

  transformHandlers: { [key in TransformType]: (colIndex: number) => void } = {
    [TransformType.StringSanitize]: (colIndex) => this.transformColumn(colIndex, TransformType.StringSanitize),
    [TransformType.ToUppercase]: (colIndex) => this.transformColumn(colIndex, TransformType.ToUppercase),
    [TransformType.ToLowercase]: (colIndex) => this.transformColumn(colIndex, TransformType.ToLowercase),
    [TransformType.ExtractNumbers]: (colIndex) => this.transformColumn(colIndex, TransformType.ExtractNumbers),
    [TransformType.onsetAge]: (colIndex) => this.transformColumn(colIndex, TransformType.onsetAge),
    [TransformType.lastEncounterAge]: (colIndex) => this.transformColumn(colIndex, TransformType.lastEncounterAge),
    [TransformType.SexColumn]: (colIndex) => this.transformColumn(colIndex, TransformType.SexColumn),
    [TransformType.SingleHpoTerm]: (colIndex) => {
      this.hpoAutoForColumnName(colIndex);
    },
    [TransformType.MultipleHpoTerm]: (colIndex: number) => {
      this.hpoMultipleForColumnName(colIndex);
    },
    [TransformType.ReplaceUniqeValues]: (colIndex: number) => {
      this.editUniqueValuesInColumn(colIndex);
    }
  };

  override ngOnInit(): void {
    super.ngOnInit();
    this.etl_service.etlDto$.subscribe(dto => { this.etlDto = dto});
    this.pmidForm.valueChanges.subscribe(value => {
      console.log('Form value:', value);
      // value = { pmid: PmidDto }
    });
  }

 


  /** Reset if user clicks outside of defined elements. */
  @HostListener('document:click')
  onClickAnywhere(): void {
    this.columnContextMenuVisible = false;
    this.editModalVisible = false;
    this.previewModalVisible = false;
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
      const table: ColumnTableDto | null = await this.configService.loadExternalExcel();
     
      if (table != null) {
        this.etlDto = fromColumnDto(table);
        console.log("Got the table", this.etlDto);
        this.ngZone.run(() => {
          this.reRenderTableRows();
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
            this.etlDto = fromColumnDto(table);
          console.log("Got the table", this.etlDto);
          this.ngZone.run(() => {
          this.reRenderTableRows();
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
  async reRenderTableRows(): Promise<void> {
    if (this.etlDto == null) {
      this.notificationService.showError("Attempt to build table rows with null EtlDto");
      return;
    }
    const columnTableDto = this.etlDto.table;
    if (!columnTableDto.columns.length) {
      alert("Could not create table because externalTable had no columns");
      return;
    }
    const headers = columnTableDto.columns.map(col => col.header);
    const rowCount = Math.max(...columnTableDto.columns.map(col => col.values.length));
    const valueRows: string[][] = [];

    for (let i = 0; i < rowCount; i++) {
      const row: string[] = columnTableDto.columns.map(col => col.values[i] ?? '');
      valueRows.push(row);
    }
    this.displayHeaders = headers;
    this.displayRows = [
      ...valueRows
    ];
    this.displayColumns = columnTableDto.columns;
  }

  /**
   * The point of this component is to transform columns one by one into the form
   * required for our curation tool. We display columns that have been already transformed
   * in a green color.
   * @param colIndex 
   * @returns true iff this column was already transformed
   */
  isTransformed(colIndex: number): boolean {
    if (this.etlDto == null) {
      return false;
    }
    const columnTableDto = this.etlDto.table;
    if (columnTableDto.columns.length >= colIndex) {
      this.notificationService.showError(`Index out of bounds ${colIndex} for table with ${columnTableDto.columns.length} columns`);
      return false;
    }
    return columnTableDto.columns[colIndex].transformed;
  }

  /**
   * TODO document me
   * @param index 
   * @returns 
   */
  openColumnDialog(index: number): void {
    if (this.etlDto == null) {
      return;
    }
    const columnTableDto = this.etlDto.table;
    const column = columnTableDto.columns[index];

    const dialogRef = this.dialog.open(EtlColumnEditComponent, {
      data: { column: structuredClone(column) }, // clone to avoid mutating until confirmed
      width: '500px'
    });

    dialogRef.afterClosed().subscribe((updatedColumn: ColumnDto | undefined) => {
      if (updatedColumn && this.etlDto != null) {
        this.etlDto.table.columns[index] = updatedColumn;
      }
    });
  }

  /** Call this method to clear right-click context */
  resetRightClick(): void {
    this.contextMenuColIndex = null;
    this.contextMenuColHeader =  null;  
    this.contextMenuColType =  null;
    this.columnContextMenuX = -1;
    this.columnContextMenuY = -1;
    this.columnContextMenuVisible = false;
  }

  /** This method is called if the user right clicks on the header (first row) */
  onRightClickHeader(event: MouseEvent, colIndex: number): void {
    event.preventDefault();
    this.contextMenuColIndex = colIndex;
    this.contextMenuColHeader = this.displayHeaders[colIndex]?? null; 
    this.contextMenuColType = this.displayHeaders[colIndex]?.columnType ?? null;
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
   * into the strings required for our template (e.g., M, F). This causes a dialog to 
   * appear that calls applyValueTransform if confirmed.
   * @param index 
   * @returns 
   */
  editUniqueValuesInColumn(index: number) {
    if (!this.etlDto) return;
    const header = this.displayHeaders[index];
    if (header == null) {
      this.notificationService.showError(`header null at index ${index}`);
      return;
    }
    const column = this.etlDto.table.columns[index];
    if (column == null) {
      this.notificationService.showError(`column null at index ${index}`);
      return;
    }
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
    this.contextMenuColHeader = header;
    this.contextMenuColType = header.columnType;
    this.uniqueValuesToMap = unique;
    this.transformationPanelVisible = true;
    this.columnBeingTransformed = index;
  }

  /** Return a list of the unique values found in the indicated column */
  getUniqueValues(colIndex: number): string[] {
    if (!this.etlDto) return [];
    const column = this.etlDto.table.columns[colIndex];
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
    if (this.etlDto == null) {
      return;
    }
    this.editModeActive = true;
    this.visibleColIndex = index;
    this.reRenderTableRows(); // Rebuild the table display
  }

  /* Open an autocomplete dialog to change the header of the column to an HPO term label */
  async hpoAutoForColumnName(colIndex: number) {
    const etlDto = this.etlDto;
    if (etlDto == null) {
      return;
    }
    const col = etlDto.table.columns[colIndex];
    const dialogRef = this.dialog.open(HpoDialogWrapperComponent, {
      width: '500px'
    });

    const selectedTerm: HpoTermDuplet = await firstValueFrom(dialogRef.afterClosed());
    if (selectedTerm) {
      col.header.columnType = EtlColumnType.SingleHpoTerm;
      this.processSingleHpoColumn(colIndex, selectedTerm);
    } else {
      this.notificationService.showSuccess('User cancelled HPO selection');
      return;
    }
  }

  /** Use Variant Validator in the backend to annotate each variant string in the column. Upon successful validation, add the variant key
   * to the ETL DTO. If all entries are validated, mark the column green (transformed). 
   */
  async annotateVariants(colIndex: number | null): Promise<void> {
    const etlDto = this.etlDto;
    if (etlDto == null) {
      return;
    }
    if (colIndex == null) {
      this.notificationService.showError("Could not annotate variants because column index was null");
      return;
    }
    if (etlDto.disease == null) {
       this.notificationService.showError("Could not annotate variants because disease data was not initialized (load cohort or go to new template)");
      return;
    }
    const col = etlDto.table.columns[colIndex];
    const diseaseData = etlDto.disease;
    const gt_dto = diseaseData.geneTranscriptList[0];
    const transcript = gt_dto.transcript;
    const hgnc = gt_dto.hgncId;
    const symbol = gt_dto.geneSymbol;
    let allValid = true; // will be set to false if one or more variants cannot be validated.
    // retrieve previous mapped variants and their variant keys
    const hgvsToKey: Record<string, string> = Object.values(etlDto.hgvsVariants)
      .reduce((acc, variant) => {
        acc[variant.hgvs] = variant.variantKey;
        return acc;
      }, {} as Record<string, string>);;
    const svToKey: Record<string, string> = Object.values(etlDto.structuralVariants)
      .reduce((acc, variant) => {
        acc[variant.label] = variant.variantKey;
        return acc;
      }, {} as Record<string, string>);
    const allVariantKeys: Set<string> = new Set([
      ...Object.values(hgvsToKey),
      ...Object.values(svToKey),
    ]);
   for (let i = 0; i < col.values.length; i++) {
      let val = col.values[i];
      if (!val) continue;
      val = val.trim();

      if (allVariantKeys.has(val)) {
        col.values[i] = val; // keep as is
        continue;
      }

      if (val.startsWith("c.") || val.startsWith("n.")) {
        this.configService.validateOneHgvs(symbol, hgnc, transcript, val)
          .then((hgvs) => {
            if (this.etlDto == null) {
              return;
            }
            const varKey = hgvs.variantKey;
            hgvsToKey[val] = varKey;
            allVariantKeys.add(varKey);
            col.values[i] = varKey; // update in place
            this.etlDto.hgvsVariants[varKey] = hgvs;
            this.reRenderTableRows(); // optional: trigger change detection
          })
          .catch((error) => {
            this.notificationService.showError(String(error));
            allValid = false;
          });
      } else {
        this.configService.validateOneSv(symbol, hgnc, transcript, val)
          .then((sv) => {
            if (this.etlDto == null) {
              return;
            }
            const varKey = sv.variantKey;
            svToKey[val] = varKey;
            allVariantKeys.add(varKey);
            col.values[i] = varKey; // update in place
            this.etlDto.structuralVariants[varKey] = sv;
            this.reRenderTableRows();
          })
          .catch((error) => {
            this.notificationService.showError(String(error));
            allValid = false;
          });
      }
    }
    if (allValid) {
      col.transformed = true;
      col.header.current = `${col.header.original}-validated`;
      col.header.columnType = EtlColumnType.Variant;
    } else {
      col.transformed = false;
      this.notificationService.showError("Could not annotate all variants in column");
    }

    this.reRenderTableRows();
  }

    /** Process a column that refers to a single HPO term  */ 
  async processSingleHpoColumn(colIndex: number, hpoTermDuplet: HpoTermDuplet): Promise<void> {
    if (colIndex == null || colIndex < 0) {
      this.notificationService.showError("Attempt to process single-HPO column with Null column index");
      return;
    }
    if (!this.etlDto ) {
      this.notificationService.showError("Attempt to process single-HPO column with Null ETL table");
      return;
    }
    const column = this.etlDto.table.columns[colIndex];
    let hpoHeader = column.header;
    if (hpoHeader.columnType != EtlColumnType.SingleHpoTerm) {
      this.notificationService.showError(`Attempt to process single-HPO column with wrong column: ${hpoHeader.columnType}`);
      return;
    }
    if (hpoTermDuplet == null || hpoTermDuplet.hpoId.length < 10) {
      this.notificationService.showError(`Invalid HPO Term Duplet ${hpoTermDuplet}`)
      return;
    }
    const new_header: EtlColumnHeader = {
      original: column.header.original,
      columnType: EtlColumnType.SingleHpoTerm,
      hpoTerms: [hpoTermDuplet],
    };
    this.pendingHeader = new_header;
    try {
      // Extract unique values from the column of the original table (e.g., +, -, ?)
      const uniqueValues = Array.from(new Set(column.values.map(v => v.trim())));
      const dialogRef = this.dialog.open(ValueMappingComponent, {
          data: {
            header: column.header.original,
            hpoTerm: hpoTermDuplet,
            hpoLabel: hpoTermDuplet.hpoLabel,
            uniqueValues
          }
        });

        dialogRef.afterClosed().subscribe((mapping: HpoMappingResult | undefined) => {
          if (mapping) {
            this.applyHpoMapping(colIndex, mapping);
          }
        });
    } catch (error) {
      alert("Could not identify HPO term: " + error);
    }
  }

  /** This function gets called when the user wants to map a column to zero, one, or many HPO terms.
   * For instance, a column entitled Hypo/Hypertelorism might get mapped to 
   * Hypotelorism HP:0000601; Hypotelorism HP:0000601
   */
  async hpoMultipleForColumnName(colIndex: number){
    if (this.etlDto == null) {
      return;
    }
    const col = this.etlDto.table.columns[colIndex];
    const colValues: string[] = col.values;
    const hpoAnnotations: TextAnnotationDto[] = await this.configService.mapColumnToHpo(colValues);
    /// Get the HPO hits and then create a string we can use for the module.
    // Use a Map to remove duplicates!
    const hpoTerms: HpoTermDuplet[] = Array.from(
      new Map(
        hpoAnnotations
          .filter(t => t.isFenominalHit && t.termId && t.label)
          .map(t => [t.termId, { hpoId: t.termId, hpoLabel: t.label }])
      ).values()
    );
    const dialogRef = this.dialog.open(MultiHpoComponent, {
      width: '1000px',
      data: { terms: hpoTerms, rows: colValues }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log("Result=", result);
        console.log(Object.prototype.toString.call(result));
        this.previewColumnIndex = colIndex;
        this.previewOriginal = colValues.map(val => val ?? '');
        this.previewTransformName = "Multiple HPO mappings";
        this.pendingHeader =  col.header;
        this.pendingHeader.current = `Multiple HPO terms - ${col.header.original}`;
        this.pendingColumnType = EtlColumnType.MultipleHpoTerm;
        this.pendingHeader.hpoTerms = result.allHpoTerms;
        this.previewTransformed = result.hpoMappings.map(
          (row: HpoMappingRow) =>
            row
              .filter(entry => entry.status !== 'na')// only include observed/excluded
              .map(entry => `${entry.term.hpoId}-${entry.status}`) // display label + status
              .join(";")
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
    this.etlDto == null ||
    this.previewColumnIndex == null ||
    !this.previewTransformed.length
  ) {
    this.notificationService.showError("Could not confirm value transformation because table or column was null");
    return;
  }
  console.log("confirmValueTransformation")

  const colIndex = this.previewColumnIndex;
  const col = this.etlDto.table.columns[colIndex];
  const header = this.displayHeaders[colIndex];
  if (header == null) {
    this.notificationService.showError(`Header null for index ${colIndex}`);
    return;
  }

  // Apply transformed values
  col.values = [...this.previewTransformed];
  col.transformed = true;

  // Apply pending metadata
  if (this.pendingHeader) {
    col.header = this.pendingHeader;
  }
  if (this.pendingColumnType) {
    header.columnType = this.pendingColumnType;
  }

  // Reset preview state
  this.previewOriginal = [];
  this.previewTransformed = [];
  this.previewModalVisible = false;
  this.pendingHeader = null;
  this.pendingColumnType = null;

  this.reRenderTableRows();
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
  this.contextMenuCellValue = col.values[rowIndex] ?? ''; 
  this.contextMenuCellType = header.columnType;
}

  /**
   * Open a modal dialog to allow the user to manually edit the cell that was clicked. The function
   * will cause a modal to appear that will activate the function saveManualEdit to perform the save.
   */
  async editCellValueManually() {
    if (this.contextMenuCellValue == null) {
      this.notificationService.showError("Could not edit cell because we could not get context menu cell value.");
      return;
    }
    const colIndex = this.contextMenuCellCol;
    if (colIndex == null) {
      this.notificationService.showError("Could not edit cell because we could not get context menu cell column index.");
      return;
    }
    let col = this.etlDto?.table.columns[colIndex];
    if (col == null) {
      this.notificationService.showError("Could not edit cell because we could not get context menu cell column.");
      return;
    }

    // check column type (pseudo-code, adapt to your DTO)
  if (col.header.columnType === EtlColumnType.MultipleHpoTerm) {
    // open your HPO dialog
    const dialogRef = this.dialog.open(MultipleHpoDialogComponent, {
      width: '600px',
      data: {
        entries: this.contextMenuCellValue // pass the current duplets here
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // result is updated entries
        this.editingValue = this.contextMenuCellValue || this.editingValue;
      }
    });
    this.editModalVisible = true;
    this.contextMenuCellVisible = false;
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
    if (this.etlDto == null) {
      this.notificationService.showError("Could not save JSON because data table is not initialized");
      return;
    }
    const validationError = this.etl_service.validateEtlDto(this.etlDto);
    if (validationError) {
      this.notificationService.showError(`Validation failed: ${validationError}`);
      return;
    }
    this.configService.saveJsonExternalTemplate(this.etlDto)
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
   * Assign one of the column types (which will be key to transforming to phenopacket rows)
   * @param type 
   */
  assignColumnType(type: EtlColumnType) {
    if (this.contextMenuColIndex !== null && this.etlDto) {
      this.etlDto.table.columns[this.contextMenuColIndex].header.columnType = type;
      this.contextMenuCellVisible = false;
      this.reRenderTableRows(); 
    }
  }

  /**
   * This is used to hide all columns except the first and the edit column, 
   * or to show all columns, depending on this.editModeActive
   * @param row 
   * @returns array of indices of columns that should be made visible
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
        col.values[rowIndex] = aboveValue.trim();
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
    if (this.contextMenuCellCol == null) {
      this.notificationService.showError("Could not save value because contextMenuCellCol was null");
      return;
    }
    if (this.contextMenuCellRow == null) {
      this.notificationService.showError("Could not save value because contextMenuCellRow was null");
      return;
    }
    const col = this.etlDto.table.columns[this.contextMenuCellCol];
    if (col) {
      const rowIndex = this.contextMenuCellRow;
      if (rowIndex >= 0 && rowIndex < col.values.length) {
        col.values[rowIndex] = this.editingValue.trim();
        this.contextMenuCellValue = this.editingValue;
        this.reRenderTableRows();
      }
    }
    this.editModalVisible = false;
  }


  /** Transform a single column and return the transformed values (for preview) */
  transformColumn(colIndex: number, transform: TransformType): string[] {
    if (!this.etlDto) {
      this.notificationService.showError("Attempt to transform column with null ETL DTO");
      return [];
    }

    const col = this.etlDto.table.columns[colIndex];
    if (!col || !col.values) return [];

    const originalValues = col.values.map(v => v ?? '');

  

    const transformedValues: string[] = originalValues.map(val => {
      switch (transform) {
        case TransformType.StringSanitize:
          return sanitizeString(val);
        case TransformType.ToUppercase:
          return val.toUpperCase();
        case TransformType.ToLowercase:
          return val.toLowerCase();
        case TransformType.ExtractNumbers:
          return (val.match(/\d+/g)?.join(' ') || '');
        case TransformType.onsetAge:
          return this.etl_service.parseAgeToIso8601(val);
        case TransformType.lastEncounterAge:
          return this.etl_service.parseAgeToIso8601(val);
        case TransformType.SexColumn:
          return this.etl_service.parseSexColumn(val);
        default:
          return val;
      }
    });

    return transformedValues;
  }


  /**
 * This function is called upon right click in the editing window when the user indicates
 * to replace values with the correctly formated values, e.g., "Female" => "F"
 */
applyValueTransform() {
  if (this.etlDto == null) {
    // should never happen
    this.notificationService.showError("Attempt to apply value transform with externalTable being null");
    return;
  }
  if (this.visibleColIndex == null) {
    this.notificationService.showError("Attempt to apply value transform with columnBeingTransformed being null");
    return;
  } 
  const colIndex = this.visibleColIndex;
  const column = this.etlDto.table.columns[colIndex];
  const transformedValues = column.values.map(val => this.transformationMap[val.trim()] || val);
  this.etlDto.table.columns[colIndex].values = [...transformedValues];
  this.transformationPanelVisible = false;
  this.editPreviewColumnVisible = false;
  this.reRenderTableRows();
}

/** Applies one of the transforms to a column and sets the corresponding "pending values". 
 * We will then see the pending modal dialog to check the results of transform.
 */
  applyNamedTransform(colIndex: number | null, transformName: TransformType): void {
    if (colIndex === null || !this.etlDto) return;

    if (transformName == TransformType.SingleHpoTerm) {
      this.hpoAutoForColumnName(colIndex);
      return;
    }
    if (transformName === TransformType.MultipleHpoTerm) {
      this.hpoMultipleForColumnName(colIndex);
      return;
    }

    const handler = this.transformHandlers[transformName];
    if (!handler) return;
    const col = this.etlDto.table.columns[colIndex];
    const originalValues = col.values.map(v => v ?? '');
    this.previewColumnIndex = colIndex;
    this.previewOriginal = col.values.map(v => v ?? '');
    
    
  
    this.previewTransformed = this.transformColumn(colIndex, transformName);
    this.previewColumnIndex = colIndex;
    this.previewOriginal = originalValues;
    this.pendingHeader = col.header;
    if (transformName == TransformType.SexColumn) {
      this.pendingColumnType = EtlColumnType.Sex;
      this.pendingColumnTransformed = true;
    } else {
      this.pendingColumnType = col.header.columnType;
      this.pendingColumnTransformed = false;
    }
    
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
    if (!this.etlDto || previewIdx < 0) {
      // should never happen, but...
      this.notificationService.showError("Could not apply transform because external table/preview column was null");
      return;
    } 
    if (this.pendingColumnType == null) {
       this.notificationService.showError("Could not apply transform because column type was not set");
      return;
    }
    if (this.pendingHeader == null) {
      this.notificationService.showError("Could not apply transformation because pending header was not set");
      return;
    }

    const sourceCol = this.etlDto.table.columns[previewIdx];

    const newColumn: ColumnDto = {
      id: crypto.randomUUID(),
      transformed: true,
      header: this.pendingHeader, 
      values: this.previewTransformed
    };
    newColumn.header.columnType = this.pendingColumnType;
    console.log("newColumn", newColumn);
    this.etlDto.table.columns[previewIdx] = newColumn;
    this.transformedColIndex = this.INVISIBLE;
    this.reRenderTableRows();
    this.resetPreviewModal();

  }

  /**
   * Open a dialog with a preview of the transformed data that the user can accept or cancel
   * If accepted, then applyTransformConfirmed is callede
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
    this.pendingColumnTransformed = false;
  }

  /** If the original data has separate columns for family and individual id, we
   * merge them to get a single individual identifier.
   */
  async mergeIndividualAndFamilyColumns(): Promise<void> {
    if (this.etlDto == null) {
      return;
    }
    const columns = this.etlDto.table.columns;
    try {
      const fam_idx = await this.getEtlColumnIndex(EtlColumnType.FamilyId);
      const individual_idx = await this.getEtlColumnIndex(EtlColumnType.PatientId);
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
    this.reRenderTableRows(); 
  }
  
  /**
   * Extract a specific column index or show an error
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


  /** apply a mapping for a column that has single-HPO term, e.g., +=> observed */
  applyHpoMapping(colIndex: number, mapping: HpoMappingResult): void {
    if (this.etlDto == null) {
      this.notificationService.showError("Attempting to apply mapping with null external table (should never happen).")
      return;
    }
    const col = this.etlDto.table.columns[colIndex];
    const transformedValues = col.values.map(val => {
      const mapped = mapping.valueToStateMap[val.trim()];
      return mapped !== undefined ? mapped : val.trim(); // keep original if no mapping
    });
    if (this.pendingHeader == null) {
      this.notificationService.showError("pending header was null");
      return;
    }
    // show dialog with transformed data that the user can accept or cancel.
    this.previewColumnIndex = colIndex;
    this.previewTransformed = transformedValues;
    const originalValues = col.values.map(v => v.trim() ?? '');
    this.previewOriginal = originalValues;
    this.previewTransformName = "single HPO column";
    this.pendingHeader.current =  `${mapping.hpoLabel} - ${mapping.hpoId}`;
    this.pendingColumnType = EtlColumnType.SingleHpoTerm;
    this.showPreview("single HPO column");
  }

  /** parse a string like Strabismus[HP:0000486;original: Strabismus] from the single HPO term header */
  parseHpoString(input: string): HpoTermDuplet | null {
    const match = input.match(/^([^\[]+)\[([^\];]+);.*\]$/);
    if (!match) return null;

    const label = match[1].trim();    // before the [
    const hpoId = match[2].trim();    // before the ;
    
    return { hpoLabel: label, hpoId: hpoId };
  }



  /** TODO - document */
  get_single_hpo_term(header: EtlColumnHeader) : Promise<HpoTermDuplet> {
    return new Promise((resolve, reject) => {
      if (header.columnType !== EtlColumnType.SingleHpoTerm) {
        reject(new Error("Header is not a single HPO term column"));
        return;
      }

      if (!header.hpoTerms || header.hpoTerms.length == 0) {
        reject(new Error("No HPO term found in header metadata"));
        return;
      }

      resolve(header.hpoTerms[0]);
    });
  }

  async processHpoColumn(colIndex: number | null): Promise<void> {
    if (colIndex == null) {
      this.notificationService.showError("Attempt to processHpoColumn with null column index");
      return;
    }
    if (!this.etlDto || colIndex < 0) {
      alert("Invalid column index");
      return;
    }
    const column = this.etlDto.table.columns[colIndex];
    try {
      const hpo_term_duplet = await this.get_single_hpo_term(column.header);
      const uniqueValues = Array.from(new Set(column.values.map(v => v.trim())));
      const dialogRef = this.dialog.open(HpoHeaderComponent, {
        data: {
          header: column.header.original,
          hpoId: hpo_term_duplet.hpoId,
          hpoLabel: hpo_term_duplet.hpoLabel,
          uniqueValues,
        }
      });
      dialogRef.componentInstance.mappingConfirmed.subscribe((mapping: HpoMappingResult) => {
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
    if (this.etlDto == null) {
      return;
    }
    let col = this.etlDto.table.columns[colIndex];
    col.transformed = true;
    this.reRenderTableRows();
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

  openColumnTypeDialog() {
    if (this.contextMenuColIndex == null) {
      this.notificationService.showError("Attempt to set column type with null contextMenuColIndex ");
      return;
    }
    if (this.etlDto == null) {
      return;
    }
    const currentType = this.etlDto.table.columns[this.contextMenuColIndex].header.columnType;
    const dialogRef = this.dialog.open(ColumnTypeDialogComponent, {
      width: '400px',
      data: {
        etlTypes: this.etlTypes,      
        currentType
      }
    });

    dialogRef.afterClosed().subscribe((selectedType: EtlColumnType | undefined) => {
      if (selectedType) {
        this.assignColumnType(selectedType);
      }
    });
  }

  importCohortDiseaseData() {
    const cohort = this.cohortService.getCohortDto();
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
  }

  trackRow(index: number, row: any): number {
    return index; // row identity is its index
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
    const cohort_dto_new = await this.configService.transformToCohortData(etl_dto);
    if (this.cohortService.currentCohortContainsData()) {
      this.notificationService.showError("TO DO IMPLEMENT MERGE");
    } else {
      this.cohortService.setCohortDto(cohort_dto_new);
      this.router.navigate(['/pttemplate']);
    }
  }

}

