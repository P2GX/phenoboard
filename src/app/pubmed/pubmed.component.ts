import { Component, inject, signal, WritableSignal } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfigService } from '../services/config.service';
import { PmidService } from '../services/pmid_service';
import { defaultPmidDto, PmidDto } from '../models/pmid_dto';

@Component({
  selector: 'app-pubmed',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pubmed.component.html',
  styleUrls: ['./pubmed.component.css']
})
export class PubmedComponent {


  private configService = inject(ConfigService);
  private pmidService = inject(PmidService);
  public dialogRef = inject(MatDialogRef<PubmedComponent>);



  data = inject<PmidDto>(MAT_DIALOG_DATA, { optional: true });
  pmidDto: WritableSignal<PmidDto> = signal<PmidDto>(this.data ?? defaultPmidDto());
  availablePmids: WritableSignal<PmidDto[]> = this.pmidService.pmidsSignal;
  selectedPmid = signal<string>('');


  onPmidSelection(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedPmidNumber = target.value;

    if (selectedPmidNumber === '') {
      // "New PMID" selected - clear the form
      this.pmidDto.set(defaultPmidDto());
      this.selectedPmid.set('');
      return;
    }

    const selected = this.pmidService.getPmidByNumber(selectedPmidNumber);
    if (selected) {
      this.pmidDto.set(selected);
      this.selectedPmid.set(selectedPmidNumber);
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

  isReady(): boolean {
    return this.pmidDto().pmid.length > 0 && this.pmidDto().title.length > 0;
  }

  // accept a new PMID
  accept(): void {
    if (this.isReady()) {
      this.pmidService.addPmid(this.pmidDto());
    }
    this.dialogRef.close(this.pmidDto());
  }

  cancel(): void {
    this.dialogRef.close(null);
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


