import { Component, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { noWhitespaceValidator, noLeadingTrailingSpacesValidator } from '../validators/validators';
import { HelpButtonComponent } from '../util/helpbutton/help-button.component';
import { ConfigService } from '../services/config.service';
import { CohortEntry } from '../newtemplate/newtemplate.component';

export interface CohortDialogData {
  title: string;
  isMelded: boolean;
}

export interface CohortDialogResult {
  entry: any;
  keepGoing: boolean;
}

@Component({
  selector: 'app-cohort-dialog',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, HelpButtonComponent],
  templateUrl: './cohortdialog.component.html',
  styleUrl: './cohortdialog.component.scss',
})
export class CohortDialogComponent {
  private dialogEl = viewChild.required<ElementRef<HTMLDialogElement>>('dialogEl');

  title = input.required<string>();
  isMelded = input<boolean>(false);
  /** Fires every time an entry is submitted — dialog may stay open (keepGoing) */
  entrySubmitted = output<CohortEntry>();
  /** Fires only when the dialog actually goes away — cancel or final submit */
  closed = output<boolean>(); // true = cancelled, false = completed normally

  showPasteArea = signal(false);
  pastedText = signal<string | null>(null);
  private fb = inject(FormBuilder);
  private configService = inject(ConfigService);

  form: FormGroup = this.fb.group({
    diseaseId: ['', [Validators.required, Validators.pattern(/^OMIM:\d{6}$/)]],
    diseaseLabel: ['', [Validators.required, noLeadingTrailingSpacesValidator]],
    cohortAcronym: ['', [Validators.required, noWhitespaceValidator]],
    hgnc: ['', [Validators.required, Validators.pattern(/^HGNC:\d+$/)]],
    symbol: ['', [Validators.required, noWhitespaceValidator]],
    transcript: ['', [Validators.required, Validators.pattern(/^[\w]+\.\d+$/)]],
  });
  symbolValue = toSignal(this.form.get('symbol')!.valueChanges, { initialValue: '' });
  canFetch = computed(() => {
    const s = this.symbolValue();
    return s && s.trim().length > 0;
  });
  isLoading = signal(false);


  open() {
    this.form.reset();
    this.showPasteArea.set(false);
    this.dialogEl().nativeElement.showModal();
  }



  /** Handles Esc key too, since <dialog> fires 'cancel' on Esc */
  onCancelEvent(event: Event) {
    event.preventDefault(); // we control closing ourselves, for consistent emit
    this.cancel();
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === this.dialogEl().nativeElement) {
      this.cancel();
    }
  }

  cancel() {
    this.closeDialog(true);
  }





    submitAndAddNext() {
      if (this.form.valid) {
        this.entrySubmitted.emit(this.form.value as CohortEntry);
        this.form.reset();
      } else {
        this.form.markAllAsTouched();
      }
    }

  submit() {
    if (this.form.valid) {
      this.entrySubmitted.emit(this.form.value as CohortEntry);
      this.closeDialog(false);
    } else {
      this.form.markAllAsTouched();
    }
  }
  private closeDialog(cancelled: boolean) {
    this.dialogEl().nativeElement.close();
    this.closed.emit(cancelled);
  }

  processPastedText() {
    const text = this.pastedText();
    if (!text) {
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

  async fetchHgncData(symbol: string): Promise<{ hgncId: string, maneSelect: string } | null> {
    try {
      return await this.configService.fetchHgncData(symbol);
    } catch (error) {
      console.error(`Error fetching gene ${symbol}: ${error}`);
      return null;
    }
  }

  async fetchAndFillHgnc() {
    const symbol = this.symbolValue();
    if (!symbol) return;

    this.isLoading.set(true);
    const result = await this.fetchHgncData(symbol);
    this.isLoading.set(false);

    if (result) {
      this.form.patchValue({
        hgnc: result.hgncId,
        transcript: result.maneSelect
      });
    } else {
      alert(`Could not find data for symbol: ${symbol}`);
    }
  }

  isInvalid(control: string): boolean {
    const c = this.form.get(control);
    return !!(c?.invalid && c?.touched);
  }
}