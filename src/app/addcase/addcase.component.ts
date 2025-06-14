import { Component, HostListener, NgZone, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ✅ Import FormsModule
import { ConfigService } from '../services/config.service';
import { defaultStatusDto, StatusDto } from '../models/status_dto';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { PubmedComponent } from "../pubmed/pubmed.component";
import { AddagesComponent } from "../addages/addages.component";


@Component({
  selector: 'app-textmining',
  standalone: true,
  imports: [CommonModule, FormsModule, PubmedComponent, AddagesComponent],
  templateUrl: './addcase.component.html', 
  styleUrl: './addcase.component.css'
})
export class AddcaseComponent {


  constructor(
    private ngZone: NgZone,
    private configService: ConfigService
  ) {}
  @ViewChild('pmidChild') pubmedComponent!: PubmedComponent;
  pastedText: string = '';
  showTextArea: boolean = true;
  showDataEntryArea: boolean = false;

  selectionRange: Range | null = null;

  jsonData: any[] = [ ]; 
  htmlData: string = '';
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
      const output = await this.configService.highlight_hpo_mining(this.pastedText);
          console.log("output",output);
          this.htmlData = output;
          this.showTextArea = false;
          this.showDataEntryArea = true;
        } catch (error) {
          // If parsing fails, set clipboardContent to the raw text
          //this.clipboardContent = text;
          console.error('Invalid JSON format:', error);
        }
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

  @HostListener('document:mouseup', [])
    onMouseUp(): void {
    this.handleTextSelection();
  }

  handleTextSelection(): void {
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
    const prev = span.getAttribute('data-annotation');
    const updated = prev ? `${prev}, ${annotation}` : annotation;
    span.setAttribute('data-annotation', updated);
    span.title = updated;
  }
  this.closePopup();
}

closePopup(): void {
  this.showAnnotationPopup = false;
  this.selectedText = '';
  this.selectedHpoSpans = [];
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
}
