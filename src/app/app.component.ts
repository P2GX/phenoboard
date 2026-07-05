import { Component, OnInit } from '@angular/core';
import { NavbarComponent } from './navbar/navbar.component';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from "./footer/footer.component";
import { getCurrentWindow } from '@tauri-apps/api/window';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css', '../styles.scss'],
  imports: [
    NavbarComponent,
    RouterOutlet,
    FooterComponent
]
})
export class AppComponent implements OnInit {
  async ngOnInit() {
    const appWindow = getCurrentWindow();
    
    // Listen for the event emitted by your Rust backend
    await appWindow.listen('close-requested', async () => {
      // 1. Optional: Add an unsaved changes check here if needed
      // 2. Destroy the window cleanly from the frontend
      await appWindow.destroy();
    });
  }
}
