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
  downloadPath: string | null = null;

  constructor(private configService: ConfigService) {}

  async ngOnInit() {
    console.log("ngOnInit");
    this.downloadPath = await this.configService.getSavedDownloadPath();
  }

  async chooseDownloadFolder() {
    const path = await this.configService.selectDownloadDirectory();
    if (path) {
      this.downloadPath = path;
      await this.configService.saveDownloadPath(path);
    }
  }
}
