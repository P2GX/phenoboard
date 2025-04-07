import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../services/config.service';
import { ChangeDetectorRef } from '@angular/core';


@Component({
  selector: 'app-settings',
  standalone: true,
  imports:[CommonModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  hpoJsonPath: string | null = null;
  hpocuratorSettingsPath: string | null = null;
  hpoVersion: string | null = null;
  isLoading:boolean = false;

  constructor(private configService: ConfigService, private cdRef: ChangeDetectorRef) {}

  async ngOnInit() {
    console.log("ngOnInit");
  }

  async chooseHpJsonFile() {
    const path = await this.configService.selectHpJsonFile();
    
    if (path) {
      try {
        this.isLoading = true;
        console.log("Loading HPO ");
        this.cdRef.detectChanges()
        // Give GUI time to paint before continuing
        await new Promise(resolve => setTimeout(resolve, 100));
        await this.configService.loadHumanPhenotypeOntology(path);
        console.log("version ", this.hpoVersion);
        this.hpoJsonPath = path;
      } catch (error) {
        console.error("Error loading HPO JSON:", error);
      } finally {
        this.isLoading = false;
      }
    }
  }
}
