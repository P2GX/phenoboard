import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Page, PageService } from '../services/page.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})



export class NavbarComponent {
  constructor(private pageService: PageService) {}

  currentView: Page = 'home' as Page;

  tabs = [
    { id: 'home', label: 'Home' },
    { id: 'table', label: 'New PheTools Table' },
    { id: 'addcase', label: 'Add case' },
    { id: 'phetools', label: 'Edit PheTools Table'},
    { id: 'pttemplate', label: 'Edit Template'},
    { id: 'settings', label: 'Settings' },
    { id: 'help', label: 'Help' },
  ];



  setView(page: string) {
    this.pageService.setPage(page);
    this.currentView = this.pageService.getPage();
  }
}
