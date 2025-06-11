import { Component, NgZone, ViewChild } from '@angular/core';
import { ConfigService } from '../services/config.service';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { FooterComponent } from '../footer/footer.component';
import { CommonModule, NgIf } from '@angular/common';
import { defaultStatusDto, StatusDto } from '../models/status_dto';
import { BackendStatusService } from '../services/backend_status_service'
import { Subscription } from 'rxjs';
import { PageService } from '../services/page.service';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, NgIf],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

  constructor(
    private ngZone: NgZone, 
    private configService: ConfigService,
    private backendStatusService: BackendStatusService,
    private pageService: PageService) {}

  @ViewChild(FooterComponent) footer_component!: FooterComponent;
  private unlisten: UnlistenFn | null = null;

  status: StatusDto = defaultStatusDto();
  statusSubscription?: Subscription;
 
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

  ngAfterViewInit() {
    if (this.pendingHpoVersion && this.footer_component) {
      this.footer_component.setHpoVersion(this.pendingHpoVersion);
      this.pendingHpoVersion = null;
    }
    if (this.pendingHpoNterms && this.footer_component) {
      this.footer_component.setHpoVersion(this.pendingHpoNterms);
      this.pendingHpoNterms = null;
    }
  }

  async ngOnInit() {
    console.log("ngOnInit - TOP");
    this.unlisten = await listen('backend_status', (event) => {
      this.ngZone.run(() => {
        const status = event.payload as StatusDto;
        this.backendStatusService.setStatus(status);
        this.status = event.payload as StatusDto;
        this.update_gui_variables(status);
      });
    });
    //  this will restore the status upon navigation:
    this.statusSubscription = this.backendStatusService.status$.subscribe(status => {
    if (status) {
        this.update_gui_variables(status);
      }
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
  }

  async update_gui_variables(status: StatusDto) {

    this.ngZone.run(() => {
      let n_hpo = status.nHpoTerms ?? 0;
      let n_hpo_str = String(n_hpo);
      if (this.footer_component) {
        this.footer_component.setHpoNTerms(n_hpo_str);
      } else {
        this.pendingHpoNterms = String(status.nHpoTerms);
      }
      console.log("in update_gui, status = ", status);
      console.log("status.hpoLoaded =", status.hpoLoaded, typeof status.hpoLoaded);
      if (status.hpoLoaded) {
        console.log("status.hpoLoaded true ");
        this.hpoMessage = status.hpoVersion;
        console.log("hpo_version =", status.hpoVersion);
      } else {
        this.hpoMessage = "uninitialized";
      }
      console.log("loaded HPO: hpoMessage=", this.hpoMessage);
      console.log("loaded HPO: Bottom=", this.hpoMessage);
      if (status.ptTemplatePath) {
        console.log("ptTemplatePath =", status.ptTemplatePath);
        this.ptTemplateLoaded = true; 
        this.templateFileMessage = status.ptTemplatePath;
      } else {
        console.log("ptTemplatePath = NIPE");
        this.ptTemplateLoaded = false;
        this.templateFileMessage = "not initialized";
      }
    });
  }
  
  ngOnDestroy() {
    if (this.unlisten) {
      this.unlisten();
      this.unlisten = null;
    }
    this.statusSubscription?.unsubscribe();
  }

    

  async loadHpo() {
    console.log("loading HPO");
    try {
      await this.configService.loadHPO();
    } catch (error) {
      console.error("Failed to call load_hpo:", error);
      this.hpoMessage = "Error calling load_hpo";
    }  finally {
      console.log("done loading HPO");
    }
  }

  // select an Excel file with a cohort of phenopackets
  async chooseExistingTemplateFile() {
    this.errorMessage = null;
    try {
      await this.configService.loadPtTemplate();
    } catch (error: any) {
      this.errorMessage = error?.message || 'An unexpected error occurred';
      console.error('Template load failed:', error);
    }
  }



  async chooseNewPhetoolsFile() {
    console.log("chooseNewPhetoolsFile - not implemented");
    this.configService.loadPtTemplate();
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
