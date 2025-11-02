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
import { HpoMappingRow, HpoTermData, HpoTermDuplet } from '../models/hpo_term_dto';
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
import { AddConstantColumnDialogComponent } from './add-constant-column-dialog.component';
import { VariantDialogService } from '../services/hgvsManualEntryDialogService';
import { SvDialogService } from '../services/svManualEntryDialogService';
import { HgvsVariant, StructuralVariant, VariantDto } from '../models/variant_dto';
import { HpoTwostepComponent } from '../hpotwostep/hpotwostep.component';
import { ConfirmationDialogComponent } from '../confirm/confirmation-dialog.component';
import { SplitColumnDialogComponent } from './split-age-sex-column.component';




type ColumnTypeColorMap = { [key in EtlColumnType]: string };
enum TransformType {
  SingleHpoTerm = "Single HPO Term",
  MultipleHpoTerm = "Multiple Hpo Terms",
  OnsetAge = 'Onset Age',
  LastEncounterAge = 'Age at last encounter',
  SexColumn = 'Sex column',
  SplitColumn = "Split column",
  StringSanitize = 'Sanitize (trim/ASCII)',
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
[x: string]: any;
  

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
  pmidForm: FormGroup;

  displayColumns: ColumnDto[] = [];
  displayHeaders: EtlColumnHeader[] = [];
  displayRows: string[][] = [];
  /* This is the core of the ETL DTO with the table columns */
  etlDto: EtlDto | null = null;


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
  // Modal state
  previewModalVisible: boolean = false;

  transformationMap: { [original: string]: string } = {};
  uniqueValuesToMap: string[] = [];

