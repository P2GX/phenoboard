import { ChangeDetectorRef, Component, HostListener, NgZone, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfigService } from '../services/config.service';
import { IndividualData, CohortData, RowData, CellValue, ModeOfInheritance, GeneTranscriptData, createCurationEvent, HpoGroupMap } from '../models/cohort_dto';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { AddagesComponent } from "../addages/addages.component";
import { IndividualEditComponent } from '../individual_edit/individual_edit.component'; 
import { GeneEditComponent } from '../gene_edit/gene_edit.component';
import { HpoAutocompleteComponent } from '../hpoautocomplete/hpoautocomplete.component';
import { AgeInputService } from '../services/age_service';
import { CohortDtoService } from '../services/cohort_dto_service';
import { TemplateBaseComponent } from '../templatebase/templatebase.component';
import { filter, firstValueFrom } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { getCellValue, HpoTermDuplet } from '../models/hpo_term_dto';
import { MoiSelector } from "../moiselector/moiselector.component";
import { GeneEditDialogData, StructuralVariant, VariantDto } from '../models/variant_dto';
import { MatIconModule } from "@angular/material/icon";
import { AddVariantComponent } from '../addvariant/addvariant.component';
import { SvDialogService } from '../services/svManualEntryDialogService';
import { FormsModule } from '@angular/forms';


type Option = { label: string; value: string };



@Component({
  selector: 'app-pttemplate',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HpoAutocompleteComponent,
    MatButtonModule,
    MatTableModule,
    MatTooltipModule,
    MatDialogModule,
    MoiSelector,
    MatIconModule
],
  templateUrl: './pttemplate.component.html',
  styleUrls: ['./pttemplate.component.css'],
})
export class PtTemplateComponent extends TemplateBaseComponent implements OnInit {

  constructor(
    private configService: ConfigService, 
    private dialog: MatDialog,
    public ageService: AgeInputService,
    ngZone: NgZone,
    cohortService: CohortDtoService,
    private svDialog: SvDialogService,
    override cdRef: ChangeDetectorRef,
    private notificationService: NotificationService) {
      super(cohortService, ngZone, cdRef)
    }
  @ViewChild(HpoAutocompleteComponent) hpo_component!: HpoAutocompleteComponent;
  @ViewChild(AddagesComponent) addagesComponent!: AddagesComponent;
    Object = Object; // <-- expose global Object to template
  cohortDto: CohortData | null = null;

  selectedCellContents: CellValue | null = null;
  successMessage: string | null = null;

  /* used for autocomplete widget */
  hpoInputString: string = '';
  selectedHpoTerm: HpoTermDuplet | null = null;
  /* used for right-click option menu */
  contextMenuVisible: boolean = false;
  contextMenuX:number = 0;
  contextMenuY: number = 0;
  
  pendingHpoColumnIndex: number | null = null;
  pendingHpoRowIndex: number | null = null;
  focusedHpoIndex: number | null = null;
  hpoFocusRange = 0; // number of columns to each side
  cohortAcronymInput: string = '';
  
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

  contextMenuOptions: Option[] = [];
  showMoiIndex: number | null = null;

    /** e.g., show just terms that descend from a top level term such as Abnormality of the musculoskeletal system HP:0033127 */
    selectedTopLevelHpo: string | null = null;
    /** Key: top-level term (represented in Cohort), value: all descendents of the term in our Cohort dataset */
    hpoGroups: HpoGroupMap = new Map<string, HpoTermDuplet[]>();
    hpoGroupKeys: string[] = [];
    visibleColumns: number[] = [];

  override ngOnInit(): void {
    super.ngOnInit();
    this.cohortService.cohortData$.subscribe(dto => {
      if (!dto) return;

      this.cohortDto = dto;
      this.configService.getTopLevelHpoTerms(dto)
        .then(groups => {
          this.hpoGroups = new Map(Object.entries(groups));
          this.hpoGroupKeys = Array.from(this.hpoGroups.keys());
          this.visibleColumns = this.getVisibleColumns();
        })
        .catch(err => {
          console.error('Error fetching HPO groups:', err);
          this.hpoGroupKeys = [];
        });
    });
    document.addEventListener('click', this.onClickAnywhere.bind(this));
    this.contextMenuOptions = [...this.predefinedOptions];
    this.cohortAcronymInput = this.getSuggestedAcronym();
  }
  
