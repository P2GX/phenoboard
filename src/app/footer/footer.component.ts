import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
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
export class FooterComponent implements OnInit{
  isToolReady: boolean = false;
  nHpoTerms: string = '';
  hpoVersion: string = '';
  statusMessage: string = '';
  private unlistenReady: UnlistenFn | null = null;

  constructor(private ngZone: NgZone, private configService: ConfigService) {}

  

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

  updateStatus() {
    let msg = '';
    this.ngZone.run(() => {
      if (this.hpoVersion.length > 0) {
            msg = "version: " + this.hpoVersion;
          }
          if (this.nHpoTerms.length > 0) {
            if (msg.length > 0) {
              msg = msg + ". ";
            }
            msg = msg + "terms: " + this.nHpoTerms;
          }
          this.statusMessage = msg;
    });
  }

  setHpoNTerms(nTerms: string) {
    this.nHpoTerms = nTerms;
    this.updateStatus();
  }

  setHpoVersion(hpoVersion: string) {
    this.hpoVersion = hpoVersion;
    this.updateStatus();
  }
}
