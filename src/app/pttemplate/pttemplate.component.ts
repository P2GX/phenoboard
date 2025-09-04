import { ChangeDetectorRef, Component, HostListener, NgZone, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfigService } from '../services/config.service';
import { DiseaseData, GeneVariantData, IndividualData, CohortData, RowData, CellValue, ModeOfInheritance, GeneTranscriptData } from '../models/cohort_dto';
import { CohortDescriptionDto, EMPTY_COHORT_DESCRIPTION} from '../models/cohort_description_dto'
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { AddagesComponent } from "../addages/addages.component";
import { IndividualEditComponent } from '../individual_edit/individual_edit.component'; 
import { GeneEditComponent } from '../gene_edit/gene_edit.component';
import { HpoAutocompleteComponent } from '../hpoautocomplete/hpoautocomplete.component';
import { AgeInputService } from '../services/age_service';
import { CohortDtoService } from '../services/cohort_dto_service';
import { TemplateBaseComponent } from '../templatebase/templatebase.component';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { getCellValue } from '../models/hpo_term_dto';
import { MoiSelector } from "../moiselector/moiselector.component";
import { GeneEditDialogData } from '../models/variant_dto';
import { MatIconModule } from "@angular/material/icon";


type Option = { label: string; value: string };

@Component({
  selector: 'app-pttemplate',
  standalone: true,
  imports: [
    AddagesComponent,
    HpoAutocompleteComponent,
    CommonModule,
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
    override cdRef: ChangeDetectorRef,
    private notificationService: NotificationService) {
      super(cohortService, ngZone, cdRef)
    }
  @ViewChild(HpoAutocompleteComponent) hpo_component!: HpoAutocompleteComponent;
  @ViewChild(AddagesComponent) addagesComponent!: AddagesComponent;
    Object = Object; // <-- expose global Object to template
  cohortDto: CohortData | null = null;

  selectedCellContents: CellValue | null = null;
  cohortDescription: CohortDescriptionDto | null = null;
  successMessage: string | null = null;

  /* used for autocomplete widget */
  hpoInputString: string = '';
  selectedHpoTerm: string = "";
  /* used for right-click option menu */
  contextMenuVisible: boolean = false;
  contextMenuX:number = 0;
  contextMenuY: number = 0;
  
  pendingHpoColumnIndex: number | null = null;
  pendingHpoRowIndex: number | null = null;
  focusedHpoIndex: number | null = null;
  hpoFocusRange = 0; // number of columns to each side
  
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
  moiList: ModeOfInheritance[] = [];

  override ngOnInit(): void {
    console.log("PtTemplateComponent - ngInit");
    super.ngOnInit();
    this.cohortService.cohortDto$.subscribe(dto => {
      this.cohortDto = dto;
    });
    document.addEventListener('click', this.onClickAnywhere.bind(this));
    this.contextMenuOptions = [...this.predefinedOptions];
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    document.removeEventListener('click', this.onClickAnywhere.bind(this)); 
  }

  protected override onCohortDtoLoaded(cohortDto: CohortData): void {
    console.log("✅ Template loaded into PtTemplateComponent:", cohortDto);
    this.cohortDescription = this.generateCohortDescriptionDto(cohortDto);
    this.cdRef.detectChanges();
  }

  protected override onCohortDtoMissing(): void {
    console.warn("⚠️ Template is missing in PtTemplateComponent");
  }

  /* Load the Phetools template from the backend only if the templateService 
    has not yet been initialized. */
  async loadTemplate(): Promise<void> {
    const existing = this.cohortService.getCohortDto();
    if (!existing) {
      console.log("🏗️ Loading template from backend...");
      try {
        const data = await this.configService.getPhetoolsTemplate();
        this.cohortService.setCohortDto(data); // 🟢 base class reacts here
      } catch (error) {
        console.error("❌ Failed to load template:", error);
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
        this.cohortService.setCohortDto(data);
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
      allele: alleleKey ?? null,
      count: alleleKey ? row.alleleCountMap?.[alleleKey] ?? 0 : 0,
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


  generateCohortDescriptionDto(cohortDto: CohortData | null): CohortDescriptionDto  {
    if (cohortDto == null) {
      return EMPTY_COHORT_DESCRIPTION;
    }
    console.log("generateCohortDescriptionDto", cohortDto);
    const diseaseList: DiseaseData[] = cohortDto.diseaseList;
    if (diseaseList.length == 0) {
      this.notificationService.showError("Cannot generate description of a cohort with an empty disease-list");
      return EMPTY_COHORT_DESCRIPTION;
    } else if (diseaseList.length > 1) {
      this.notificationService.showError("Cohort description for Melded phenotypes not yet implemented");
      return EMPTY_COHORT_DESCRIPTION;
    }
    const diseaseData = diseaseList[0];
    if (diseaseData.geneTranscriptList.length < 1) {
      this.notificationService.showError("Could not find GeneTrascript Data");
      return EMPTY_COHORT_DESCRIPTION;
    }
    const gt_dto = diseaseData.geneTranscriptList[0];
    const diseaseLabel = diseaseData.diseaseLabel;
    const diseaseId = diseaseData.diseaseId;
    
    let diseaseDatabase = 'N/A';
    let idPart = '';

    if (diseaseId.includes(':')) {
      [diseaseDatabase, idPart] = diseaseId.split(':');
    }

    return {
      valid: true,
      cohortType: cohortDto.cohortType,
      numIndividuals: cohortDto.rows.length,
      numHpos: cohortDto.hpoHeaders.length,
      diseaseLabel: diseaseLabel,
      diseaseId: diseaseId,
      diseaseDatabase,
      geneSymbol: gt_dto.geneSymbol,
      hgncId: gt_dto.hgncId,
      transcript: gt_dto.transcript,
    };
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



  submitSelectedHpo = async () => {
    await this.addHpoTermToCohort(this.selectedHpoTerm);
    
  };

  async addHpoTermToCohort(autocompletedTerm: string): Promise<void> {
    const template = this.cohortService.getCohortDto();
    if (template == null) {
      console.error("Attempt to add HPO Term to cohort but template is null");
      return;
    }
    if (autocompletedTerm) {
      const [id, label] = autocompletedTerm.split('-').map(s => s.trim());
      try {
        let updated_template = await this.configService.addHpoToCohort(id, label, template);
        this.notificationService.showSuccess(`Successfully added ${label} (${id})`);
        this.cohortService.setCohortDto(updated_template);
      } catch (err) {
        const errMsg =`Failed to add term ${label} (${id}): ${err}`
        this.notificationService.showError(errMsg);
      }
    }
  }

  

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
        console.log("after",this.cohortDto)
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
    if (this.moiList == null || this.moiList.length == 0) {
      this.notificationService.showError("Need to specify a mode of inheritance (or multiple)");
      return;
    }
    console.log("saveCohort: ", cohort);
    console.log("saveCohort: moi=", this.moiList);
    if (cohort.diseaseList.length > 0) {
      cohort.diseaseList[0].modeOfInheritanceList = this.moiList;
    }
     console.log("saveCohort: ", cohort);
    await this.configService.saveCohort(cohort);
    this.cohortDescription = this.generateCohortDescriptionDto(cohort);
    
  }

  

  async exportPpkt() {
    if (! this.cohortDto) {
      alert("Cohort DTO not initialized");
      return;
    }
    const cohort_dto = this.cohortDto;
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
    const cohort_dto: CohortData | null = await firstValueFrom(this.cohortService.cohortDto$); // make sure we get the very latest version
    console.log("submitCohortAcronym before", cohort_dto);
    if (acronym.trim()) {
      this.cohortService.setCohortAcronym(acronym.trim());
      this.showCohortAcronym = false;
    }
    const cohort_dto2: CohortData | null = await firstValueFrom(this.cohortService.cohortDto$); // make sure we get the very latest version
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
      const cohort = this.cohortService.getCohortDto();
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
      const cohort = this.cohortService.getCohortDto();
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

    onMoiChange(mois: ModeOfInheritance[]) {
      this.moiList = mois;
      this.notificationService.showSuccess(`Set ${this.moiList.length} modes of inheritance`)
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

}
