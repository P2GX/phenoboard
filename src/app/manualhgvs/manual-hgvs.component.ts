import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from "@angular/material/input";
import { HgvsVariant } from '../models/variant_dto';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';



@Component({
  selector: 'app-manualhgvs-dialog',
  templateUrl: './manual-hgvs.component.html',
  styleUrls: ['./manual-hgvs.component.scss'],
  standalone: true,
   imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule
  ],
})
export class ManualHgvsVariantDialog  {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<HgvsVariant>,
    @Inject(MAT_DIALOG_DATA) public data: Partial<HgvsVariant>
  ) {
    this.form = this.fb.group({
      assembly: [{ value: 'hg38', disabled: true }, Validators.required],
      chr: [data.chr ?? '', Validators.required],
      position: [data.position ?? null, [Validators.required, Validators.min(1)]],
      refAllele: [data.refAllele ?? '', Validators.required],
      altAllele: [data.altAllele ?? '', Validators.required],
      symbol: [data.symbol ?? '', Validators.required],
      hgncId: [data.hgncId ?? '', Validators.required],
      hgvs: [data.hgvs ?? '', Validators.required],
      transcript: [data.transcript ?? '', Validators.required],
      gHgvs: [data.gHgvs ?? '', Validators.required],
    });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSave(): void {
    if (this.form.valid) {
      const formValue = this.form.getRawValue(); // includes disabled controls like assembly
      const variant: HgvsVariant = {
        ...formValue,
        variantKey: this.generateVariantKey(
          formValue.hgvs,
          formValue.symbol,
          formValue.transcript
        )
      };
      this.dialogRef.close(variant);
    }
  }

  private generateVariantKey(hgvs: string, symbol: string, transcript: string): string {
    // Normalize hgvs
    let hgvsNorm = hgvs.replace("c.", "c").replace("m.", "m").replace("n.","n").replace(">", "to");
    hgvsNorm = Array.from(hgvsNorm)
      .map(c => /[a-zA-Z0-9]/.test(c) ? c : "_")
      .join("");

    // Normalize transcript
    const transcriptNorm = transcript.replace(/\./g, "v");

    return `${hgvsNorm}_${symbol}_${transcriptNorm}`;
  }
}
