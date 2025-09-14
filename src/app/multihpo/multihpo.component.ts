import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from "@angular/material/select";
import { MatIconModule } from "@angular/material/icon";
import { MatChipsModule } from '@angular/material/chips';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from "@angular/material/checkbox";
import { HpoAutocompleteComponent } from "../hpoautocomplete/hpoautocomplete.component";
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { HpoTermDuplet } from '../models/hpo_term_dto';
import { HpoStatus, HpoMappingRow } from '../models/hpo_term_dto';

@Component({
  selector: 'app-multihpo',
  standalone: true,
  templateUrl: './multihpo.component.html',
  styleUrls: ['./multihpo.component.scss'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    CommonModule,
    MatTableModule,
    MatCheckboxModule,
    MatButtonToggleModule,
    HpoAutocompleteComponent
]
})
export class MultiHpoComponent {
  allHpoTerms: HpoTermDuplet[];
  hpoMappings: HpoMappingRow[] = [];
  /* HPO autocomplete input (not necessarily a valid HPO term yet) */
  hpoInputString: string = ''; 

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { terms: HpoTermDuplet[], rows: string[] },
    private dialogRef: MatDialogRef<MultiHpoComponent>
  ) {
    this.allHpoTerms = data.terms;
    this.hpoMappings = data.rows.map(rowText =>
      this.allHpoTerms.map(term => ({
        term,
        status: this.getInitialStatus(rowText, term) as HpoStatus
      }))
    );
  }

  /**
   * Determines the initial status for a term based on whether the row text matches the HPO term label.
   * Uses case-insensitive matching and handles partial matches.
   */
  private getInitialStatus(rowText: string, term: HpoTermDuplet): HpoStatus {
    if (!rowText || !term.hpoLabel) {
      return 'na';
    }
    const normalizedRowText = rowText.toLowerCase().trim();
    const normalizedTermLabel = term.hpoLabel.toLowerCase().trim();
    if (normalizedRowText === normalizedTermLabel) {
      return 'observed';
    }
    // Check if the row text contains the HPO term label
    if (normalizedRowText.includes(normalizedTermLabel)) {
      return 'observed';
    }
    // Check if the HPO term label contains the row text (for shorter row text)
    if (normalizedTermLabel.includes(normalizedRowText)) {
      return 'observed';
    }
    return 'na';
  }

  cancel() {
    this.dialogRef.close();
  }

  save() {
    this.dialogRef.close({
      hpoMappings: this.hpoMappings
    });
  }

  // Fixed: Return the actual entry, ensuring it always exists
  getEntry(rowIndex: number, termIndex: number) {
    return this.hpoMappings[rowIndex][termIndex];
  }

  // Alternative: Get entry by term ID but ensure it exists
  getEntryByTermId(rowIndex: number, termId: string): { term: HpoTermDuplet; status: HpoStatus } {
    const entry = this.hpoMappings[rowIndex].find(e => e.term.hpoId === termId);
    if (!entry) {
      // This should never happen if data is properly initialized, but provides safety
      throw new Error(`Entry not found for row ${rowIndex}, term ${termId}`);
    }
    return entry;
  }

  // Track by function for better performance
  trackByTermId(index: number, term: HpoTermDuplet): string {
    return term.hpoId;
  }

  addHpoTerm(term: HpoTermDuplet) {
    if (
      term &&
      !this.allHpoTerms.some(t => t.hpoId === term.hpoId)
    ) {
      this.allHpoTerms.push(term);

     this.hpoMappings.forEach((row, rowIndex) => {
        const rowText = this.data.rows[rowIndex];
        const initialStatus = this.getInitialStatus(rowText, term);
        row.push({ term, status: initialStatus as HpoStatus });
      });
    }
  }

 
  /** Set the value for an HPO term in a cell to excluded if the current status is "na"
   * However, do not do this if the original text is na, unknown, or ?
   */
  setAllNaToExcluded() {
    this.hpoMappings.forEach((row, rowIndex) => {
      const rowText = this.data.rows[rowIndex];
      const normalizedRowText = rowText.toLowerCase().trim();
      
      // Check if the original text indicates "no data" or "unknown"
      const notApplicable = new Set([
        "na",
        "n/a",
        "unknown",
        "n.a.",
        "nd",
        "n/d",
        "n.d.",
        "?"
      ]);
      const hasNaIndicators = notApplicable.has(normalizedRowText);
      row.forEach(entry => {
        if (entry.status == 'na' && !hasNaIndicators) { 
          entry.status = 'excluded';
        }
      });
    });
  }

  removeHpoTerm(term: HpoTermDuplet) {
    this.allHpoTerms = this.allHpoTerms.filter(t => t.hpoId !== term.hpoId);
    this.hpoMappings = this.hpoMappings.map(row =>
      row.filter(entry => entry.term.hpoId !== term.hpoId)
    );
  }
}
