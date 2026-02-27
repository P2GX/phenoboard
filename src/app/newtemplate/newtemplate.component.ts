import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CohortDtoService } from '../services/cohort_dto_service';
import { DiseaseData, CohortData, CohortType, GeneTranscriptData } from '../models/cohort_dto';
import { RouterLink } from '@angular/router';
import { ConfigService } from '../services/config.service';
import { CohortDialogComponent } from '../cohortdialog/cohortdialog.component';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { EtlSessionService } from '../services/etl_session_service';
import { HelpButtonComponent } from "../util/helpbutton/help-button.component";
import { DisplayMendelianComponent } from "./display-mendelian.component";
import { DisplayMeldedComponent } from "./display-melded.component";
import { AppStatusService } from '../services/app_status_service';


export interface CohortEntry {
  diseaseId: string;
  diseaseLabel: string;
  cohortAcronym: string;
  hgnc: string;
  symbol: string;
  transcript: string;
  // Used for Oligogenic/Digenic additional genes
  geneTranscriptList?: GeneTranscriptData[]; 
}

export function toDiseaseData(entry: CohortEntry): DiseaseData {
  const gtd: GeneTranscriptData = {
    hgncId: entry.hgnc,
    geneSymbol: entry.symbol,
    transcript: entry.transcript
  };
  return {
    diseaseId: entry.diseaseId,
    diseaseLabel: entry.diseaseLabel,
    modeOfInheritanceList: [],
    geneTranscriptList: [gtd]
  };
}

export interface CohortDialogResult {
  entries: CohortEntry[];
}

/**
 * Component for creating a Template for a new disease. This is the first thing we need to use
 * when we are creating a Template for a new OMIM entry etc.
 */
@Component({
  selector: 'app-newtemplate',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, HelpButtonComponent, DisplayMendelianComponent, DisplayMeldedComponent],
  templateUrl: './newtemplate.component.html',
  styleUrls: ['./newtemplate.component.scss'],
})
export class NewTemplateComponent  {

  private cohortService = inject(CohortDtoService);
  private configService = inject(ConfigService);
  private etl_service = inject(EtlSessionService);
  private notificationService = inject(NotificationService);
  private dialog= inject(MatDialog);
  public statusService = inject(AppStatusService);

  digenicTemplate = false;
  meldedTemplate = false;
  mendelianTemplate = false;

  diseases = signal<CohortEntry[]>([]);
  diseasesData = computed<DiseaseData[]>(() => 
    this.diseases().map(d => toDiseaseData(d))
  );
  mendelianDisease = computed<DiseaseData | null>(() => {
    const list = this.diseasesData(); 
    return list.length > 0 ? list[0] : null;
  });
  cohortAcronym = computed(() => {
    const currentDiseases = this.diseases();
    if (currentDiseases.length === 0) return '';
    
    return currentDiseases
      .map(d => `${d.symbol}_${d.cohortAcronym}`)
      .join("_");
  });

  thisCohortType = signal<CohortType | null>(null);
  pendingCohort = signal<CohortData | null>(null);
  showSuccessMessage = signal<boolean>(false);


 async melded(): Promise<void> {
    this.resetCohort();
    this.mendelianTemplate = false;
    this.meldedTemplate = true;
    this.digenicTemplate = false;
    const tempDiseases: CohortEntry[] = [];
    let shouldContinue = true;
    while (shouldContinue) {
      const dialogRef = this.dialog.open(CohortDialogComponent, {
        width: '450px',
        height: '700px',
        data: {
          title: `Enter disease #${tempDiseases.length + 1} Info`,
          isMelded: true
        }
      });
      const result = await firstValueFrom(dialogRef.afterClosed());
      if (! result) {
        shouldContinue = false;
        if (tempDiseases.length < 2) this.resetCohort();
      }
      if (result) {
        tempDiseases.push({ ...result.entry, geneTranscriptList: []});
        shouldContinue = result.keepGoing;
      }
    }
    if (tempDiseases.length >= 2) {
      this.diseases.set(tempDiseases);
      this.createMeldedTemplate();
    } else {
      this.notificationService.showError("Could not get >=2 diseases for melded cohort");
      this.resetCohort();
    }
  }

