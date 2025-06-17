import { Component, HostListener, Input, NgZone, ViewChild } from '@angular/core';
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
import { openUrl } from '@tauri-apps/plugin-opener';


@Component({
  selector: 'app-addcase',
  standalone: true,
  imports: [CommonModule, FormsModule, PubmedComponent, AddagesComponent, AdddemoComponent],
  templateUrl: './addcase.component.html', 
  styleUrl: './addcase.component.css'
})
export class AddcaseComponent {
  
  showPopup: boolean = false;

  

  constructor(
    private ngZone: NgZone,
    private configService: ConfigService,
    public ageService: AgeInputService
  ) {}
  @Input() annotations: TextAnnotationDto[] = [];
  @ViewChild('pmidChild') pubmedComponent!: PubmedComponent;
  @ViewChild('addagesComponent') addagesComponent!: AddagesComponent;

  pastedText: string = '';
  showTextArea: boolean = true;
  showDataEntryArea: boolean = false;
  showAgeEntryArea: boolean = true;
  showCollapsed: boolean = true;
  showAnnotationTable: boolean = false;

  showHoverPopup: boolean = false;
  selectedAnnotation: TextAnnotationDto | null = null;
  

  selectionRange: Range | null = null;

  // childTermsMap: { [termId: string]: TextAnnotationDto[] } = {};
  parentChildHpoTermMap: { [termId: string]: ParentChildDto } = {};
  showDropdownMap: { [termId: string]: boolean } = {};
  htmlData: string = '';
  rightClickOptions: string[] = [];
  predefinedOptions: string[] = ["observed", "excluded", "na"];
  selectedOptions: string[] = []; // Stores selected radio button values
  customOptions: string[] = []; // Stores manually entered custom options
  hpoInitialized: boolean = false;
  errorString: string | null = null;
  hasError: boolean = false;
  multiSelecting = false;


  selectedHpoSpans: HTMLElement[] = [];
  selectedText: string = '';
  popupX = 0;
  popupY = 0;
  uniqueAnnotatedTerms: string[] = [];

  backend_status: StatusDto = defaultStatusDto();
  private unlisten: UnlistenFn | null = null;

  async ngOnInit() {
    this.unlisten = await listen('backend_status', (event) => {
      this.ngZone.run(() => {
        this.backend_status = event.payload as StatusDto;
        console.log('Received backend status:', this.backend_status);
        this.hpoInitialized = this.backend_status.hpoLoaded;
      });
    });
  }
  
  ngOnDestroy() {
    if (this.unlisten) {
      this.unlisten();
      this.unlisten = null;
    }
  }

  /**
   * Performs HPO text mining by sending the pasted text to the backend service,
   * and updates the annotation list and rendered HTML view on success.
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
        const html = this.convertAnnotationsToHtml(); 
        this.htmlData = html;
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
  

  convertAnnotationsToHtml(): string {
    return this.annotations.map(ann => {
      if (!ann.isFenominalHit) {
        const escaped = this.escapeHtml(ann.originalText);
        return escaped;
      }
      const cls = ann.isObserved ? 'hpo-hit observed' : 'hpo-hit excluded';
      return `<span class="${cls}" title="${ann.label} [${ann.termId}]" data-id="${ann.termId}" onset-string="${ann.onsetString}">${this.escapeHtml(ann.originalText)}</span>`;
    }).join('');
  }

  escapeHtml(text: string): string {
    if (typeof text !== 'string') {
      const mytype = typeof text;
      console.warn('escapeHtml received non-string:', text, "type was ", mytype);
      return '';
    }
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }



  addCustomOption(index: number) {
    const customValue = this.customOptions[index]?.trim();
    if (customValue && !this.predefinedOptions.includes(customValue)) {
      this.predefinedOptions.push(customValue); // Add new option
      this.selectedOptions[index] = customValue; // Select it
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
    console.log("handleDemographicData - hide_demographic=",hide_demographic);
    if (hide_demographic) {
      this.showAgeEntryArea = false;
    } else {
      this.showAgeEntryArea = true;
    }
  }



openPopup(ann: TextAnnotationDto, event: MouseEvent) {
  console.log("open popup ann=", ann);
  this.rightClickOptions = [...this.predefinedOptions, ...this.ageService.getSelectedTerms()];
  console.log("rightcli", this.rightClickOptions);
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
  get fenominalAnnotations(): TextAnnotationDto[] {
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

}
