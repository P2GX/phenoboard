import { Component, computed, inject, NgZone, OnDestroy, OnInit, signal, Signal } from '@angular/core';
import { ConfigService } from '../services/config.service';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { CommonModule } from '@angular/common';
import { StatusDto } from '../models/status_dto';
import { BackendStatusService } from '../services/backend_status_service'
import { CohortDtoService } from '../services/cohort_dto_service';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { OrcidDialogComponent } from './orcid-dialog.component';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FormsModule } from '@angular/forms';
import {MatCheckboxModule } from '@angular/material/checkbox'
import { NotificationService } from '../services/notification.service';
import { AgeInputService } from '../services/age_service';
import { PmidService } from '../services/pmid_service';
import { HelpButtonComponent } from "../util/helpbutton/help-button.component";
import { MatIcon } from "@angular/material/icon";
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatProgressBarModule, FormsModule, MatCheckboxModule, HelpButtonComponent, MatIcon, MatProgressSpinnerModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {

  cohortService= inject(CohortDtoService);
  private configService = inject(ConfigService);
  private backendStatusService = inject(BackendStatusService);
  private ageService = inject(AgeInputService);
  private pmidService = inject(PmidService);
  private router= inject(Router);
  private dialog = inject(MatDialog);
  private notificationService = inject(NotificationService);
  private ngZone = inject(NgZone);
  status: Signal<StatusDto> = this.backendStatusService.status;
  private cancelMessage = signal<string | null>(null);
  private unlisten: UnlistenFn | null = null;


  hpoMessage = computed(() => {
    const s = this.status();
    const cancel = this.cancelMessage();
    if (s.hpoLoaded) {
      return `${s.hpoVersion} (${s.nHpoTerms})` || "Loaded";
    }
    if (this.hpoLoading()) return "Loading hp.json ...";
    if (cancel) return cancel;
    return "uninitialized";
  });
  hpoLoading = signal<boolean>(false);
  hpoLoaded = signal<boolean>(false);
  templateFileMessage = computed(()=> {
    const path = this.status().ptTemplatePath;
    return path ? path : this.NOT_INIT;
  });
  NOT_INIT = "not initialized";
  jsonTemplateFileMessage = signal(this.NOT_INIT);

  ptTemplateLoaded = computed(() => !!this.status().ptTemplatePath);
  
  // Updated by checkbox in front end, should we update outdated HPO loabels upon import of Excel legacy files?
  updateLabels = false;
  
  newTemplateMessage = this.NOT_INIT;
  biocuratorOrcid = signal<string | null>(this.NOT_INIT);


  progressValue = 0;
  isRunning = false;


   async ngOnInit(): Promise<void> {
    await this.updateOrcid();
    const currentOrcid = this.biocuratorOrcid();
    this.biocuratorOrcid.set(currentOrcid || "not initialized");
    this.unlisten = await listen("hpo-load-event", (event) =>{
      const { status, message, data } = event.payload as {status: string, message?: string, data?: StatusDto};
      this.ngZone.run(() => {
        switch(status) {
          case 'loading':
            this.hpoLoading.set(true);
            this.hpoLoaded.set(false);
            break;
          case 'success':
            this.hpoLoading.set(false);
            this.hpoLoaded.set(true);
            if (data) this.backendStatusService.setStatus(data);
            this.configService.resetPtTemplate();
            break;
          case 'error':
            this.hpoLoading.set(false);
            this.hpoLoaded.set(false);
            this.notificationService.showError(message || ' Unknown error');
            break;
          case 'cancel':
            this.hpoLoading.set(false);
            this.hpoLoaded.set(false);
        }
      });
    });
    this.configService.emitStatusFromBackend();
  }

    

  async loadHpo(): Promise<void> {
    try {
      this.hpoLoaded.set(false);
      this.hpoLoading.set(true);
      await this.configService.loadHPO();
    } catch (error: unknown) {
      this.notificationService.showError(
        `Failed to load HPO: ${error instanceof Error ? error.message : error}`
      );
    } 
  }

  // select an Excel file with a cohort of phenopackets
  async chooseExistingTemplateFile(): Promise<void> {
    try {
      this.isRunning = true;
      const data = await this.configService.loadPtExcelTemplate(this.updateLabels);
      this.isRunning = false;
      if (data == null) {
        const errorMessage = "Could not retrieve template (null error)"
        this.notificationService.showError(errorMessage);
        return;
      }
      this.clearData();
      this.resetBackend();  
      this.cohortService.setCohortData(data);
      this.router.navigate(['/pttemplate']);
      } catch (error: unknown) {
        const errorMessage = String(error);
        this.notificationService.showError(errorMessage);
      }
    }


  /* After loading HPO, we may create a new template (new cohort) */
  async createNewPhetoolsTemplate(): Promise<void> {
    this.cohortService.clearCohortData();
    this.resetBackend();
    await this.configService.resetPtTemplate();
    await this.router.navigate(['/newtemplate']);
  }


  async setBiocuratorOrcid(): Promise<void>{
    const currentOrcid = this.biocuratorOrcid();
    const dialogRef = this.dialog.open(OrcidDialogComponent, {
      width: '500px',
      data: { 
        currentOrcid: currentOrcid
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;

      this.ngZone.run(async () => {
        await this.configService.saveCurrentOrcid(result);
        await this.updateOrcid();
      });
    });
  }

  private async updateOrcid(): Promise<void> {
    try {
      const orcid = await this.configService.getCurrentOrcid();
      this.ngZone.run(() => {
        this.biocuratorOrcid.set(orcid);
      });

    } catch (error: unknown) {
      this.ngZone.run(() => {
        const errMessage =
          'No ORCID found. Use the "Set biocurator ORCID" button to specify your research ID.';
        this.notificationService.showError(errMessage);
        this.biocuratorOrcid.set(null);
      });
    }
  }



  async chooseJsonTemplateFile(): Promise<void> {
  
    try {
      this.isRunning = true;
      const data = await this.configService.loadPtJson();
       this.isRunning = false;
      if (data == null) {
        const errorMessage = "Could not retrieve JSON template (null error)"
        this.notificationService.showError(errorMessage);
        return;
      }
      this.clearData();
      this.resetBackend();
      this.cohortService.setCohortData(data);
      this.router.navigate(['/pttemplate']);
      } catch (error: unknown) {
        const errorMessage = String(error);
         this.notificationService.showError(errorMessage);
      }
  }

  openExternalTemplate(): void {
    this.clearData();
    this.resetBackend();
    this.router.navigate(['/tableeditor']);
  }

  /** Clear existing datasets, e.g., when we move to a new template */
  clearData(): void {
    this.backendStatusService.clearStatus();
    this.hpoLoading.set(false);
    this.cohortService.clearCohortData();
    this.pmidService.clearAllPmids();
    this.newTemplateMessage = this.NOT_INIT;
    this.jsonTemplateFileMessage.set(this.NOT_INIT);
  }

  resetBackend(): void {
    this.configService.resetPtTemplate();
    this.ageService.clearSelectedTerms();
  }

}
