import { Component, OnInit } from '@angular/core';
import { NavbarComponent } from "./navbar/navbar.component";
import { HomeComponent } from "./home/home.component";
import { AddcaseComponent } from './addcase/addcase.component';
import { HelpComponent } from './help/help.component';
import { NewTemplateComponent } from './newtemplate/newtemplate.component';
import { CommonModule } from '@angular/common';
import { PageService } from './services/page.service';
import { TableEditorComponent } from "./tableeditor/tableeditor.component";
import { PtTemplateComponent } from './pttemplate/pttemplate.component';
import { VariantListComponent } from './variant_list/variant_list.component';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [CommonModule, NavbarComponent, HomeComponent,NewTemplateComponent, AddcaseComponent,
    TableEditorComponent,HelpComponent,
    PtTemplateComponent, VariantListComponent
  ]
})
export class AppComponent implements OnInit {
    constructor(private pageService: PageService) {}
  /* These are the components for our single-page application */
  currentView: string = this.pageService.getHome();

  ngOnInit(): void {
    this.pageService.currentPage$.subscribe((page) => {
      this.currentView = page;
    });
  }
}