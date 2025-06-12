import { ChangeDetectorRef, Component, NgZone } from '@angular/core';
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
  constructor(
    private ngZone: NgZone,
    private configService: ConfigService
  ) {}

  pastedText: string = '';
  showTextArea: boolean = true;

  jsonData: any[] = [ ]; 
  htmlData: string = '';
  predefinedOptions: string[] = ["observed", "excluded", "na"];
  selectedOptions: string[] = []; // Stores selected radio button values
  customOptions: string[] = []; // Stores manually entered custom options
  hpoInitialized: boolean = false;
  loadError: string | null = null;

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


  async doHpoTextMining(): Promise<void> {
    try {
      const output = await this.configService.highlight_hpo_mining(this.pastedText);
          console.log("output",output);
          this.htmlData = output;
          this.showTextArea = false;
        } catch (error) {
          // If parsing fails, set clipboardContent to the raw text
          //this.clipboardContent = text;
          console.error('Invalid JSON format:', error);
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

  resetWindow() {
    this.ngZone.run(() => {
      this.showTextArea = true;
    });

  }
}
