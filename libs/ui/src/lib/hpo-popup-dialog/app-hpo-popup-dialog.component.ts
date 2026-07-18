import { Component, input, output, effect, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HpoTermDuplet } from '../models/hpo_term_dto';
import { OntologyMatch, OntologyAutocompleteComponent, OntologyAutocompleteProvider } from 'ng-hpo-uikit';

@Component({
  selector: 'app-hpo-popup-dialog',
  standalone: true,
  imports: [CommonModule, OntologyAutocompleteComponent],
  templateUrl:'./app-hpo-popup-dialog.component.html',
  styleUrl:'./app-hpo-popup-dialog.component.scss'
})
export class HpoPopupDialogComponent {
  title = input.required<string>();
  bestMatch = input<OntologyMatch | null>(null);
  autocompleteProvider = input.required<OntologyAutocompleteProvider>();
  confirmed = output<HpoTermDuplet>();
  cancel = output<void>();

  private dialogElement = viewChild<ElementRef<HTMLDialogElement>>('nativeDialog');

  constructor() {
    effect(() => {
      const dialog = this.dialogElement()?.nativeElement;
      if (dialog && !dialog.open) {
          dialog.showModal(); // Places it on the official browser top-layer stack
        }
    });
  }

  selectTerm(match: OntologyMatch) {
    const dialog = this.dialogElement()?.nativeElement;
    if (dialog) {
      dialog.close();
    }
    this.confirmed.emit({
      hpoId: match.id,
      hpoLabel: match.label
    });
  }

  onHpoTermSelected(term: OntologyMatch | null) {
    if (term) {
      this.selectTerm(term);
    }
  }
}