import { HpoAnnotationDto, ParentChildDto, TextAnnotationDto, textAnnotationToHpoAnnotation, to_annotation_dto } from '../models/text_annotation_dto';
import { AgeInputService } from '../services/age_service';
import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, inject, signal, ElementRef, ViewChild, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { openUrl } from '@tauri-apps/plugin-opener';
import { ConfigService } from '../services/config.service';
import { HpoAutocompleteComponent } from "../hpoautocomplete/hpoautocomplete.component";
import { CellValue, HpoTermData, HpoTermDuplet } from '../models/hpo_term_dto';
import { AddageComponent } from '../addages/addage.component';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from '../services/notification.service';
import { HpoMatch } from '../models/hpo_mapping_result';
import { MatIcon } from "@angular/material/icon";

/** This component takes the results of the raw text mining (fenominal) and allows the user to revise them and add new terms */
@Component({
  selector: 'app-hpopolishing',
  templateUrl: './hpopolishing.component.html',
  styleUrls: ['./hpopolishing.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, HpoAutocompleteComponent, MatIcon]
})
export class HpoPolishingComponent implements OnInit {

  /** These are the raw textmining results and contain hits, in-between text, and may contain duplicates */
  @Input() annotations: TextAnnotationDto[] = [];
  @Output() done = new EventEmitter<HpoTermData[]>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild(HpoAutocompleteComponent) hpoAutocomplete!: HpoAutocompleteComponent;

  private ageService = inject(AgeInputService);
  private configService = inject(ConfigService);
  private dialog = inject(MatDialog);
  private notificationService = inject(NotificationService);
  @ViewChild('annotationTable') annotationTable!: ElementRef;

  availableOnsetTerms = this.ageService.selectedTerms;  
  hpoAnnotations = signal<HpoAnnotationDto[]>([]);
  showCollapsed = false;
  showPopup = false;
  selectedAnnotation: TextAnnotationDto | null = null;
  popupX = 0;
  popupY = 0;
  showDropdownMap: { [termId: string]: boolean } = {};
  parentChildHpoTermMap: { [termId: string]: ParentChildDto } = {};
   /* used for autocomplete widget */
  hpoInputString: string = '';
  //selectedHpoTerm: HpoTermDuplet | null = null;
  selectedHpoTerm: HpoMatch | null = null;


  

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
    this.hpoAnnotations.set(unique_hpo_hits);
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

  @HostListener('document:mousedown', ['$event']) // mousedown is often more reliable than click
    onGlobalClick(event: MouseEvent): void {
      const clickedInside = this.annotationTable.nativeElement.contains(event.target);
      if (!clickedInside) {
        this.showDropdownMap = {};
      }
    }

  /** This is used in the GUI to replace a term by a parent or child term. */
 replaceTerm(annotation: HpoAnnotationDto, replacement: HpoAnnotationDto) {
  this.hpoAnnotations.update(current => {
    return current.map(item => 
      item.termId === annotation.termId
      ? { ...item, termId: replacement.termId, label: replacement.label}
      : item
      );
    });
  }

  /* Remove an annotation from the HTML table. */
  deleteAnnotation(index: number): void {
    this.hpoAnnotations.update(current => current.filter((_,i) => i !== index));
  }

  updateOnset(annotation: HpoAnnotationDto, newValue: string): void {
    this.hpoAnnotations.update(current => 
      current.map(item => 
        item.termId === annotation.termId 
          ? { ...item, onsetString: newValue } 
          : item
      )
    );
  }

  async handleSelection(match: HpoMatch) {
    this.selectedHpoTerm = match;
  }

  submitSelectedHpo = async () => {
    if (this.selectedHpoTerm == null) {
      return;
    }
    const duplet: HpoTermDuplet = {
      hpoLabel: this.selectedHpoTerm.label,
      hpoId: this.selectedHpoTerm.id
    };
    await this.submitHpoAutocompleteTerm(duplet);
  };

  // Add an autocompleted term to the list (do not add duplicates, silently skip)
  async submitHpoAutocompleteTerm(autocompletedTerm: HpoTermDuplet): Promise<void> {
    if (autocompletedTerm) {
      const annot: TextAnnotationDto = to_annotation_dto(autocompletedTerm);
      this.hpoAnnotations.update(current => {
        const exists = current.some(a => a.termId === annot.termId);
        return exists ? current : [...current, annot];
        });
    }
    if (this.hpoAutocomplete) {
      this.hpoAutocomplete.clear(); 
    }
  }

  /** We get a list of TextAnnotationDto objects from the HPO Textmining app. 
   * We want to extract the corresponding unique set of HPO terms with observations. 
   * This function converts one such annotation to an HpoTermData object.
  */
    convertTextAnnotationToHpoAnnotation(textAnn: HpoAnnotationDto): HpoTermData {
      const duplet: HpoTermDuplet = {
        hpoLabel: textAnn.label,
        hpoId: textAnn.termId
      };
      let entry: CellValue;
      if (!textAnn.isObserved) {
        entry = {type: 'Excluded'};
      } else if (textAnn.onsetString && textAnn.onsetString !== "na") {
        entry = {type: 'OnsetAge', data: textAnn.onsetString};
      } else {
        entry = {type: 'Observed'};
      }
    return {termDuplet: duplet, entry };
  }
  

  finish() {
    const annotations = this.hpoAnnotations();
    const uniqueMap = new Map<string, HpoAnnotationDto>();
    const conflicts: string[] = [];

    for (const hit of annotations) {
      const existing = uniqueMap.get(hit.termId);
      if (!existing) {
        uniqueMap.set(hit.termId, hit);
      } else {
        if (
          existing.onsetString !== hit.onsetString ||
          existing.isObserved !== hit.isObserved
        ) {
          conflicts.push(`${hit.label} (${hit.termId})`);
        }
      }
      if (conflicts.length > 0) {
        this.notificationService.showError(`Conflicting observed/onset status for: ${conflicts.join(', ')}`);
        return;
      }
    }
    const uniqueHpoData = Array.from(uniqueMap.values()).map(h => 
      this.convertTextAnnotationToHpoAnnotation(h)
    );
    this.done.emit(uniqueHpoData);
  }

  onCancel() {
    this.cancel.emit();
  }

  /** add the onset string to the Age service, and also update the current row */
  addOnsetString(annotation: HpoAnnotationDto) {
    const dialogRef = this.dialog.open(AddageComponent, {
      width: '400px'
    });
    
    dialogRef.afterClosed().subscribe((newOnset: string | undefined) => {
      if (newOnset) {
        this.ageService.addSelectedTerm(newOnset);
          setTimeout(() => {
            this.hpoAnnotations.update(current => 
              current.map(item => 
                item.termId === annotation.termId 
                  ? { ...item, onsetString: newOnset } 
                  : item
              )
            );
         });}
    });
  }
}
