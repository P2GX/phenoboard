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
import { IndividualDto } from '../models/template_dto';
import { openUrl } from '@tauri-apps/plugin-opener';
import { HpoAutocompleteComponent } from "../hpoautocomplete/hpoautocomplete.component";
import { HpoAnnotationDto, HpoTermDto } from '../models/hpo_annotation_dto';
import { TemplateDtoService } from '../services/template_dto_service';

@Component({
  selector: 'app-addcase',
  standalone: true,
  imports: [CommonModule, FormsModule, PubmedComponent, AddagesComponent, AdddemoComponent, HpoAutocompleteComponent],
  templateUrl: './addcase.component.html', 
  styleUrl: './addcase.component.css'
})
export class AddcaseComponent {
  constructor(
    private ngZone: NgZone,
    private configService: ConfigService,
    public ageService: AgeInputService,
    private templateService: TemplateDtoService
  ) {}
  @Input() annotations: TextAnnotationDto[] = [];
  @ViewChild('pmidChild') pubmedComponent!: PubmedComponent;
  @ViewChild('addagesComponent') addagesComponent!: AddagesComponent;
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
  

  selectionRange: Range | null = null;
  parentChildHpoTermMap: { [termId: string]: ParentChildDto } = {};
  showDropdownMap: { [termId: string]: boolean } = {};
  rightClickOptions: string[] = [];
  predefinedOptions: string[] = ["observed", "excluded", "na"];
  selectedOptions: string[] = []; // Stores selected radio button values
  customOptions: string[] = []; // Stores manually entered custom options
  hpoInitialized: boolean = false;
  errorString: string | null = null;
  hasError: boolean = false;
  multiSelecting = false;

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
  }

  
  ngOnDestroy() {
    if (this.unlisten) {
      this.unlisten();
      this.unlisten = null;
    }
    
  }

  async submitNewRow(): Promise<void> {
      let pmid_dto = this.pubmedComponent.getPmidDto();
      let demogr_dto = this.demographics_component.getDemograph();
      // combine the above
      const individual_dto: IndividualDto = {
        pmid: pmid_dto.pmid,
        title: pmid_dto.title,
        individualId: demogr_dto.individualId,
        comment: demogr_dto.comment,
        ageOfOnset: demogr_dto.ageOfOnset,
        ageAtLastEncounter: demogr_dto.ageAtLastEncounter,
        deceased: demogr_dto.deceased,
        sex: demogr_dto.sex
      };
      const hpoAnnotations: HpoTermDto[] = this.getFenominalAnnotations().map(this.convertTextAnnotationToHpoAnnotation);
      console.log("mapped HPO annotations", hpoAnnotations);
      let template_dto = this.templateService.getTemplate();
      if (template_dto != null) {
        try {
        const updated_dto = await this.configService.addNewRowToCohort(individual_dto, hpoAnnotations, template_dto);
        console.log("Updated cohort, " , updated_dto);
        this.templateService.setTemplate(updated_dto);
      } catch (error) {
        console.log("Could not add new row: error TO DO DISPLAAY", error);
      }

      } else {
        console.error("Attempt to add new row with null template_dto");
      }
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
  handleDemographicData(hide_demographic: boolean) {
    if (hide_demographic) {
      this.showAgeEntryArea = false;
    } else {
      this.showAgeEntryArea = true;
    }
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
  submitAnnotations() {
    this.rightClickOptions = [...this.predefinedOptions, ...this.ageService.getSelectedTerms()];
    this.showAnnotationTable = true;
    /*console.log('Annotations:');
    this.annotations.forEach((annotation, index) => {
      console.log(`Annotation ${index + 1}:`, annotation);
    });*/
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
    }
  }

  convertTextAnnotationToHpoAnnotation(textAnn: TextAnnotationDto): HpoTermDto {
    console.log("convertTextAnnotationToHpoAnnotation teAnn", textAnn);
    let status = 'na';
    if (textAnn.isObserved) {
      status = 'observed';
      if (textAnn.onsetString != 'na') {
        status = textAnn.onsetString;
      }
    } else {
      status = 'excluded';
    }

    return {
      termId: textAnn.termId,
      termLabel: textAnn.label,
      entry: status,
    };
  }

}
