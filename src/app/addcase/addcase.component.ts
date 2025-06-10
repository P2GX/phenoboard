import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ✅ Import FormsModule
import { invoke } from "@tauri-apps/api/core";
import { ConfigService } from '../services/config.service';
import { defaultStatusDto, StatusDto } from '../models/status_dto';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

@Component({
  selector: 'app-textmining',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './addcase.component.html', 
  styleUrl: './addcase.component.css'
})
export class AddcaseComponent {
  clipboardContent: string | null = null;
  jsonData: any[] = [ ]; 
  predefinedOptions: string[] = ["observed", "excluded", "na"];
  selectedOptions: string[] = []; // Stores selected radio button values
  customOptions: string[] = []; // Stores manually entered custom options
  hpoInitialized: boolean = false;
  loadError: string | null = null;
  ngZone: any;

  constructor(private configService: ConfigService, private cd: ChangeDetectorRef) {}
  backend_status: StatusDto = defaultStatusDto();
  private unlisten: UnlistenFn | null = null;

 

  async ngOnInit() {
    this.unlisten = await listen('backend_status', (event) => {
      this.ngZone.run(() => {
        this.backend_status = event.payload as StatusDto;
        console.log('Received backend status:', this.backend_status);
        this.hpoInitialized = this.backend_status.hpoLoaded;
      });
    });
  }
  
  ngOnDestroy() {
    if (this.unlisten) {
      this.unlisten();
      this.unlisten = null;
    }
  }

  async readClipboard(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      invoke<string>("run_text_mining", { inputText: text }).then((output) => {
        try {
          console.log("output");
          console.log(output);
          this.jsonData = JSON.parse(output);
        } catch (error) {
          // If parsing fails, set clipboardContent to the raw text
          this.clipboardContent = text;
          console.error('Invalid JSON format:', error);
        }
    }).catch((error) => {
      console.error("Tauri invoke failed:", error);
    });
      this.clipboardContent = text;
    } catch (err) {
      console.error('Failed to read clipboard', err);
    }
  }

  addCustomOption(index: number) {
    const customValue = this.customOptions[index]?.trim();
    if (customValue && !this.predefinedOptions.includes(customValue)) {
      this.predefinedOptions.push(customValue); // Add new option
      this.selectedOptions[index] = customValue; // Select it
    }
  }

  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }
}
