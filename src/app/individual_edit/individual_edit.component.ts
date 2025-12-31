import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IndividualData } from '../models/cohort_dto';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';  
import { CommonModule } from '@angular/common';
import { AgeInputService } from '../services/age_service' 
import { MatAutocompleteModule } from '@angular/material/autocomplete';


@Component({
  selector: 'app-individual-edit',
  standalone: true,
  imports: [
    CommonModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatOptionModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './individual_edit.component.html',
})
export class IndividualEditComponent {
  form: FormGroup;
  constructor() {
    this.form = this.fb.group({
      pmid: [this.data.pmid, Validators.required],
      title: [this.data.title, Validators.required],
      individualId: [this.data.individualId, Validators.required],
      comment: [this.data.comment],
      ageOfOnset: [this.data.ageOfOnset, [Validators.required, this.ageInputService.validator()]],
      ageAtLastEncounter: [this.data.ageAtLastEncounter, [Validators.required, this.ageInputService.validator()]],
      deceased: [this.data.deceased, Validators.required],
      sex: [this.data.sex, Validators.required]
    });
    this.form.get('individualId')?.valueChanges.subscribe(value => {
      if (value !== value?.trim()) {
        this.form.get('individualId')?.setValue(value.trim(), { emitEvent: false });
      }
    });
  }

  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<IndividualEditComponent>);
  public ageInputService = inject(AgeInputService);
  public data = inject(MAT_DIALOG_DATA) as IndividualData;
  
  save(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
