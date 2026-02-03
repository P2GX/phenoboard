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

  digenicTemplate = false;
  meldedTemplate = false;
  mendelianTemplate = false;

  diseaseA = signal<CohortEntry | null>(null);
  diseaseB = signal<CohortEntry | null>(null);
  diseaseDataA = computed<DiseaseData | null>(() => {
    const d = this.diseaseA();
    if (!d) return null;
    else return toDiseaseData(d);
  });
  diseaseDataB = computed<DiseaseData | null>(() => {
    const d = this.diseaseB();
    if (!d) return null;
    else return toDiseaseData(d);
  });
  thisCohortType = signal<CohortType | null>(null);
  pendingCohort = signal<CohortData | null>(null);
  showSuccessMessage = signal<boolean>(false);





 async melded(): Promise<void> {
  this.mendelianTemplate = false;
  this.meldedTemplate = true;
  this.digenicTemplate = false;
  this.resetCohort();
    const first = this.dialog.open(CohortDialogComponent, {
      width: '450px',
      height: '550px',
      data: { title: 'Enter Disease A Info' }
    });
    if (!first) return;
    const rawValueA = await firstValueFrom(first.afterClosed());
    if (rawValueA) {
        const entryA: CohortEntry = {
          ...rawValueA,
          geneTranscriptList: [] // Ensure the optional list is initialized if needed
        };
        this.diseaseA.set(entryA);
      } else {
        this.notificationService.showError("Could not retrieve disease A");
        return;
      }

    const second = await this.dialog.open(CohortDialogComponent, {
      width: '450px',
      height: '550px',
      data: { title: 'Enter Disease B Info' }
    });
    if (!second) return;
    const rawValueB = await firstValueFrom(second.afterClosed());
    if (rawValueB) {
      const entryB: CohortEntry = {
        ...rawValueB,
        geneTranscriptList: []
      };
      this.diseaseB.set(entryB);
    } else {
        this.notificationService.showError("Could not retrieve disease B");
        return;
      }
    this.createMeldedTemplate();
  }

  async digenic(): Promise<void> {
    this.mendelianTemplate = false;
    this.meldedTemplate = false;
    this.digenicTemplate = true;
    const dialogRef = this.dialog.open(CohortDialogComponent, {
      width: '450px',
      height: '550px',
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
      height: '650px',
      data: { title: 'Create Mendelian Cohort', mode: 'mendelian' }
    });
    const rawValue = await firstValueFrom(dialogRef.afterClosed());
    if (!rawValue) {
      this.notificationService.showError("Could not get data for Mendelian cohort");
      return;
    }
    if (rawValue) {
        const entryA: CohortEntry = {
          ...rawValue,
          geneTranscriptList: [] // Ensure the optional list is initialized if needed
        };
        this.diseaseA.set(entryA);
      } else {
        this.notificationService.showError("Could not retrieve disease A");
        return;
      }

    this.createMendelianTemplate();
}

  private async createMeldedTemplate(): Promise<void> {
    const diseaseA = this.diseaseA();
    const diseaseB = this.diseaseB();
    if (!diseaseA) {
      this.notificationService.showError("Could not retrieve disease A data for melded template");
      return;
    }
    if (!diseaseB) {
      this.notificationService.showError("Could not retrieve disease B data for melded template");
      return;
    }
    
      const acronymA = diseaseA.cohortAcronym;
      const acronymB = diseaseB.cohortAcronym;
      const geneA = diseaseA.symbol;
      const geneB = diseaseB.symbol;
      const acronym = `${geneA}-${acronymA}-${geneB}-${acronymB}`;
      const cohort = await this.configService.createNewMeldedTemplate(toDiseaseData(diseaseA), toDiseaseData(diseaseB), acronym);
       this.resetCohort();
      this.pendingCohort.set(cohort);
      this.thisCohortType.set("melded");
  }

private async createMendelianTemplate(): Promise<void> {
  this.etl_service.clearEtlDto();
  const diseaseA = this.diseaseA();
  if (! diseaseA) {
    this.notificationService.showError("Could not retrieve disease for Mendelian");
    return;
  }
  const acronym = diseaseA.cohortAcronym;
  const gene = diseaseA.symbol;
  const fullAcronym = `${gene}-${acronym}`;
  const ctype: CohortType = "mendelian";
  const template = await this.configService.createNewTemplate(
    toDiseaseData(diseaseA),
    ctype,
    fullAcronym
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
    label: 'Melded (Dual)', 
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
