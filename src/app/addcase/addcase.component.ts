import { Component, Input, NgZone, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, NgModel,  } from '@angular/forms';
import { ConfigService } from '../services/config.service';
import { defaultStatusDto, StatusDto } from '../models/status_dto';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { PubmedComponent } from "../pubmed/pubmed.component";
import { AddagesComponent } from "../addages/addages.component";
import { AdddemoComponent } from "../adddemo/adddemo.component";
import { AgeInputService } from '../services/age_service';
import { ParentChildDto, TextAnnotationDto } from '../models/text_annotation_dto';
import { GeneVariantData, IndividualData, CohortData } from '../models/cohort_dto';
import { HpoAutocompleteComponent } from "../hpoautocomplete/hpoautocomplete.component";
import { HpoTermData, HpoTermDuplet } from '../models/hpo_term_dto';
import { MatIconModule } from '@angular/material/icon';
import { CohortDtoService } from '../services/cohort_dto_service';
import { AddVariantComponent } from "../addvariant/addvariant.component";
import { VariantDto } from '../models/variant_dto';
import { MatDialog } from '@angular/material/dialog';
import { DemographDto } from '../models/demograph_dto';
import { Router } from '@angular/router';
import { defaultPmidDto, PmidDto } from '../models/pmid_dto';
import { NotificationService } from '../services/notification.service';
import { HpoTwostepComponent } from '../hpotwostep/hpotwostep.component';
import { NgModule } from '@angular/core';

/**
 * Component to add a single case using text mining and HPO autocompletion.
 */
@Component({
  selector: 'app-addcase',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,  
    MatIconModule
  ],
  templateUrl: './addcase.component.html', 
  styleUrl: './addcase.component.css'
})
export class AddcaseComponent {


  constructor(
    private ngZone: NgZone,
    private configService: ConfigService,
    public ageService: AgeInputService,
    private cohortService: CohortDtoService,
    private dialog: MatDialog,
    private router: Router,
    private notificationService: NotificationService,
  ) {}
  @Input() annotations: TextAnnotationDto[] = [];
 
  cohortDto$ = this.cohortService.cohortData$;
  //pmidForm: FormGroup;
  pmidDto: PmidDto = defaultPmidDto();


  pastedText: string = '';
  showTextArea: boolean = true;
  showDataEntryArea: boolean = false;
  showAgeEntryArea: boolean = true;
  showCollapsed: boolean = true;
  showAnnotationTable: boolean = false;
  showPopup: boolean = false;
  showHoverPopup: boolean = false;
  selectedAnnotation: TextAnnotationDto | null = null;

  showTwoStepHpoButton: boolean = true;
  hpoAnnotations: HpoTermData[] = [];

  alleles: VariantDto[] = [];

  tableData: CohortData | null = null;
  demographData: DemographDto | null = null;
 

  selectionRange: Range | null = null;
  //parentChildHpoTermMap: { [termId: string]: ParentChildDto } = {};
  showDropdownMap: { [termId: string]: boolean } = {};
  rightClickOptions: string[] = [];
  predefinedOptions: string[] = ["observed", "excluded", "na"];
  selectedOptions: string[] = []; //  selected radio button values
  customOptions: string[] = []; // manually entered custom options
  hpoInitialized: boolean = false;
  errorString: string | null = null;
  hasError: boolean = false;


  selectedText: string = '';
  popupX = 0;
  popupY = 0;
  uniqueAnnotatedTerms: string[] = [];

  backend_status: StatusDto = defaultStatusDto();

  /* used for autocomplete widget */
  hpoInputString: string = '';
  selectedHpoTerm: HpoTermDuplet | null = null;

  private unlisten: UnlistenFn | null = null;
  private unlistenFns: UnlistenFn[] = [];

  async ngOnInit(): Promise<void> {
    this.unlistenFns.push(
      await listen('backend_status', (event) => {
        this.ngZone.run(() => this.handleBackendStatus(event.payload));
      })
    );
    // 
    this.cohortService.cohortData$.subscribe(template => {
      if (template) {
        this.tableData = template;
      } else {
        this.tableData = null;
      }
      
    });
  }

  
  ngOnDestroy() {
    if (this.unlisten) {
      this.unlisten();
      this.unlisten = null;
    }
    
  }

