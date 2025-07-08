import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from './footer/footer.component';
import { HomeComponent } from './home/home.component';
import { AddcaseComponent } from "./addcase/addcase.component";
import { VariantListComponent } from "./variant_list/variant_list.component";
import { NewTemplateComponent } from "./newtemplate/newtemplate.component";
import { HelpComponent } from "./help/help.component";
import { PhetoolsComponent } from "./phetools/phetools.component";
import { PtTemplateComponent } from './pttemplate/pttemplate.component';
import { NavbarComponent } from './navbar/navbar.component';

import { PageService } from './services/page.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FooterComponent, HomeComponent, NewTemplateComponent, HelpComponent, AddcaseComponent, VariantListComponent, PhetoolsComponent, PtTemplateComponent, NavbarComponent],
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
