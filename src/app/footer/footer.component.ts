import { Component, OnInit } from '@angular/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event'; // Import listen from Tauri
import { CommonModule } from '@angular/common';
import { ConfigService } from '../services/config.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent implements OnInit {
  isToolReady: boolean = false;
  private unlistenReady: UnlistenFn | null = null;

  constructor(private configService: ConfigService) {}

  

  async ngOnInit() {
    // Listen for the 'tool-ready' event from the backend
     this.isToolReady = await this.configService.checkReadiness();

    // Listen for readiness updates from backend
    this.unlistenReady = await listen<boolean>('ready', (event) => {
      this.isToolReady = event.payload;
      console.log("Tool ready event received:", event.payload);
    });
  }

  ngOnDestroy(): void {
    if (this.unlistenReady) {
      this.unlistenReady();
    }
  }
}
