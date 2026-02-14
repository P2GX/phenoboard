import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { HpoAutocompleteComponent } from '../hpoautocomplete/hpoautocomplete.component';
import { HpoTermDuplet } from '../models/hpo_term_dto';
import { ConfigService } from '../services/config.service';
import { ClinicalStatus, HpoMatch, MiningConcept, MiningStatus } from '../models/hpo_mapping_result';

@Component({
  selector: 'app-hpo-mining-verifier',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, 
    MatIconModule, MatProgressBarModule, HpoAutocompleteComponent
  ],
  templateUrl: './hpominingverifier.component.html',
  styleUrl: './hpominingverifier.component.scss'
})
export class HpoMiningVerifierComponent implements OnInit {
  @Input() rawSubstrings: string[] = [];
  
  // Using Signals for modern Angular state management
  concepts = signal<MiningConcept[]>([]);
  currentIndex = signal(0);

  constructor(private configService: ConfigService) {}

  async ngOnInit() {
    const initialConcepts: MiningConcept[] = [];
    
    for (const text of this.rawSubstrings) {
      // Call your Rust "get_best_hpo_match" for an initial guess
      const bestMatch = await this.configService.getBestHpoMatch(text);
      initialConcepts.push({
        originalText: text,
        suggestedTerms: [bestMatch], // This might be null or "n/a"
        miningStatus: MiningStatus.Pending,
        clinicalStatus: ClinicalStatus.Observed,
        onsetString: null
      });
    }
    this.concepts.set(initialConcepts);
  }

  get current() {
    return this.concepts()[this.currentIndex()];
  }

  get progress() {
    return ((this.currentIndex() + 1) / this.concepts().length) * 100;
  }

  handleUpdate(match: HpoMatch): void {
    const updated = [...this.concepts()];
    const index = this.currentIndex();
    updated[index] = {
      ...updated[index],
      suggestedTerms: [...updated[index].suggestedTerms, match]
    };
    this.concepts.set(updated);
  }

  confirmAndNext(): void {
    const updated = [...this.concepts()];
    updated[this.currentIndex()].miningStatus = MiningStatus.Confirmed;
    this.concepts.set(updated);
    this.next();
  }

  next() {
    if (this.currentIndex() < this.concepts().length - 1) {
      this.currentIndex.update(v => v + 1);
    }
  }

  prev() {
    if (this.currentIndex() > 0) {
      this.currentIndex.update(v => v - 1);
    }
  }
}