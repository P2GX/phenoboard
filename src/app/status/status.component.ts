import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { EtlSessionService } from '../services/etl_session_service';
import { ConfigService } from '../services/config.service';
import { CohortDtoService } from '../services/cohort_dto_service';
import { DiseaseGeneDto, CohortDto } from '../models/cohort_dto';
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
    private templateService: CohortDtoService,
    private etl_service: EtlSessionService,
  ) {
  
  }

  
  diseaseGeneDto: DiseaseGeneDto | null = null;
  templateDto: CohortDto | null = null;



  ngOnInit(): void {
    this.diseaseGeneDto = this.templateService.getDiseaseGeneDto();
    this.templateDto = this.templateService.getCohortDto();
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

  get phenopacketCount(): number {
    if (this.templateDto != null) {
      return this.templateDto.rows.length;
    }
    return 0;
  }

  get hpoTermCount(): number {
    if (this.templateDto != null) {
      return this.templateDto.hpoHeaders.length;
    }

    return 0;
  }
  

}