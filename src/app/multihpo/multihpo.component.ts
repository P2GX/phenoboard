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
import { HpoMatch, MiningConcept, MiningStatus } from '../models/hpo_mapping_result';
import { MatTooltipModule } from '@angular/material/tooltip';


/// symbols for not applicable or unknown status
 const NOT_APPLICABLE = new Set(["na",  "n.a.", "n/a", "nd",  "n/d", "n.d.", "?", "/", "n.d.",  "unknown"]);

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
    MatTooltipModule,
    MatIconModule,
    CommonModule,
    MatTableModule,
    MatCheckboxModule,
    MatButtonToggleModule,
    HpoAutocompleteComponent
]
})
export class MultiHpoComponent {
  // We work with the specific concepts found by Rust
  concepts: MiningConcept[] = [];
  title: string = '';

  // Track which row indices are currently showing the search input field
  searchingIndices = new Set<number>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { concepts: MiningConcept[], title: string },
    private dialogRef: MatDialogRef<MultiHpoComponent>
  ) {
    // 1. Initialize with the concepts passed from the parent
    // remove "na" - like entries
    this.concepts = (data.concepts ?? []).filter(c => {
      const text = c.originalText.toLowerCase().trim();
      // Ignore if it's in our NA set or if it has no letters
      return !NOT_APPLICABLE.has(text) && /[a-zA-Z]/.test(text);
    });
    this.title = data.title;

    // 2. High-Confidence Auto-Confirm
    // If Rust found a match, we can pre-set it to 'confirmed'
    this.concepts.forEach(c => {
      if (c.suggestedTerms.length) {
        c.miningStatus = MiningStatus.Confirmed;
      }
    });
  }

  // Update a specific concept when user uses autocomplete
  updateMapping(index: number, newTerm: HpoTermDuplet) {
    this.concepts[index].suggestedTerms.push( {
      id: newTerm.hpoId,
      label: newTerm.hpoLabel,
      matched_text: this.concepts[index].originalText // update context
    });
    this.concepts[index].miningStatus = MiningStatus.Confirmed;
  }

  toggleConfirm(index: number) {
    const c = this.concepts[index];
    c.miningStatus = c.miningStatus === MiningStatus.Confirmed 
      ? MiningStatus.Pending 
      : MiningStatus.Confirmed;
  }

  removeConcept(index: number) {
    this.concepts.splice(index, 1);
  }

  cancel() {
    this.dialogRef.close();
  }

  save() {
    // Return the refined list of concepts back to processMultipleHpoColumn
    this.dialogRef.close(this.concepts);
  }

  resetMapping(index: number) {
    this.concepts[index].miningStatus = MiningStatus.Pending;
    this.concepts[index].suggestedTerms = [];
  }

  prepareConcepts() {
  this.concepts = this.data.concepts.map(c => ({
    ...c,
    isSearching: false,
    // Ensure suggestedTerms is an array even if Rust sent one/none
    suggestedTerms: c.suggestedTerms  
  }));
}

  addNewTerm(conceptIndex: number, newTerm: HpoTermDuplet) {
    const concept: MiningConcept = this.concepts[conceptIndex];
    
    const newMatch: HpoMatch = {
      id: newTerm.hpoId,
      label: newTerm.hpoLabel,
      matched_text: concept.originalText
    };

    // Prevent duplicates
    if (!concept.suggestedTerms.some(t => t.id === newMatch.id)) {
      concept.suggestedTerms.push(newMatch);
    }
    
    concept.miningStatus = MiningStatus.Confirmed;
    this.searchingIndices.delete(conceptIndex);
  }

  removeTerm(conceptIndex: number, termIndex: number) {
    this.concepts[conceptIndex].suggestedTerms.splice(termIndex, 1);
    if (this.concepts[conceptIndex].suggestedTerms.length === 0) {
      this.concepts[conceptIndex].miningStatus = MiningStatus.Pending;
    }
  }

  onBlur(index: number) {
    // Only collapse if we have terms; otherwise keep search open
    if (this.concepts[index].suggestedTerms.length > 0) {
      this.searchingIndices.delete(index);
    }
  }

  startSearch(index: number) {
    this.searchingIndices.add(index);
  }

}