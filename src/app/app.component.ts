import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './navbar/navbar.component';
import { FooterComponent } from './footer/footer.component';
import { HomeComponent } from './home/home.component';
import { TextminingComponent } from "./textmining/textmining.component";
import { SettingsComponent } from "./settings/settings.component";
import { TableComponent } from "./table/table.component";
import { HelpComponent } from "./help/help.component";
import { PyphetoolsComponent } from "./pyphetools/pyphetools.component";
import { PhetoolsloaderComponent } from "./components/phetoolsloader/phetoolsloader.component";


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FooterComponent, HomeComponent, TableComponent, HelpComponent, TextminingComponent, SettingsComponent, PyphetoolsComponent, PhetoolsloaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  /* These are the components for our single-page application */
  currentView: 'home' | 'table' | 'textmining' | 'settings' | 'pyphetoolsloader' | 'help' = 'home';
  
  setView(view: typeof this.currentView) {
    this.currentView = view;
  }
}
