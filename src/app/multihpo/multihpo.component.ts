import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from "@angular/material/select";
import { MatIconModule } from "@angular/material/icon";
import { MatChipsModule } from '@angular/material/chips';
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
import { EtlCellValue } from '../models/etl_dto';


/// symbols for not applicable or unknown status
 const NOT_APPLICABLE = new Set(["na",  "n.a.", "n/a", "nd",  "n/d", "n.d.", "?", "/", "n.d.",  "unknown","n"]);

/* Component to map columns that contain strings representing one to many HPO terms */
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
  /* unique original entries (no duplicates)*/
  uniqueEntries: string[] = [];
  hpoMappings: HpoMappingRow[] = [];
  /* HPO autocomplete input (not necessarily a valid HPO term yet) */
  hpoInputString: string = ''; 

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { terms: HpoTermDuplet[], rows: EtlCellValue[], title: string },
    private dialogRef: MatDialogRef<MultiHpoComponent>
  ) {
    this.allHpoTerms = data.terms ?? [];
    this.uniqueEntries = Array.from(new Set((data.rows ?? []).map(r => (r.original ?? '').trim()))).filter(r => r !== '');

    this.hpoMappings = this.uniqueEntries.map(rowText =>
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
    if (!rowText || !term.hpoLabel) return 'na';
    const normalizedRowText = rowText.toLowerCase().trim();
    if (NOT_APPLICABLE.has(normalizedRowText)) return "na";
    const normalizedTermLabel = term.hpoLabel.toLowerCase().trim();
    if (normalizedTermLabel == "normal") return "excluded"; 
    if (normalizedRowText === normalizedTermLabel) return 'observed';
    // Check if the row text contains the HPO term label (skip short entries such as na)
    if (normalizedRowText.includes(normalizedTermLabel) && normalizedRowText.length > 4) {
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
    const mappedRows: HpoMappingRow[] = (this.data.rows ?? []).map(row => {
      const trimmed = (row.original ?? '').trim();
      const idx = this.uniqueEntries.indexOf(trimmed);
      if (idx >= 0) {
        // clone so caller can mutate if desired without mutating this dialog state
        return this.hpoMappings[idx].map(e => ({ ...e }));
      }
      return this.allHpoTerms.map(term => ({ term, status: 'na' as HpoStatus }));
    });
    this.dialogRef.close({
      hpoMappings: mappedRows,
      allHpoTerms: this.allHpoTerms,
    });
  }

  getEntry(rowIndex: number, termIndex: number) {
    if (!this.hpoMappings[rowIndex]) {
      this.hpoMappings[rowIndex] = this.allHpoTerms.map(term => ({ term, status: 'na' as HpoStatus }));
    }
    return this.hpoMappings[rowIndex][termIndex];
  }
    
  addHpoTerm(term: HpoTermDuplet) {
    if (!term) return;
    if (this.allHpoTerms.some(t => t.hpoId === term.hpoId)) return;
    this.allHpoTerms.push(term);
    // Add a new column for this term on each unique-entry mapping
    this.hpoMappings.forEach((row, rowIndex) => {
      const initialStatus = this.getInitialStatus(this.uniqueEntries[rowIndex], term);
      row.push({ term, status: initialStatus as HpoStatus });
    });
  }

  

 
  /** Set the value for an HPO term in a cell to excluded if the current status is "na"
   * However, do not do this if the original text is na, unknown, or ?
   */
  setAllNaToExcluded() {
    this.hpoMappings.forEach((row, rowIndex) => {
      const rowText = this.uniqueEntries[rowIndex] ?? '';
      const normalizedRowText = rowText.toLowerCase().trim();
      const hasNaIndicators = NOT_APPLICABLE.has(normalizedRowText);
      row.forEach(entry => {
        if (entry.status === 'na' && !hasNaIndicators) {
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