  /** This function is called when the user wants to finalize
   * the creation of a new Phenopacket row with all information
   * for one new case.
   */
  async submitNewRow(): Promise<void> {
    console.log("submitNewRow - top");
    if (this.pmidDto == null) {
      this.notificationService.showError("Cannot submit new row without PMID");
      return;
    }
      let pmid_dto = this.pmidDto;
      if (this.demographData == null) {
        this.notificationService.showError("Cannot submit row unless demographic information is initialized");
        return;
      }

      // combine the above
      const individual_dto: IndividualData = {
        pmid: pmid_dto.pmid,
        title: pmid_dto.title,
        individualId: this.demographData.individualId,
        comment: this.demographData.comment,
        ageOfOnset: this.demographData.ageOfOnset,
        ageAtLastEncounter: this.demographData.ageAtLastEncounter,
        deceased: this.demographData.deceased,
        sex: this.demographData.sex
      };
      const hpoAnnotations: HpoTermData[] = this.hpoAnnotations;
      let allele_keys: string[] = [];
      this.alleles.forEach(allele => {
        if (allele.variantKey) allele_keys.push(allele.variantKey)
      });
      const cohort_dto = this.cohortService.getCohortData();
      console.log("add case, cohort=", cohort_dto);
      if (cohort_dto != null) {
        try {
          const updated_dto: CohortData = await this.configService.addNewRowToCohort(
              individual_dto, 
              hpoAnnotations, 
              allele_keys,
              cohort_dto);
          this.cohortService.setCohortData(updated_dto);
        } catch (error) {
          this.errorString = `Could not add new row: ${error instanceof Error ? error.message : JSON.stringify(error)}`;
          this.notificationService.showError(this.errorString);
        }
      } else {
        this.notificationService.showError("Attempt to add new row with null template_dto")
      }
      this.resetAllInputVars();
      /* After creating a new row, we jump to the template editor component. */
     await this.router.navigate(['/pttemplate']);
  }

  private handleBackendStatus(payload: unknown): void {
    const status = payload as StatusDto;
    this.backend_status = status;
    this.hpoInitialized = status.hpoLoaded;
  }


  setError(errMsg: string): void {
    this.errorString = errMsg;
    this.hasError = true;
  }

  clearError(): void {
    this.errorString = '';
    this.hasError = false;
  }


  addCustomOption(index: number) {
    const customValue = this.customOptions[index]?.trim();
    if (customValue && !this.predefinedOptions.includes(customValue)) {
      this.predefinedOptions.push(customValue); 
      this.selectedOptions[index] = customValue;
    }
  }

  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  resetWindow() {
    this.ngZone.run(() => {
      this.showTextArea = true;
    });
  }

 


closePopup(): void {
  this.showPopup = false;
  this.selectedAnnotation = null;
}


openPopup(ann: TextAnnotationDto, event: MouseEvent) {
  this.rightClickOptions = [...this.predefinedOptions, ...this.ageService.getSelectedTerms()];
  this.selectedAnnotation = ann;
  this.showPopup = true;
  // Get the clicked element's bounding box
  const target = event.target as HTMLElement;
  const rect = target.getBoundingClientRect();
  // Position relative to the page
  this.popupX = rect.left + window.scrollX;
  this.popupY = rect.bottom + window.scrollY;
} 
  toggleObserved(annot: TextAnnotationDto | null): void {
    if (annot == null) {
      return;
    }
    annot.isObserved = !annot.isObserved;
  }

  /* The following commands deal with the table of annotated terms */
  annotateSelectedText() {
    throw new Error('Method not implemented.');
  }

  /* This is called by the button to submit the annotations obtained by fenominal text mining
    of an input text. */
  submitAnnotations() {
    this.rightClickOptions = [...this.predefinedOptions, ...this.ageService.getSelectedTerms()];
    this.showAnnotationTable = true;
    this.showCollapsed = false;
    this.showTextArea = false;
  }

  /* About half of the TextAnnotationDto objects represent the text between the fenominal hits
    Here, we get a list of the fenominal hits (representing the HPO terms) for display in the table */
  getFenominalAnnotations(): TextAnnotationDto[] {
    return this.annotations.filter(a => a.isFenominalHit);
  }

  /* Remove an annotation from the HTML table. */
  deleteAnnotation(index: number): void {
    this.annotations.splice(index, 1);
  }

  updateOnset(annotation: TextAnnotationDto, newValue: string): void {
    annotation.onsetString = newValue;
  }



