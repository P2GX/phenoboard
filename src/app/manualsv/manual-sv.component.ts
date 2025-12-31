import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from "@angular/material/input";
import { StructuralVariant, SvType } from '../models/variant_dto';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-manualsv-dialog',
  templateUrl: './manual-sv.component.html',
  styleUrls: ['./manual-sv.component.scss'],
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
})
export class ManualStructuralVariantDialog  {
  form: FormGroup;
  svTypeOptions = [
    { value: SvType.DEL, label: 'DEL - Chromosomal Deletion' },
    { value: SvType.INV, label: 'INV - Chromosomal Inversion' },
    { value: SvType.TRANSL, label: 'TRANSL - Chromosomal Translocation' },
    { value: SvType.DUP, label: 'DUP - Chromosomal Duplication' },
    { value: SvType.SV, label: 'SV - Structural Variation (unspecified)' }
  ] as const;
  constructor() {
    this.form = this.fb.group({
      label: [ this.data.label ?? '', Validators.required],
      geneSymbol: [this.data.geneSymbol ?? '', Validators.required],
      transcript: [this.data.transcript ?? '', Validators.required],
      hgncId: [this.data.hgncId ?? '', Validators.required],
      svType: [this.data.svType ?? SvType.SV, Validators.required],
      chromosome: [this.data.chromosome ?? '', Validators.required],
    });
  }

  private fb = inject(FormBuilder);
  public dialogRef = inject(MatDialogRef<StructuralVariant>);
  public data = inject(MAT_DIALOG_DATA) as Partial<StructuralVariant>;

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSave(): void {
    if (this.form.valid) {
      const formValue = this.form.getRawValue(); // includes disabled controls like assembly
      const variant: StructuralVariant = {
          ...formValue,
          variantKey: this.generateVariantKey(
          formValue.geneSymbol,
          formValue.svType,
          formValue.label,
        )
      };
      this.dialogRef.close(variant);
    }
  }

/**
 * Provide a key for the variant that we will use for the HashMap
 */
  private generateVariantKey(symbol: string, svType: SvType, label: string): string {
    const normalize = (val: string): string => val?.trim().replace(/\s+/g, "-") || "-";
    return `${symbol.trim()}_${svType}_${normalize(label)}`;
  }
  
}
