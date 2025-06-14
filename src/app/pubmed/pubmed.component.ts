import { Component, NgZone } from '@angular/core';
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

  constructor(
      private ngZone: NgZone,
      private configService: ConfigService
    ) {}
    

  pmidDto: PmidDto = defaultPmidDto();



  async retrieve_pmid_title() {
    if (this.pmidDto.pmid == null) return;
    const input = this.pmidDto.pmid.trim();
    try {
      const result: PmidDto = await this.configService.retrieve_pmid_title(input);
      this.pmidDto.pmid = result.pmid;
      this.pmidDto.title = result.title;
      this.pmidDto.hasError = false;
      this.pmidDto.retrievedPmid = true;
    } catch (error) {
      console.error('PMID lookup failed:', error);
      this.pmidDto.title = '';
      this.pmidDto.hasError = true;
      this.pmidDto.errorMessage = 'Error retrieving title: ' + String(error);
      this.pmidDto.retrievedPmid  = false;
    }
  }

  reset_pmid() {
    this.pmidDto = defaultPmidDto();
  }

  getPmidDto(): PmidDto {
    return this.pmidDto;
  }
}