  pmidDto: PmidDto = defaultPmidDto();


 
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
    [TransformType.SingleHpoTerm]: (colIndex) => { this.hpoAutoForColumnName(colIndex); },
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
    [TransformType.DiseaseColumnType]:(colIndex: number) => { this.setColumnType(colIndex, EtlColumnType.Disease); },
    [TransformType.AgeOfOnsetColumnType]: (colIndex: number) => { this.setColumnType(colIndex, EtlColumnType.AgeOfOnset); },
    [TransformType.SexColumnType]: (colIndex: number) => { this.setColumnType(colIndex, EtlColumnType.Sex); },
    [TransformType.DeceasedColumnType]: (colIndex: number) => { this.setColumnType(colIndex, EtlColumnType.Deceased); },
    [TransformType.IgnoreColumnType]: (colIndex: number) => { this.setColumnType(colIndex, EtlColumnType.Ignore); },
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
    this.previewModalVisible = false;
  }


  override ngOnDestroy(): void {
    super.ngOnDestroy();
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
        const table = await this.configService.loadExternalExcelRowBased();
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
      this.notificationService.showError("Could not create table because externalTable had no columns");
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
    this.cdRef.detectChanges();
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
    console.log('right-clicked header index', colIndex);
    this.contextMenuColIndex = colIndex;
    this.contextMenuColHeader = this.displayHeaders[colIndex] ?? null; 
    this.contextMenuColType = this.displayHeaders[colIndex]?.columnType ?? null;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const menuWidth = 350; // estimate
    const menuHeight = 400; 
    
    let x = event.clientX;
    let y = event.clientY;
    
    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 10; 
    }
    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - 10; 
    }
    
    // Ensure minimum distances from edges
    x = Math.max(10, x); // At least 10px from left edge
    y = Math.max(10, y); // At least 10px from top edge
    
    this.columnContextMenuX = x;
    this.columnContextMenuY = y;
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
  /**
 * Start mapping unique values in a column (e.g. male→M, female→F).
 */
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

  // Extract unique, trimmed, non-empty values
  const unique = Array.from(new Set(column.values.map(v => v?.trim()).filter(Boolean)));

  // Identity map: each value initially maps to itself
  this.transformationMap = Object.fromEntries(unique.map(val => [val, val]));

  // Store UI state for the mapping panel
  this.contextMenuColIndex = index;
  this.contextMenuColHeader = header;
  this.contextMenuColType = header.columnType;
  this.uniqueValuesToMap = unique;
  this.transformationPanelVisible = true;
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
    const column_title = col.header.original || "n/a";
   let best_hpo_match = "";
    try {
      best_hpo_match = (await this.configService.getBestHpoMatch(col.header.original)) ?? "";
    } catch {
      best_hpo_match = "";
    }
    const dialogRef = this.dialog.open(HpoDialogWrapperComponent, {
      width: '500px',
      data: { bestMatch: best_hpo_match, title: column_title },
    });

    const selectedTerm: HpoTermDuplet = await firstValueFrom(dialogRef.afterClosed());
    if (! selectedTerm) {
      this.notificationService.showError('User cancelled HPO selection');
      return;
    }
    col.header.columnType = EtlColumnType.SingleHpoTerm;

    const transformed = await this.processSingleHpoColumn(colIndex, selectedTerm);

    if (transformed) {
      this.previewColumnIndex = colIndex;
      this.previewOriginal = col.values.map(v => v ?? "");
      this.previewTransformed = transformed;
      this.pendingColumnType = EtlColumnType.SingleHpoTerm;
      this.pendingColumnTransformed = true;
      this.showPreview("Single HPO transform");
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
      console.log("annotate var-val=", val);
      if (!val) continue;
      val = val.trim();

      if (allVariantKeys.has(val)) {
        col.values[i] = val; // keep as is
        continue;
      }
      console.log(allVariantKeys);

      if (this.configService.isValidHgvsStart(val)) {
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
            this.reRenderTableRows(); // trigger change detection
          })
          .catch((error) => {
            this.notificationService.showError(String(error));
            allValid = false;
          });
      } else {
        const dto: VariantDto = {
            variantString: val,
            variantKey: null,
            transcript: transcript,
            hgncId: hgnc,
            geneSymbol: symbol,
            variantType: "SV",
            isValidated: false,
            count: 1
        };
        this.configService.validateSv(dto)
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


   updateVariants(colIndex: number | null): string[] {
    const etlDto = this.etlDto;
    if (!etlDto) return [];
    if (colIndex === null) return [];
    const col = etlDto.table.columns[colIndex];
    if (!col) { 
      this.notificationService.showError("Could not annotate variants because column index was null");
      return [];
    }
    try {
      const hgvsMap: Record<string, string> = Object.values(etlDto.hgvsVariants)
        .reduce((acc, variant) => {
          acc[variant.hgvs] = variant.variantKey;
          return acc;
        }, {} as Record<string, string>);
        console.log("updateVariants - hgvsMap", hgvsMap);
        col.values.forEach(v => {
          console.log("typeof", typeof v, "val", v);
        });
      const svMap: Record<string, string> = Object.values(etlDto.structuralVariants)
        .reduce((acc, variant) => {
          acc[variant.label] = variant.variantKey;
          return acc;
        }, {} as Record<string, string>);

      return col.values.map((val) => {
        const key = val.trim(); 
        if (hgvsMap[key] !== undefined) return hgvsMap[key];
        if (svMap[key] !== undefined) return svMap[key];
        return key;
      });
    } catch (err) {
      this.notificationService.showError("Error while updating variants: " + (err as Error).message);
      return col.values; // fallback to original
    }
  }


  /** Process a column that refers to a single HPO term  */ 
  async processSingleHpoColumn(
    colIndex: number, 
    hpoTermDuplet: HpoTermDuplet
  ): Promise<string[] | null> {
    if (colIndex == null || colIndex < 0) {
      this.notificationService.showError("Attempt to process single-HPO column with Null column index");
      return null;
    }
    if (!this.etlDto ) {
      this.notificationService.showError("Attempt to process single-HPO column with Null ETL table");
      return null;
    }
    const column = this.etlDto.table.columns[colIndex];
    let hpoHeader = column.header;
    if (hpoHeader.columnType != EtlColumnType.SingleHpoTerm) {
      this.notificationService.showError(`wrong column type: ${hpoHeader.columnType}`);
      return null;
    }
    if (hpoTermDuplet == null || hpoTermDuplet.hpoId.length < 10) {
      this.notificationService.showError(`Invalid HPO Term Duplet ${hpoTermDuplet}`)
      return null;
    }
    this.pendingHeader = {
      original: column.header.original,
      columnType: EtlColumnType.SingleHpoTerm,
      hpoTerms: [hpoTermDuplet],
    };
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
    const mapping: HpoMappingResult | undefined =
    await firstValueFrom(dialogRef.afterClosed());
    if (!mapping) {
      this.notificationService.showError("User cancelled");
      return null;
    }
    return this.applyHpoMapping(colIndex, mapping);
  }

  /** This function gets called when the user wants to map a column to zero, one, or many HPO terms.
   * For instance, a column entitled Hypo/Hypertelorism might get mapped to 
   * Hypotelorism HP:0000601; Hypotelorism HP:0000601
   */
  async processMultipleHpoColumn(colIndex: number): Promise<string[]>{
    if (this.etlDto == null) {
      return [];
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
      data: { terms: hpoTerms, rows: colValues, title: col.header.original }
    });
    const result = await firstValueFrom(dialogRef.afterClosed());
    if (!result) {
      this.notificationService.showError('User cancelled');
      return [];
    }
    
    this.previewColumnIndex = colIndex;
    this.previewOriginal = colValues.map(val => val ?? '');
    this.previewTransformName = "Multiple HPO mappings";
    this.pendingHeader =  col.header;
    this.pendingHeader.current = `Multiple HPO terms - ${col.header.original}`;
    this.pendingColumnType = EtlColumnType.MultipleHpoTerm;
    this.pendingHeader.hpoTerms = result.allHpoTerms;
    this.previewTransformed  = result.hpoMappings.map(
      (row: HpoMappingRow) =>
        row
          .filter(entry => entry.status !== 'na')// only include observed/excluded
          .map(entry => `${entry.term.hpoId}-${entry.status}`) // display label + status
          .join(";")
    );
    this.showPreview( "multiple HPO transform");
    return this.previewTransformed;  
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
  this.contextMenuCellValue = col.values[rowIndex] ?? ''; 
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
    if (etlDto == null) {
      return;
    }
    let rowIndex: number | null = this.contextMenuCellRow;
    if (rowIndex == null) {
  this.notificationService.showError("Could not delete row because we could not get context menu cell row index.");
      return;
    }
    const col1 = etlDto.table.columns[0].values[rowIndex];
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: { message: `Delete row ${rowIndex}`, subMessage: col1 }
    });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
       this.etlDto = this.deleteRowAtI(etlDto, rowIndex);
        this.reRenderTableRows();
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

  duplicateColumn(index: number | null) {
    const etlDto = this.etlDto;
    if (! etlDto ) {
      return;
    }
    if (index === null) return;
    const columns = etlDto.table.columns;
    const originalColumn = columns[index];
    if (!originalColumn) {
      return;
    }
    console.log("duplicated column", index, " with contents", originalColumn.values);
    const clonedColumn: ColumnDto = JSON.parse(JSON.stringify(originalColumn));
    clonedColumn.id = crypto.randomUUID();
    clonedColumn.header.original = `B. ${originalColumn.header.original}`
    columns.splice(index + 1, 0, clonedColumn);

    // Trigger Angular change detection if needed
    this.etlDto = { ...etlDto, table: { ...etlDto.table, columns: [...columns] } };
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
    if (! separator) {
      this.notificationService.showError("Could not extract separator");
      return;
    }
    let columnAPosition = Number(result.sexPosition);
    let columnBPosition = Number(result.agePosition);
    if (![0, 1].includes(columnAPosition)) columnAPosition = 0;
    if (![0, 1].includes(columnBPosition)) columnBPosition = 1;
    //  copy original column
    const columnA: ColumnDto = JSON.parse(JSON.stringify(originalColumn));
    const columnB: ColumnDto = JSON.parse(JSON.stringify(originalColumn));

    columnA.id = crypto.randomUUID();
    columnB.id = crypto.randomUUID();

    columnA.header = { ...columnA.header, original: `Sex (${originalColumn.header.original})` };
    columnB.header = { ...columnB.header, original: `Age (${originalColumn.header.original})` };

    const columnAValues: string[] = [];
    const columBValues: string[] = [];
    for (const cell of originalColumn.values) {
      const text = cell == null ? '' : cell;
      const parts = text.split(separator);
      const aVal = (parts[columnAPosition]?.trim() || 'U');
      const bVal = (parts[columnBPosition]?.trim() || 'na');
      columnAValues.push(aVal);
      columBValues.push(bVal);
    }
    originalColumn.values = columnAValues;
    columnB.values = columBValues;
    columns.splice(index + 1, 0, columnB);

    this.etlDto = {
      ...etlDto,
      table: {
        ...etlDto.table,
        columns: [...columns],
      }
    }
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


  // Organized transform structure
transformCategories = {
  basic: {
    label: 'Basic Transforms',
    transforms: [
      TransformType.StringSanitize,
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


  /** Transform a single column and return the transformed values (for preview) */
  transformColumnElementwise(colIndex: number, transform: TransformType): string[] {
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
        case TransformType.OnsetAge:
          return this.etl_service.parseAgeToIso8601(val);
        case TransformType.OnsetAgeAssumeYears:
          return this.etl_service.parseDecimalYearsToIso8601(val);
        case TransformType.LastEncounterAge:
          return this.etl_service.parseAgeToIso8601(val);
        case TransformType.LastEncounterAgeAssumeYears:
          return this.etl_service.parseDecimalYearsToIso8601(val);
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
applyValueTransform(): void {
  if (!this.etlDto || this.contextMenuColIndex == null) return;

  const colIndex = this.contextMenuColIndex;
  const column = this.etlDto.table.columns[colIndex];

  const transformedValues = column.values.map(val => {
    const trimmed = val?.trim() ?? '';
    return this.transformationMap[trimmed] ?? trimmed;
  });
  if (this.contextMenuColHeader === null) {
    this.notificationService.showError("Attempt to apply value transform with null header");
    return;
  }

  if (this.pendingColumnType === null) {
    this.notificationService.showError("Attempt to apply value transform with null column type");
    return;
  }

  this.startPreviewTransform(
    colIndex,
    transformedValues,
    "Value mapping",
    this.contextMenuColHeader,
    this.pendingColumnType
  );

  this.transformationPanelVisible = false;
}

async applyNamedTransform(colIndex: number | null, transformName: TransformType): Promise<void> {
  console.log("applyNamedTransform for type", transformName);
  if (colIndex === null || !this.etlDto) return;

  const col = this.etlDto.table.columns[colIndex];
  const originalValues = col.values.map(v => v ?? '');
  this.previewColumnIndex = colIndex;
  this.previewOriginal = originalValues;

  switch (transformName) {
    // Interactive transforms (dialog opens, they handle preview themselves)
    case TransformType.SingleHpoTerm:
      await this.hpoAutoForColumnName(colIndex);
      return;

    case TransformType.MultipleHpoTerm:
      await this.processMultipleHpoColumn(colIndex);
      return;

    case TransformType.SetColumnType:
      console.log("set column type");
      this.setColumnTypeDialog(colIndex);
      return;

    case TransformType.ReplaceUniqeValues:
      this.editUniqueValuesInColumn(colIndex); 
      return;

    case TransformType.ConstantColumn:
      this.addConstantColumn(colIndex); 
      return;
    
    case TransformType.ToggleTransformed:
      this.toggleTransformed(colIndex);
      return;

    case TransformType.MergeIndividualFamily:
      this.mergeIndividualAndFamilyColumns();
      return;

    case TransformType.DeleteColumn:
      this.deleteColumn(colIndex);
      return;

    case TransformType.DuplicateColumn:
      this.duplicateColumn(colIndex);
      return;

    case TransformType.SplitColumn:
      this.splitColumn(colIndex);
      return;

    case TransformType.AnnotateVariants:
      this.annotateVariants(colIndex);
      return;

    case TransformType.UpdateVariants:{
      const transformed = this.updateVariants(colIndex);
      const col = this.etlDto!.table.columns[colIndex];
      this.startPreviewTransform(
        colIndex,
        transformed,
        "Update Variants",
        col.header,
        EtlColumnType.Variant
      );
      return;
    }

    // Elementwise transforms
    default: {
      const transformed = this.transformColumnElementwise(colIndex, transformName);
      this.previewTransformed = transformed;
      this.pendingHeader = col.header;

      if (transformName === TransformType.SexColumn) {
        this.pendingColumnType = EtlColumnType.Sex;
        this.pendingColumnTransformed = true;
      } else if (transformName === TransformType.OnsetAge ||
                 transformName === TransformType.OnsetAgeAssumeYears) {
        this.pendingColumnType = EtlColumnType.AgeOfOnset;
        this.pendingColumnTransformed = true;
      } else if (transformName === TransformType.LastEncounterAge ||
                 transformName === TransformType.LastEncounterAgeAssumeYears) {
        this.pendingColumnType = EtlColumnType.AgeAtLastEncounter;
        this.pendingColumnTransformed = true;
      } else {
        this.pendingColumnType = col.header.columnType;
        this.pendingColumnTransformed = false;
      }

      this.showPreview(transformName);
    }
  }
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

    const newColumn: ColumnDto = {
      id: crypto.randomUUID(),
      transformed: true,
      header: this.pendingHeader, 
      values: this.previewTransformed
    };
    newColumn.header.columnType = this.pendingColumnType;
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
  applyHpoMapping(colIndex: number, mapping: HpoMappingResult): string [] {
    if (this.etlDto == null) {
      this.notificationService.showError("Attempting to apply mapping with null external table (should never happen).")
      return [];
    }
   const col = this.etlDto.table.columns[colIndex];
    const transformedValues = col.values.map(val => {
      const mapped = mapping.valueToStateMap[val.trim()];
      return mapped !== undefined ? mapped : val.trim();
    });

    if (!this.pendingHeader) {
      this.notificationService.showError("pending header was null");
      return transformedValues;
    }

    // set preview state
    this.previewColumnIndex = colIndex;
    this.previewOriginal = col.values.map(v => v.trim() ?? '');
    this.pendingHeader.current = `${mapping.hpoLabel} - ${mapping.hpoId}`;
    this.previewTransformName = "single HPO column";
    this.pendingColumnType = EtlColumnType.SingleHpoTerm;

    return transformedValues;
  }

  /** parse a string like Strabismus[HP:0000486;original: Strabismus] from the single HPO term header */
  parseHpoString(input: string): HpoTermDuplet | null {
    const match = input.match(/^([^\[]+)\[([^\];]+);.*\]$/);
    if (!match) return null;

    const label = match[1].trim();    // before the [
    const hpoId = match[2].trim();    // before the ;
    
    return { hpoLabel: label, hpoId: hpoId };
  }



  /** Used by processHpoColumn to retrieve the HpoTermDuplet corresponding to a transformed column */
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

  /** Toggle between true and false status for current column */
  toggleTransformed(colIndex: number | null): void{
    if (colIndex == null) {
      return; // should never happen
    }
    if (this.etlDto == null) {
      return;
    }
    let col = this.etlDto.table.columns[colIndex];
    col.transformed = col.transformed ? false : true;
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
        col.values[rowIndex] = vkey;
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
      const sv: StructuralVariant | null = await this.svDialog.openSvDialog(gt, cell_contents, chr);
      if (sv) {
        const vkey = sv.variantKey;
        if (! vkey) {
          this.notificationService.showError(`Could not get key from Structural Variant object ${sv}`);
          return;
        }
        etlDto.structuralVariants[vkey] = sv;
        let col = etlDto.table.columns[colIndex];
        col.values[rowIndex] = vkey;
        this.reRenderTableRows();
      }
    } catch (error) {
      const errMsg = String(error);
      this.notificationService.showError(errMsg);
    }
  }

  
  // generic entrypoint for transforms
  private startPreviewTransform(
    colIndex: number,
    transformedValues: string[],
    previewName: string,
    pendingHeader: EtlColumnHeader,  
    pendingColumnType: EtlColumnType
  ): void {
    const col = this.etlDto?.table.columns[colIndex];
    if (!col) return;

    this.previewColumnIndex = colIndex;
    this.previewOriginal = col.values.map(v => v.trim() ?? '');
    this.previewTransformed = transformedValues;
    this.previewTransformName = previewName;
    this.pendingHeader =  pendingHeader;
    this.pendingColumnType = pendingColumnType;

    this.showPreview(previewName);
  }

  confirmPreview(): void {
    if (!this.etlDto || this.previewColumnIndex == null) return;
    const colIndex = this.previewColumnIndex;

    if (this.previewTransformName == TransformType.ConstantColumn) {
        const newColumn: ColumnDto = {
          id: crypto.randomUUID(),
          transformed: false,
          header: {
            original: this.pendingHeaderName ?? 'constant',
            columnType: EtlColumnType.Raw,
          },
          values: this.previewTransformed,
        };
      this.etlDto.table.columns.splice(colIndex, 1);
      this.etlDto.table.columns[colIndex] = newColumn;
      this.reRenderTableRows();
      this.resetPreviewState();
      return;
    }
    const col = this.etlDto.table.columns[colIndex];
    const updatedCol: ColumnDto = {
      id: col.id,
      transformed: true,
      header: this.pendingHeader ?? col.header,
      values: this.previewTransformed,
    };
    this.etlDto.table.columns[colIndex] = updatedCol;
    this.reRenderTableRows();
    this.resetPreviewState();
  }

  cancelPreview(): void {
    this.resetPreviewState();
  }

  private resetPreviewState(): void {
    this.previewColumnIndex = null;
    this.previewOriginal = [];
    this.previewTransformed = [];
    this.previewTransformName = '';
    this.pendingHeader = null;
    this.pendingHeaderName = null;
    this.pendingColumnType = null;
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
        col.values[rowIndex] = jsonized_cell_calue;
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
      return JSON.parse(cell);
    } catch {
      this.notificationService.showError(`Invalid HPO data in cell: "${cell}"`);
      return [];
    }
  }

  clearHpoMining(colIndex: number, rowIndex: number) {
    this.displayRows[rowIndex][colIndex] = "";
  }

}