  /** Get suggest cohort acronym for melded only (others should be blank because the user
   * needs to retrieve from OMIM; for melded, we use the gene symbols for the two diseases). */
  getSuggestedAcronym(): string {
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
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    document.removeEventListener('click', this.onClickAnywhere.bind(this)); 
  }

  protected override onCohortDtoLoaded(cohortDto: CohortData): void {
    console.log("✅ Template loaded into PtTemplateComponent:", cohortDto);
    this.cdRef.detectChanges();
  }

  protected override onCohortDtoMissing(): void {
    console.warn("⚠️ Template is missing in PtTemplateComponent");
  }

  get moiList(): ModeOfInheritance[] {
    const cohort = this.cohortService.getCohortData();
    if (!cohort) return [];
    return cohort.diseaseList.flatMap(d => d.modeOfInheritanceList ?? []);
  }

  toggleMoiSelector(i: number) {
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
        this.cohortService.setCohortData(data); // 🟢 base class reacts here
      } catch (error) {
        this.notificationService.showError(`❌ Failed to load template: ${error}`);
      }
    } else {
      console.log("✅ Template already loaded");
    }
  }

  ngAfterViewInit(): void {
    this.cdRef.detectChanges(); 
  }


  async loadTemplateFromBackend(): Promise<void> {
    this.configService.getPhetoolsTemplate().then((data: CohortData) => {
        this.cohortService.setCohortData(data);
  });
  }


  openIndividualEditor(individual: IndividualData) {
    const dialogRef = this.dialog.open(IndividualEditComponent, {
      width: '500px',
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



    
  /**
   * Opens a dialog that allows editing or adding alleles
   */
  openGeneEditor(alleleKey: string | undefined, row: RowData) {
    const cohort = this.cohortDto;
    if (!cohort) {
      this.notificationService.showError("Could not retrieve cohort");
      return;
    }

    const gtdata: GeneTranscriptData[] = this.cohortService.getGeneTranscriptDataList();
    if (gtdata.length === 0) {
      this.notificationService.showError("Could not retrieve gene/transcript data");
      return;
    }

    // Build data for the dialog
    const geneEditData: GeneEditDialogData = {
      alleleKey: alleleKey ?? undefined,
      allelecount: alleleKey ? row.alleleCountMap?.[alleleKey] ?? 0 : 0,
      gtData: gtdata,
      cohort: cohort
    };

    // Open dialog
    const dialogRef = this.dialog.open(GeneEditComponent, {
      width: '500px',
      data: geneEditData
    });

    // Handle result
    dialogRef.afterClosed().subscribe((result: any) => {
      if (!result) return;

      if (result.action === 'update') {
        row.alleleCountMap[result.alleleKey] = result.count;
        this.notificationService.showSuccess("Updated allele");
      } else if (result.action === 'add') {
        row.alleleCountMap[result.alleleKey] = result.count;
        this.notificationService.showSuccess("Added allele");
      } else if (result.action === 'delete') {
        delete row.alleleCountMap[result.alleleKey];
        this.notificationService.showSuccess("Deleted allele");
      }
    });
  }

  addAllele(row: RowData) {
     const dialogRef = this.dialog.open(AddVariantComponent, {
          width: '600px'
        });
    
        dialogRef.afterClosed().subscribe((result: VariantDto | undefined) => {
          if (result) {
            const variantKey = result.variantKey;
            if (variantKey == null) {
              this.notificationService.showError("Could not retrieve variantKey");
              return;
            }
            if (! result.isValidated) {
              this.notificationService.showError("Variant could not be validated");
              return;
            }
            /* If we get here, the variant was validated and added to the cohort. */
            /* We add it with a count of 1 -- they user may need to adjust */
  
            const cohort = this.cohortService.getCohortData();
            if (cohort) {
              // Find the matching row in cohort.rows
              const rowIndex = cohort.rows.findIndex(r => r === row);
              if (rowIndex >= 0) {
                row.alleleCountMap[variantKey] = 1;
                cohort.rows[rowIndex] = row; // update row reference
                this.cohortService.setCohortData(cohort); // push back to service
                this.notificationService.showSuccess(`Allele ${variantKey} added`);
              }
            } else {
              this.notificationService.showError("No cohort available");
            }
          } else {
            console.error("Error in open Allele Dialog")
          }
        });
  }

  async openSvEditor(row: RowData): Promise<void> {
    const cohort = this.cohortService.getCohortData();
    if (! cohort) return; 
    // get first disease
    if (cohort.diseaseList == null || cohort.diseaseList.length < 1) {
      this.notificationService.showError("Cannot add SV because disease list not initialized");
      return;
    }
    if (cohort.diseaseList[0].geneTranscriptList === null || cohort.diseaseList[0].geneTranscriptList.length < 1) {
      this.notificationService.showError("Cannot add SV because geneTranscriptList not initialized");
      return;
    }
    const gt = cohort.diseaseList[0].geneTranscriptList[0];
    const chr: string = this.cohortService.getChromosome();
    const cell_contents = ''; // initialize SV label in dialog 
    try{
      const sv: StructuralVariant | null = await this.svDialog.openSvDialog(gt, cell_contents, chr);
      
      if (sv) {
        const vkey = sv.variantKey;
        if (! vkey) {
          this.notificationService.showError(`Could not get key from Structural Variant object ${sv}`);
          return;
        }
        // Initialize to 1 if missing, otherwise increment
        row.alleleCountMap[vkey] = (row.alleleCountMap[vkey] ?? 0) + 1;
        if (!(vkey in cohort.structuralVariants)) {
          cohort.structuralVariants[vkey] = sv;
        }
      }
    } catch (error) {
      const errMsg = String(error);
      this.notificationService.showError(errMsg);
    }
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

  get numVariants(): number {
    const cohort = this.cohortService.getCohortData()
    if (! cohort ) {
      return 0;
    } else {
      return Object.keys(cohort.hgvsVariants).length + Object.keys(cohort.structuralVariants).length
    }
  }


  async validateCohort() {
    console.log("validate")
    if (! this.cohortDto) {
      alert("Cohort DTO not initialized");
      return;
    }
    try {
      await this.configService.validateCohort(this.cohortDto);
      alert("✅ Cohort successfully validated");
    } catch (err: any) {
      // If the Rust command returns a ValidationErrors struct
      alert('❌ Validation failed:\n' + JSON.stringify(err));
    }
  }

  /** Remove ontological conflicts and redundancies */
  async sanitizeCohort() {
    console.log("validate")
    const cohortDto = this.cohortDto;
    if (! cohortDto) {
      alert("Cohort DTO not initialized");
      return;
    }
    try {
      let sanitized_cohort = await this.configService.sanitizeCohort(cohortDto);
      this.cohortService.setCohortData(sanitized_cohort);
      console.log(this.deepDiff(sanitized_cohort, cohortDto));
      alert("✅ Cohort successfully sanitized");
    } catch (err: any) {
      // If the Rust command returns a ValidationErrors struct
      alert('❌ Sanitization failed:\n' + JSON.stringify(err));
    }
  }



  submitSelectedHpo = async () => {
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
        let updated_template = await this.configService.addHpoToCohort(autocompletedTerm.hpoId, autocompletedTerm.hpoLabel, template);
        this.notificationService.showSuccess(`Successfully added ${autocompletedTerm.hpoLabel} (${autocompletedTerm.hpoId})`);
        this.cohortService.setCohortData(updated_template);
      } catch (err) {
        const errMsg =`Failed to add term ${autocompletedTerm.hpoLabel} (${autocompletedTerm.hpoId}): ${err}`
        this.notificationService.showError(errMsg);
      }
    }
  }

  
  /** Open a context menu after a right-click on an HPO column */
  onRightClick(event: MouseEvent, hpoColumnIndex: number, hpoRowIndex: number, cell: CellValue) {
    event.preventDefault();
    this.contextMenuVisible = true;
    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
    this.pendingHpoColumnIndex = hpoColumnIndex;
    this.pendingHpoRowIndex = hpoRowIndex;
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


/**  Update the indicated table cell to have the new indicated CellValue (e.g., na, excluded, P14D)*/
  updateHpoCell(
    cohort: CohortData,
    rowIndex: number,
    colIndex: number,
    newValue: CellValue
  ): CohortData {
    return {
      ...cohort,
      rows: cohort.rows.map((row, rIdx) => {
        if (rIdx !== rowIndex) return row;

        return {
          ...row,
          hpoData: row.hpoData.map((cell, cIdx) =>
            cIdx === colIndex ?  newValue  : cell
          )
        };
      })
    };
  }


  /* This function can only be called if contextMenuVisible is set true; this happens with the
  *  onRightClick function, which shows an option menu of actions for the cell. Then, when the user clicks
  * on one of those options, this function is called. The goal is to change the value of the cell 
  * and to persist it.
  */
  onMenuOptionClick(option: string): void {
    console.log("onMenuOptionClick option=",option);
    if (this.pendingHpoColumnIndex == null) {
      this.notificationService.showError("Attempt to perform right-option with null column index");
      return;
    }
    if (this.pendingHpoRowIndex == null) {
      this.notificationService.showError("Attempt to perform right-option with null row index");
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
      const currentDto = this.cohortDto; //this.cohortService.getCohortDto();
      if (! currentDto) {
        this.notificationService.showError("Cohort object is null (should never happen, please report to developers).");
        return;
      }
      console.log(currentDto)
      const cellValue: CellValue = getCellValue(option);
      const updatedCohort: CohortData = this.updateHpoCell(currentDto, this.pendingHpoRowIndex, this.pendingHpoColumnIndex, cellValue);
      this.cohortDto = updatedCohort;
      this.cohortService.setCohortData(updatedCohort);
    }  
      
    
    this.pendingHpoColumnIndex = null;
    this.pendingHpoRowIndex = null;
    this.contextMenuVisible = false;
  }

  onClickAnywhere(): void {
    this.contextMenuVisible = false;
  }

  @HostListener('document:click')
  closeContextMenu() {
    this.contextMenuVisible = false;
  }

  async saveCohort() {
    const cohort = this.cohortDto;
    if (cohort == null) {
      this.notificationService.showError("Cannot save null cohort");
      return;
    }
    let acronym = cohort.cohortAcronym;
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

  

  async exportPpkt() {
    const cohort_dto = this.cohortDto;
    if (! cohort_dto) {
      this.notificationService.showError("CohortData not initialized");
      return;
    }
   
    console.log("exportPpkt-cohort=", cohort_dto);
    try {
      const res = await this.configService.exportPpkt(cohort_dto);
      this.notificationService.showSuccess(res);
    } catch (err) {
      this.notificationService.showError(String(err));
    }
  }

  /** Export the aggregate file for use in phenotype.hpoa (part of a small file) */
    async exportHpoa() {
      if (! this.cohortDto) {
        this.notificationService.showError("Cohort DTO not initialized");
        return;
      }
      const cohort_dto = this.cohortDto;
      console.log("exportHpoa", cohort_dto);
      try {
        const message = await this.configService.exportHpoa(cohort_dto);
        this.notificationService.showSuccess(message);
      } catch (err) {
        this.notificationService.showError(String(err));
      }
    }



    /* Keep track of which cell is hovered over. The key is something like `${category}-${rowIndex}-${itemIndex}` */
    hoverState: Record<string, boolean> = {};
    setHover(category: string, rowIndex: number, itemIndex: number, hovered: boolean) {
      this.hoverState[`${category}-${rowIndex}-${itemIndex}`] = hovered;
    }
    isHovered(category: string, rowIndex: number, itemIndex: number): boolean {
      return !!this.hoverState[`${category}-${rowIndex}-${itemIndex}`];
    }



  /* flag -- if true, the GUI shows the dialog to enter an acronym */
  showCohortAcronym = false;
  showMoi = false;

 async submitCohortAcronym(acronym: string) {
    const cohort_dto: CohortData | null = await firstValueFrom(this.cohortService.cohortData$); // make sure we get the very latest version
    console.log("submitCohortAcronym before", cohort_dto);
    if (acronym.trim()) {
      this.cohortService.setCohortAcronym(acronym.trim());
      this.showCohortAcronym = false;
    }
    const cohort_dto2: CohortData | null = await firstValueFrom(this.cohortService.cohortData$); // make sure we get the very latest version
    console.log("submitCohortAcronym afteter", cohort_dto2);
  }

  cancelCohortAcronym() {
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

    getShortAlleleDisplay(key: string, count: number): string {
      const cohort = this.cohortService.getCohortData();
      let label = key;
      const allelecount = count.toString();
      if (cohort != null) {
        const hgvs = cohort.hgvsVariants[key];
          const sv = cohort.structuralVariants[key];
          if ( hgvs) {
            label = hgvs.hgvs;
          } else if (sv) {
            label = sv.label;
          }
      }
      return `${label} (n=${allelecount})`;
    }

    getDiseaseLabel(diseaseId: string): string {
      const cohort = this.cohortDto;
      if (cohort == null || cohort.diseaseList.length == 0) {
        return "n/a";
      }
      if (cohort.diseaseList.length > 1) {
        const disease = cohort.diseaseList.find(d => d.diseaseId === diseaseId)?.diseaseLabel;
        return disease || "n/a";
      } else {
        return cohort.diseaseList[0].diseaseLabel;
      }
    }
 /*
    onMoiChange(mois: ModeOfInheritance[]) {
      console.log("onMoiChange mois=", mois);
      const cohort = this.cohortService.getCohortData();
      if (!cohort) {
        this.notificationService.showError("Could not set MOI because cohort is not initialized");
        return;
      }
      cohort.diseaseList.forEach(disease => {
        disease.modeOfInheritanceList = mois;
      });

      this.notificationService.showSuccess(
        `Set ${mois.length} modes of inheritance`
      );
    }*/

   onMoiChange(newMoiList: ModeOfInheritance[], diseaseIndex: number) {
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

    isAlleleValidated(alleleKey: string): boolean {
      const cohort = this.cohortDto;
      if (cohort == null) {
        return false;
      }
      return !!cohort.hgvsVariants[alleleKey] || !!cohort.structuralVariants[alleleKey];
    }

    showAlleleColumn = true;

    toggleVariantColumn() {
      this.showAlleleColumn = !this.showAlleleColumn;
    }

    deleteAllele(alleleKey: string, row: RowData) {
      delete row.alleleCountMap[alleleKey];
    }

  /** for debugging. Puts the differences between to structures, can be output to console. */
  deepDiff(a: any, b: any, path: string[] = []): string[] {
    const diffs: string[] = [];

    const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);

    for (const key of keys) {
      const newPath = [...path, key];
      const aVal = a?.[key];
      const bVal = b?.[key];

      if (aVal && bVal && typeof aVal === "object" && typeof bVal === "object") {
        diffs.push(...this.deepDiff(aVal, bVal, newPath));
      } else if (aVal !== bVal) {
        diffs.push(`${newPath.join(".")}: ${aVal} → ${bVal}`);
      }
    }
  return diffs;
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

  async recordBiocuration() {
    
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
  getVisibleColumns(): number[] {
    const cohort = this.cohortService.getCohortData();
    if (! cohort) return [];
    if (cohort.rows.length < 1) return [];
    const row1 = cohort.rows[0];
    const n_cols = row1.hpoData.length;
  
    
    // if we have fewer than 20 columns, show all
    if (n_cols <= 20 || !this.selectedTopLevelHpo) {
      return Array.from({ length: n_cols }, (_, i) => i);
    }

    const allowedTerms = this.hpoGroups.get(this.selectedTopLevelHpo) ?? [];
    const allowedIds = allowedTerms.map(term => term.hpoId);

    // Return indices of headers whose HPO ID is allowed
    return cohort.hpoHeaders
      .map((header, i) => (allowedIds.includes(header.hpoId) ? i : -1))
      .filter(i => i !== -1);
  }

  private filterChangeTimeout: any;

  onHpoFilterChange(): void {
    clearTimeout(this.filterChangeTimeout);
    this.filterChangeTimeout = setTimeout(() => {
      this.visibleColumns = this.getVisibleColumns();
    }, 200); // adjust delay as needed (ms)
  }


}
