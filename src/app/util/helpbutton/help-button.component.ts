import { Component, input, ViewEncapsulation } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { openUrl } from '@tauri-apps/plugin-opener'; 

@Component({
  selector: 'app-help-button',
  standalone: true,
  imports: [MatMenuModule, MatButtonModule, MatIconModule],
  encapsulation: ViewEncapsulation.None, // Allows us to style the overlay menu
  templateUrl: './help-button.component.html',
  styleUrls: [ './help-button.component.scss']
})
export class HelpButtonComponent {
  title = input.required<string>();
  lines = input.required<string[]>();
  helpUrl = input<string>();

  /* Open page in default system browser */
  async openDocs() {
    const url = this.helpUrl();
    if (url) {
      try {
        await openUrl(url);
      } catch (err) {
        console.error("Failed to open documentation:", err);
      }
    }
  }
}