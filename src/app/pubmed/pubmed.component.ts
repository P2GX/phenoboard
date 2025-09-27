import { Component, Inject, Optional } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfigService } from '../services/config.service';
import { defaultPmidDto, PmidDto } from '../models/pmid_dto';

@Component({
  selector: 'app-pubmed',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pubmed.component.html',
  styleUrl: './pubmed.component.css'
})
export class PubmedComponent {
  pmidDto: PmidDto = defaultPmidDto();

  constructor(
    private configService: ConfigService,
    public dialogRef: MatDialogRef<PubmedComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data?: any
  ) {
    // Initialize with data passed from dialog opener
    if (data?.pmidDto) {
      this.pmidDto = { ...data.pmidDto };
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
    this.dialogRef.close(this.pmidDto);
  }

  cancel(): void {
    console.log('Cancel clicked');
    this.dialogRef.close(null);
  }
}