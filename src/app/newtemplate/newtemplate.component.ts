import { Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CohortDtoService } from '../services/cohort_dto_service';
import { DiseaseData, newDiseaseData, CohortData, CohortType, GeneTranscriptData } from '../models/cohort_dto';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ConfigService } from '../services/config.service';
import { CohortDialogComponent } from '../cohortdialog/cohortdialog.component';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../services/notification.service';




/**
 * Component for creating a Template for a new disease. This is the first thing we need to use
 * when we are creating a Template for a new OMIM entry etc.
 */
@Component({
  selector: 'app-newtemplate',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RouterLinkActive],
  templateUrl: './newtemplate.component.html',
  styleUrls: ['./newtemplate.component.scss'],
})
export class NewTemplateComponent  {

  private cohortService = inject(CohortDtoService);
  private configService = inject(ConfigService);
  private notificationService = inject(NotificationService);
  private dialog= inject(MatDialog);

  /* after the user submits data, we hide everything else and display a message */
  showSuccessMessage = false;

  digenicTemplate = false;
  meldedTemplate = false;
  mendelianTemplate = false;

  diseaseA: DiseaseData | null = null;
  diseaseB: DiseaseData | null = null;
  thisCohortType: CohortType | null = null;
  jsonData = '';
  errorMessage: string | null = null;

  pendingCohort: CohortData | null = null;

 async melded(): Promise<void> {
  this.mendelianTemplate = false;
  this.meldedTemplate = true;
  this.digenicTemplate = false;
  this.resetCohort();
    const first = await this.dialog.open(CohortDialogComponent, {
      width: '450px',
      height: '550px',
      data: { title: 'Enter Disease A Info', mode: 'melded' }
    });
    console.log("first=", first);
    if (!first) return;
    const first_disease = await firstValueFrom(first.afterClosed());
    const second = await this.dialog.open(CohortDialogComponent, {
      width: '450px',
      height: '550px',
      data: { title: 'Enter Disease B Info', mode: 'melded' }
    });
    console.log("second=", second);
    if (!second) return;
    const second_disease = await firstValueFrom(second.afterClosed());
    this.createTemplate({ diseaseA: first_disease, diseaseB: second_disease }, 'melded');
  }

  async digenic(): Promise<void> {
    this.mendelianTemplate = false;
    this.meldedTemplate = false;
    this.digenicTemplate = true;
    this.resetCohort();
    const dialogRef = this.dialog.open(CohortDialogComponent, {
      width: '450px',
      height: '550px',
      data: { title: 'Create Digenic Cohort', mode: 'digenic' }
    });
    const result = await firstValueFrom(dialogRef.afterClosed());
    if (!result) return;

    this.createTemplate(result, 'digenic');
  }


async mendelian(): Promise<void> {
  this.mendelianTemplate = true;
  this.meldedTemplate = false;
  this.digenicTemplate = false;
  this.resetCohort();
  const dialogRef = this.dialog.open(CohortDialogComponent, {
      width: '450px',
      height: '650px',
      data: { title: 'Create Mendelian Cohort', mode: 'mendelian' }
    });
    const result = await firstValueFrom(dialogRef.afterClosed());
    if (!result) {
      this.notificationService.showError("Could not get data for Mendelian cohort");
      return;
    }
    this.createTemplate(result, 'mendelian');
}

private async createTemplate(data: any, ctype: CohortType): Promise<void> {
  if (ctype == "mendelian") {  
    try {
        const diseaseData: DiseaseData = newDiseaseData(
          data.diseaseId, data.diseaseLabel, data.hgnc1, data.symbol1, data.transcript1
        );
        this.diseaseA = diseaseData;
        const template = await this.configService.createNewTemplate(
          diseaseData,
          ctype,
          data.cohortAcronym
        );
        this.pendingCohort = template;
        this.thisCohortType = "mendelian";
      } catch (error) {
        this.errorMessage = String(error);
      }
    } else if (ctype =="melded") {
      const diseaseA = data.diseaseA;
      const diseaseB = data.diseaseB;
      const gtlA: GeneTranscriptData = {
        hgncId: diseaseA.hgnc1,
        geneSymbol: diseaseA.symbol1,
        transcript: diseaseA.transcript1
      };
      const diseaseDataA: DiseaseData = {
        diseaseId: diseaseA.diseaseId,
        diseaseLabel: diseaseA.diseaseLabel,
        modeOfInheritanceList: [],
        geneTranscriptList: [gtlA]
      };
      this.diseaseA = diseaseDataA;
       const gtlB: GeneTranscriptData = {
        hgncId: diseaseB.hgnc1,
        geneSymbol: diseaseB.symbol1,
        transcript: diseaseB.transcript1
      };
      const diseaseDataB: DiseaseData = {
        diseaseId: diseaseB.diseaseId,
        diseaseLabel: diseaseB.diseaseLabel,
        modeOfInheritanceList: [],
        geneTranscriptList: [gtlB]
      };
      this.diseaseB = diseaseDataB;
      const cohort = await this.configService.createNewMeldedTemplate(this.diseaseA, this.diseaseB, data.cohortAcronym);
      this.pendingCohort = cohort;
      this.thisCohortType = "melded";
    } else if (ctype == "digenic") {
      this.notificationService.showError("digenic not implemented");
    } else {
      this.notificationService.showError(`Did not recognize cohort type: "${ctype}"`);
    }
  } 

  resetCohort(): void {
    this.mendelianTemplate = false;
    this.meldedTemplate = false;
    this.digenicTemplate = false;
    this.cohortService.clearCohortData();
  }

  onConfirm(): void {
    const cohort = this.pendingCohort;
    if (! cohort) {
      this.notificationService.showError("CohortData not initialized");
      return;
    }
    this.cohortService.setCohortData(cohort);
    this.showSuccessMessage = true;
  }

}
