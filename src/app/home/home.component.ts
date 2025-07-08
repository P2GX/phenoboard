import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ConfigService } from '../services/config.service';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { FooterComponent } from '../footer/footer.component';
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

  @ViewChild(FooterComponent) footer_component!: FooterComponent;
  private unlisten: UnlistenFn | null = null;
  statusSubscription?: Subscription;
  status: StatusDto = this.backendStatusService.getStatus();

  ptTemplateLoaded: boolean = false;
  newFileCreated: boolean = false;
  hasError: boolean = false;
  hpoMessage: string = "not initialized";

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
      this.hasError = true;
      this.errorMessage = String(event.payload);
    });
    await listen('hpoLoading', (event) => {
      this.hasError = false;
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
    const status = this.backendStatusService.getStatus();
    this.ngZone.run(() => {
      let n_hpo = status.nHpoTerms ?? 0;
      let n_hpo_str = String(n_hpo);
      if (this.footer_component) {
        this.footer_component.setHpoNTerms(n_hpo_str);
      } else {
        this.pendingHpoNterms = String(status.nHpoTerms);
      }
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
      await this.configService.loadHPO();
    } catch (error) {
      console.error("Failed to call load_hpo:", error);
      this.hpoMessage = "Error calling load_hpo";
    } 
  }

  // select an Excel file with a cohort of phenopackets
  async chooseExistingTemplateFile() {
    this.errorMessage = null;
    console.log("chooseExistingTemplateFile TOP");
    try {
        console.log("chooseExistingTemplateFile TRY TOP");
      //await this.configService.loadPtExcelTemplate();
        //console.log("chooseExistingTemplateFile after loadPtTempalte");
      const data = await this.configService.loadPtExcelTemplate();
      if (data == null) {
        console.error("Could not retrieve template, data=null TODO create error message");
        return;
      }
      console.log("chooseExistingTemplateFile data=", data);
      
      this.templateService.setTemplate(data);
      console.log("chooseExistingTemplateFile After set template=");
      const newTemplate = JSON.parse(JSON.stringify(data));
      console.log("chooseExistingTemplateFile newTemplate=", newTemplate);
      
      this.templateService.setTemplate(newTemplate);
    } catch (error: any) {
      this.errorMessage = error?.message || 'An unexpected error occurred';
      console.error('Template load failed:', error);
    }
  }



  async chooseNewPhetoolsFile() {
    console.log("chooseNewPhetoolsFile - not implemented");
    this.configService.loadPtExcelTemplate();
  /*  const path = await save({
      title: "Save new PheTools template file",
      defaultPath: "phetools-individuals.xlsx",
      filters: [
        { name: "Excel Files", extensions: ["xlsx"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });
  
    if (!path) {
      console.log("Template save canceled");
      return;
    }
    try {
  
      console.log("Saving file at:", path);
      await this.configService.loadExistingPhetoolsTemplate(path);
      this.newFilePath = path;
      this.newFileCreated = true;
    } catch(error) {
      this.newFilePath = "";
      this.newFileCreated = false;
      console.error("Could not create new file: ", error);
    } finally {
      this.isLoading = false;
      await this.configService.checkReadiness();
    }
    //await invoke("create_new_file", { path });  // Send path to Rust*/
  }

  /* switch to the addcase page */
  goToAddCase() {
    this.pageService.setPage("addcase");
  }

  

}
