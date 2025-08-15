import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { GeneVariantBundleDto } from '../models/cohort_dto';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select'; 
import { MatOptionModule } from '@angular/material/core';  
import { CommonModule } from '@angular/common';
import { noLeadingTrailingSpacesValidator, noWhitespaceValidator} from '../validators/validators';
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
  templateUrl: './gene_edit.component.html',
  styleUrl: './gene_edit.component.css'
})
export class GeneEditComponent {
  form: FormGroup;
  hgncIdTouched: boolean = false;
  geneSymbolTouched: boolean = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<GeneEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GeneVariantBundleDto
  ) {
    this.form = this.fb.group({
      hgncId:  [
        data.hgncId,
        [Validators.required, noWhitespaceValidator()] 
      ],
      geneSymbol: [
        data.geneSymbol,
        [ Validators.required, noWhitespaceValidator()],
      ],
      transcript: [
        data.transcript,
        [ Validators.required, noWhitespaceValidator()],
      ],
      allele1: [
        data.allele1,
        [Validators.required, noWhitespaceValidator()],
      ],
      allele2: [
        data.allele2,
        [Validators.required]
      ],
      variantComment: [
        data.variantComment
      ]
    });
    this.form.get('hgncId')?.valueChanges
      .pipe(debounceTime(100))
      .subscribe(() => {
        this.hgncIdTouched = true;
      });
      this.form.get('geneSymbol')?.valueChanges
      .pipe(debounceTime(100))
      .subscribe(() => {
        this.geneSymbolTouched = true;
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
