import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { EtlSessionService } from '../services/etl_session_service';
import { ConfigService } from '../services/config.service';
import { CohortDtoService } from '../services/cohort_dto_service';
import { DiseaseGeneData, CohortData } from '../models/cohort_dto';
import { MatIconModule } from "@angular/material/icon";


@Component({
  selector: 'app-status',
  templateUrl: './status.component.html',
  styleUrls: ['./status.component.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule],
})
export class StatusComponent implements OnInit {

  constructor(private configService: ConfigService, 
    private cohortService: CohortDtoService,
    private etl_service: EtlSessionService,
  ) {
  }
  cohortDto$ = this.cohortService.cohortDto$;

  
  diseaseGeneDto: DiseaseGeneData | null = null;
  showJson = false;


  ngOnInit(): void {
    this.diseaseGeneDto = this.cohortService.getDiseaseGeneDto();
  }


  get mendelianDiseaseOmimUrl(): string | null {
    if (
      this.diseaseGeneDto?.templateType === 'mendelian' &&
      this.diseaseGeneDto.diseaseDtoList?.length
    ) {
      const label = this.diseaseGeneDto.diseaseDtoList[0].diseaseLabel;
      const id = this.diseaseGeneDto.diseaseDtoList[0].diseaseId;
      if (id?.startsWith('OMIM:')) {
        const omimNumber = id.split(':')[1];
        return  `https://omim.org/entry/${omimNumber}`;
      }
    }
    return null;
  }

  get hgncGeneUrl(): string | null {
    if (
      this.diseaseGeneDto?.templateType === 'mendelian' &&
      this.diseaseGeneDto.geneTranscriptDtoList?.length
    ) {
      const hgncId = this.diseaseGeneDto.geneTranscriptDtoList[0].hgncId;
      return  `https://www.genenames.org/data/gene-symbol-report/#!/hgnc_id/${hgncId}`;
    }
    return null;
  }

  
  
  

}