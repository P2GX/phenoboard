import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ✅ Import FormsModule
import { invoke } from "@tauri-apps/api/core";

@Component({
  selector: 'app-clipboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './textmining.component.html', 
   styleUrl: './textmining.component.css'
})
export class TextminingComponent {
  clipboardContent: string | null = null;
  jsonData: any[] = [ ]; 
  predefinedOptions: string[] = ["observed", "excluded", "na"];
  selectedOptions: string[] = []; // Stores selected radio button values
  customOptions: string[] = []; // Stores manually entered custom options


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
