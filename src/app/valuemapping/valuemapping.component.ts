import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms'; 
import { HpoStatus, HpoTermDuplet } from '../models/hpo_term_dto';
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatTableModule } from '@angular/material/table';


const VALUE_TO_STATE: Record<string, HpoStatus> = {
  '+': 'observed',
  'Yes': 'observed',
  'yes': 'observed',
  'Y': 'observed',
  'y': 'observed',
  'No': 'excluded',
  'no': 'excluded',
  'N': 'excluded',
  'n': 'excluded',
  '-': 'excluded',
  '–': 'excluded', // en dash
  '—': 'excluded', // em dash
  'na': 'na'
};

@Component({
  selector: 'app-value-mapping',
  standalone: true,
  imports: [
    MatDialogContent,
    MatDialogModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatAutocompleteModule,
    CommonModule,
    FormsModule,
    MatButtonToggleModule,
    MatTableModule
],
  templateUrl: './valuemapping.component.html',
  styleUrls: ['./valuemapping.component.css']
})
export class ValueMappingComponent {
  header!: string;
  hpoId!: string;
  hpoLabel!: string;
  uniqueValues: string[] = [];
  valueToStateMap: { [key: string]: HpoStatus } = {};

  predefinedStates = ['observed', 'excluded', 'na'];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { 
      header: string;
      hpoTerm: HpoTermDuplet;
      uniqueValues: string[];
    },
    public dialogRef: MatDialogRef<ValueMappingComponent>
  ) {
    this.hpoId = data.hpoTerm.hpoId;
    this.hpoLabel = data.hpoTerm.hpoLabel;
    this.uniqueValues = data.uniqueValues;
    this.header = data.header;

    // Initialize each value with default mapping
    data.uniqueValues.forEach(val => {
      this.valueToStateMap[val] = this.normalizeValue(val);
    });
  }

  onSave(): void {
    const hpoMapResult = {
      valueToStateMap: this.valueToStateMap,
      hpoId: this.hpoId,
      hpoLabel: this.hpoLabel
    };
    this.dialogRef.close(hpoMapResult);
  }

  onInput(val: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.valueToStateMap[val] = input.value as HpoStatus;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  normalizeValue(val: string): HpoStatus {
    return VALUE_TO_STATE[val.trim()] ?? 'na';
  }
}
