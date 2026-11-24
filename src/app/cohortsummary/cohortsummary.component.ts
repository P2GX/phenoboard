import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import {
  CohortData,
  DiseaseData,
  GeneTranscriptData,
  ModeOfInheritance,
} from '../../../libs/ui/src/lib/models/cohort_dto';
import { CohortDtoService } from '../services/cohort_dto_service';
import { PmidDialogComponent } from '../util/pmidvis/pmid-dialog.component';
import { FormsModule } from '@angular/forms';
import { MoiSummaryDialogComponent } from '../moi-summary-dialog/moi-summary-dialog.component';
import { DocumentButtonComponent } from 'ng-hpo-uikit';


/* Display a summary of the salient characteristics of the Cohort */
@Component({
  selector: 'app-cohort-summary',
  templateUrl: './cohortsummary.component.html',
  styleUrls: ['./cohortsummary.component.scss'],
  standalone: true,
  imports: [DocumentButtonComponent, PmidDialogComponent, FormsModule, MoiSummaryDialogComponent],
})
export class CohortSummaryComponent {
  cohort = input.required<CohortData>();
  private cohortService = inject(CohortDtoService);
  showPmid = signal<boolean>(false);
  citations = computed(() => {
    return this.cohortService.getAllPmids();
  });
  updateAcronym = output<string>();

  acronymInput = signal('');
   displayAcronym = computed(() => this.cohort().cohortAcronym || '---');
  showCohortAcronym = signal(false);
  showMoiIndex = signal<number | null>(null);
  updateMoi = output<{ diseaseIndex: number; moi: ModeOfInheritance }>();
  showMoiDialog = signal<boolean>(false);
  toggleMoiDialog() {
    this.showMoiDialog.update((v) => !v);
  }

  updateDiseaseLabel = output<{ diseaseIndex: number; label: string }>();
  editingDiseaseIndex = signal<number | null>(null);
  diseaseLabelInput = signal('');


  /* return the total count of distinct variants */
  numVariants = computed((): number => {
    const cohortData = this.cohort();
    const n_hgvs = Object.keys(cohortData.hgvsVariants).length;
    const n_sv = Object.keys(cohortData.structuralVariants).length;
    const n_ig = Object.keys(cohortData.intergenicVariants).length;
    return n_hgvs + n_sv + n_ig;
  });

  /* Create an OMIM URL from a string such as OMIM:654123 */
  getOmimId(diseaseId: string): string {
    const parts = diseaseId.split(':');
    return `${parts.length > 1 ? parts[1] : diseaseId}`;
  }

  getOmimUrl(id: string): string {
    return `https://omim.org/entry/${id.replace('OMIM:', '')}`;
  }

  /* Get Links for display with summary of cohort */
  getGeneLinks(
    disease: DiseaseData,
  ): { symbol: string; hgncUrl: string; transcript: string; ncbiUrl: string }[] {
    if (!disease?.geneTranscriptList?.length) {
      return [];
    }

    return disease.geneTranscriptList.map((gene: GeneTranscriptData) => ({
      symbol: gene.geneSymbol,
      transcript: gene.transcript,
      hgncUrl: `https://www.genenames.org/data/gene-symbol-report/#!/hgnc_id/${gene.hgncId}`,
      ncbiUrl: `https://www.ncbi.nlm.nih.gov/nuccore/${gene.transcript}`,
    }));
  }

  openPmidModal() {
    this.showPmid.set(true);
  }

  closePmidModal() {
    this.showPmid.set(false);
  }

  submitAcronym(): void {
    const acronym = this.acronymInput().replace(/\s+/g, '');
    if (!acronym) { return; }  
    this.updateAcronym.emit(acronym);
    this.showCohortAcronym.set(false);
  }

  showMoiModalIndex = signal<number | null>(null);
  openMoiModal(index: number) {
    this.showMoiModalIndex.set(index);
  }

  closeMoiModal() {
    this.showMoiModalIndex.set(null);
  }

  onMoiChange(selectedMoi: any) {
    const currentIndex = this.showMoiModalIndex();
    if (currentIndex !== null) {
      this.updateMoi.emit({ diseaseIndex: currentIndex, moi: selectedMoi });
    }
  }



  stripWhitespace(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/\s+/g, '');
    if (cleaned !== input.value) {
      const pos = (input.selectionStart ?? cleaned.length) - (input.value.length - cleaned.length);
      input.value = cleaned;
      input.setSelectionRange(pos, pos);   // keep the cursor where it was
      input.dispatchEvent(new Event('input'));   // let ngModel pick up the cleaned value
    }
  }

  startEditLabel(index: number, currentLabel: string): void {
    this.diseaseLabelInput.set(currentLabel);
    this.editingDiseaseIndex.set(index);
  }

  cancelEditLabel(): void {
    this.editingDiseaseIndex.set(null);
  }

  submitDiseaseLabel(): void {
    const index = this.editingDiseaseIndex();
    if (index === null) { return; }
    // trim and collapse runs of whitespace, but keep single spaces ("Basal cell nevus syndrome 1")
    const label = this.diseaseLabelInput().trim().replace(/\s+/g, ' ');
    if (!label) { return; }
    this.updateDiseaseLabel.emit({ diseaseIndex: index, label });
    this.editingDiseaseIndex.set(null);
  }
}
