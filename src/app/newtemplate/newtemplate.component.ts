import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CohortDtoService } from '../services/cohort_dto_service';
import { DiseaseData, CohortData, CohortType, GeneTranscriptData } from '../models/cohort_dto';
import { RouterLink } from '@angular/router';
import { ConfigService } from '../services/config.service';
import { CohortDialogComponent, CohortDialogData, CohortDialogResult} from '../cohortdialog/cohortdialog.component';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from 'ng-hpo-uikit';
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

//export interface CohortDialogResult {
//  entries: CohortEntry[];
//}

/**
 * Component for creating a Template for a new disease. This is the first thing we need to use
 * when we are creating a Template for a new OMIM entry etc.
 */
@Component({
  selector: 'app-newtemplate',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, HelpButtonComponent, DisplayMendelianComponent, DisplayMeldedComponent, CohortDialogComponent],
  templateUrl: './newtemplate.component.html',
  styleUrl: './newtemplate.component.scss',
})
export class NewTemplateComponent  {

  private cohortService = inject(CohortDtoService);
  private configService = inject(ConfigService);
  private etl_service = inject(EtlSessionService);
  private notificationService = inject(NotificationService);
  public statusService = inject(AppStatusService);

  cohortDialogRef = viewChild.required<CohortDialogComponent>('cohortDialog');
  dialogTitle = signal('');
  dialogIsMelded = signal(false);


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

  cohortType = signal<CohortType | null>(null);
  pendingCohort = signal<CohortData | null>(null);
  showSuccessMessage = signal<boolean>(false);

  mendelian(): void {
    this.resetCohort();
    this.mendelianTemplate = true;
    this.meldedTemplate = false;
    this.digenicTemplate = false;
    this.collectedEntries = [];
    this.openCohortDialog( 'Create Mendelian Cohort', false);
  }

 melded(): void {
    this.mendelianTemplate = false;
    this.meldedTemplate = true;
    this.digenicTemplate = false;
    this.collectedEntries = [];
    this.openCohortDialog("Create Melded Cohort", true);
  }

  digenic(): void {
    alert("digenic template not currently implemented");
  }



  openCohortDialog(title: string, isMelded: boolean) {
     this.dialogTitle.set(title);
   this.dialogIsMelded.set(isMelded);  
    this.cohortDialogRef().open();
  }
  private collectedEntries: CohortEntry[] = [];

    onEntrySubmitted(entry: CohortEntry): void {
    const fullEntry: CohortEntry = { ...entry, geneTranscriptList: [] };
    this.collectedEntries.push(fullEntry);
  }

  onDialogClosed(cancelled: boolean): void {
    if (cancelled) {
      this.collectedEntries = [];
      return;
    }
    if (this.collectedEntries.length === 0) {
      this.notificationService.showError('Could not retrieve disease');
      return;
    }
    this.diseases.set(this.collectedEntries);

    if (this.collectedEntries.length > 1) {
      this.createMeldedTemplate();
    } else {
      this.createMendelianTemplate();
    }
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
    this.cohortType.set("melded");
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
  this.cohortType.set("mendelian");
}
   
  

  resetCohort(): void {
    this.mendelianTemplate = false;
    this.meldedTemplate = false;
    this.digenicTemplate = false;
    this.pendingCohort.set(null);
    this.cohortType.set(null);
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
