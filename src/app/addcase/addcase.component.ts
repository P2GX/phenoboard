import { Component, Input, NgZone, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ✅ Import FormsModule
import { ConfigService } from '../services/config.service';
import { defaultStatusDto, StatusDto } from '../models/status_dto';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { PubmedComponent } from "../pubmed/pubmed.component";
import { AddagesComponent } from "../addages/addages.component";
import { AdddemoComponent } from "../adddemo/adddemo.component";
import { AgeInputService } from '../services/age_service';
import { ParentChildDto, TextAnnotationDto } from '../models/text_annotation_dto';
import { GeneVariantBundleDto, IndividualDto, TemplateDto } from '../models/template_dto';
import { openUrl } from '@tauri-apps/plugin-opener';
import { HpoAutocompleteComponent } from "../hpoautocomplete/hpoautocomplete.component";
import { HpoTermDto } from '../models/hpo_annotation_dto';
import { MatIconModule } from '@angular/material/icon';
import { TemplateDtoService } from '../services/template_dto_service';
import { AddVariantComponent } from "../addvariant/addvariant.component";
import { VariantDto } from '../models/variant_dto';
import { MatDialog } from '@angular/material/dialog';
import { DemographDto } from '../models/demograph_dto';

/**
 * Component to add a single case using text mining and HPO autocompletion.
 */
@Component({
  selector: 'app-addcase',
  standalone: true,
  imports: [CommonModule, FormsModule, PubmedComponent, AddagesComponent, AdddemoComponent, HpoAutocompleteComponent, MatIconModule],
  templateUrl: './addcase.component.html', 
  styleUrl: './addcase.component.css'
})
export class AddcaseComponent {

  constructor(
    private ngZone: NgZone,
    private configService: ConfigService,
    public ageService: AgeInputService,
    private templateService: TemplateDtoService,
    private dialog: MatDialog
  ) {}
  @Input() annotations: TextAnnotationDto[] = [];
  @ViewChild(PubmedComponent) pubmedComponent!: PubmedComponent;
  @ViewChild(AddagesComponent) addagesComponent!: AddagesComponent;
  @ViewChild(HpoAutocompleteComponent) hpo_component!: HpoAutocompleteComponent;
  @ViewChild(AdddemoComponent) demographics_component!: AdddemoComponent;



  pastedText: string = '';
  showTextArea: boolean = true;
  showDataEntryArea: boolean = false;
  showAgeEntryArea: boolean = true;
  showCollapsed: boolean = true;
  showAnnotationTable: boolean = false;
  showPopup: boolean = false;
  showHoverPopup: boolean = false;
  selectedAnnotation: TextAnnotationDto | null = null;

  allele1: VariantDto | null = null;
  allele2: VariantDto | null = null;

  tableData: TemplateDto | null = null;
  demographData: DemographDto | null = null;
 

  selectionRange: Range | null = null;
  parentChildHpoTermMap: { [termId: string]: ParentChildDto } = {};
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
  selectedHpoTerm: string = "";

  private unlisten: UnlistenFn | null = null;
  private unlistenFns: UnlistenFn[] = [];

  async ngOnInit(): Promise<void> {
    this.unlistenFns.push(
      await listen('backend_status', (event) => {
        this.ngZone.run(() => this.handleBackendStatus(event.payload));
      })
    );

    this.unlistenFns.push(
      await listen('autocompletion', (event) => {
        this.ngZone.run(() => this.handleAutocompletion(event.payload));
      })
    );
    // 
    this.templateService.template$.subscribe(template => {
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

  async submitNewRow(): Promise<void> {
    console.log("submitNewRow - top");
      let pmid_dto = this.pubmedComponent.getPmidDto();
      if (pmid_dto == null) {
        alert("Cannot submit row unless PMID information is initialized");
        return;
      }
      if (this.demographData == null) {
        alert("Cannot submit row unless demographic information is initialized");
        return;
      }

      // combine the above
      const individual_dto: IndividualDto = {
        pmid: pmid_dto.pmid,
        title: pmid_dto.title,
        individualId: this.demographData.individualId,
        comment: this.demographData.comment,
        ageOfOnset: this.demographData.ageOfOnset,
        ageAtLastEncounter: this.demographData.ageAtLastEncounter,
        deceased: this.demographData.deceased,
        sex: this.demographData.sex
      };
      const hpoAnnotations: HpoTermDto[] = this.getFenominalAnnotations().map(this.convertTextAnnotationToHpoAnnotation);
      const geneVariantBundle = this.createGeneVariantBundleDto();
      if (geneVariantBundle == null) {
        this.errorString = "Could not create Gene/Variant bundle";
        alert(this.errorString);
        return;
      }
      const template_dto = this.templateService.getTemplate();
      if (template_dto != null) {
         console.log("previous template was not null", template_dto);
        try {
          const updated_dto: TemplateDto = await this.configService.addNewRowToCohort(
              individual_dto, 
              hpoAnnotations, 
              [geneVariantBundle],
              template_dto);
          console.log("Updated dto, " , updated_dto);
          this.templateService.setTemplate(updated_dto);
        } catch (error) {
          this.errorString = `Could not add new row: ${error instanceof Error ? error.message : JSON.stringify(error)}`;
          alert(this.errorString);
          console.error(this.errorString);
        }
      } else {
        alert("Attempt to add new row with null template_dto")
      }
      this.resetAllInputVars();
  }

  private handleBackendStatus(payload: unknown): void {
    const status = payload as StatusDto;
    this.backend_status = status;
    this.hpoInitialized = status.hpoLoaded;
  }

  private handleAutocompletion(payload: unknown): void {
    this.ngZone.run(() => {
      try {
        const dto = payload as TextAnnotationDto;
        this.annotations.push(dto);
      } catch (error) {
        console.error('Error in autocompletion payload:', error);
      }
    });
  }

  /**
   * Performs HPO text mining by sending the pasted text to the backend service,
   * and updates the annotation list on success.
   *
   * - If the backend returns a string, it is assumed to be an error message.
   * - Otherwise, the result is parsed as a list of `TextAnnotationDto`.
   *
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  async doHpoTextMining(): Promise<void> {
    this.clearError();
    try {
      const result = await this.configService.map_text_to_annotations(this.pastedText);

      if (typeof result === 'string') {
        this.setError(String(result));
      } else {
        const annots: TextAnnotationDto[] = result;
        this.annotations = annots;
        this.showTextArea = false;
        this.showDataEntryArea = true;
      }
    } catch (error) {
      this.setError(String(error));
    }
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


onMouseEnterAnnotatedTerm(event: MouseEvent): void {
  if (this.selectedText) return; // avoid showing hover popup if text is selected
  this.showHoverPopup = true;
  this.popupX = event.pageX;
  this.popupY = event.pageY;
}

onAnnotationMouseLeave(event: MouseEvent) {
  this.showHoverPopup = false;
  this.selectedAnnotation = null;
}


handleMouseLeave() {
  this.showHoverPopup = false;
}

/** This is run when the user enters demographic information via the child component */
  handleDemographicData(event: {dto: DemographDto, hideDemo: boolean}) {
    if (event.hideDemo) {
      this.showAgeEntryArea = false;
    } else {
      this.showAgeEntryArea = true;
    }
    this.demographData = event.dto;
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

  onLinkClick(event: MouseEvent, termId: string): void {
    event.preventDefault();
    this.openHpoLink(termId);
  }

  async openHpoLink(hpoId: string) {
    const hpo_url = `https://hpo.jax.org/browse/term/${hpoId}`;
    await openUrl(hpo_url);
  }

  toggleDropdown(annotation: TextAnnotationDto) {
    const termId = annotation.termId;

    this.showDropdownMap[termId] = !this.showDropdownMap[termId];

    if (this.showDropdownMap[termId] && !this.parentChildHpoTermMap[termId]) {
      this.configService.getHpoParentAndChildTerms(annotation).then(relativeTermDtos => {
        this.parentChildHpoTermMap[termId] = relativeTermDtos;
      });
    }
  }

  replaceTerm(annotation: TextAnnotationDto, replacement: TextAnnotationDto) {
    annotation.termId = replacement.termId;
    annotation.label = replacement.label;
    this.showDropdownMap[annotation.termId] = false;
  }

    submitSelectedHpo = async () => {
    await this.submitHpoAutocompleteTerm(this.selectedHpoTerm);
  };

  async submitHpoAutocompleteTerm(autocompletedTerm: string): Promise<void> {
    if (autocompletedTerm) {
      const [id, label] = autocompletedTerm.split('-').map(s => s.trim());
      await this.configService.submitAutocompleteHpoTerm(id, label);
      this.clearError();
      this.ngZone.run(() => {
        this.resetWindow();
        this.demographics_component.reset();
      });
    }
  }

  convertTextAnnotationToHpoAnnotation(textAnn: TextAnnotationDto): HpoTermDto {
    let status = 'na';
    
    if (textAnn.isObserved) {
      status = 'observed';
      if (!textAnn.onsetString || textAnn.onsetString.trim() === "" || textAnn.onsetString != 'na') {
        status = textAnn.onsetString; // if there is a non-empty/non-na onset, use it for our value
      }
    } else {
      status = 'excluded';
    }
    console.log("convertTextAnnotationToHpoAnnotation status (O/E)=", status);
    return {
      termId: textAnn.termId,
      termLabel: textAnn.label,
      entry: status,
    };
  }

  handleVariantAllele1(variant: VariantDto) {
    this.allele1 = variant;
  }

  handleVariantAllele2(variant: VariantDto) {
    this.allele2 = variant;
  }

  openAddAllele1Dialog() {
    console.log("openAddAllele1Dialog-top")
    const dialogRef = this.dialog.open(AddVariantComponent, {
      width: '600px'
    });

    dialogRef.afterClosed().subscribe((result: VariantDto | undefined) => {
      if (result) {
        this.allele1 = result;
        console.log('allele1 added:', result);
      } else {
        console.error("Error in openAddAllele1Dialog")
      }
    });
  }

  openAddAllele2Dialog() {
    const dialogRef = this.dialog.open(AddVariantComponent, {
      width: '600px'
    });

    dialogRef.afterClosed().subscribe((result: VariantDto | undefined) => {
      if (result) {
        this.allele2 = result;
        console.log('Variant added:', result);
      } else {
        console.error("Error in openAddAllele2Dialog")
      }
    });
  }


  createGeneVariantBundleDto(): GeneVariantBundleDto | null {
    if (this.allele1 == null ) {
      console.error("allele 1 was null, cannot create GeneVariant bundle");
      return null; // need at least allele1 to move forward
    }
    let allele2_string = "na";
    if (this.allele2 != null && this.allele2.validated) {
      allele2_string = this.allele2.variant_string
    }
    return  {
      hgncId: this.allele1.hgnc_id,
      geneSymbol: this.allele1.gene_symbol,
      transcript: this.allele1.transcript || "na",
      allele1: this.allele1.variant_string,
      allele2: allele2_string,
      variantComment: '',
    }
  }
  
  resetAllInputVars() {
    this.resetWindow();
    this.allele1 = null;
    this.allele2 = null;
    this.demographics_component.reset();
    this.pubmedComponent.reset_pmid();
    if (this.addagesComponent) {
        this.addagesComponent.reset();
    }
    if (this.hpo_component) {
      this.hpo_component.clearInput();
    }
    
    this.annotations = [];
    this.selectedAnnotation = null;
    this.selectionRange = null;
    this.errorString = null;
    this.hasError = false;
    this.backend_status = defaultStatusDto();
  }
}
