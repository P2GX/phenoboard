import { Component, Inject, Optional, OnInit } from '@angular/core';
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
  styleUrl: './pubmed.component.css'
})
export class PubmedComponent implements OnInit {
  pmidDto: PmidDto = defaultPmidDto();
  availablePmids: PmidDto[] = [];
  selectedPmid: string = '';

  constructor(
    private configService: ConfigService,
    private pmidService: PmidService,
    public dialogRef: MatDialogRef<PubmedComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data?: any
  ) {
    // Initialize with data passed from dialog opener
    if (data?.pmidDto) {
      this.pmidDto = { ...data.pmidDto };
    }
  }

  ngOnInit(): void {
    // Load available PMIDs
    this.availablePmids = this.pmidService.getPmids();
    
    // Subscribe to changes
    this.pmidService.pmids$.subscribe(pmids => {
      this.availablePmids = pmids;
    });
  }

  onPmidSelection(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedPmidNumber = target.value;
    
    if (selectedPmidNumber === '') {
      // "New PMID" selected - clear the form
      this.pmidDto = defaultPmidDto();
      this.selectedPmid = '';
      return;
    }

    const selected = this.pmidService.getPmidByNumber(selectedPmidNumber);
    if (selected) {
      this.pmidDto = { ...selected };
      this.selectedPmid = selectedPmidNumber;
    }
  }

  async retrieve_pmid_title() {
    if (!this.pmidDto.pmid?.trim()) return;
    
    const input = this.pmidDto.pmid.trim();
    try {
      const result: PmidDto = await this.configService.retrieve_pmid_title(input);
      this.pmidDto = {
        ...result,
        hasError: false,
        retrievedPmid: true
      };
    } catch (error) {
      this.pmidDto = {
        ...this.pmidDto,
        title: '',
        hasError: true,
        retrievedPmid: false,
        errorMessage: 'Error retrieving title: ' + String(error),
      };
    }
  }

  isReady(): boolean {
    return this.pmidDto.pmid.length > 0 && this.pmidDto.title.length > 0;
  }

  // Dialog methods
  accept(): void {
    console.log('Accept clicked with:', this.pmidDto);
    
    // Save to service if it's a valid PMID
    if (this.isReady()) {
      this.pmidService.addPmid(this.pmidDto);
    }
    
    this.dialogRef.close(this.pmidDto);
  }

  cancel(): void {
    console.log('Cancel clicked');
    this.dialogRef.close(null);
  }
}