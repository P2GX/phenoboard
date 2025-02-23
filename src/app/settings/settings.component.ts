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

  constructor(private configService: ConfigService) {}

  async ngOnInit() {
    console.log("ngOnInit");
    this.hpocuratorSettingsPath = await this.configService.getSavedDownloadPath();
  }

  async chooseHpJsonFile() {
    const path = await this.configService.selectHpJsonFile();
    if (path) {
      console.log("We got the path settings.component.ts=", path);
      this.hpoJsonPath = path;
      await this.configService.saveHpJsonPath(path);
    }
  }
}
