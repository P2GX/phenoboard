import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CohortData, ModeOfInheritance } from '../../models/cohort_dto';
import { MoiSelector } from "../../moiselector/moiselector.component";

@Component({
  selector: 'app-cohort-metadata',
  standalone: true,
  imports: [CommonModule, FormsModule, MoiSelector],
  templateUrl: './cohort-metadata.component.html'
})
export class CohortMetadataComponent {
  cohortData = input.required<CohortData>();
  readonly diseases = computed(() => this.cohortData()?.diseaseList ?? []);
  resetCohortMetadata = output<void>();
  updateAcronym = output<string>();
  updateMoi = output<{diseaseIndex: number, moi: ModeOfInheritance}>();

  // local ui state signals
  showCohortAcronym = signal(false);
  showMoiIndex = signal<number | null>(null);
  acronymInput = signal('');

  // computed display
  displayAcronym = computed(() => this.cohortData()?.cohortAcronym || '---');

  toggleMoi(index: number): void {
    this.showMoiIndex.update(current => current === index ? null : index);
  }

  submitAcronym(): void {
    this.updateAcronym.emit(this.acronymInput());
    this.showCohortAcronym.set(false);
  }

   /** Get suggest cohort acronym for melded only (others should be blank because the user
   * needs to retrieve from OMIM; for melded, we use the gene symbols for the two diseases). */
  suggestedAcronym = computed(() : string  => {
    const cohort = this.cohortData();
    if (! cohort) return '';
    if (cohort.cohortType === 'melded') {
      // Collect all gene symbols from both diseases
      const symbols = cohort.diseaseList
        .flatMap(disease => 
          disease.geneTranscriptList.map(gt => gt.geneSymbol)
        )
        .filter(Boolean) // remove null/undefined just in case
        .sort((a: string, b: string) => a.localeCompare(b)); // alphabetic sort
      return symbols.join('-');
    }  else if (cohort.cohortAcronym != null) {
      return cohort.cohortAcronym;
    } else {
      return '';
    }
  });
}