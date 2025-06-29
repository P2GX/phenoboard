import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Page, PageService } from '../services/page.service';
import { StatusDto } from '../models/status_dto';
import { Subscription } from 'rxjs';
import { BackendStatusService } from '../services/backend_status_service';



type Tab = {
  id: Page;
  label: string;
  disabled?: boolean;
  disabledFn?: (status: StatusDto | null) => boolean;
};


@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  constructor(
    private pageService: PageService,
    private backendStatusService: BackendStatusService
  ) {
    this.statusSub = this.backendStatusService.status$.subscribe((status) => {
      this.status = status;
    });
  }

  currentView: Page = 'home' as Page;
  status: StatusDto | null = null;
  private statusSub: Subscription;


  tabs: Tab[] = [
  { id: 'home', label: 'Home' },
  { id: 'table', label: 'New PheTools Table' },
  {
    id: 'addcase',
    label: 'Add case',
    disabledFn: (status) => !status?.ptTemplateLoaded
  },
  {
    id: 'phetools',
    label: 'Edit PheTools Table',
    disabledFn: (status) => !status?.ptTemplateLoaded
  },
  {
    id: 'pttemplate',
    label: 'Edit Template',
    disabledFn: (status) => !status?.ptTemplateLoaded
  },
  { id: 'settings', label: 'Settings' },
  { id: 'help', label: 'Help' }
];


  isDisabled(tab: Tab): boolean {
    return typeof tab.disabledFn === 'function' ? tab.disabledFn(this.status) : !!tab.disabled;
  }

  setView(page: string) {
    const tab = this.tabs.find(t => t.id === page);
    if (!tab || this.isDisabled(tab)) return;

    this.pageService.setPage(page);
    this.currentView = this.pageService.getPage();
  }

  ngOnDestroy(): void {
    this.statusSub.unsubscribe();
  }
}
