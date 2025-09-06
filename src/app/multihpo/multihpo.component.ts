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
    HpoAutocompleteComponent
]
})
export class MultiHpoComponent {
  allHpoTerms: string[];
  selectedHpoTerms: string[] = [];
  hpoMappings: string[][] = [];
  hpoLabels: string[] = [];     // just the labels for display
  termInput: any;

  selectedHpoTerm: string = '';
  /* HPO autocomplete input (not necessarily a valid HPO term yet) */
  hpoInputString: string = ''; 

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { terms: string[], rows: string[] },
    private dialogRef: MatDialogRef<MultiHpoComponent>
  ) {
    this.allHpoTerms = data.terms;
    this.hpoMappings = data.rows.map(row => this.matchTerms(row));
    this.hpoLabels = this.allHpoTerms.map(term => term.split(" - ")[1]?.trim() || term);
  }

  cancel() {
    this.dialogRef.close();
  }

  /* Save the choices of the user. If there is no choice, map to "na" */
  save() {
    const normalizedMappings = this.hpoMappings.map(
      row => (row.length > 0 ? row : ["na"])
    );
    this.dialogRef.close({
      hpoMappings: normalizedMappings
    });
  }

  /* Add an HPO term from the autocomplete widget to the list of terms that we can use for mapping. */
  addHpoTerm(term: string) {
    if (term && !this.allHpoTerms.includes(term)) {
      this.allHpoTerms.push(term);
    }
  }

  removeHpo(term: string) {
    this.selectedHpoTerms = this.selectedHpoTerms.filter(t => t !== term);
  }

  toggleTerm(rowIndex: number, term: string) {
    const mapping = this.hpoMappings[rowIndex];
  const idx = mapping.indexOf(term);
  if (idx >= 0) {
    mapping.splice(idx, 1);
  } else {
    mapping.push(term);
  }
  this.hpoMappings[rowIndex] = mapping.filter(t => t !== "na");
  }

  private matchTerms(row: string): string[] {
    return this.allHpoTerms.filter(term => {
      const label = term.split(" - ")[1]?.trim();
      return label && row.toLowerCase().includes(label.toLowerCase());
    });
  }

  labelFromTerm(term: string): string {
    return term.split(" - ")[1]?.trim() || term;
  }

  removeHpoTerm(term: string) {
    this.allHpoTerms = this.allHpoTerms.filter(t => t !== term);
    this.hpoMappings.forEach(mapping => {
      const idx = mapping.indexOf(term);
      if (idx >= 0) mapping.splice(idx, 1);
    });
  }
}
