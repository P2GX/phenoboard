import { Component, inject } from '@angular/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { HelpService } from '../services/help.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  private helpService = inject(HelpService);

  async openHelp(): Promise<void> {
    const url = this.helpService.getCurrentUrlValue();   
    await openUrl(url);
  }

    
}