  /** Allow the user to enter data about Allele1 */
  openAddAlleleDialog() {
    const dialogRef = this.dialog.open(AddVariantComponent, {
      width: '600px'
    });

    dialogRef.afterClosed().subscribe((result: VariantDto | undefined) => {
      if (result) {
        const allele = result;
        this.alleles.push(allele);
        console.log('allele1 added:', result);
      } else {
        this.notificationService.showError("Error in openAddAllele1Dialog")
      }
    });
  }

  removeAllele(allele: any) {
    this.alleles = this.alleles.filter(a => a !== allele);
  }


  createGeneVariantBundleDto(): GeneVariantData | null {
    if (this.alleles.length == 0 ) {
      this.notificationService.showError("allele 1 was null, cannot create GeneVariant bundle");
      return null; // need at least allele1 to move forward
    }
    const allele1 = this.alleles[0];
    let allele2_string = "na";
    if (this.alleles.length == 2) {
      allele2_string = this.alleles[1].variantString
    }
    return  {
      hgncId: allele1.hgncId,
      geneSymbol: allele1.geneSymbol,
      transcript: allele1.transcript || "na",
      allele1: allele1.variantString,
      allele2: allele2_string,
      variantComment: '',
    }
  }
  
  resetAllInputVars() {
    this.resetWindow();
    this.alleles = [];
    this.annotations = [];
    this.hpoAnnotations = [];
    this.selectedAnnotation = null;
    this.selectionRange = null;
    this.errorString = null;
    this.hasError = false;
    this.backend_status = defaultStatusDto();
  }


    openPubmedDialog() {
      const dialogRef = this.dialog.open(PubmedComponent, {
        width: '600px',
        data: { pmidDto: null } // optional initial data
      });
  
      dialogRef.afterClosed().subscribe((result: PmidDto | null) => {
        if (result) {
          this.pmidDto = result;
          const pmid = this.pmidDto.pmid;
          if (this.cohortService.pmidExists(pmid)) {
            this.notificationService.warnPmid(pmid);
          }
        } else {
          this.notificationService.showError('Could not retrieve PMID');
        }
      });
    }

    resetPmidDto() {
      this.pmidDto = defaultPmidDto(); // or however you want to reset it
    }

    openHpoTwoStepDialog() {
      console.log("openHpoTwoStepDialog")
      const dialogRef = this.dialog.open(HpoTwostepComponent, {
        width: '1200px',
        height: '900px',
        disableClose: true,
      });

      dialogRef.afterClosed().subscribe((result: HpoTermData[] | undefined) => {
        if (result) {
          console.log('Final annotations:', result);
          this.hpoAnnotations = result;
          this.showTwoStepHpoButton = false;
        }
      });
    }

    resetAnnotations() {
      this.hpoAnnotations = [];
      this.showTwoStepHpoButton = true;
    }

  openAgeDialog(): void {
    const dialogRef = this.dialog.open(AddagesComponent, {
      width: '400px',
      data: { /* pass inputs if needed */ }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.notificationService.showSuccess(`Added age "${result}"`);
      }
    });
  }

  openAddDemoDialog() {
    const dialogRef = this.dialog.open(AdddemoComponent, {
      width: '1000px',
      data: { ageStrings: this.ageService.getSelectedTerms(), demoDto: this.demographData }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.demographData = result.dto;
        this.showAgeEntryArea = !result.hideDemo;
      } else {
        this.notificationService.showError("Could not get demographic data");
      }
    });
  }

  get ageEntries(): string[] {
    return this.ageService.getSelectedTerms();
  }

  get demographicSummary(): string {
    const value = this.demographData;
    if (value === null) {
      return "not initialized";
    }
    if (!value.individualId) return 'not initialized';

    const age = value.ageAtLastEncounter !== 'na' ? `age: ${value.ageAtLastEncounter}` : '';
    const onset = value.ageOfOnset !== 'na' ? `onset: ${value.ageOfOnset}` : '';
    const extras = [age, onset].filter(Boolean).join(', ');

    return `Individual: ${value.individualId} (${extras}; sex: ${value.sex}; deceased?: ${value.deceased})`;
  }

  /** Do we have all of the information needed to submit a row? */
  canSubmitRow(): boolean {
    return !!(
      this.pmidDto?.pmid &&
      this.demographData &&
      this.hpoAnnotations?.length > 0 &&
      this.alleles?.length > 0
    );
  }

}
