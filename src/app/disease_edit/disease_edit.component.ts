import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DiseaseDto } from '../models/template_dto';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select'; 
import { MatOptionModule } from '@angular/material/core';  
import { CommonModule } from '@angular/common';
import { noLeadingTrailingSpacesValidator } from '../validators/validators';
import { debounceTime } from 'rxjs/operators';



@Component({
  selector: 'app-disease-edit',
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
  templateUrl: './disease_edit.component.html',
  styleUrl: './disease_edit.component.css'
})
export class DiseaseEditComponent {
  form: FormGroup;
  diseaseIdTouched: boolean = false;
  diseaseLabelTouched: boolean = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DiseaseEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DiseaseDto
  ) {
    this.form = this.fb.group({
      diseaseId:  [
        data.diseaseId,
        [Validators.required, noLeadingTrailingSpacesValidator()] 
      ],
      diseaseLabel: [
        data.diseaseLabel,
        [ Validators.required, noLeadingTrailingSpacesValidator()],
      ]
    });
    this.form.get('diseaseId')?.valueChanges
      .pipe(debounceTime(100))
      .subscribe(() => {
        this.diseaseIdTouched = true;
      });
      this.form.get('diseaseLabel')?.valueChanges
      .pipe(debounceTime(100))
      .subscribe(() => {
        this.diseaseLabelTouched = true;
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
