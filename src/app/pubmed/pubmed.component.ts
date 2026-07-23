import { Component, computed, effect, inject, input, output, signal, viewChild, ElementRef, WritableSignal, afterNextRender } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfigService } from '../services/config.service';
import { PmidService } from '../services/pmid_service';
import { defaultPmidDto, PmidDto } from '../models/pmid_dto';

@Component({
  selector: 'app-pubmed',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './pubmed.component.html',
  styleUrls: ['./pubmed.component.css'],
})
export class PubmedComponent {
  private configService = inject(ConfigService);
  private pmidService = inject(PmidService);

  initialData = input<PmidDto | null>(null);
  closeDialog = output<PmidDto | null>();

  readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('pubmedDialog');
  pmidDto: WritableSignal<PmidDto> = signal<PmidDto>(defaultPmidDto());
  availablePmids: WritableSignal<PmidDto[]> = this.pmidService.pmidsSignal;
  selectedPmid = computed(() => this.pmidDto().pmid);

  constructor() {
    // seed from initialData once, and open the dialog as soon as it exists in the DOM
    afterNextRender(() => {
      const dialogEl = this.dialogRef()?.nativeElement;
      if (dialogEl && !dialogEl.open) {
        this.pmidDto.set(this.initialData() ?? defaultPmidDto());
        dialogEl.showModal();
      }
    });
  }

  onPmidSelection(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedPmidNumber = target.value;

    if (selectedPmidNumber === '') {
      this.pmidDto.set(defaultPmidDto());
      return;
    }

    const selected = this.pmidService.getPmidByNumber(selectedPmidNumber);
    if (selected) {
      this.pmidDto.set(selected);
      this.pmidService.addPmid(this.pmidDto());
    }
  }

  async retrieve_pmid_title(): Promise<void> {
    if (!this.pmidDto().pmid?.trim()) return;

    const input = this.pmidDto().pmid.trim();
    try {
      const result: PmidDto = await this.configService.retrieve_pmid_title(input);
      this.pmidDto.set({ ...result, hasError: false, retrievedPmid: true });
    } catch (error) {
      this.pmidDto.set({
        ...this.pmidDto(),
        title: '',
        hasError: true,
        retrievedPmid: false,
        errorMessage: 'Error retrieving title: ' + String(error),
      });
    }
  }

  readonly isRetrieveDisabled = computed(() => {
    const pmid = this.pmidDto().pmid;
    return !pmid || pmid.trim() === '';
  });

  readonly isReady = computed(() => !!this.pmidDto().pmid && !!this.pmidDto().title);

  accept(): void {
    this.dialogRef()?.nativeElement.close();
    this.closeDialog.emit(this.pmidDto());
  }

  cancel(): void {
    this.dialogRef()?.nativeElement.close();
    this.closeDialog.emit(null);
  }

  onPmidChange(value: string): void {
    this.pmidDto.update((prev) => ({ ...prev, pmid: value.replace(/\s+/g, '') }));
  }

  clearPmids(): void {
    this.availablePmids.set([]);
  }
  onDialogClose(): void {
    // fires for ANY native close — Escape key, or dialog.close() called
    // programmatically from accept()/cancel(). 
    this.closeDialog.emit(null);
  }
}