import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../../services/config.service';
import { interval, Subscription } from 'rxjs';
import { open } from '@tauri-apps/plugin-dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-phetoolsloader',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  templateUrl: './phetoolsloader.component.html',
  styleUrl: './phetoolsloader.component.css'
})
export class PhetoolsloaderComponent {
  isLoading: boolean = false;
  successfullyLoaded: boolean = false;
  filePath: string = "";
  hpoInitialized: boolean = false;
  phetoolsCohortTemplatePath: string = "";
  loadError: string | null = null;
  progress: number = 0;
  progressSub?: Subscription;

  constructor(private cd: ChangeDetectorRef, private configService: ConfigService) {}


  ngOnInit(): void {
   this.checkHpoInitialized();
   }
   

  async checkHpoInitialized(): Promise<void> {
    console.log("LOADING phetools template")
    try {
      this.hpoInitialized = await this.configService.hpoInitialized();
      console.log("phetoolsloader: hpo initialized", this.hpoInitialized);
    } catch (err) {
      console.error('Error checking whether HPO initialized:', err);
      this.hpoInitialized = false; 
      this.loadError = "Could not check HPO" 
    } finally {
      this.cd.detectChanges(); 
    }
  }

  /*
  async loadPheToolsCohortPath(): Promise<void> {
    console.log("Loading phetools template file")
    try {
      this.phetoolsCohortTemplatePath = await this.configService.selectPhetoolsTemplatePath();
      console.log("Got phetoolsCohortTemplatePath", this.phetoolsCohortTemplatePath);
    } catch (err) {
      console.error('Error phetools cohort template path:', err);
      this.phetoolsCohortTemplatePath = err instanceof Error ? err.message : 'Unknown error'; 
      this.loadError = "Could not load phetools cohort template " 
    } finally {
      this.cd.detectChanges(); 
    }
  }
*/
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
      this.filePath = result as unknown as string;
      console.log("this.filePath: ", this.filePath);
      this.isLoading = true;
      this.progress = 5;
      this.cd.detectChanges();
      this.startProgress();
      await this.configService.loadHumanPhenotypeOntology(this.filePath);
      console.log("Loaded phetools cohort template ");
      this.successfullyLoaded = true;
      this.progress = 100;
    } catch (err) {
      console.error('Error loading phetools cohort template :', err);
      this.loadError = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      this.isLoading = false;
      this.progressSub?.unsubscribe(); // Stop progress update
    
      //this.loadPheToolsCohortPath();
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