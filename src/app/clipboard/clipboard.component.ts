import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { invoke } from "@tauri-apps/api/core";

@Component({
  selector: 'app-clipboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './clipboard.component.html', 
   styleUrl: './clipboard.component.css'
})
export class ClipboardComponent {
  clipboardContent: string | null = null;
  jsonData: any[] = [ ]; 
  async readClipboard(): Promise<void> {
    console.log("readClipboard() called"); 
    try {
      console.log("readClipboard() Top of Try"); 
      const text = await navigator.clipboard.readText();
      console.log("readClipboard() text=", text); 
      invoke<string>("run_text_mining", { inputText: text }).then((output) => {
        this.clipboardContent = output;
        console.log("readClipboard() output=", output); 
        try {
          console.log("text")
          console.log(text)
          this.jsonData = JSON.parse(output);
          console.log("json")
          console.log(this.jsonData)
        } catch (error) {
          // If parsing fails, set clipboardContent to the raw text
          this.clipboardContent = text;
          console.error('Invalid JSON format:', error);
        }
    }).catch((error) => {
      console.error("Tauri invoke failed:", error);
    });
      console.log('Clipboard Content BTOOM:', text);
      this.clipboardContent = text;
    } catch (err) {
      console.error('Failed to read clipboard', err);
    }
  }

  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }
}
