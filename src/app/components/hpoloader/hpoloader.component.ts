import { ChangeDetectorRef, Component } from '@angular/core';
import { open } from '@tauri-apps/plugin-dialog';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { ConfigService } from '../../services/config.service';

@Component({
  selector: 'app-hpoloader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hpoloader.component.html',
  styleUrls: ['./hpoloader.component.css']
})
export class HpoloaderComponent {
  initialState: boolean = true;
  isLoading: boolean = false;
  successfullyLoaded: boolean = false;
  filePath: string = "";
  hpoVersion: string = "";
  hpJsonPath: string = "";
  loadError: string | null = null;
  progress: number = 0;
  progressSub?: Subscription;

  constructor(private cd: ChangeDetectorRef, private configService: ConfigService) {}


  ngOnInit(): void {
    this.loadHpoVersion();
    this.loadHpJsonPath();
  }

  async loadHpoVersion(): Promise<void> {
    try {
      this.hpoVersion = await this.configService.getHpoVersion();
      console.log("Retrieved hpo version: ", this.hpoVersion);
    } catch (err) {
      console.error('Error getting HPO version: ', err);
      this.hpoVersion = err instanceof Error ? err.message : 'Unknown error'; 
      this.loadError = "Could not load HPO version" 
    } finally {
      await this.configService.checkReadiness();
      this.cd.detectChanges(); 
    }
  }

  async loadHpJsonPath(): Promise<void> {
    console.log("Loading hp json path")
    try {
      this.hpJsonPath = await this.configService.getHpJsonPath();
      console.log("Got hp.json path", this.hpJsonPath);
    } catch (err) {
      console.error('Error hp.json path:', err);
      this.hpJsonPath = err instanceof Error ? err.message : 'Unknown error'; 
      this.loadError = "Could not load hp.json path" 
    } finally {
      await this.configService.checkReadiness();
      this.cd.detectChanges(); 
    }
  }

  async chooseHpJsonFile() {
    const path = await this.configService.selectHpJsonFile();
    if (path) {
      try {
        this.isLoading = true;
        console.log("Loading HPO ");
        this.cd.detectChanges()
        // Give GUI time to paint before continuing
        await new Promise(resolve => setTimeout(resolve, 100));
        await this.configService.loadHumanPhenotypeOntology(path);
        console.log("HPO version ", this.hpoVersion);
        this.hpJsonPath = path;
      } catch (error) {
        console.error("Error loading HPO JSON:", error);
      } finally {
        this.isLoading = false;
        this.initialState = false;
        this.loadHpoVersion();
        await this.configService.checkReadiness();
      }
    }
  }
}
