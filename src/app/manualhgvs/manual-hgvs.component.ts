import { Component, ElementRef, ViewChild, AfterViewInit, input, output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HgvsVariant } from '../../../libs/ui/src/lib/models/variant_dto';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-manualhgvs-dialog',
  templateUrl: './manual-hgvs.component.html',
  styleUrls: ['./manual-hgvs.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
  ],
})
export class ManualHgvsVariantDialog implements AfterViewInit {
  readonly data = input<Partial<HgvsVariant>>({});
  readonly closed = output<HgvsVariant | null>();

  @ViewChild('dialogEl') dialogEl!: ElementRef<HTMLDialogElement>;

  form: FormGroup;

  constructor(private fb: FormBuilder) {
    const initialData = this.data();
    this.form = this.fb.group({
      assembly: [{ value: 'hg38', disabled: true }, Validators.required],
      chr: [initialData.chr ?? '', Validators.required],
      position: [initialData.position ?? null, [Validators.required, Validators.min(1)]],
      refAllele: [initialData.refAllele ?? '', Validators.required],
      altAllele: [initialData.altAllele ?? '', Validators.required],
      symbol: [initialData.symbol ?? '', Validators.required],
      hgncId: [initialData.hgncId ?? '', Validators.required],
      hgvs: [initialData.hgvs ?? '', Validators.required],
      transcript: [initialData.transcript ?? '', Validators.required],
      gHgvs: [initialData.gHgvs ?? '', Validators.required],
    });
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
      const variant: HgvsVariant = {
        ...formValue,
        variantKey: this.generateVariantKey(formValue.hgvs, formValue.symbol, formValue.transcript),
      };
      this.dialogEl?.nativeElement.close();
      this.closed.emit(variant);
    }
  }

  private generateVariantKey(hgvs: string, symbol: string, transcript: string): string {
    let hgvsNorm = hgvs.replace('c.', 'c').replace('m.', 'm').replace('n.', 'n').replace('>', 'to');
    hgvsNorm = Array.from(hgvsNorm)
      .map((c) => (/[a-zA-Z0-9]/.test(c) ? c : '_'))
      .join('');

    const transcriptNorm = transcript.replace(/\./g, 'v');

    return `${hgvsNorm}_${symbol}_${transcriptNorm}`;
  }
}