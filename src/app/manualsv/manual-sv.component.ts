import { Component, inject, input, output, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { StructuralVariant, SvType } from '../../../libs/ui/src/lib/models/variant_dto';

@Component({
  selector: 'app-manualsv-dialog',
  templateUrl: './manual-sv.component.html',
  styleUrls: ['./manual-sv.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
  ],
})
export class ManualStructuralVariantDialog implements AfterViewInit {
  private fb = inject(FormBuilder);

  readonly data = input<Partial<StructuralVariant>>({});
  readonly closed = output<StructuralVariant | null>();

  @ViewChild('dialogEl') dialogEl!: ElementRef<HTMLDialogElement>;

  form: FormGroup;
  svTypeOptions = [
    { value: SvType.DEL, label: 'DEL - Chromosomal Deletion' },
    { value: SvType.INV, label: 'INV - Chromosomal Inversion' },
    { value: SvType.TRANSL, label: 'TRANSL - Chromosomal Translocation' },
    { value: SvType.DUP, label: 'DUP - Chromosomal Duplication' },
    { value: SvType.SV, label: 'SV - Structural Variation (unspecified)' },
  ] as const;

  constructor() {
    const initialData = this.data();
    this.form = this.fb.group({
      label: [initialData.label ?? '', Validators.required],
      geneSymbol: [initialData.geneSymbol ?? '', Validators.required],
      transcript: [initialData.transcript ?? '', Validators.required],
      hgncId: [initialData.hgncId ?? '', Validators.required],
      svType: [initialData.svType ?? SvType.SV, Validators.required],
      chromosome: [initialData.chromosome ?? '', Validators.required],
    });
  }

  ngOnInit() {
    const initialData = this.data();
    if (initialData) {
      this.form.patchValue({
        label: initialData.label ?? '',
        geneSymbol: initialData.geneSymbol ?? '',
        transcript: initialData.transcript ?? '',
        hgncId: initialData.hgncId ?? '',
        svType: initialData.svType ?? SvType.SV,
        chromosome: initialData.chromosome ?? '',
      });
    }
  }

  ngAfterViewInit() {
    if (this.dialogEl?.nativeElement) {
      this.dialogEl.nativeElement.showModal();
    }
  }

  onCancel(): void {
    this.dialogEl?.nativeElement.close();
    this.closed.emit(null);
  }

  onSave(): void {
    if (this.form.valid) {
      const formValue = this.form.getRawValue();
      const variant: StructuralVariant = {
        ...formValue,
        variantKey: this.generateVariantKey(
          formValue.geneSymbol,
          formValue.svType,
          formValue.label,
        ),
      };
      this.dialogEl?.nativeElement.close();
      this.closed.emit(variant);
    }
  }

  private generateVariantKey(symbol: string, svType: SvType, label: string): string {
    const normalize = (val: string): string => val?.trim().replace(/\s+/g, '-') || '-';
    return `${symbol.trim()}_${svType}_${normalize(label)}`;
  }
}