  async digenic(): Promise<void> {
    this.mendelianTemplate = false;
    this.meldedTemplate = false;
    this.digenicTemplate = true;
    const dialogRef = this.dialog.open(CohortDialogComponent, {
      width: '450px',
      height: '700px',
      data: { title: 'Create Digenic Cohort', mode: 'digenic' }
    });
    const result = await firstValueFrom(dialogRef.afterClosed());
    if (!result) return;

    alert("digenic template not currently implemented")
  }


async mendelian(): Promise<void> {
  this.mendelianTemplate = true;
  this.meldedTemplate = false;
  this.digenicTemplate = false;
  
  const dialogRef = this.dialog.open(CohortDialogComponent, {
      width: '450px',
      height: '700px',
      data: { title: 'Create Mendelian Cohort', mode: 'mendelian' }
    });
    const rawValue = await firstValueFrom(dialogRef.afterClosed());
    if (!rawValue) {
      this.notificationService.showError("Could not get data for Mendelian cohort");
      return;
    }
    if (rawValue) {
        const entryA: CohortEntry = {
          ...rawValue.entry,
          geneTranscriptList: []
        };
        this.diseases.set([entryA]);
      } else {
        this.notificationService.showError("Could not retrieve disease");
        return;
      }

    this.createMendelianTemplate();
}

  private async createMeldedTemplate(): Promise<void> {
    const currentDiseases = this.diseases();
    if (currentDiseases.length < 2) {
      this.notificationService.showError(`Only ${currentDiseases.length} diseases but need at least 2 for melded cohort`);
      return;
    }

  
    const cohort = await this.configService.createNewMeldedTemplate(this.diseasesData(), this.cohortAcronym());
      this.resetCohort();
    this.pendingCohort.set(cohort);
    this.thisCohortType.set("melded");
  }

private async createMendelianTemplate(): Promise<void> {
  this.etl_service.clearEtlDto();
  const diseases = this.diseases();
  if (diseases.length != 1) {
    this.notificationService.showError(`Expected to get one disease for Mendelian cohort, but got ${diseases.length}`);
    return;
  }
  const disease = diseases[0];
  const ctype: CohortType = "mendelian";
  const template = await this.configService.createNewTemplate(
    toDiseaseData(disease),
    ctype,
    this.cohortAcronym()
  );
  this.resetCohort();
  this.pendingCohort.set(template);
  this.thisCohortType.set("mendelian");
}
   
  

  resetCohort(): void {
    this.mendelianTemplate = false;
    this.meldedTemplate = false;
    this.digenicTemplate = false;
    this.pendingCohort.set(null);
    this.thisCohortType.set(null);
    this.cohortService.clearCohortData();
    this.showSuccessMessage.set(false);
  }

  onConfirm(): void {
    const cohort = this.pendingCohort();
    if (! cohort) {
      this.notificationService.showError("CohortData not initialized");
      return;
    }
    this.cohortService.setCohortData(cohort);
    this.showSuccessMessage.set(true);
  }
  /* helper for displaying info in the termplate */
readonly cohortModes = [
  { 
    id: 'mendelian', 
    label: 'Mendelian', 
    action: () => this.mendelian(),
    disabled: false,
    helpTitle: 'Mendelian Template',
    helpLines: ['A Mendelian disorder is caused by mutations in a single gene.']
  },
  { 
    id: 'melded', 
    label: 'Melded (Multiple Genetic Diagnosis)', 
    action: () => this.melded(),
    disabled: false,
    helpTitle: 'Melded Diagnosis',
    helpLines: ['A clinical presentation resulting from two or more independent genetic diagnoses.']
  },
  { 
    id: 'digenic', 
    label: 'Digenic', 
    action: () => this.digenic(),
    disabled: true,
    helpTitle: 'Digenic Inheritance',
    helpLines: ['Support for digenic disease curation has not yet been implemented.']
  }
];
}
