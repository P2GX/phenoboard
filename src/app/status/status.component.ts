import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { EtlSessionService } from '../services/etl_session_service';
import { ConfigService } from '../services/config.service';
import { CohortDtoService } from '../services/cohort_dto_service';
import { DiseaseData } from '../models/cohort_dto';
import { MatIconModule } from "@angular/material/icon";
import { RouterModule } from '@angular/router'; 
import { SourcePmid } from '../models/cohort_description_dto';

@Component({
  selector: 'app-status',
  templateUrl: './status.component.html',
  styleUrls: ['./status.component.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterModule],
})
export class StatusComponent implements OnInit {

  constructor(private configService: ConfigService, 
    private cohortService: CohortDtoService,
    private etl_service: EtlSessionService,
  ) {
  }
  cohortDto$ = this.cohortService.cohortData$;

  
  diseaseList!: DiseaseData[];
  pmidList: SourcePmid[] = [];
  showPmid = false;
  showJson = false;


  ngOnInit(): void {
    this.diseaseList = this.cohortService.getDiseaseList();
  }


  get mendelianDiseaseOmimUrl(): string | null {
    const cohort = this.cohortService.getCohortData();
    if (
      cohort?.cohortType === 'mendelian' &&
      cohort.diseaseList?.length == 1
    ) {
      const disease = cohort.diseaseList[0];
      const id = disease.diseaseId;
      if (id?.startsWith('OMIM:')) {
        const omimNumber = id.split(':')[1];
        return  `https://omim.org/entry/${omimNumber}`;
      }
    }
    return null;
  }

  get hgncGeneUrl(): string | null {
    const cohort = this.cohortService.getCohortData();
    if (
      cohort?.cohortType === 'mendelian' &&
      cohort.diseaseList?.length == 1
    ) {
      const gene = cohort.diseaseList[0].geneTranscriptList[0];
      const hgncId = gene.hgncId;
      return  `https://www.genenames.org/data/gene-symbol-report/#!/hgnc_id/${hgncId}`;
    }
    return null;
  }

  
  showAllPmid() {
    this.pmidList = this.cohortService.getAllPmids();
    this.showPmid = true;
  }

  showAllPpkt() {
    this.showPmid = false;
    this.showJson = false;
  }

  /** Return a cleaned PMID id suitable for the PubMed URL.
 *  - Prefer the first sequence of digits if present.
 *  - Fallback: strip a leading "PMID:" prefix and trim.
 */
extractPmid(raw?: string): string {
  if (!raw) return '';
  // prefer the first run of digits
  const m = raw.match(/\d+/);
  if (m) return m[0];
  // fallback: remove common "PMID:" style prefix
  return raw.replace(/^\s*PMID:\s*/i, '').trim();
}
  
saveHtmlSummary() {
  const cohort = this.cohortService.getCohortData();
  if (! cohort) {
    alert("Cohort not initialized");
    return;
  }
  this.configService.saveHtmlReport(cohort);
}

}