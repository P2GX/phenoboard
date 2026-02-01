import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, effect, ElementRef, HostListener, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfigService } from '../services/config.service';
import { IndividualData, CohortData, RowData, CellValue, ModeOfInheritance, createCurationEvent, GeneTranscriptData, DiseaseData, getRowId } from '../models/cohort_dto';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { AddageComponent } from "../addages/addage.component";
import { IndividualEditComponent } from '../individual_edit/individual_edit.component'; 
import { HpoAutocompleteComponent } from '../hpoautocomplete/hpoautocomplete.component';
import { AgeInputService } from '../services/age_service';
import { CohortDtoService } from '../services/cohort_dto_service';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { getCellValue, HpoTermDuplet } from '../models/hpo_term_dto';
import { MoiSelector } from "../moiselector/moiselector.component";
import { MatIconModule } from "@angular/material/icon";
import { AddVariantComponent, VariantKind } from '../addvariant/addvariant.component';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { CohortSummaryComponent } from "../cohortsummary/cohortsummary.component";
import { ConfirmDialogComponent } from '../addcase/confirmdialog.component';
interface Option { label: string; value: string };

@Component({
  selector: 'app-pttemplate',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HpoAutocompleteComponent,
    MatButtonModule,
    MatButtonToggleModule,
    MatTableModule,
    MatTooltipModule,
    MatDialogModule,
    MoiSelector,
    MatIconModule,
    CohortSummaryComponent
],
  templateUrl: './pttemplate.component.html',
  styleUrls: ['./pttemplate.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PtTemplateComponent  {


  /** Key: top-level term (represented in Cohort), value: all descendents of the term in our Cohort dataset */
  hpoGroups = signal<Map<string, HpoTermDuplet[]>>(new Map());
  hpoGroupKeys = computed<string[]>(() => Array.from(this.hpoGroups().keys()));
  constructor() {
    effect(() => {
      const cohortDto = this.cohortService.cohortData();
      if (cohortDto) {
        if (cohortDto) {
          this.configService.getTopLevelHpoTerms(cohortDto).then(groupsObj => {
            // Convert the plain object to a Map
            this.hpoGroups.set(new Map(Object.entries(groupsObj)));
          });
        } else {
          this.hpoGroups.set(new Map());
        }
      }
    });
  }
  
  public cohortService = inject(CohortDtoService);
  cohortData = this.cohortService.cohortData; 

  private cdRef = inject(ChangeDetectorRef);
  private configService = inject(ConfigService);
  private ageService = inject(AgeInputService);
  private dialog = inject(MatDialog);
  private notificationService = inject(NotificationService);

  @ViewChild(HpoAutocompleteComponent) hpo_component!: HpoAutocompleteComponent;
  @ViewChild(AddageComponent) addagesComponent!: AddageComponent;
  // References to the HTML elements
  @ViewChild('tableWrapper') tableWrapper!: ElementRef<HTMLDivElement>;
  @ViewChild('topScrollMirror') topScrollMirror!: ElementRef<HTMLDivElement>;
  @ViewChild('tableWidthRef') tableElement!: ElementRef<HTMLTableElement>;
  tableWidth = '100%'; 
  Object = Object; // expose global Object to template
  public readonly VariantKind = VariantKind;
  successMessage: string | null = null;

  /* used for autocomplete widget */
  hpoInputString = '';
  selectedHpoTerm: HpoTermDuplet | null = null;
  /* used for right-click option menu */
  contextMenuVisible = false;
  contextMenuX = 0;
  contextMenuY = 0;
  /* used for first column only */
  individualContextMenuVisible = false;
  individualMenuX = 0;
  individualMenuY = 0;

  contextRowId: string | null = null;

  // Tracks currently hovered HPO header
  hoveredHpoHeader: number | null = null;
  // corresponds to the + sighn for adding a new allele on a row
  openAddAlleleRowId: string | null = null;



  // the following determine which rows are shown in the GUI
  
  filterMode = signal<'all' | 'single' | 'pmid'>('all');
  focusedRow = signal<RowData | null>(null);
  focusedPmid = signal<string | null>(null);
  /* Extract the filtered rows from our model after any change. */
  filteredRows = computed(() => {
    const cohort = this.cohortService.getCohortData();
    if (!cohort) return [];
    const mode = this.filterMode();
    const allRows = cohort.rows;
    switch (mode) {
      case 'single':
        const row = this.focusedRow();
        return row ? [row] : allRows;
      case 'pmid':
        const pmid = this.focusedPmid();
        return pmid ? allRows.filter(r => r.individualData.pmid === pmid) : allRows;
      case 'all':
      default:
        return allRows;
    }
  });

  rowMapById = computed(() => {
    const map = new Map<string, RowData>();
    for (const row of this.filteredRows()) {
      map.set(getRowId(row.individualData), row);
    }
    return map;
  });

  /* Create a view model. The data obsejects are computed once upon change of filteredRows, 
    not for each change detection cycle in the GUI. */
  readonly tableVM = computed(() => {
    const rows = this.filteredRows();
    const alleleDisplayMap = this.shortAlleleDisplayByKey();
    const validatedSet = this.validatedAlleles();
    return rows.map(row => {
      const alleles = Object.entries(row.alleleCountMap).map(([key, count]) => ({
        key,
        count,
        shortDisplay: alleleDisplayMap.get(key),
        validated: validatedSet.has(key),
      }));
      const hpoCells = row.hpoData.map(cell => ({
          originalCell: cell,
          displayValue: this.getCellDisplay(cell),
          cssClass: this.getCellClass(cell)
        }));
     return {
      id: getRowId(row.individualData),
      individualId: row.individualData.individualId,
      pmid: row.individualData.pmid,
      title: row.individualData.title,
      comment: row.individualData.comment,
      ageOfOnset: row.individualData.ageOfOnset,
      ageAtLastEncounter: row.individualData.ageAtLastEncounter,
      deceased: row.individualData.deceased,
      sex: row.individualData.sex,
      hasObservedHpo: row.hpoData.some(c => c.type === 'Observed'),
      alleleCountMap: { ...row.alleleCountMap }, 
      alleles: alleles,
      hpoCells: hpoCells,
      };
    });
  });

  getCellDisplay(cell: any): string {
    if (cell.type === 'Observed') return '✅';
    if (cell.type === 'Excluded') return '❌';
    if (cell.type === 'Na') return 'n/a';
    return cell.data || 'Unknown';
  }

  getCellClass(cell: any): string {
    return `${cell.type.toLowerCase()}-cell`; // e.g., 'cell-observed'
  }

  
  pendingHpoColumnIndex: number | null = null;
  pendingHpoRowIndex: number | null = null;
 
  pendingRowId: string | null = null;
  selectedCellContents: CellValue | null = null;


  focusedHpoIndex: number | null = null;
  hpoFocusRange = 0; // number of columns to each side
  cohortAcronymInput = '';

  public rowInfoKey: string| null = null;
  rowInfoVisible = false;
  
  predefinedOptions: Option[] = [
    { label: 'Observed ✅', value: 'observed' },
    { label: 'Excluded ❌', value: 'excluded' },
    { label: 'N/A', value: 'na' },
  ];

  focusOptions = [
    { label: 'Focus on this column', value: 'focus-0' },
    { label: 'Focus on this column ±2', value: 'focus-2' },
    { label: 'Focus on this column ±5', value: 'focus-5' },
    { label: 'Focus on this column ±10', value: 'focus-10' },
    { label: 'Show all columns', value: 'focus-reset' }
  ];
  
  /** Alleles that have been validated (and will show green). */
  validatedAlleles = computed<Set<string>>(() => {
    const cohort = this.cohortService.getCohortData(); // read the signal
    if (!cohort) return new Set<string>();
    return new Set<string>([
      ...Object.keys(cohort.hgvsVariants ?? {}),
      ...Object.keys(cohort.structuralVariants ?? {}),
      ...Object.keys(cohort.intergenicVariants ?? {})
    ]);
  });

  isAlleleValidatedCached(key: string): boolean {
    return this.validatedAlleles().has(key);
  }

  contextMenuOptions: Option[] = [];
  showMoiIndex: number | null = null;

  /** e.g., show just terms that descend from a top level term such as Abnormality of the musculoskeletal system HP:0033127 */
  selectedTopLevelHpo = signal<string | null>(null);
    
    

  /** Get suggest cohort acronym for melded only (others should be blank because the user
   * needs to retrieve from OMIM; for melded, we use the gene symbols for the two diseases). */
  suggestedAcronym = computed(() : string  => {
    const cohort = this.cohortService.getCohortData();
    if (! cohort) return '';
    if (cohort.cohortType === 'melded') {
      // Collect all gene symbols from both diseases
      const symbols = cohort.diseaseList
        .flatMap(disease => 
          disease.geneTranscriptList.map(gt => gt.geneSymbol)
        )
        .filter(Boolean) // remove null/undefined just in case
        .sort((a: string, b: string) => a.localeCompare(b)); // alphabetic sort
      return symbols.join('-');
    }  else if (cohort.cohortAcronym != null) {
      return cohort.cohortAcronym;
    } else {
      return '';
    }
  });


  moiList = computed(() => {
    const dto = this.cohortService.cohortData();
    if (! dto ) return [];
    return dto.diseaseList.flatMap(d => d.modeOfInheritanceList ?? []);
  });

 

  toggleMoiSelector(i: number): void {
    this.showMoiIndex = this.showMoiIndex === i ? null : i;
  }

  

  /* Load the Phetools template from the backend only if the templateService 
    has not yet been initialized. */
  async loadTemplate(): Promise<void> {
    const existing = this.cohortService.getCohortData();
    if (!existing) {
      console.log("🏗️ Loading template from backend...");
      try {
        const data = await this.configService.getPhetoolsTemplate();
        this.cohortService.setCohortData(data); 
      } catch (error) {
        this.notificationService.showError(`❌ Failed to load template: ${error}`);
      }
    } else {
      console.log("✅ Template already loaded");
    }
  }

  async loadTemplateFromBackend(): Promise<void> {
    this.configService.getPhetoolsTemplate().then((data: CohortData) => {
        this.cohortService.setCohortData(data);
  });
  }


  openIndividualEditor(rowId: string): void {
    this.individualContextMenuVisible = false;
    const row = this.rowMapById().get(rowId);
    if (!row) return; 
    const individualCopy = { ...row.individualData };


   
    const dialogRef = this.dialog.open(IndividualEditComponent, {
      width: '500px',
      panelClass: 'edit-dialog',// Ensures above the current dialog
      data: individualCopy, // pass a copy
    });
    dialogRef.afterClosed().subscribe((result: IndividualData | null) => {
      if (result) {
        // Apply changes back to the original
        Object.assign(row.individualData, result);
      }
    });
  }

  onAlleleCountChange(alleleString: string, rowId: string, newCount: number): void {
    const row = this.rowMapById().get(rowId);
    if (!row) return; 
    
    if (!alleleString || !row) return;
    // Ensure alleleCountMap exists
    if (!row.alleleCountMap) {
      row.alleleCountMap = {};
    }
    console.log("onAlleleCountChange", row.alleleCountMap);
    if (newCount === 0) {
      delete row.alleleCountMap[alleleString];
    } else {
      row.alleleCountMap[alleleString] = newCount;
    }

    const cohort = this.cohortService.getCohortData();
    if (!cohort) return;

    const updatedRows = cohort.rows.map(r => {
      if (r !== row) return r;
      const newAlleleCountMap = {...r.alleleCountMap};
      if (newCount === 0) {
        delete newAlleleCountMap[alleleString];
      } else {
        newAlleleCountMap[alleleString] = newCount;
      }
       return {...r, alleleCountMap: newAlleleCountMap};
    });

    this.cohortService.setCohortData({ ...cohort, rows: updatedRows });

    this.notificationService.showSuccess(
      `Set ${alleleString} allele count to ${newCount}`
    );
  }


  hoveredCell: { rowId: string; alleleKey: string } | null = null;

  onMouseEnter(rowId: string, alleleKey: string) {
    this.hoveredCell = { rowId, alleleKey };
  }

  onMouseLeave() {
    this.hoveredCell = null;
  }

  async addAllele(rowId: string, varKind: VariantKind): Promise<void> {
    const row = this.rowMapById().get(rowId);
    if (!row) return; 
    const dialogRef = this.dialog.open(AddVariantComponent, {
          width: '600px',
           data: { kind: varKind }
        });
    const result = await firstValueFrom(dialogRef.afterClosed());
    if (!result) {
      this.notificationService.showError("Error in open Allele Dialog: Could not retrieve result");
      return;
    }
    const { variantKey, isValidated, count } = result;
    if (!variantKey) {
      this.notificationService.showError("Could not retrieve variantKey");
      return;
    }
    if (!isValidated) {
      this.notificationService.showError("Variant could not be validated");
      return;
    }
    const ok = this.cohortService.addAlleleToRow(
      rowId,
      result.variantKey,
      result.count
    );
    if (!ok) {
      this.notificationService.showError("Failed to add allele");
      return;
    }
    this.notificationService.showSuccess(`Allele ${variantKey} added`);
  }

  get diseaseDescription(): string {
    const cohort = this.cohortService.getCohortData()
    if (! cohort ) {
      return "Could not retrieve cohort";
    }
    const diseaseStrings = cohort.diseaseList.map(disease => {
      const label = disease.diseaseLabel ?? "Unknown disease";
      const genes = disease.geneTranscriptList
        ?.map(g => g.geneSymbol)
        .filter((s: string | undefined) => !!s)
        .join(", ");
      return genes ? `${label} (${genes})` : label;
    });
    return diseaseStrings.join(" and ");
  }


  numVariants = computed((): number => {
    const cohort = this.cohortService.getCohortData();
    if (! cohort ) {
      return 0;
    } else {
      return Object.keys(cohort.hgvsVariants).length + Object.keys(cohort.structuralVariants).length
    }
  });

 


  async validateCohort(): Promise<void> {
    const cohortData = this.cohortService.getCohortData();
    if (! cohortData) {
      alert("Cohort DTO not initialized");
      return;
    }
    try {
      await this.configService.validateCohort(cohortData);
      alert("✅ Cohort successfully validated");
    } catch (err: unknown) {
      // If the Rust command returns a ValidationErrors struct
      alert('❌ Validation failed:\n' + JSON.stringify(err));
    }
  }

  /** Remove ontological conflicts and redundancies */
  async sanitizeCohort(): Promise<void> {
    const cohortData = this.cohortService.getCohortData();
    if (! cohortData) {
      alert("Cohort DTO not initialized");
      return;
    }
    try {
      const sanitized_cohort = await this.configService.sanitizeCohort(cohortData);
      this.cohortService.setCohortData(sanitized_cohort);
      alert(`✅ Cohort successfully sanitized`);
    } catch (err: unknown) {
      // If the Rust command returns a ValidationErrors struct
      alert('❌ Sanitization failed:\n' + JSON.stringify(err));
    }
  }

  submitSelectedHpo = async (): Promise<void> => {
    if (this.selectedHpoTerm == null) {
      this.notificationService.showError("No HPO term selected");
      return;
    }
    await this.addHpoTermToCohort(this.selectedHpoTerm);
  };

  async addHpoTermToCohort(autocompletedTerm: HpoTermDuplet): Promise<void> {
    const template = this.cohortService.getCohortData();
    if (template == null) {
      console.error("Attempt to add HPO Term to cohort but template is null");
      return;
    }
    if (autocompletedTerm) {
      try {
        const updated_template = await this.configService.addHpoToCohort(autocompletedTerm.hpoId, autocompletedTerm.hpoLabel, template);
        this.notificationService.showSuccess(`Successfully added ${autocompletedTerm.hpoLabel} (${autocompletedTerm.hpoId})`);
        this.cohortService.setCohortData(updated_template);
      } catch (err) {
        const errMsg =`Failed to add term ${autocompletedTerm.hpoLabel} (${autocompletedTerm.hpoId}): ${err}`
        this.notificationService.showError(errMsg);
      }
    }
  }

  
  /** Open a context menu after a right-click on an HPO column */
  onRightClick(event: MouseEvent, hpoColumnIndex: number, hpoRowIndex: number, rowId: string, cell: CellValue): void {
    event.preventDefault();
    this.contextMenuVisible = true;
    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
    this.pendingHpoColumnIndex = hpoColumnIndex;
    this.pendingHpoRowIndex = hpoRowIndex;
    this.pendingRowId = rowId;
    this.selectedCellContents = cell;
    console.log("pending c&r=", this.pendingHpoColumnIndex, this.pendingHpoRowIndex)
    this.selectedCellContents = cell;
    this.contextMenuOptions = [
      ...this.predefinedOptions,
      ...this.ageService.selectedTerms().map(term => ({
          label: term,
          value: term
        })),
      { label: '---', value: 'separator' },
      ...this.focusOptions,
  ];
  }

  shouldDisplayHpoColumn(index: number): boolean {
    if (this.focusedHpoIndex === null) return true;
    return (
      index >= this.focusedHpoIndex - this.hpoFocusRange &&
      index <= this.focusedHpoIndex + this.hpoFocusRange
    );
  }


  /**  Update the indicated table cell to have the new indicated CellValue (e.g., na, excluded, P14D).
   * This is called after the user has right-clicked on an HPO cell -  onRightClick, which sets
   * this.contextMenuVisible to true, allowing the methods onMenuOptionClick to be called, which in
   * turn calls this method with the indicated row and column index
  */
  updateHpoCell(
    cohort: CohortData,
    targetRow: RowData,
    colIndex: number,
    newValue: CellValue
  ): CohortData {
    return {
      ...cohort,
      rows: cohort.rows.map((row) =>
        row === targetRow
          ? {
              ...row,
              hpoData: row.hpoData.map((cell, cIdx) =>
                cIdx === colIndex ? newValue : cell
              ),
            }
          : row
      ),
    };
  }



  /* This function can only be called if contextMenuVisible is set true; this happens with the
  *  onRightClick function, which shows an option menu of actions for the cell. Then, when the user clicks
  * on one of those options, this function is called. The goal is to change the value of the cell 
  * and to persist it.
  */
  onMenuOptionClick(option: string): void {
    if (this.pendingHpoColumnIndex == null || !this.pendingRow) {
      this.notificationService.showError("No cell context found");
      return;
    }
    if (option.startsWith('focus')) {
      const parts = option.split('-');
      if (parts[1] === 'reset') {
        this.focusedHpoIndex = null;
        this.hpoFocusRange = 0;
      } else {
        this.focusedHpoIndex = this.pendingHpoColumnIndex;
        this.hpoFocusRange = parseInt(parts[1], 10);
      }
    } else if (this.selectedCellContents) {
      this.focusedHpoIndex = null;
      const currentDto = this.cohortService.getCohortData();
      if (! currentDto) {
        this.notificationService.showError("Cohort object is null (should never happen, please report to developers).");
        return;
      }
      console.log(currentDto)
      const cellValue: CellValue = getCellValue(option);
      const updatedCohort: CohortData = this.updateHpoCell(currentDto, this.pendingRow, this.pendingHpoColumnIndex, cellValue);
      this.cohortService.setCohortData(updatedCohort);
    }  
      
    
    this.pendingHpoColumnIndex = null;
    this.pendingHpoRowIndex = null;
    this.pendingRowId = null;
    this.contextMenuVisible = false;
  }

  onClickAnywhere(): void {
    this.contextMenuVisible = false;
  }

  @HostListener('document:click')
  closeContextMenu(): void {
    this.contextMenuVisible = false;
  }



  async saveCohort(): Promise<void> {
    const cohort = this.cohortService.getCohortData();
    if (cohort == null) {
      this.notificationService.showError("Cannot save null cohort");
      return;
    }
    const acronym = cohort.cohortAcronym;
    if (acronym == null) {
      this.notificationService.showError("Need to specify acronym before saving cohort");
      return;
    }

   cohort.diseaseList.forEach(d => {
      if (d.modeOfInheritanceList.length == 0) {
        this.notificationService.showError(`No mode of inheritance specified for ${d.diseaseLabel}`);
        return;
      }
    });
    await this.configService.saveCohort(cohort);
  }

  

  async exportPpkt(): Promise<void> {
    const cohort_dto = this.cohortService.getCohortData();
    if (! cohort_dto) {
      this.notificationService.showError("CohortData not initialized");
      return;
    }
    try {
      const res = await this.configService.exportPpkt(cohort_dto);
      this.notificationService.showSuccess(res);
    } catch (err) {
      this.notificationService.showError(String(err));
    }
  }

  /** Export the aggregate file for use in phenotype.hpoa (part of a small file) */
    async exportHpoa(): Promise<void> {
      const cohortDto = this.cohortService.getCohortData();
      if (! cohortDto) {
        this.notificationService.showError("Cohort DTO not initialized");
        return;
      }
      try {
        const message = await this.configService.exportHpoa(cohortDto);
        this.notificationService.showSuccess(message);
      } catch (err) {
        this.notificationService.showError(String(err));
      }
    }



    /* Keep track of which cell is hovered over. The key is something like `${category}-${rowIndex}-${itemIndex}` */
    hoverState: Record<string, boolean> = {};
    setHover(category: string, rowIndex: number, itemIndex: number, hovered: boolean): void {
      this.hoverState[`${category}-${rowIndex}-${itemIndex}`] = hovered;
    }
    isHovered(category: string, rowIndex: number, itemIndex: number): boolean {
      return !!this.hoverState[`${category}-${rowIndex}-${itemIndex}`];
    }



  /* flag -- if true, the GUI shows the dialog to enter an acronym */
  showCohortAcronym = false;
  showMoi = false;

 async submitCohortAcronym(acronym: string): Promise<void> {
    if (acronym.trim()) {
      this.cohortService.setCohortAcronym(acronym.trim());
      this.showCohortAcronym = false;
    }
  }

  cancelCohortAcronym(): void {
    this.showCohortAcronym = false;
  }


    // Convert the map into entries
    getAlleleEntries(row: RowData): [string, number][] {
      return Object.entries(row.alleleCountMap);
    }

    /* Function to return list of strings for display for an individuals pathogenic alleles.
      Returns a 5-element array. We could transform to a DTO (todo)  */
    getAlleleDisplay(key: string, count: number): string[] {
      const cohort = this.cohortService.getCohortData();
      let symbol = "na";
      let transcript = "na";
      let allele = "na";
      let allelecount = "na";
      if (cohort != null) {
        const hgvs = cohort.hgvsVariants[key];
        const sv = cohort.structuralVariants[key];
        allelecount = `n=${count}`;
        if (  hgvs) {
          symbol = hgvs.symbol;
          transcript = hgvs.transcript;
          allele = hgvs.hgvs;
        } else if (sv) {
          symbol = sv.geneSymbol;
          transcript = "na";
          allele = sv.label;
        }
      }
      return [allele, symbol, transcript, allelecount, key];
    }


  shortAlleleDisplayByKey = computed(() => {
    const cohort = this.cohortService.cohortData();
    if (!cohort || cohort.diseaseList.length === 0) {
      return new Map<string, string>();
    }
    const map = new Map<string, string>();
    for (const [key, hgvs] of Object.entries(cohort.hgvsVariants)) {
      map.set(key, hgvs.hgvs);
    }
    for (const [key, sv] of Object.entries(cohort.structuralVariants)) {
      map.set(key, sv.label);
    }
    for (const [key, ig] of Object.entries(cohort.intergenicVariants ?? {})) {
      map.set(key, ig.gHgvs ?? key);
    }
    return map;
  });


   diseaseLabelById = computed(() => {
    const cohort = this.cohortService.cohortData();
    if (!cohort || cohort.diseaseList.length === 0) {
      return new Map<string, string>();
    } else {
      return new Map(
        cohort.diseaseList.map(d => [d.diseaseId, d.diseaseLabel])
      );
    }
   }); 
 

   onMoiChange(newMoiList: ModeOfInheritance[], diseaseIndex: number): void {
    const cohort = this.cohortService.getCohortData();
    if (! cohort) {
      return;
    }
    // Attach MOI to the correct disease
    const disease = cohort.diseaseList[diseaseIndex];
    if (!disease.modeOfInheritanceList) {
      disease.modeOfInheritanceList = [];
    }
    newMoiList.forEach(moi => {disease.modeOfInheritanceList.push(moi)});
  }

    showAlleleColumn = true;

    toggleVariantColumn(): void {
      this.showAlleleColumn = !this.showAlleleColumn;
    }

   

  /** 
   * Debug helper: returns human-readable differences between two values.
   */
  deepDiff(a: unknown, b: unknown, path: string[] = []): string[] {
    const diffs: string[] = [];
    // Case 1: both are non-null objects → recurse
    if (this.isRecord(a) && this.isRecord(b)) {
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const key of keys) {
        diffs.push(
          ...this.deepDiff(a[key], b[key], [...path, key])
        );
      }
      return diffs;
    }
    // Case 2: values differ (primitive or mismatched types)
    if (a !== b) {
      diffs.push(`${path.join(".")}: ${String(a)} → ${String(b)}`);
    }

    return diffs;
  }
  /* HELPER FOR ABOVE FUNCTION */
  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }



  
