import { Component, NgZone, ViewChild } from '@angular/core';
import { ConfigService } from '../services/config.service';
import { listen } from '@tauri-apps/api/event';
import { FooterComponent } from '../footer/footer.component';
import { CommonModule, NgIf } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, NgIf],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {


  constructor(private ngZone: NgZone, private configService: ConfigService) {}
  @ViewChild(FooterComponent) footer_component!: FooterComponent;

  hpoLoaded: boolean = false;
  templateLoaded: boolean = false;
  newFileCreated: boolean = false;
  nHpoTerms: string = '';
  hpoVersion: string = '';
  hpoMessage: string = "not initialized";
  successfullyLoaded: any;
  templateFilePath: any;
  newFilePath: any;
  loadError: any;
  newTemplateMessage: string = "not initialized";
  templateFileMessage: string = "not initialized";
  pendingHpoVersion: string | null = null;
  pendingHpoNterms: string | null = null;

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
    listen('n_hpo_terms', (event) => {
      this.ngZone.run(() => {
        this.nHpoTerms = String(event.payload);
        if (this.footer_component) {
          this.footer_component.setHpoNTerms(this.nHpoTerms);
        } else {
          this.pendingHpoNterms = this.nHpoTerms;
        }
        
      });
    });
    listen('hpo_version', (event) => {
      this.ngZone.run(() => {
        this.hpoVersion = String(event.payload);
        console.log("hpo_version =", this.hpoVersion);
        this.hpoMessage = this.hpoVersion;
        console.log("loaded HPO: hpoMessage=", this.hpoMessage);
        if (this.footer_component) {
          this.footer_component.setHpoVersion(this.hpoVersion);
        } else {
          this.pendingHpoVersion = this.hpoVersion;
        }
        //this.footer_component.setHpoVersion(this.hpoVersion);
      });
    });
    listen("loadedHPO", (event) => {
      this.ngZone.run(() => {
        let message = String(event.payload);
        if (message === "success") {
          this.hpoLoaded = true; 
        } else if (message === "failure") {
          this.hpoLoaded = false;
        } else if (message === "loading") {
          this.hpoMessage = " loading ...";
        }else {
          console.error("did not recognize payload for hpoMessage: ", message);
          this.hpoLoaded = false;
        }
      });
    });
    listen("templateLoaded", (event) => {
      this.ngZone.run(() => {
        let message = String(event.payload);
        const [status, detail] = message.split(":", 2);
        console.log("template loaded: ", message);
        if (status === "success") {
          this.templateLoaded = true; 
          this.templateFileMessage = detail;
        } else if (status === "failure") {
          this.templateLoaded = false;
          this.templateFileMessage = detail;
        } else {
          console.error("did not recognize payload for templateLoaded: ", status);
          this.templateLoaded = false;
        }
      });
    });


    
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
    console.log("chooseExistingTemplateFile");
    this.configService.loadExistingPhetoolsTemplate();
  }


  async chooseNewPhetoolsFile() {
    console.log("chooseNewPhetoolsFile - not implemented");
    this.configService.loadExistingPhetoolsTemplate();
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

  

}
