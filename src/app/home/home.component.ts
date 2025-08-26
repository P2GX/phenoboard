import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ConfigService } from '../services/config.service';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { CommonModule } from '@angular/common';
import { StatusDto } from '../models/status_dto';
import { BackendStatusService } from '../services/backend_status_service'
import { Subscription } from 'rxjs';
import { CohortDtoService } from '../services/cohort_dto_service';
import { TemplateBaseComponent } from '../templatebase/templatebase.component';
import { CohortData } from '../models/cohort_dto';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { OrcidDialogComponent } from './orcid-dialog.component';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FormsModule } from '@angular/forms';
import {MatCheckboxModule } from '@angular/material/checkbox'
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatProgressBarModule, FormsModule, MatCheckboxModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent extends TemplateBaseComponent implements OnInit, OnDestroy {

  constructor(
    ngZone: NgZone, 
    private configService: ConfigService,
    private backendStatusService: BackendStatusService,
    override cohortService: CohortDtoService,
    private router: Router,
    private dialog: MatDialog,
    override cdRef: ChangeDetectorRef,
    private notificationService: NotificationService) {
      super(cohortService, ngZone, cdRef);
    }

  private unlisten: UnlistenFn | null = null;
  statusSubscription?: Subscription;
  status: StatusDto = this.backendStatusService.getStatus();

  ptTemplateLoaded: boolean = false;
  newFileCreated: boolean = false;
  hpoMessage: string | null = null;
  updateLabels = false;

  newFilePath: any;
  loadError: any;
  newTemplateMessage: string = "not initialized";
  templateFileMessage: string = "not initialized";
  jsonTemplateFileMessage: string = "not initialized";
  biocuratorOrcid: string | null = "not initialized";
  pendingHpoVersion: string | null = null;
  pendingHpoNterms: string | null = null;

  errorMessage: string | null = null;
  progressValue = 0;
  isRunning = false;


  override async ngOnInit() {
    super.ngOnInit();
    const currentOrcid = await this.getCurrentOrcid();
    this.biocuratorOrcid = currentOrcid || "not initialized";
    this.unlisten = await listen('backend_status', (event) => {
      this.ngZone.run(() => {
        const status = event.payload as StatusDto;
        console.log("got backend status: ", status);
        this.backendStatusService.setStatus(status);
        this.update_gui_variables();
      });
    });
    await listen('failure', (event) => {
      this.errorMessage = String(event.payload);
    });
    await listen('hpoLoading', (event) => {
      this.hpoMessage = null;
      this.errorMessage = '';
      this.hpoMessage = "loading ...";
    });
    await listen<{ current: number; total: number }>('progress', (event) => {
      const { current, total } = event.payload;
      this.progressValue = Math.round((current / total) * 100);
    });
    this.statusSubscription = this.backendStatusService.status$.subscribe(
      status => this.status = status
    );
    this.update_gui_variables();
  }

  ngAfterViewInit() {
    this.configService.emitStatusFromBackend();
  }

  protected override onCohortDtoLoaded(template: CohortData): void {
    this.cdRef.detectChanges();
  }

  protected override onCohortDtoMissing(): void {
  }
  
  async update_gui_variables() {
    this.errorMessage = null;
    const status = this.backendStatusService.getStatus();
    this.ngZone.run(() => {
      console.log("in update_gui, status = ", status);
      if (status.hpoLoaded) {
        this.hpoMessage = status.hpoVersion;
      } else {
        this.hpoMessage = "uninitialized";
      }
      if (status.ptTemplatePath) {
        this.ptTemplateLoaded = true; 
        this.templateFileMessage = status.ptTemplatePath;
      } else {
        console.log("ptTemplatePath = not initialized");
        this.ptTemplateLoaded = false;
        this.templateFileMessage = "not initialized";
      }
    });
  }
  
  override ngOnDestroy() {
    super.ngOnDestroy();
    if (this.unlisten) {
      this.unlisten();
      this.unlisten = null;
    }
    this.statusSubscription?.unsubscribe();
  }

    

  async loadHpo() {
    try {
      this.errorMessage = null;
      await this.configService.loadHPO();
    } catch (error: any) {
      console.error("Failed to call load_hpo:", error);
      const msg = error?.message ?? String(error);
      this.notificationService.showError(`❌ Failed to load HPO:\n${msg}`);
      this.hpoMessage = "Error calling load_hpo";
    } 
  }

  // select an Excel file with a cohort of phenopackets
  async chooseExistingTemplateFile() {
    this.errorMessage = null;
    try {
      this.isRunning = true;
      const data = await this.configService.loadPtExcelTemplate(this.updateLabels);
       this.isRunning = false;
      if (data == null) {
        this.errorMessage = "Could not retrieve template (null error)"
        return;
      }
      this.cohortService.setCohortDto(data);
      this.router.navigate(['/pttemplate']);
      } catch (error: any) {
        this.errorMessage = String(error);
        console.error('Template load failed:', error);
      }
    }


  /* After loading HPO, we may create a new template (new cohort) */
  async createNewPhetoolsTemplate() {
     await this.router.navigate(['/newtemplate']);
  }


  async setBiocuratorOrcid() {
    const currentOrcid = await this.getCurrentOrcid();
    const dialogRef = this.dialog.open(OrcidDialogComponent, {
      width: '400px',
      data: { 
        currentOrcid: currentOrcid
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('ORCID entered:', result);
        this.saveOrcid(result);
      }
    });
  }

  private async getCurrentOrcid(): Promise<string | undefined> {
    try {
      return await this.configService.getCurrentOrcid();
    } catch (error) {
      console.log('No existing ORCID found:', error);
      return undefined;
    }
  }

  private saveOrcid(orcid: string): void {
    console.log('Saving ORCID:', orcid);
    this.configService.saveCurrentOrcid(orcid);

  }

  async chooseJsonTemplateFile() {
    this.errorMessage = null;
    try {
      this.isRunning = true;
      const data = await this.configService.loadPtJson();
       this.isRunning = false;
      if (data == null) {
        this.errorMessage = "Could not retrieve template (null error)"
        return;
      }
      this.cohortService.setCohortDto(data);
      this.router.navigate(['/pttemplate']);
      } catch (error: any) {
        this.errorMessage = String(error);
        console.error('Template load failed:', error);
      }
  }

}
