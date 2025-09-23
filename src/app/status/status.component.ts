import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { EtlSessionService } from '../services/etl_session_service';
import { ConfigService } from '../services/config.service';
import { CohortDtoService } from '../services/cohort_dto_service';
import { DiseaseData } from '../models/cohort_dto';
import { MatIconModule } from "@angular/material/icon";
import { RouterModule } from '@angular/router'; 

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

  
  
  

}