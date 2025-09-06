import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from "@angular/material/select";
import { MatAutocomplete } from "@angular/material/autocomplete";
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
import { MatCheckbox } from "@angular/material/checkbox";


@Component({
  selector: 'app-multi-hpo-wrapper',
  templateUrl: './multihpo-wrapper.component.html',
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
    MatCheckbox
]
})
export class MultiHpoWrapperComponent {
  allHpoTerms: string[];
  selectedHpoTerms: string[] = [];
  hpoMappings: string[][] = [];
termInput: any;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { terms: string[], rows: string[] },
    private dialogRef: MatDialogRef<MultiHpoWrapperComponent>
  ) {
    this.allHpoTerms = data.terms;
     this.hpoMappings = data.rows.map(row => this.matchTerms(row));
  }

  cancel() {
    this.dialogRef.close();
  }

  save() {
    this.dialogRef.close({
      selectedHpoTerms: this.selectedHpoTerms,
      hpoMappings: this.hpoMappings
    });
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
  }

  private matchTerms(row: string): string[] {
    return this.allHpoTerms.filter(term => {
      // term example: "HP:0000347 - Micrognathia"
      const label = term.split(" - ")[1]?.trim();
      return label && row.toLowerCase().includes(label.toLowerCase());
    });
  }
}
