import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { EtlSessionService } from '../services/etl_session_service';
import { ConfigService } from '../services/config.service';
import { CohortDtoService } from '../services/cohort_dto_service';
import { DiseaseData } from '../models/cohort_dto';
import { MatIconModule } from "@angular/material/icon";
import { RouterModule } from '@angular/router'; 
import { SourcePmid } from '../models/cohort_description_dto';

@Component({
  selector: 'app-status',
  templateUrl: './repo.component.html',
  styleUrls: ['./repo.component.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterModule],
})
export class RepoComponent  {
  private configService = inject(ConfigService); 

  
  diseaseList!: DiseaseData[];
  pmidList: SourcePmid[] = [];
  showPmid = false;
  showJson = false;


  

}