import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { invoke } from '@tauri-apps/api/core';
//import { open } from '@tauri-apps/api/dialog';

@Component({
  selector: 'app-hpoloader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hpoloader.component.html',
  styleUrl: './hpoloader.component.css'
})
export class HpoloaderComponent {
  isLoading: boolean = false;
  filePath: string = "";
  hpoVersion: string = "";

  async onFileSelected() {
    console.log("inside onFileSelected");
    try {
      this.isLoading = true;
      // Open the file dialog using Tauri
      const filePath = await open(
        //{
       /* multiple: false,  // Set to true if you want to select multiple files
        directory: false, // Set to true if you want to select a directory
        filters: [{ name: 'JSON Files', extensions: ['json'] }],*/
     // }
    );
  
      if (filePath) {
        //this.filePath = filePath;
        console.log("this.filePath is ", filePath);
        //this.hpoVersion = await invoke<string>("initialize_hpo_and_get_version", { hpoJsonPath: this.filePath });
      }
    } catch (err) {
      console.error('Error loading file:', err);
    } finally {
      this.isLoading = false;
    }
  }


}
