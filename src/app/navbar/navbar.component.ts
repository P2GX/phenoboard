import { Component, EventEmitter, Output } from '@angular/core';
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
    { id: 'table', label: 'Table' },
    { id: 'textmining', label: 'Text mining' },
    { id: 'pyphetoolsloader', label: 'Pyphetools loader' },
    { id: 'settings', label: 'Settings' },
    { id: 'help', label: 'Help' },
  ];



  setView(page: string) {
    this.pageService.setPage(page);
    this.currentView = this.pageService.getPage();
  }
}
