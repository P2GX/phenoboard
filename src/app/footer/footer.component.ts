import { Component, inject, OnInit } from '@angular/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { HelpService } from '../services/help.service';
import { getVersion, getName } from '@tauri-apps/api/app';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit {
  private helpService = inject(HelpService);
  appVersion = '';
  appName = '';

  async ngOnInit() {
    this.appVersion = await getVersion();
    this.appName = await getName();
  }

  async openHelp(): Promise<void> {
    const url = this.helpService.getCurrentUrlValue();   
    await openUrl(url);
  }

    
}