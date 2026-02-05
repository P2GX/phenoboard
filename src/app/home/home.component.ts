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

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatProgressBarModule, FormsModule, MatCheckboxModule, HelpButtonComponent, MatIcon],
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
    if (this.hpoLoading()) return "loading";
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
  

  updateLabels = false;
  
  newTemplateMessage = this.NOT_INIT;
  
  biocuratorOrcid = signal<string | null>(this.NOT_INIT);
  pendingHpoVersion: string | null = null;
  pendingHpoNterms: string | null = null;

  progressValue = 0;
  isRunning = false;


   async ngOnInit(): Promise<void> {
    await this.updateOrcid();
    const currentOrcid = this.biocuratorOrcid();
    this.biocuratorOrcid.set(currentOrcid || "not initialized");
    this.unlisten = await listen('backend_status', (event) => {
      this.ngZone.run(() => {
        const status = event.payload as StatusDto;
        this.backendStatusService.setStatus(status);
        this.cancelMessage.set(null);
      });
    });
    await listen('failure', (event) => {
      const payload = event.payload as StatusDto;
      const errorMessage = payload.errorMessage;
      this.ngZone.run(() => {
        this.hpoLoading.set(false);
        this.hpoLoaded.set(false);
        this.notificationService.showError(errorMessage);
        if (errorMessage.toLocaleLowerCase().includes("cancel")) {
          this.cancelMessage.set("User cancelled file selection");
        } 
      });
      
    });
    await listen('hpoLoading', () => {
      this.ngZone.run(() => {
        this.cancelMessage.set(null);
         this.hpoLoading.set(true);
      });
    });
    await listen<{ current: number; total: number }>('progress', (event) => {
      const { current, total } = event.payload;
      this.ngZone.run(() => {
        this.progressValue = Math.round((current / total) * 100);
      });
      
    });
    
    this.configService.emitStatusFromBackend();
  }

    

  async loadHpo(): Promise<void> {
    try {
      this.hpoLoading.set(true);
      await this.configService.loadHPO();
      this.hpoLoaded.set(true);
      await this.configService.resetPtTemplate();
      this.clearData();
      this.resetBackend();
    } catch (error: unknown) {
      this.notificationService.showError(
        `Failed to load HPO: ${error instanceof Error ? error.message : error}`
      );
      this.hpoLoading.set(false);
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
