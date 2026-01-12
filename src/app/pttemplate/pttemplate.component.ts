import { ChangeDetectorRef, Component, computed, effect, ElementRef, HostListener, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfigService } from '../services/config.service';
import { IndividualData, CohortData, RowData, CellValue, ModeOfInheritance, createCurationEvent, GeneTranscriptData, DiseaseData } from '../models/cohort_dto';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { AddagesComponent } from "../addages/addages.component";
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
    MatIconModule
],
  templateUrl: './pttemplate.component.html',
  styleUrls: ['./pttemplate.component.css'],
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
  @ViewChild(AddagesComponent) addagesComponent!: AddagesComponent;
  // References to the HTML elements
  @ViewChild('tableWrapper') tableWrapper!: ElementRef<HTMLDivElement>;
  @ViewChild('topScrollMirror') topScrollMirror!: ElementRef<HTMLDivElement>;
  @ViewChild('tableWidthRef') tableElement!: ElementRef<HTMLTableElement>;
  tableWidth = '100%'; 
  Object = Object; // expose global Object to template
  public readonly VariantKind = VariantKind;
  selectedCellContents: CellValue | null = null;
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
  contextRow: RowData | null = null;

  // the following determine which rows are shown in the GUI
  
  filterMode = signal<'all' | 'single' | 'pmid'>('all');
  focusedRow = signal<RowData | null>(null);
  focusedPmid = signal<string | null>(null);
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

  
  pendingHpoColumnIndex: number | null = null;
  pendingHpoRowIndex: number | null = null;
  pendingRow: RowData | null = null;
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


  openIndividualEditor(individual: IndividualData): void {
    this.individualContextMenuVisible = false;
    const dialogRef = this.dialog.open(IndividualEditComponent, {
      width: '500px',
      panelClass: 'edit-dialog',// Ensures above the current dialog
      data: { ...individual }, // pass a copy
    });
    dialogRef.afterClosed().subscribe((result: IndividualData | null) => {
      if (result) {
        // Apply changes back to the original
        Object.assign(individual, result);
        // Optional: trigger change detection or save to backend
      }
    });
  }

  onAlleleCountChange(alleleString: string, row: RowData, newCount: number): void {
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

    this.notificationService.showSuccess(
      `Set ${alleleString} allele count to ${newCount}`
    );
  }


  async addAllele(row: RowData, varKind: VariantKind): Promise<void> {
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
    const cohort = this.cohortService.getCohortData();
    if (!cohort) {
      this.notificationService.showError("No cohort available");
      return;
    }
    const rowIndex = cohort.rows.findIndex(r => r === row);
    if (rowIndex < 0) {
       this.notificationService.showError("Could not find row");
      return;
    }
    row.alleleCountMap[variantKey] = count;
    cohort.rows[rowIndex] = row;  // update row reference

    this.cohortService.setCohortData(cohort);
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
      const cdiff = this.deepDiff(sanitized_cohort, cohortData);
      alert(`✅ Cohort successfully sanitized ${cdiff}`);
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
  onRightClick(event: MouseEvent, hpoColumnIndex: number, hpoRowIndex: number, rowData: RowData, cell: CellValue): void {
    event.preventDefault();
    this.contextMenuVisible = true;
    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
    this.pendingHpoColumnIndex = hpoColumnIndex;
    this.pendingHpoRowIndex = hpoRowIndex;
    this.pendingRow = rowData;
    console.log("pending c&r=", this.pendingHpoColumnIndex, this.pendingHpoRowIndex)
    this.selectedCellContents = cell;
    this.contextMenuOptions = [
      ...this.predefinedOptions,
      ...this.ageService.getSelectedTerms().map(term => ({
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
    this.pendingRow = null;
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

  /* Create an OMIM URL from a string such as OMIM:654123 */
  getOmimId(diseaseId: string): string {
    const parts = diseaseId.split(":");
    return `${parts.length > 1 ? parts[1] : diseaseId}`;
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
  const dialogRef = this.dialog.open(AddagesComponent, {
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
  return this.ageService.getSelectedTerms();
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


  /* right click on first column can focus on row or PMIDs */
  onIndividualRightClick(event: MouseEvent, row: RowData): void {
    event.preventDefault();
    this.contextRow = row;
    this.individualMenuX = event.clientX;
    this.individualMenuY = event.clientY;
    this.individualContextMenuVisible = true;
    event.stopPropagation();
  }

  closeIndividualContextMenu(): void {
    this.individualContextMenuVisible = false;
  }


  // Just show the row that the user clicks on
  focusOnSingleRow(): void {
    if (!this.contextRow) return;
    this.focusedRow.set(this.contextRow);
    this.filterMode.set('single');
    this.closeContextMenu();
    this.individualContextMenuVisible = false;
  }
  /** Focus on all rows with the same PMID */
  focusOnPmid(): void {
    const crow = this.contextRow;
    if (! crow) {
      this.notificationService.showError("Could not focus on PMID because context row not found");
      this.showAllRows();
      return;
    }
    const pmid = crow.individualData.pmid
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
showInfoForRow(row: RowData | null): void {
  this.individualContextMenuVisible = false;
  if (! row) {
    this.rowInfoKey = null;
    this.notificationService.showError("Cannot retrieve context row"); 
    return;
  }
  this.rowInfoKey = this.getRowKey(row);
  this.rowInfoVisible = true;
  this.cdRef.detectChanges();
}


  closeRowInfo(): void {
    this.rowInfoKey = null;
    this.rowInfoVisible = false;
    this.cdRef.detectChanges();
  }



  getAlleleKeys(map: Record<string, unknown>): string[] {
    return Object.keys(map);
  }

  /** Get a unique key for a row based on the PMID and individualId (the combination of these two is garanteed to be unique) */
  getRowKey(row: RowData): string {
    const pmid = row?.individualData?.pmid ?? '';
    const id = row?.individualData?.individualId ?? '';
    return `${pmid}::${id}`; // use :: to avoid accidental collisions
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

  deleteRow(row: RowData | null): void {
    this.individualContextMenuVisible = false;
    if (! row) return;
    const currentCohort = this.cohortService.getCohortData();
    if (!currentCohort) return;
    console.log("Deleting row", row);
    const updatedRows = currentCohort.rows.filter(r => r !== row);
    const updatedCohort = {
      ...currentCohort,
      rows: updatedRows
    };
    this.cohortService.setCohortData(updatedCohort);
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

}
