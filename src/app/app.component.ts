import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from './footer/footer.component';
import { HomeComponent } from './home/home.component';
import { TextminingComponent } from "./textmining/textmining.component";
import { SettingsComponent } from "./settings/settings.component";
import { TableComponent } from "./table/table.component";
import { HelpComponent } from "./help/help.component";
import { PhetoolsComponent } from "./phetools/phetools.component";
import { NavbarComponent } from './navbar/navbar.component';
import { Page, PageService } from './services/page.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FooterComponent, HomeComponent, TableComponent, HelpComponent, TextminingComponent, SettingsComponent, PhetoolsComponent,  NavbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  constructor(private pageService: PageService) {}
  /* These are the components for our single-page application */
  currentView: string = this.pageService.getHome();

  ngOnInit(): void {
    this.pageService.currentPage$.subscribe((page) => {
      this.currentView = page;
    });
  }

}
