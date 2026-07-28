import { Component, input, output, signal, computed } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { CohortData, ModeOfInheritance } from '../../../../libs/ui/src/lib/models/cohort_dto';
import { MoiSelector } from '../../moiselector/moiselector.component';


export const MOI_ABBREVIATIONS: Record<string, string> = {
  'HP:0000006': 'AD',   // Autosomal dominant inheritance
  'HP:0000007': 'AR',   // Autosomal recessive inheritance
  'HP:0001417': 'XL',   // X-linked inheritance
  'HP:0001423': 'XLD',  // X-linked dominant inheritance
  'HP:0001419': 'XLR',  // X-linked recessive inheritance
  'HP:0001427': 'MI',   // Mitochondrial inheritance
  'HP:0001450': 'YL',   // Y-linked inheritance
  'HP:0010985': 'GD',   // Gonosomal dominant inheritance
  'HP:0001452': 'SC',   // Somatic mutation
  'HP:0003745': 'SP',   // Sporadic
  'HP:0001426': 'MF',   // Multifactorial inheritance
  // add any others you curate against as you encounter them
};


@Component({
  selector: 'app-cohort-metadata',
  standalone: true,
  imports: [FormsModule, MoiSelector],
  templateUrl: './cohort-metadata.component.html',
})
export class CohortMetadataComponent {
  cohortData = input.required<CohortData>();
  readonly diseases = computed(() => this.cohortData()?.diseaseList ?? []);
  resetCohortMetadata = output<void>();
  updateAcronym = output<string>();
  updateMoi = output<{ diseaseIndex: number; moi: ModeOfInheritance }>();

  // local ui state signals
  showCohortAcronym = signal(false);
  showMoiIndex = signal<number | null>(null);
  acronymInput = signal('');

  // computed display
  displayAcronym = computed(() => this.cohortData()?.cohortAcronym || '---');

  toggleMoi(index: number): void {
    this.showMoiIndex.update((current) => (current === index ? null : index));
  }

  submitAcronym(): void {
    this.updateAcronym.emit(this.acronymInput());
    this.showCohortAcronym.set(false);
  }

  /** Get suggest cohort acronym for melded only (others should be blank because the user
   * needs to retrieve from OMIM; for melded, we use the gene symbols for the two diseases). */
  suggestedAcronym = computed((): string => {
    const cohort = this.cohortData();
    if (!cohort) return '';
    if (cohort.cohortType === 'melded') {
      // Collect all gene symbols from both diseases
      const symbols = cohort.diseaseList
        .flatMap((disease) => disease.geneTranscriptList.map((gt) => gt.geneSymbol))
        .filter(Boolean) // remove null/undefined just in case
        .sort((a: string, b: string) => a.localeCompare(b)); // alphabetic sort
      return symbols.join('-');
    } else if (cohort.cohortAcronym != null) {
      return cohort.cohortAcronym;
    } else {
      return '';
    }
  });
}
