import { Component, inject,  signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { noWhitespaceValidator, noLeadingTrailingSpacesValidator } from '../validators/validators';
import { MatMenuModule } from "@angular/material/menu";
import { HelpButtonComponent } from "../util/helpbutton/help-button.component";


@Component({
  selector: 'app-cohort-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatMenuModule,
    ReactiveFormsModule,
    HelpButtonComponent
],
  templateUrl: './cohortdialog.component.html',
  styleUrls: ['./cohortdialog.component.css'],
})
export class CohortDialogComponent {
  form: FormGroup;

  showPasteArea = signal(false);
  pastedText = signal<string | null>(null);
  private fb = inject(FormBuilder);
  public dialogRef = inject(MatDialogRef<CohortDialogComponent>);
public data = inject(MAT_DIALOG_DATA) as { title: string };
  constructor(
  ) {
    this.form = this.fb.group({
      diseaseId: ['', [Validators.required, Validators.pattern(/^OMIM:\d{6}$/)]],
      diseaseLabel: ['', [Validators.required, noLeadingTrailingSpacesValidator]],
      cohortAcronym: ['', [Validators.required, noWhitespaceValidator]],
      hgnc: ['', [Validators.required, Validators.pattern(/^HGNC:\d+$/)]],
      symbol: ['', [Validators.required, noWhitespaceValidator]],
      transcript: ['', [Validators.required, Validators.pattern(/^[\w]+\.\d+$/)]],
    });
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
    const text = this.pastedText();
    if (! text) {
      this.showPasteArea.set(false);
      return;
    }
    const parts = text.split(/\t/).filter(p => p.trim());
    const omimIdIndex = parts.findIndex(p => /^\d{6}$/.test(p));
    if (omimIdIndex === -1) {
      alert('No valid 6-digit OMIM ID found in pasted data.');
      this.showPasteArea.set(false);
      return;
    }

    const omimId = parts[omimIdIndex];
    const diseaseLabel = omimIdIndex > 0 ? parts[omimIdIndex - 1] : null;
    const geneSymbol = omimIdIndex + 3 < parts.length ? parts[omimIdIndex + 3] : null;

    this.form.patchValue({
      diseaseLabel: diseaseLabel,
      diseaseId: `OMIM:${omimId}`,
      symbol: geneSymbol,
    });

    this.showPasteArea.set(false);
  }

  togglePaste() {
    this.showPasteArea.update(v => !v);
  }
}
