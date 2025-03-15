import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

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

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 1) {
      this.isLoading = true;
      const file = input.files[0];
      this.filePath = file.name;
    }
  }
}
