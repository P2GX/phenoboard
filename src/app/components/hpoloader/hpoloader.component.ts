import { ChangeDetectorRef, Component } from '@angular/core';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { interval, Subscription, takeWhile } from 'rxjs';
import { ConfigService } from '../../services/config.service';

@Component({
  selector: 'app-hpoloader',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  templateUrl: './hpoloader.component.html',
  styleUrls: ['./hpoloader.component.css']
})
export class HpoloaderComponent {
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
    console.log("LOADING HPO VERSION")
    try {
      this.hpoVersion = await this.configService.getHpoVersion();
      console.log("got hpo version", this.hpoVersion);
    } catch (err) {
      console.error('Error getting HPO version:', err);
      this.hpoVersion = err instanceof Error ? err.message : 'Unknown error'; 
      this.loadError = "Could not load HPO version" 
    } finally {
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
      this.cd.detectChanges(); 
    }
  }

  async onFileSelected(event: Event) {
    if (this.isLoading) {
      console.log("File currently being loaded.");
      return; 
    }
    this.isLoading = true;
    this.successfullyLoaded = false;
    this.loadError = null;
    this.progress = 0;

    try {
      // Open file dialog
      const result = await open({ multiple: false, directory: false });
      if (!result) {
        this.isLoading = false;
        return;
      }
      this.filePath = result as string;
      console.log("this.filePath: ", this.filePath);
      this.isLoading = true;
      this.progress = 5;
      this.cd.detectChanges();
      this.startProgress();
      await this.configService.loadHumanPhenotypeOntology(this.filePath);
      console.log("Loaded hp json");
      this.successfullyLoaded = true;
      this.progress = 100;
    } catch (err) {
      console.error('Error loading file:', err);
      this.loadError = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      this.isLoading = false;
      this.progressSub?.unsubscribe(); // Stop progress update
      this.loadHpoVersion();
      this.loadHpJsonPath();
    }
  }

  startProgress() {
    this.progress = 10;
    this.progressSub = interval(250).subscribe(() => {
      if (this.progress < 90) {
        this.progress += 20;
        this.cd.detectChanges();
      } else {
        this.progressSub?.unsubscribe();
      }
    });
  }

  ngOnDestroy() {
    this.progressSub?.unsubscribe();
  }
}
