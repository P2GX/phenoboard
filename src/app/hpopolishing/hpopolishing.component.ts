import { MatDialogRef } from '@angular/material/dialog';
import { ParentChildDto, TextAnnotationDto } from '../models/text_annotation_dto';
import { AgeInputService } from '../services/age_service';
import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { openUrl } from '@tauri-apps/plugin-opener';
import { ConfigService } from '../services/config.service';


@Component({
  selector: 'app-hpopolishing',
  templateUrl: './hpopolishing.component.html',
  styleUrls: ['./hpopolishing.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class HpoPolishingComponent implements OnInit {
  @Input() annotations: TextAnnotationDto[] = [];
  @Output() done = new EventEmitter<TextAnnotationDto[]>();

  showCollapsed = false;
  showPopup = false;
  selectedAnnotation: TextAnnotationDto | null = null;
  rightClickOptions: string[] = [];
  popupX = 0;
  popupY = 0;
  predefinedOptions: string[] = [];
  showDropdownMap: { [termId: string]: boolean } = {};
  parentChildHpoTermMap: { [termId: string]: ParentChildDto } = {};

  constructor(private ageService: AgeInputService,
    private configService: ConfigService
  ) {
  }

  ngOnInit() {
    console.log("annotations at init:", this.annotations);
    console.log("annotations:", JSON.stringify(this.annotations, null, 2));
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

  finish() {
    this.done.emit(this.annotations);
  }
}
