import { Component, inject, OnInit, signal } from '@angular/core';
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
  appVersion = signal<string>('');
  readonly appName = signal<string>('');

  async ngOnInit() {
    const version = await getVersion();
    const name = await getName();
    this.appVersion.set(version);
    this.appName.set(name);
  }

  async openHelp(): Promise<void> {
    const url = this.helpService.getCurrentUrlValue();   
    await openUrl(url);
  }

    
}