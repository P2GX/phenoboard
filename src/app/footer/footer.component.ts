import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { openUrl } from '@tauri-apps/plugin-opener';
import { filter } from 'rxjs/operators';
import { HelpService } from '../services/help.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  helpUrl: string = 'https://p2gx.github.io/phenoboard/';

  constructor(private router: Router, 
    private helpService: HelpService) {
  }

  

  async openHelp(): Promise<void> {
    const url = this.helpService.getCurrentUrlValue();   
    await openUrl(url);
  }

    
}