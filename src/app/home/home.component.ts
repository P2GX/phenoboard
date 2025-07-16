import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ConfigService } from '../services/config.service';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { CommonModule, NgIf } from '@angular/common';
import { StatusDto } from '../models/status_dto';
import { BackendStatusService } from '../services/backend_status_service'
import { Subscription } from 'rxjs';
import { PageService } from '../services/page.service';
import { TemplateDtoService } from '../services/template_dto_service';
import { TemplateBaseComponent } from '../templatebase/templatebase.component';
import { TemplateDto } from '../models/template_dto';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, NgIf],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent extends TemplateBaseComponent implements OnInit, OnDestroy {

  constructor(
    ngZone: NgZone, 
    private configService: ConfigService,
    private backendStatusService: BackendStatusService,
    override templateService: TemplateDtoService,
    private pageService: PageService,
    override cdRef: ChangeDetectorRef) {
      super(templateService, ngZone, cdRef);
    }

  private unlisten: UnlistenFn | null = null;
  statusSubscription?: Subscription;
  status: StatusDto = this.backendStatusService.getStatus();

  ptTemplateLoaded: boolean = false;
  newFileCreated: boolean = false;
  hpoMessage: string | null = null;

  newFilePath: any;
  loadError: any;
  newTemplateMessage: string = "not initialized";
  templateFileMessage: string = "not initialized";
  pendingHpoVersion: string | null = null;
  pendingHpoNterms: string | null = null;

  errorMessage: string | null = null;



  override async ngOnInit() {
    console.log("HomeComponent ngInit");
    super.ngOnInit();

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
    this.statusSubscription = this.backendStatusService.status$.subscribe(
      status => this.status = status
    );
    this.update_gui_variables();
  }

  ngAfterViewInit() {
    this.configService.emitStatusFromBackend();
  }

  protected override onTemplateLoaded(template: TemplateDto): void {
    console.log("✅ Template loaded into HomeComponent:", template);
    this.cdRef.detectChanges();
  }

  protected override onTemplateMissing(): void {
    console.warn("⚠️ Template is missing in HomeComponent");
    // Optionally fetch it again or show an error
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
    console.log("HomeComponent - ngOnDestroy");
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
    } catch (error) {
      console.error("Failed to call load_hpo:", error);
      this.hpoMessage = "Error calling load_hpo";
    } 
  }

  // select an Excel file with a cohort of phenopackets
  async chooseExistingTemplateFile() {
    this.errorMessage = null;
    try {
      console.log("chooseExistingTemplateFile TRY TOP");
      const data = await this.configService.loadPtExcelTemplate();
      if (data == null) {
        this.errorMessage = "Could not retrieve template (null error)"
        return;
      }
      console.log("chooseExistingTemplateFile data=", data);
      
      this.templateService.setTemplate(data);
      console.log("chooseExistingTemplateFile After set template=");
      /*const newTemplate = JSON.parse(JSON.stringify(data));
      console.log("chooseExistingTemplateFile newTemplate=", newTemplate);
      
      this.templateService.setTemplate(newTemplate);*/
    } catch (error: any) {
      this.errorMessage = String(error);
      console.error('Template load failed:', error);
    }
  }



  async createNewPhetoolsTemplate() {
     alert("Function called!");
    console.error("TODO REFACTOR");

  }

  

}
