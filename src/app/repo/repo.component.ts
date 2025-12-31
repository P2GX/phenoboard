import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { EtlSessionService } from '../services/etl_session_service';
import { ConfigService } from '../services/config.service';
import { CohortDtoService } from '../services/cohort_dto_service';
import { DiseaseData } from '../models/cohort_dto';
import { MatIconModule } from "@angular/material/icon";
import { RouterModule } from '@angular/router'; 
import { SourcePmid } from '../models/cohort_description_dto';
import { RepoQc } from '../models/repo_qc';
import { NotificationService } from '../services/notification.service';
import { HelpService } from '../services/help.service';

@Component({
  selector: 'app-status',
  templateUrl: './repo.component.html',
  styleUrls: ['./repo.component.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterModule],
})
export class RepoComponent implements OnInit {
  private configService = inject(ConfigService); 
  private helpService = inject(HelpService);
  private notificationService = inject(NotificationService);
  
  ngOnInit(): void {
    this.helpService.setHelpContext("repo");
  }
  
  diseaseList!: DiseaseData[];
  pmidList: SourcePmid[] = [];
  showPmid = false;
  showJson = false;

  repoQc: RepoQc | null = null;
  loading = false;
  errorMessage = '';


  async fetchRepoQc() {
    this.loading = true;
    this.errorMessage = '';
    try {
      this.repoQc = await this.configService.fetchRepoQc();
    } catch (err: unknown) {
      this.notificationService.showError(`Could not load QC data: ${err instanceof Error ? err: String(err)}`)
    }
  }

  

}