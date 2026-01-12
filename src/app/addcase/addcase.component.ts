import { Component, inject, Input, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule} from '@angular/forms';
import { ConfigService } from '../services/config.service';
import { defaultStatusDto, StatusDto } from '../models/status_dto';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { PubmedComponent } from "../pubmed/pubmed.component";
import { AddagesComponent } from "../addages/addages.component";
import { AdddemoComponent } from "../adddemo/adddemo.component";
import { AgeInputService } from '../services/age_service';
import { TextAnnotationDto } from '../models/text_annotation_dto';
import { GeneVariantData, IndividualData, CohortData } from '../models/cohort_dto';
import { HpoTermData, HpoTermDuplet } from '../models/hpo_term_dto';
import { MatIconModule } from '@angular/material/icon';
import { CohortDtoService } from '../services/cohort_dto_service';
import { AddVariantComponent, VariantKind } from "../addvariant/addvariant.component";
import { VariantDto } from '../models/variant_dto';
import { MatDialog } from '@angular/material/dialog';
import { defaultDemographDto, DemographDto } from '../models/demograph_dto';
import { Router } from '@angular/router';
import { defaultPmidDto, PmidDto } from '../models/pmid_dto';
import { NotificationService } from '../services/notification.service';
import { HpoTwostepComponent } from '../hpotwostep/hpotwostep.component';
import { ConfirmDialogComponent } from './confirmdialog.component';
import { signal, computed, effect } from '@angular/core';
import { firstValueFrom } from 'rxjs';

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
  constructor() {}
  @Input() annotations: TextAnnotationDto[] = [];
  private configService = inject(ConfigService);
  public ageService = inject(AgeInputService);
  private cohortService = inject(CohortDtoService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private ngZone = inject(NgZone);


  readonly pmidDto = signal<PmidDto>(defaultPmidDto());
  readonly demographData = signal<DemographDto>(defaultDemographDto());
  readonly hpoAnnotations = signal<HpoTermData[]>([]);
  readonly alleles = signal<VariantDto[]>([]);
  readonly backendStatus = signal<StatusDto>(defaultStatusDto());

  public VariantKind = VariantKind;
    

  pastedText: string = '';
  showTextArea: boolean = true;
  showDataEntryArea: boolean = false;
  showAgeEntryArea: boolean = true;
  showCollapsed: boolean = true;
  showAnnotationTable: boolean = false;
  showPopup: boolean = false;
  showHoverPopup: boolean = false;
  selectedAnnotation: TextAnnotationDto | null = null;

  /* Once we have annotations from the first step, show the second step! */
  readonly showTwoStepHpoButton = computed(
    () => this.hpoAnnotations().length === 0
  );
 

  selectionRange: Range | null = null;
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
    const pmid = this.pmidDto();
    const demo = this.demographData();
    const hpoAnn = this.hpoAnnotations();
    const allelesArr = this.alleles();
    if (!pmid.pmid) {
      this.notificationService.showError("Cannot submit new row without PMID");
      return;
    }
    if (!demo) {
      this.notificationService.showError("Cannot submit row unless demographic information is initialized");
      return;
    }
    // combine PMID and Demographic data DTOs to create an individual
    const individual_dto: IndividualData = {
      pmid: pmid.pmid,
      title: pmid.title,
      individualId: demo.individualId,
      comment: demo.comment,
      ageOfOnset: demo.ageOfOnset,
      ageAtLastEncounter: demo.ageAtLastEncounter,
      deceased: demo.deceased,
      sex: demo.sex
    };
    const allele_keys: string[] = allelesArr
      .filter(a => a.variantKey)
      .map(a => a.variantKey!);
    const cohort_dto = this.cohortService.getCohortData();
    if (cohort_dto != null) {
      try {
        const updated_dto: CohortData = await this.configService.addNewRowToCohort(
            individual_dto, 
            hpoAnn, 
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

  openVariantEditor(varKind: VariantKind) {
    const dialogRef = this.dialog.open(AddVariantComponent, {
      data: {
        kind: varKind
      },
        width: '600px'
      });
    
      dialogRef.afterClosed().subscribe((result: VariantDto | undefined) => {
        if (result) {
          const variantKey = result.variantKey;
          const alleleCount = result.count;
          if (variantKey == null) {
            this.notificationService.showError("Could not retrieve variantKey");
            return;
          }
          if (! result.isValidated) {
            this.notificationService.showError("Variant could not be validated");
            return;
          }
      let dto: VariantDto;
       if (varKind == VariantKind.HGVS) {
          dto = {
            variantString: result.variantString,
            variantKey: result.variantKey,
            transcript: result.transcript,
            hgncId: result.hgncId,
            geneSymbol: result.geneSymbol,
            variantType: 'HGVS',
            isValidated: false,
            count: alleleCount
          };
        } else if (varKind == VariantKind.SV) {
            dto = {
              variantString: result.variantString,
              variantKey: result.variantKey,
              transcript: result.transcript,
              hgncId: result.hgncId,
              geneSymbol: result.geneSymbol,
              variantType: 'SV',
              isValidated: false,
              count: alleleCount
            };
        } else if (varKind == VariantKind.INTERGENIC) {
          dto = {
              variantString: result.variantString,
              variantKey: result.variantKey,
              transcript: '',
              hgncId: result.hgncId,
              geneSymbol: result.geneSymbol,
              variantType: 'INTERGENICHGVS',
              isValidated: false,
              count: alleleCount
            };
        } else {
          this.notificationService.showError(`Could not identifiy variant kind ${varKind}`);
          return;
        }
          this.alleles.update(a => [...a, dto]);
          if (alleleCount == 2) {
            this.alleles.update(a => [...a, dto]);
          }
        } else {
          console.error("Error in open Allele Dialog")
        }
      });
    }


  removeAllele(allele: any) {
    this.alleles.update(list => list.filter(a => a !== allele));
  }


  createGeneVariantBundleDto(): GeneVariantData | null {
    if (this.alleles.length == 0 ) {
      this.notificationService.showError("allele 1 was null, cannot create GeneVariant bundle");
      return null; // need at least allele1 to move forward
    }
    const allele1 = this.alleles()[0];
    let allele2_string = "na";
    if (this.alleles.length == 2) {
      allele2_string = this.alleles()[1].variantString
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
    this.alleles.set([]);
    this.annotations = [];
    this.hpoAnnotations.set([]);
    this.demographData.set(defaultDemographDto());
    this.pmidDto.set(defaultPmidDto());
    this.backendStatus.set(defaultStatusDto());
    
    /*this.selectedAnnotation = null;
    this.selectionRange = null;
    this.errorString = null;
    this.hasError = false;
    */
  }

 private async selectPmid(): Promise<PmidDto | null> {
    const dialogRef = this.dialog.open(PubmedComponent, {
      width: '600px',
      data: { pmidDto: this.pmidDto() }
    });

    return firstValueFrom(dialogRef.afterClosed());
  }

  private async confirmDuplicatePmid(pmid: string): Promise<boolean> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Duplicate PMID',
        message: `${pmid} is already in the database. Continue anyway?`,
        confirmText: 'Continue',
        cancelText: 'Cancel'
      }
    });

    return firstValueFrom(ref.afterClosed());
  }

  async openPubmedDialog(): Promise<void> {
    const result = await this.selectPmid();
    if (!result) return;

    const pmid = result.pmid;

    if (this.cohortService.pmidExists(pmid)) {
      const confirmed = await this.confirmDuplicatePmid(pmid);

      if (!confirmed) {
        this.notificationService.showWarning('Cancelled adding duplicate PMID.');
        this.pmidDto.set(defaultPmidDto());
        return;
      }

      this.notificationService.showWarning(`Continuing with duplicate PMID ${pmid}`);
    }

    this.pmidDto.set(result);
  }


  resetPmidDto() {
    this.pmidDto.set(defaultPmidDto());
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
        this.hpoAnnotations.set(result);
        
      }
    });
  }

  resetAnnotations() {
    this.hpoAnnotations.set([]);
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
      data: { ageStrings: this.ageService.getSelectedTerms(), demoDto: this.demographData() }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.demographData.set(result.dto);
        this.showAgeEntryArea = !result.hideDemo;
      } else {
        this.notificationService.showError("Could not get demographic data");
      }
    });
  }

  readonly ageEntries = computed(
    () => this.ageService.getSelectedTerms()
  );

  get demographicSummary(): string {
    const value = this.demographData();
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
  readonly canSubmitRow = computed(() =>
    !!(
      this.pmidDto().pmid &&
      this.demographData() &&
      this.hpoAnnotations().length > 0 &&
      this.alleles().length > 0
    )
  );

}