openAgeDialog(): void {
  const dialogRef = this.dialog.open(AddageComponent, {
    width: '400px',
    data: { /* pass inputs if needed */ }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      this.ageService.addSelectedTerms(result);
    }
  });
}

get ageEntries(): string[] {
  return this.ageService.selectedTerms();
}

  async recordBiocuration(): Promise<void> {
    const orcid = await this.configService.getCurrentOrcid();
    if (! orcid) {
      this.notificationService.showError("Could not retrieve ORCID id");
      return;
    }
    const biocurationEvent = createCurationEvent(orcid);
    if (! biocurationEvent) {
      this.notificationService.showError("Could not create biocuration event");
      return;
    }
    this.cohortService.addBiocuration(biocurationEvent);
    this.notificationService.showSuccess(`Added biocuration event: ${biocurationEvent.orcid} on ${biocurationEvent.date}`)
  }

  /** Calculate the columns we show if the user chooses to filter to a top-level term */
  /** Calculate the columns we show if the user chooses to filter to a top-level term */
visibleColumns = computed<number[]>(() => {
  const cohort = this.cohortService.getCohortData();
  if (!cohort) return [];
  if (cohort.rows.length < 1) return [];
  
  const row1 = cohort.rows[0];
  const n_cols = row1.hpoData.length;  
  const selectedHpo = this.selectedTopLevelHpo();
  // if we have fewer than 20 columns, show all
  if (n_cols <= 20 || !selectedHpo) {
    return Array.from({ length: n_cols }, (_, i) => i);
  }
  const allowedTerms = this.hpoGroups().get(selectedHpo) ?? [];
  const allowedIds = allowedTerms.map(term => term.hpoId);
  // Return indices of headers whose HPO ID is allowed
  return cohort.hpoHeaders
    .map((header, i) => (allowedIds.includes(header.hpoId) ? i : -1))
    .filter(i => i !== -1);
});


