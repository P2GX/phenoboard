import { HpoAnnotationDto, ParentChildDto, TextAnnotationDto, textAnnotationToHpoAnnotation, to_annotation_dto } from '../models/text_annotation_dto';
import { AgeInputService } from '../services/age_service';
import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { openUrl } from '@tauri-apps/plugin-opener';
import { ConfigService } from '../services/config.service';
import { HpoAutocompleteComponent } from "../hpoautocomplete/hpoautocomplete.component";
import { CellValue, HpoTermData, HpoTermDuplet } from '../models/hpo_term_dto';
import { AddagesComponent } from '../addages/addages.component';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from '../services/notification.service';

/** This component takes the results of the raw text mining (fenominal) and allows the user to revise them and add new terms */
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

  constructor(private ageService: AgeInputService,
      private configService: ConfigService,
      private dialog: MatDialog,
      private notificationService: NotificationService
    ) {
    }
  
  hpoAnnotations: HpoAnnotationDto[] = [];

  showCollapsed = false;
  showPopup = false;
  selectedAnnotation: TextAnnotationDto | null = null;
  popupX = 0;
  popupY = 0;
  showDropdownMap: { [termId: string]: boolean } = {};
  parentChildHpoTermMap: { [termId: string]: ParentChildDto } = {};
   /* used for autocomplete widget */
  hpoInputString: string = '';
  selectedHpoTerm: HpoTermDuplet | null = null;


  

  ngOnInit() {
    const hpo_annots: TextAnnotationDto[] = this.getFenominalAnnotations();
    const unique_hpo_hits: HpoAnnotationDto[] = Array.from(
      new Map(
        hpo_annots.map(tad => {
          const hpoAnnot = textAnnotationToHpoAnnotation(tad);
          return [JSON.stringify(hpoAnnot), hpoAnnot]; // key is full object
        })
      ).values()
    );
    this.hpoAnnotations = unique_hpo_hits;
  }

  openPopup(ann: TextAnnotationDto, event: MouseEvent) {
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

   toggleObserved(annot: HpoAnnotationDto | null): void {
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

    /** This is called when the user clicks on a link in the menu of hits to see the parents and the children of the current HPO term */
  showParentChildDropdown(annotation: HpoAnnotationDto) {
    const termId = annotation.termId;

    this.showDropdownMap[termId] = !this.showDropdownMap[termId];

    if (this.showDropdownMap[termId] && !this.parentChildHpoTermMap[termId]) {
      this.configService.getHpoParentAndChildTerms(annotation).then(relativeTermDtos => {
        console.log("relativeTermDtos", relativeTermDtos)
        this.parentChildHpoTermMap[termId] = relativeTermDtos;
      });
    }
  }

  /** This is used in the GUI to replace a term by a parent or child term. */
 replaceTerm(annotation: HpoAnnotationDto, replacement: HpoAnnotationDto) {
    const idx = this.hpoAnnotations.indexOf(annotation);
    if (idx < 0) {
      this.notificationService.showError(`C ould not get index of Hpo Annotation "${annotation}"`);
      return;
    }
    const updated = {
      ...annotation,              // keep onsetString, observed, etc
      termId: replacement.termId, // replace IDs
      label: replacement.label
    };
    this.hpoAnnotations[idx] = updated;
    // Force change detection
    this.hpoAnnotations = [...this.hpoAnnotations];
    this.showDropdownMap[annotation.termId] = false;
  }

  /* Remove an annotation from the HTML table. */
  deleteAnnotation(index: number): void {
    this.hpoAnnotations.splice(index, 1);
  }

  updateOnset(annotation: HpoAnnotationDto, newValue: string): void {
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
      const annot: TextAnnotationDto = to_annotation_dto(autocompletedTerm);
      this.hpoAnnotations.push(annot);
    }
  }

  /** We get a list of TextAnnotationDto objects from the HPO Textmining app. 
   * We want to extract the corresponding unique set of HPO terms with observations. 
   * This function converts one such annotation to an HpoTermData object.
  */
    convertTextAnnotationToHpoAnnotation(textAnn: HpoAnnotationDto): HpoTermData {
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
    const uniqueMap = new Map<string, HpoAnnotationDto>();

    for (const hit of this.hpoAnnotations) {
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
          alert(
            `Conflicting annotations for term ${hit.termId}: ` +
            `existing(${existing.onsetString}, ${existing.isObserved}), ` +
            `new(${hit.onsetString}, ${hit.isObserved}). Fix this and try again`
          );
        }
        // else identical, skip
      }
    }
    const uniqueHits: HpoAnnotationDto[] = Array.from(uniqueMap.values());
    let uniqueHpoData: HpoTermData[] = uniqueHits.map(h => this.convertTextAnnotationToHpoAnnotation(h));
    this.done.emit(uniqueHpoData);
  }

  onCancel() {
    this.cancel.emit();
  }

  get availableOnsetTerms(): string[] {
    return this.ageService.getSelectedTerms();
  }

  /** add the onset string to the Age service, and also update the current row */
  addOnsetString(annotation: HpoAnnotationDto) {
    const dialogRef = this.dialog.open(AddagesComponent, {
          width: '400px',
          data: {  data: { existingAges: this.ageService.getSelectedTerms() } }
        });
    
        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            if (result.length == 1) {
              const onset = result[0];
              annotation.onsetString = onset;
              this.ageService.addSelectedTerm(onset);
            } else {
              result.forEach((r: string) => {this.ageService.addSelectedTerm(r); });
            }
          }
        });
  }
}
