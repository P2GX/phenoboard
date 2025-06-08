import { Component, NgZone, ViewChild } from '@angular/core';
import { HpoloaderComponent } from '../components/hpoloader/hpoloader.component';
import { PhetoolsloaderComponent } from "../components/phetoolsloader/phetoolsloader.component";
import { invoke } from '@tauri-apps/api/core';
import { ConfigService } from '../services/config.service';
import { listen } from '@tauri-apps/api/event';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HpoloaderComponent, PhetoolsloaderComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  constructor(private ngZone: NgZone, private configService: ConfigService) {}

  hpoLoaded: boolean = false;
  nHpoTerms: string = '';
  hpoVersion: string = '';
  hpoMessage: string = "not initialized";

  @ViewChild(FooterComponent) footer_component!: FooterComponent;
 
  async ngOnInit() {
    listen('n_hpo_terms', (event) => {
      this.ngZone.run(() => {
        this.nHpoTerms = String(event.payload);
        this.footer_component.setHpoNTerms(this.nHpoTerms);
      });
    });
    listen('hpo_version', (event) => {
      this.ngZone.run(() => {
        this.hpoVersion = String(event.payload);
        this.footer_component.setHpoVersion(this.hpoVersion);
      });
    });
  }

  async loadHpo() {
    try {
      await invoke("load_hpo");
    } catch (error) {
      console.error("Failed to call load_hpo:", error);
      this.hpoMessage = "Error calling load_hpo";
    }  finally {
      this.configService.updateDescriptiveStats();
    }
  }

}
