import { Component, inject, OnInit, signal } from '@angular/core';

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
  'na': 'na',
  'Mild': 'observed;HP:0012825', // Mild (HP:0012825)
  'mild': 'observed;HP:0012825',
  'Moderate': 'observed;HP:0012826', // Moderate (HP:0012826)
  'moderate': 'observed;HP:0012826',
  'Mod.': 'observed;HP:0012826',
  'mod.': 'observed;HP:0012826',
  'Severe': "observed;HP:0012828",// Severe (HP:0012828)
  'severe': "observed;HP:0012828",
  'Sev.': "observed;HP:0012828",
  'sev.': "observed;HP:0012828",
};

export interface ValueMappingData {
  header: string;
  hpoTerm: HpoTermDuplet;
  uniqueValues: string[];
}

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
    FormsModule,
    MatButtonToggleModule,
    MatTableModule
],
  templateUrl: './valuemapping.component.html',
  styleUrls: ['./valuemapping.component.css']
})
export class ValueMappingComponent implements OnInit {
 
  /* key: An entry in a column, e.g., 'yes'; value: corresponding phenoboard value, e.g., 'observed' */
  valueToStateMap: { [key: string]: HpoStatus } = {};

  public data = inject<ValueMappingData>(MAT_DIALOG_DATA);
  public dialogRef = inject(MatDialogRef<ValueMappingComponent>);
  public hpoId = signal(this.data.hpoTerm.hpoId);
  public hpoLabel = signal(this.data.hpoTerm.hpoLabel);
  public header = signal(this.data.header);
  public uniqueValues = signal(this.data.uniqueValues);

  ngOnInit(): void {
    this.data.uniqueValues.forEach(val => {
      this.valueToStateMap[val] = VALUE_TO_STATE[val.trim()] ?? 'na';
    })
  }

  onSave(): void {
    const hpoMapResult = {
      valueToStateMap: this.valueToStateMap,
      hpoId: this.hpoId,
      hpoLabel: this.hpoLabel
    };
    this.dialogRef.close(hpoMapResult);
  }

  /* Add a new entry to the map to relate an entry in the column (e.g. 'y') to a phenoboard value (e.g., 'observed'). */
  onInput(val: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.valueToStateMap[val] = input.value as HpoStatus;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

}
