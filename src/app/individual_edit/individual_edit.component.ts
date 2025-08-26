import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IndividualData } from '../models/cohort_dto';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';  
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-individual_edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatButtonModule,
    MatSelectModule,
    MatOptionModule
  ],
  templateUrl: './individual_edit.component.html',
})
export class IndividualEditComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<IndividualEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: IndividualData
  ) {
    this.form = this.fb.group({
      pmid: [data.pmid, Validators.required],
      title: [data.title, Validators.required],
      individualId: [data.individualId, Validators.required],
      comment: [data.comment],
      ageOfOnset: [data.ageOfOnset, Validators.required],
      ageAtLastEncounter: [data.ageAtLastEncounter, Validators.required],
      deceased: [data.deceased, Validators.required],
      sex: [data.sex, Validators.required]
    });
    this.form.get('individualId')?.valueChanges.subscribe(value => {
      if (value !== value?.trim()) {
        this.form.get('individualId')?.setValue(value.trim(), { emitEvent: false });
      }
    });
  }

  save() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }

  cancel() {
    this.dialogRef.close(null);
  }
}
