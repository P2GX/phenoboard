import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../services/config.service';

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

  constructor(private configService: ConfigService) {}

  async ngOnInit() {
    console.log("ngOnInit");
  }

  async chooseHpJsonFile() {
    const path = await this.configService.selectHpJsonFile();
    if (path) {
      this.hpoJsonPath = path;
      this.hpoVersion = await this.configService.loadOntologyAndGetVersion(path);
      console.log("version ", this.hpoVersion);
      await this.configService.saveHpJsonPath(path);
    }
  }
}
