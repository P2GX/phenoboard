import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { GeneVariantData } from '../models/cohort_dto';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select'; 
import { MatOptionModule } from '@angular/material/core';  
import { CommonModule } from '@angular/common';
import { noWhitespaceValidator} from '../validators/validators';
import { debounceTime } from 'rxjs/operators';
import { GeneEditDialogData } from '../models/variant_dto';



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
    @Inject(MAT_DIALOG_DATA) public data: GeneEditDialogData
  ) {

    this.form = this.fb.group({
      allele: [
        data.allele,
        [Validators.required, noWhitespaceValidator()],
      ],
      allelecount: [
        data.allelecount,
        [Validators.required]
      ],
    });
    this.form.get('allele')?.valueChanges
      .pipe(debounceTime(100))
      .subscribe(() => {
        this.hgncIdTouched = true;
      });
      this.form.get('allelecount')?.valueChanges
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
