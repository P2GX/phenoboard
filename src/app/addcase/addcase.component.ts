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
annotateSelectedText() {
throw new Error('Method not implemented.');
}
submitAnnotations() {
throw new Error('Method not implemented.');
}
  
  @Input() annotations: TextAnnotationDto[] = [];
  selectedAnnotation: TextAnnotationDto | null = null;


  constructor(
    private ngZone: NgZone,
    private configService: ConfigService,
    public ageService: AgeInputService
  ) {}
  @ViewChild('pmidChild') pubmedComponent!: PubmedComponent;
  @ViewChild('addagesComponent') addagesComponent!: AddagesComponent;
  pastedText: string = '';
  showTextArea: boolean = true;
  showDataEntryArea: boolean = false;
  showAgeEntryArea: boolean = true;
  showCollapsed: boolean = true;
  showAnnotations: boolean = false;

  selectionRange: Range | null = null;

  jsonData: any[] = [ ]; 
  htmlData: string = '';
  rightClickOptions: string[] = [];
  predefinedOptions: string[] = ["observed", "excluded", "na"];
  selectedOptions: string[] = []; // Stores selected radio button values
  customOptions: string[] = []; // Stores manually entered custom options
  hpoInitialized: boolean = false;
  loadError: string | null = null;

  selectedHpoSpans: HTMLElement[] = [];
  selectedText: string = '';
  showAnnotationPopup = false;
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


  async doHpoTextMining(): Promise<void> {
    try {
      const result = await this.configService.map_text_to_annotations(this.pastedText);

      if (typeof result === 'string') {
        console.error('Backend error:', result); // handle error message
      } else {
        const annots: TextAnnotationDto[] = result;
        this.annotations = annots;
        const html = this.convertAnnotationsToHtml(); //
        this.htmlData = html;
        this.showTextArea = false;
        this.showDataEntryArea = true;
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    }
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



  handleTextSelection(event: MouseEvent): void {
    this.rightClickOptions = [...this.predefinedOptions, ...this.ageService.getSelectedTerms()];
    console.log("In this.rightClickOptions:", this.rightClickOptions);
    const selection = window.getSelection();
    if (! selection || selection.rangeCount == 0) return;
    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
    if (selectedText.length == 0) return;
    // collect all .hpo-hit elements
    const container = document.createElement('div');
    container.appendChild(range.cloneContents());
    const spanNodes = container.querySelectorAll('.hpo-hit');
    if (spanNodes.length == 0) return;

    this.selectedHpoSpans = Array.from(spanNodes).map((span: any) => {
      const dataId = span.getAttribute('data-id');
      if (!dataId) return null;
      const selector = `[data-id="${CSS.escape(dataId)}"]`;
      const matching = document.querySelector(selector);
      return matching as HTMLElement | null;
    }).filter((el): el is HTMLElement => el !== null);

    this.selectedText = selectedText;
    const rect = range.getBoundingClientRect();
    this.popupX = rect.left + window.scrollX;
    this.popupY = rect.bottom + window.scrollY;
    this.showAnnotationPopup = true;
  }

  deleteSelectedText(): void {
  if (this.selectionRange) {
    this.selectionRange.deleteContents();
    
    this.updateHtmlDataFromDom();
  }
}

annotateSelection(annotation: string): void {
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

onAnnotationClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (target && target.classList.contains('hpo-hit')) {
    const termId = target.getAttribute('data-id');

    if (termId) {
      const annotation = this.annotations.find(ann => ann.termId === termId);
      if (annotation) {
        this.selectedAnnotation = annotation;
        const rect = target.getBoundingClientRect();
        this.popupX = rect.left + window.scrollX;
        this.popupY = rect.bottom + window.scrollY;
        this.showAnnotationPopup = true;
      }
    }
  }
}

closePopup(): void {
  this.showAnnotationPopup = false;
  this.selectedAnnotation = null;
}

updateHtmlDataFromDom(): void {
  const container = document.querySelector('[innerHTML]');
  if (container) {
    this.htmlData = container.innerHTML;
  }
}
  handleAgeList(entries: string[]) {
    console.log('Validated entries:', entries);
    // Use the entries array as needed
  }

  handleDemographicData(hide_demographic: boolean) {
    console.log("handleDemographicData - hide_demographic=",hide_demographic);
    if (hide_demographic) {
      this.showAgeEntryArea = false;
    } else {
      this.showAgeEntryArea = true;
    }
  }



}