visibleColumnMask = computed<Uint8Array>(() => {
  const cohort = this.cohortService.getCohortData();
  if (!cohort) return new Uint8Array();

  const n = cohort.hpoHeaders.length;
  const mask = new Uint8Array(n);

  for (const i of this.visibleColumns()) {
    mask[i] = 1;
  }
  return mask;
});

  /* right click on first column can focus on row or PMIDs */
  onIndividualRightClick(event: MouseEvent, rowId: string): void {
    event.preventDefault();
    this.contextRowId = rowId; 
    this.individualMenuX = event.clientX;
    this.individualMenuY = event.clientY;
    this.individualContextMenuVisible = true;
    event.stopPropagation();
  }


  get pendingRow(): RowData | null {
    if (!this.pendingRowId) return null;
    return this.rowMapById().get(this.pendingRowId) ?? null;
  }

  closeIndividualContextMenu(): void {
    this.individualContextMenuVisible = false;
  }


  // Just show the row that the user clicks on
  focusOnSingleRow(): void {
    if (!this.contextRowId) return;
    const row = this.rowMapById().get(this.contextRowId);
    if (! row) return;
    this.focusedRow.set(row);
    this.filterMode.set('single');
    this.closeContextMenu();
    this.individualContextMenuVisible = false;
  }

  get contextRowPmid(): string | null {
    if (!this.contextRowId) return null;
    const row = this.rowMapById().get(this.contextRowId);
    return row?.individualData.pmid ?? null;
  }
  /** Focus on all rows with the same PMID */
  focusOnPmid(pmid: string | null): void {
    if (! pmid) return;
    this.focusedPmid.set(pmid);
    this.filterMode.set('pmid');
    this.individualContextMenuVisible = false;
  }

  showAllRows(): void {
    this.filterMode.set('all');
    this.focusedPmid.set('');
    this.individualContextMenuVisible = false;
  }
 




 filteredKeys = computed(() => {
    const frows=  this.filteredRows().map(row => this.getIndividualKey(row.individualData));
    return new Set(frows);
 });





  /** Show info like the existing hover popup */
  showInfoForRow(rowId: string | null): void {
    console.log("showInfoForRow id=", rowId);
    this.individualContextMenuVisible = false;
    if (! rowId) return;
    const row = this.rowMapById().get(rowId);
    if (! row) {
      this.rowInfoKey = null;
      this.notificationService.showError("Cannot retrieve context row"); 
      return;
    }
    this.rowInfoKey = rowId;
    this.rowInfoVisible = true;
  }


  closeRowInfo(): void {
    this.rowInfoKey = null;
    this.rowInfoVisible = false;
    this.cdRef.detectChanges();
  }



  getAlleleKeys(map: Record<string, unknown>): string[] {
    return Object.keys(map);
  }

  getIndividualKey(individual: IndividualData): string {
    return `${individual.pmid || 'NA'}-${individual.individualId || 'NA'}`;
  }

  hasObservedHpo(row: RowData): boolean {
    if (!row?.hpoData || row.hpoData.length === 0) {
      return false;
    }
    return row.hpoData.some(cell => cell.type !== 'Excluded' && cell.type !== "Na");
  }

  async deleteRow(rowId: string | null): Promise<void> {
    if (!rowId) return;

    this.individualContextMenuVisible = false;

    const confirmed = await firstValueFrom(
    this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: "Delete row?",
        message: `row ${rowId}`,
        confirmText: "delete",
        cancelText: "cancel"
      }
    }).afterClosed()
  );

  if (!confirmed) return;

    const currentCohort = this.cohortService.getCohortData();
    if (!currentCohort) return;

    const updatedRows = currentCohort.rows.filter(
      r => getRowId(r.individualData) !== rowId
    );

    this.cohortService.setCohortData({
      ...currentCohort,
      rows: updatedRows
    });
  }

  /* Get Links for display with summary of cohort */
  getGeneLinks(disease: DiseaseData): {symbol: string, hgncUrl: string, transcript: string, ncbiUrl: string}[] {
    if (!disease?.geneTranscriptList?.length) {
      return [];
    }

    return disease.geneTranscriptList.map((gene:  GeneTranscriptData) => ({
      symbol: gene.geneSymbol,
      transcript: gene.transcript,
      hgncUrl: `https://www.genenames.org/data/gene-symbol-report/#!/hgnc_id/${gene.hgncId}`,
      ncbiUrl: `https://www.ncbi.nlm.nih.gov/nuccore/${gene.transcript}`
    }));
  }

  async sortCohortRows() {
    const dto = this.cohortService.getCohortData();
    if (! dto) return;
    const sorted_dto = await this.configService.sortCohortByrows(dto);
    this.cohortService.setCohortData(sorted_dto);
  
  }

  onHeaderMouseEnter(index: number) {
    this.hoveredHpoHeader = index;
  }

  onHeaderMouseLeave() {
    this.hoveredHpoHeader = null;
  }

  // Helper to check if a header is hovered
  isHeaderHovered(index: number): boolean {
    return this.hoveredHpoHeader === index;
  }

  toggleAddAllelePopover(rowId: string, event: MouseEvent) {
  event.stopPropagation(); // prevents the table row click from firing
  this.openAddAlleleRowId = this.openAddAlleleRowId === rowId ? null : rowId;
}

  // Close after selecting an option
  closeAddAllelePopover() {
    this.openAddAlleleRowId = null;
  }

  // Optional: click anywhere else closes popover
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    this.openAddAlleleRowId = null;
    this.individualContextMenuVisible = false;
  }

}
