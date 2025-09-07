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
    this.hpoMappings = data.rows.map(() =>
      this.allHpoTerms.map(term => ({
        term,
        status: 'na' as HpoStatus
      }))
    );
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

      // add new entry with 'na' status to every row
      this.hpoMappings.forEach(row =>
        row.push({ term, status: 'na' as HpoStatus })
      );
    }
  }

  setAllNaToExcluded() {
    this.hpoMappings.forEach(row => {
      row.forEach(entry => {
        if (entry.status == 'na') { 
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
