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
import { TextAnnotationDto } from '../models/text_annotation_dto';

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
  showAnnotations: boolean = false;
  suppressHoverMenu = false;
  showHoverPopup: boolean = false;
  selectedAnnotation: TextAnnotationDto | null = null;
  

  selectionRange: Range | null = null;

  jsonData: any[] = [ ]; 
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

  /* prevent hover menu from showing when we are selecting a section of text. */
  suppressHover($event: MouseEvent) {
    this.suppressHoverMenu = true;
    this.showHoverPopup = false;
  }
handleTextSelection(event: MouseEvent): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const selectedText = selection.toString().trim();
  if (selectedText.length === 0) return;

  const container = document.createElement('div');
  container.appendChild(range.cloneContents());
  const spanNodes = container.querySelectorAll('.hpo-hit');
  if (spanNodes.length === 0) return;

  this.rightClickOptions = [...this.predefinedOptions, ...this.ageService.getSelectedTerms()];
  this.selectedHpoSpans = Array.from(spanNodes).map((span: any) => {
    const dataId = span.getAttribute('data-id');
    if (!dataId) return null;
    const selector = `[data-id="${CSS.escape(dataId)}"]`;
    return document.querySelector(selector) as HTMLElement | null;
  }).filter((el): el is HTMLElement => el !== null);

  this.selectedText = selectedText;
  const rect = range.getBoundingClientRect();
  this.popupX = rect.left + window.scrollX;
  this.popupY = rect.bottom + window.scrollY;
  

  setTimeout(() => {
    this.suppressHoverMenu = false;
    this.showHoverPopup = true;
  }, 300);
}

  

annotateSelection(annotation: string): void {
  console.log("annotateSelection=>", annotation);
  for (const span of this.selectedHpoSpans) {
   // First, get all selected term IDs from spans
    const selectedTermIds = this.selectedHpoSpans.map(span => span.getAttribute('data-id')).filter(id => id !== null) as string[];

  // Update matching DTOs
  this.annotations.forEach(annot => {
    if (annot != null && selectedTermIds.includes(annot.termId)) {
      annot.onsetString = annotation;
    }
  });
    }
  this.closePopup();
}


closePopup(): void {
  this.showHoverPopup = false;
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

updatePopupPosition(event: MouseEvent) {
  if (this.suppressHoverMenu) return;
  const target = event.target as HTMLElement;
  const rect = target.getBoundingClientRect();
  this.popupX = rect.left + window.scrollX;
  this.popupY = rect.bottom + window.scrollY;
  this.showHoverPopup = true;
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

annotateSelectedText() {
  throw new Error('Method not implemented.');
}
submitAnnotations() {
  console.log("submitAnnotations not implemented yet")
}

openPopup(ann: TextAnnotationDto, event: MouseEvent) {
  console.log("open popup ann=", ann);
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
}
