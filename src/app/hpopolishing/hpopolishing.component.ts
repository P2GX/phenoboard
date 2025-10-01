import { ParentChildDto, TextAnnotationDto } from '../models/text_annotation_dto';
import { AgeInputService } from '../services/age_service';
import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { openUrl } from '@tauri-apps/plugin-opener';
import { ConfigService } from '../services/config.service';
import { HpoAutocompleteComponent } from "../hpoautocomplete/hpoautocomplete.component";
import { CellValue, HpoTermData, HpoTermDuplet } from '../models/hpo_term_dto';


@Component({
  selector: 'app-hpopolishing',
  templateUrl: './hpopolishing.component.html',
  styleUrls: ['./hpopolishing.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, HpoAutocompleteComponent]
})
export class HpoPolishingComponent implements OnInit {


  /** These are the raw textmining results and contain hits, in-between text, and may contain duplicates */
  @Input() annotations: TextAnnotationDto[] = [];
  @Output() done = new EventEmitter<HpoTermData[]>();
  @Output() cancel = new EventEmitter<void>();

  addedAnnotations: HpoTermData[] = [];
  uniqueHpoAnnotations: HpoTermData[] = [];

  showCollapsed = false;
  showPopup = false;
  selectedAnnotation: TextAnnotationDto | null = null;
  rightClickOptions: string[] = [];
  popupX = 0;
  popupY = 0;
  predefinedOptions: string[] = [];
  showDropdownMap: { [termId: string]: boolean } = {};
  parentChildHpoTermMap: { [termId: string]: ParentChildDto } = {};
   /* used for autocomplete widget */
    hpoInputString: string = '';
    selectedHpoTerm: HpoTermDuplet | null = null;


  constructor(private ageService: AgeInputService,
    private configService: ConfigService
  ) {
  }

  ngOnInit() {
  }

  openPopup(ann: TextAnnotationDto, event: MouseEvent) {
    this.rightClickOptions = [
      ...(this.predefinedOptions ?? []),
      ...this.ageService.getSelectedTerms()
    ];
    this.selectedAnnotation = ann;
    this.showPopup = true;

    // Position popup under clicked element
    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.popupX = rect.left + window.scrollX;
    this.popupY = rect.bottom + window.scrollY;
  }

  closePopup() {
    this.showPopup = false;
    this.selectedAnnotation = null;
  }

  applyAnnotationChange(newTermId: string) {
    if (this.selectedAnnotation) {
      this.selectedAnnotation.termId = newTermId;
    }
    this.closePopup();
  }

   toggleObserved(annot: TextAnnotationDto | null): void {
      if (annot == null) {
        return;
      }
      annot.isObserved = !annot.isObserved;
    }

  /** About half of the TextAnnotationDto objects represent the text between the fenominal hits
    Here, we get a list of the fenominal hits (representing the HPO terms) for display in the table */
  getFenominalAnnotations(): TextAnnotationDto[] {
    return this.annotations.filter(a => a.isFenominalHit);
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

  /* Remove an annotation from the HTML table. */
  deleteAnnotation(index: number): void {
    this.annotations.splice(index, 1);
  }

  updateOnset(annotation: TextAnnotationDto, newValue: string): void {
    annotation.onsetString = newValue;
  }

    submitSelectedHpo = async () => {
    if (this.selectedHpoTerm == null) {
      return;
    }
    await this.submitHpoAutocompleteTerm(this.selectedHpoTerm);
  };

  async submitHpoAutocompleteTerm(autocompletedTerm: HpoTermDuplet): Promise<void> {
    if (autocompletedTerm) {
      const hpoTermData: HpoTermData= {
        termDuplet: autocompletedTerm,
        entry: {
          type: 'Observed'
        }
      };
      this.addedAnnotations.push(hpoTermData);
    }
  }

  /** We get a list of TextAnnotationDto objects from the HPO Textmining app. 
   * We want to extract the corresponding unique set of HPO terms with observations. 
   * This function converts one such annotation to an HpoTermData object.
  */
    convertTextAnnotationToHpoAnnotation(textAnn: TextAnnotationDto): HpoTermData {
      let cellValue: CellValue | null = null;
      if (textAnn.isObserved) {
        let status = 'observed'; // status could be observed or an age of onset.
        if (!textAnn.onsetString || textAnn.onsetString.trim() === "" || textAnn.onsetString != 'na') {
          status = textAnn.onsetString; // if there is a non-empty/non-na onset, use it for our value
          cellValue = {
            type: "OnsetAge",
            data: status
          }
        } else {
          cellValue = { type: "Observed"}
        }
      } else {
         cellValue = { type: "Excluded"}
      }
      const duplet: HpoTermDuplet = {
        hpoLabel: textAnn.label,
        hpoId:  textAnn.termId,
      };
      
      return {
        termDuplet: duplet, 
        entry: cellValue,
      };
    }
  

  finish() {
    const mining_hits: TextAnnotationDto[] = this.getFenominalAnnotations();
    const uniqueMap = new Map<string, TextAnnotationDto>();

    for (const hit of mining_hits) {
      const existing = uniqueMap.get(hit.termId);
      if (!existing) {
        // Not seen yet, add it
        uniqueMap.set(hit.termId, hit);
      } else {
        // Already seen, check if onset or observed differs
        if (
          existing.onsetString !== hit.onsetString ||
          existing.isObserved !== hit.isObserved
        ) {
          throw new Error(
            `Conflicting annotations for term ${hit.termId}: ` +
            `existing(${existing.onsetString}, ${existing.isObserved}), ` +
            `new(${hit.onsetString}, ${hit.isObserved})`
          );
        }
        // else identical, skip
      }
    }
    const uniqueHits: TextAnnotationDto[] = Array.from(uniqueMap.values());
    let uniqueHpoData: HpoTermData[] = uniqueHits.map(h => this.convertTextAnnotationToHpoAnnotation(h));
    this.addedAnnotations.forEach(t => {
      if (!uniqueMap.has(t.termDuplet.hpoId)) {
        uniqueHpoData.push(t);
      }
    });

    this.done.emit(uniqueHpoData);
  }

  onCancel() {
    this.cancel.emit();
  }
}
