import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ✅ Import FormsModule
import { invoke } from "@tauri-apps/api/core";


@Component({
  selector: 'app-table',
  standalone: true,
  imports: [],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss'
})
export class TableComponent {
  clipboardContent: string | null = null;
  jsonData: any[] = [ ]; 

  async readClipboard(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      // attempt to get a matrix of Strings representing a new pyphetools tempalte
      invoke<string>("get_table_columns_from_seeds", { inputText: text }).then((output) => {
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

}
