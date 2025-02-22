import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { invoke } from "@tauri-apps/api/core";

@Component({
  selector: 'app-clipboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button (click)="readClipboard()">Copy clinical text from system clipboard</button>
    <p *ngIf="clipboardContent">Clipboard: {{ clipboardContent }}</p>
    <!-- Add a section to display the table if jsonData is available -->
    <table *ngIf="jsonData.length">
      <thead>
        <tr>
          <!-- Create table headers dynamically -->
          <th *ngFor="let key of getObjectKeys(jsonData[0])">{{ key }}</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let item of jsonData">
          <td *ngFor="let key of getObjectKeys(item)">
            {{ item[key] }}
          </td>
        </tr>
      </tbody>
    </table>
  `,
  styles: [`
    button {
      padding: 8px;
      background: #007bff;
      color: white;
      border: none;
      cursor: pointer;
      border-radius: 4px;
    }
  `]
})
export class ClipboardComponent {
  clipboardContent: string | null = null;
  jsonData: any[] = [
    { name: 'John', age: 30, city: 'New York' },
    { name: 'Jane', age: 25, city: 'London' }
  ]; 
  async readClipboard(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
       // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
      invoke<string>("run_text_mining", { text }).then((output) => {
      this.clipboardContent = output;
      try {
        console.log(text)
        this.jsonData = JSON.parse(output);
      } catch (error) {
        // If parsing fails, set clipboardContent to the raw text
        this.clipboardContent = text;
        console.error('Invalid JSON format:', error);
      }
    });
      console.log('Clipboard Content:', text);
      this.clipboardContent = text;
    } catch (err) {
      console.error('Failed to read clipboard', err);
    }
  }

  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }
}
