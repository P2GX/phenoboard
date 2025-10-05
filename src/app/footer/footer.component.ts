import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { openUrl } from '@tauri-apps/plugin-opener';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  helpUrl: string = 'https://p2gx.github.io/phenoboard/';

  constructor(private router: Router) {
    // Listen to route changes and update help URL accordingly
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateHelpUrl(event.urlAfterRedirects);
      });
    
    // Set initial help URL
    this.updateHelpUrl(this.router.url);
  }

  private updateHelpUrl(url: string): void {
    const baseHelpUrl = 'https://p2gx.github.io/phenoboard/help';
    
    // Map routes to help pages
    if (url.includes('/cohort')) {
      this.helpUrl = `${baseHelpUrl}/cohort`;
    } else if (url.includes('/variants')) {
      this.helpUrl = `${baseHelpUrl}/variants`;
    } else if (url.includes('/phenotypes')) {
      this.helpUrl = `${baseHelpUrl}/phenotypes`;
    } else {
      this.helpUrl = `${baseHelpUrl}/overview`;
    }
  }

  openHelp(): void {
    this.openLink(this.helpUrl);
  }

    /**
     * Open a URL in the (external) system browser
    */
    async openLink(url: string) {
      await openUrl(url);
    }
}