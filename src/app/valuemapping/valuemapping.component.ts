import { Component, EventEmitter, Inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms'; // for ngModel



@Component({
  selector: 'app-variant_list',
  standalone: true,
  imports: [MatDialogContent, MatDialogModule, MatInputModule, MatSelectModule, MatOptionModule, MatAutocompleteModule, CommonModule, FormsModule],
  templateUrl: './valuemapping.component.html',
  styleUrls: ['./valuemapping.component.css']
})
export class ValueMappingComponent  {
  /* original header of the column */
  header!: string;
  hpoId!: string;
  hpoLabel!: string;
  /* all values found in the column (that we will replace with the valid values for the template). */
  uniqueValues: string[] = [];
  /* The user will assign the strings in the column to values needed for our template, including "observed", "excluded", "na", and potentially P32Y etc.*/
  valueToStateMap: { [key: string]: string } = {};

  predefinedStates = ['observed', 'excluded', 'na'];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { 
      header: string;
      hpoId: string;
      hpoLabel: string;
      uniqueValues: string[];
     },
    public dialogRef: MatDialogRef<ValueMappingComponent>
  ) {
    this.hpoId = data.hpoId;
    this.hpoLabel = data.hpoLabel;
    this.uniqueValues = data.uniqueValues;
    this.header = data.header;
    data.uniqueValues.forEach(val => this.valueToStateMap[val] = 'na');
  }

  onSave(): void {
    console.log("valuemapping: onSave() this.hpoId", this.hpoId);
    const hpoMapResult = {
        valueToStateMap: this.valueToStateMap,
        hpoId: this.hpoId,
        hpoLabel: this.hpoLabel
    }
    this.dialogRef.close(hpoMapResult);
  }

  onInput(val: string, event: Event) {
    const input = event.target as HTMLInputElement;
    this.valueToStateMap[val] = input.value;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

    
}

