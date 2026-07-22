import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import {
  CohortData,
  DiseaseData,
  GeneTranscriptData,
} from '../../../libs/ui/src/lib/models/cohort_dto';
import { CohortDtoService } from '../services/cohort_dto_service';
import { SourcePmid } from '@workspace/ui';
import { PmidDialogComponent } from '../util/pmidvis/pmid-dialog.component';
import { MatDialog } from '@angular/material/dialog';

/* Display a summary of the salient characteristics of the Cohort */
@Component({
  selector: 'app-cohort-summary',
  templateUrl: './cohortsummary.component.html',
  styleUrls: ['./cohortsummary.component.scss'],
  standalone: true,
  imports: [PmidDialogComponent],
})
export class CohortSummaryComponent {
  cohort = input.required<CohortData>();
  private cohortService = inject(CohortDtoService);
  showPmid = signal<boolean>(false);
  citations = computed(() => {
    return this.cohortService.getAllPmids();
  });

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

  togglePmidModal() {
    this.showPmid.update((v) => !v);
  }
}
