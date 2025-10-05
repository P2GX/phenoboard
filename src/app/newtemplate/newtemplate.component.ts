import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { noLeadingTrailingSpacesValidator, noWhitespaceValidator } from '../validators/validators';
import { CohortDtoService } from '../services/cohort_dto_service';
import { TemplateBaseComponent } from '../templatebase/templatebase.component';
import { DiseaseData, newMendelianTemplate, CohortData, CohortType } from '../models/cohort_dto';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ConfigService } from '../services/config.service';

import { DiseaseIdSanitizerDirective } from '../directives/disease-id.directive';
import { TrimDirective } from '../directives/trim.directive';
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
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RouterLinkActive, DiseaseIdSanitizerDirective, TrimDirective],
  templateUrl: './newtemplate.component.html',
  styleUrls: ['./newtemplate.component.scss'],
})
export class NewTemplateComponent extends TemplateBaseComponent implements OnInit, OnDestroy  {


  constructor(
    private configService: ConfigService,
    private notificationService: NotificationService,
    ngZone: NgZone, 
    templateService: CohortDtoService,
    private dialog: MatDialog,
    cdRef: ChangeDetectorRef) {
      super(templateService, ngZone, cdRef);
  }

  /* after the user submits data, we hide everything else and display a message */
  showSuccessMessage = false;

  digenicTemplate = false;
  meldedTemplate = false;
  mendelianTemplate = false;

  diseaseA: DiseaseData | null = null;
  diseaseB: DiseaseData | null = null;
  thisCohortType: CohortType | null = null;
  jsonData: string = '';
  errorMessage: string | null = null;

  pendingCohort: CohortData | null = null;

  override ngOnInit(): void {
    super.ngOnInit();
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
  }
  
  protected override onCohortDtoLoaded(template: CohortData): void {
    console.log("✅ Template loaded into HomeComponent:", template);
    this.cdRef.detectChanges();
  }
  
    protected override onCohortDtoMissing(): void {
      // When we open the page, the template will still be missing
    }




 



 async melded() {
  this.mendelianTemplate = false;
  this.meldedTemplate = true;
  this.digenicTemplate = false;
  this.resetCohort();
    const first = await this.dialog.open(CohortDialogComponent, {
      width: '450px',
      height: '550px',
      data: { title: 'Enter Disease A Info', mode: 'melded' }
    });
    if (!first) return;
    const first_disease = await firstValueFrom(first.afterClosed());
    const second = await this.dialog.open(CohortDialogComponent, {
      width: '450px',
      height: '550px',
      data: { title: 'Enter Disease B Info', mode: 'melded' }
    });
    if (!second) return;
    const second_disease = await firstValueFrom(first.afterClosed());
    this.createTemplate({ diseaseA: first_disease, diseaseB: second_disease }, 'melded');
  }

  async digenic() {
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


async mendelian() {
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

private async createTemplate(data: any, ctype: CohortType) {
  if (ctype == "mendelian") {  
    try {
        const diseaseData: DiseaseData = newMendelianTemplate(
          data.diseaseId, data.diseaseName, data.hgnc1, data.symbol1, data.transcript1
        );
        this.diseaseA = diseaseData;
        const template = await this.configService.createNewTemplate(
          diseaseData,
          ctype,
        );
        this.pendingCohort = template;
        this.thisCohortType = "mendelian";
      } catch (error) {
        this.errorMessage = String(error);
      }
    } else if (ctype =="melded") {
      this.notificationService.showError("melded not implemented");
    } else if (ctype == "digenic") {
      this.notificationService.showError("digenic not implemented");
    } else {
      this.notificationService.showError(`Did not recognize cohort type: "${ctype}"`);
    }
  } 

  resetCohort() {
    this.mendelianTemplate = false;
    this.meldedTemplate = false;
    this.digenicTemplate = false;
    this.cohortService.clearCohortData();
  }

  onConfirm() {
    const cohort = this.pendingCohort;
    if (! cohort) {
      this.notificationService.showError("CohortData not initialized");
      return;
    }
    this.cohortService.setCohortData(cohort);
    this.showSuccessMessage = true;
  }

}
