import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { invoke } from '@tauri-apps/api/core';

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


  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 1) {
      try {
        this.isLoading = true;
        const file = input.files[0];
        this.filePath = file.name;
        console.log("file path is ", this.filePath);
        this.hpoVersion = await invoke<string | string>("initialize_hpo_and_get_version", { hpJsonPath:  this.filePath });
      } catch(err) {
        console.error('Error loading file:', err);
      } finally {
        this.isLoading = false;
      }
    }
  }



}
