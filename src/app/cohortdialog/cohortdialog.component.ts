import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { noWhitespaceValidator, noLeadingTrailingSpacesValidator } from '../validators/validators';
import { CohortData } from '../models/cohort_dto';

@Component({
  selector: 'app-cohort-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, ReactiveFormsModule],
  templateUrl: './cohortdialog.component.html',
  styleUrls: ['./cohortdialog.component.css'],
})
export class CohortDialogComponent {
  form: FormGroup;
  showPasteArea = false;
  pastedText: string | null = null;


  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CohortDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { title: string; mode: 'mendelian' | 'melded' | 'digenic' }
  ) {
    this.form = this.fb.group({
      diseaseId: ['', [Validators.required, Validators.pattern(/^OMIM:\d{6}$/)]],
      diseaseName: ['', [Validators.required, noLeadingTrailingSpacesValidator]],
      cohortAcronym: ['', [Validators.required, noWhitespaceValidator]],
      hgnc1: ['', [Validators.required, Validators.pattern(/^HGNC:\d+$/)]],
      symbol1: ['', [Validators.required, noWhitespaceValidator]],
      transcript1: ['', [Validators.required, Validators.pattern(/^[\w]+\.\d+$/)]],
      hgnc2: [''],
      symbol2: [''],
      transcript2: [''],
    });

    // Only make the second gene required if mode is digenic
    if (data.mode === 'digenic') {
      this.makeSecondGeneRequired();
    } else {
      this.clearSecondGeneValidators();
    }
  }

  /** Mark the second gene set as required for digenic mode */
  private makeSecondGeneRequired() {
    this.form.get('hgnc2')?.setValidators([Validators.required, Validators.pattern(/^HGNC:\d+$/)]);
    this.form.get('symbol2')?.setValidators([Validators.required, noWhitespaceValidator]);
    this.form.get('transcript2')?.setValidators([Validators.required, Validators.pattern(/^[\w]+\.\d+$/)]);
    this.updateValidation();
  }

  /** Clear validators for the second gene (mendelian or melded) */
  private clearSecondGeneValidators() {
    ['hgnc2', 'symbol2', 'transcript2'].forEach(field => {
      const ctrl = this.form.get(field);
      ctrl?.clearValidators();
      ctrl?.setValue(''); // reset empty
    });
    this.updateValidation();
  }

  /** Recalculate form validity */
  private updateValidation() {
    Object.values(this.form.controls).forEach(control => control.updateValueAndValidity());
  }

  cancel() {
    this.dialogRef.close(null);
  }

  submit() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    } else {
      this.form.markAllAsTouched();
    }
  }

  processPastedText() {
    if (!this.pastedText) {
      this.showPasteArea = false;
      return;
    }

    const parts = this.pastedText.split(/\t/).filter(p => p.trim());
    const omimIdIndex = parts.findIndex(p => /^\d{6}$/.test(p));
    if (omimIdIndex === -1) {
      alert('No valid 6-digit OMIM ID found in pasted data.');
      this.showPasteArea = false;
      return;
    }

    const omimId = parts[omimIdIndex];
    const diseaseLabel = omimIdIndex > 0 ? parts[omimIdIndex - 1] : null;
    const geneSymbol = omimIdIndex + 3 < parts.length ? parts[omimIdIndex + 3] : null;

    this.form.patchValue({
      diseaseName: diseaseLabel,
      diseaseId: `OMIM:${omimId}`,
      symbol1: geneSymbol,
    });

    this.showPasteArea = false;
  }
}
