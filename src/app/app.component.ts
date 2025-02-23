import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { invoke } from "@tauri-apps/api/core";
import { ClipboardComponent } from './clipboard/clipboard.component';
import { SettingsComponent } from './settings/settings.component';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ClipboardComponent, SettingsComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  greetingMessage = "";

  hpoText = "";

  greet(event: SubmitEvent, name: string): void {
    event.preventDefault();

    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    invoke<string>("greet", { name }).then((text) => {
      this.greetingMessage = text;
    });
  }

  
}
