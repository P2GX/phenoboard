import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { CohortData, DiseaseData, GeneTranscriptData } from '../models/cohort_dto';

@Component({
  selector: 'app-cohort-summary',
  templateUrl: './cohortsummary.component.html',
  styleUrls: ['./cohortsummary.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class CohortSummaryComponent {
  cohort = input.required<CohortData>(); 


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
    const parts = diseaseId.split(":");
    return `${parts.length > 1 ? parts[1] : diseaseId}`;
  }

  getOmimUrl(id: string): string {
    return `https://omim.org/entry/${id.replace('OMIM:', '')}`;
  }

  /* Get Links for display with summary of cohort */
  getGeneLinks(disease: DiseaseData): {symbol: string, hgncUrl: string, transcript: string, ncbiUrl: string}[] {
      if (!disease?.geneTranscriptList?.length) {
        return [];
      }
  
      return disease.geneTranscriptList.map((gene:  GeneTranscriptData) => ({
        symbol: gene.geneSymbol,
        transcript: gene.transcript,
        hgncUrl: `https://www.genenames.org/data/gene-symbol-report/#!/hgnc_id/${gene.hgncId}`,
        ncbiUrl: `https://www.ncbi.nlm.nih.gov/nuccore/${gene.transcript}`
      }));
    }

}