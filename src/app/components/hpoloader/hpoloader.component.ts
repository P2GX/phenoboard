import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

@Component({
  selector: 'app-hpoloader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hpoloader.component.html',
  styleUrls: ['./hpoloader.component.css']
})
export class HpoloaderComponent {
  isLoading: boolean = false;
  successfullyLoaded: boolean = false;
  filePath: string = "";
  hpoVersion: string = "";
  loadError: string | null = null;
  progress: number = 0;

  async onFileSelected(event: Event) {
    console.log("TOP onFileSelected");
    if (this.isLoading) {
      console.log("File is already being loaded, skipping another open.");
      return; // Avoid opening the dialog again
    }
    console.log("2 onFileSelected");
    try {
      this.isLoading = true;
      this.successfullyLoaded = false;
      this.loadError = null;
      this.progress = 10;
      console.log("3 onFileSelected");
      // Open the file dialog using Tauri
      const result = await open({
        multiple: false,
        directory: false,
      });
      console.log("result:", result);
      console.log("4 onFileSelected");
      if (result) {
        this.filePath = result as string;
        console.log("this.filePath is", this.filePath);
        this.progress = 50;
        console.log("5 onFileSelected");
        // Call the Rust function
        this.hpoVersion = await invoke<string>("initialize_hpo_and_get_version", { hpoJsonPath: this.filePath });
        console.log("6 onFileSelected");
        console.log(this.hpoVersion);
        this.progress = 100;
        this.successfullyLoaded = true;
      }
    } catch (err) {
      console.error('Error loading file:', err);
      this.loadError = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      this.isLoading = false;
    }
  }
}
