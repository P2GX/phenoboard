import { Component, computed, ElementRef, inject, signal, viewChild, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfigService } from '../services/config.service';
import { PmidService } from '../services/pmid_service';
import { defaultPmidDto, PmidDto } from '../models/pmid_dto';

@Component({
  selector: 'app-pubmed',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './pubmed.component.html',
  styleUrls: ['./pubmed.component.css']
})
export class PubmedComponent {
  private configService = inject(ConfigService);
  private pmidService = inject(PmidService);

  readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('pubmedDialog');
  pmidDto: WritableSignal<PmidDto> = signal<PmidDto>(defaultPmidDto());
  availablePmids: WritableSignal<PmidDto[]> = this.pmidService.pmidsSignal;
  selectedPmid = computed(() => this.pmidDto().pmid);

  private resolvePromise: ((value: PmidDto|null)=> void) | null = null;

  /**
   * Opens the native dialog and returns a Promise resolving to the result.
   */
  public open(initialData?: PmidDto | null): Promise<PmidDto | null> {
    const dialogEl = this.dialogRef()?.nativeElement;
    if (!dialogEl) return Promise.resolve(null);
    dialogEl.showModal();
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
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
      this.pmidDto.set({
        ...result,
        hasError: false,
        retrievedPmid: true
      });
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

  readonly isReady = computed(() =>
    !!this.pmidDto().pmid && !!this.pmidDto().title
  );


  // accept a new PMID
  accept(): void {
    this.closeDialog(this.pmidDto());
  }

  cancel(): void {
    this.closeDialog(null);
  }
  onDialogClose(): void {
    if (this.resolvePromise) {
      this.resolvePromise(null);
      this.resolvePromise = null;
    }
  }

  private closeDialog(result: PmidDto | null): void {
    const dialogEl = this.dialogRef()?.nativeElement;
    dialogEl?.close();
    
    if (this.resolvePromise) {
      this.resolvePromise(result);
      this.resolvePromise = null;
    }
  }

  /* remove stray whitespaces */
  onPmidChange(value: string): void {
    this.pmidDto.update(prev => ({
      ...prev,
      pmid: value.replace(/\s+/g, '')
    }));
  }

  clearPmids(): void {
    this.availablePmids.set([]);
  }

}


