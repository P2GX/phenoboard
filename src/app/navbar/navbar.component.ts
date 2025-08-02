import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';


@Component({
  selector: 'app-navbar',
  standalone: true,
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  imports: [RouterLink, RouterLinkActive],
})
export class NavbarComponent {
  tabs = [
    { label: 'Home', path: '/home' },
    { label: 'New Template', path: '/newtemplate' },
    { label: 'Add Case', path: '/addcase' },
    { label: 'Table Editor', path: '/tableeditor' },
    { label: 'Patient Template', path: '/pttemplate' },
    { label: 'Variants', path: '/variant_list' },
    { label: 'Help', path: '/help' },
  ];

  isDisabled(tab: { path: string }) {
    return false; // add logic here if needed
  }
}
function provideExperimentalFeatures(arg0: string[]) {
  throw new Error('Function not implemented.');
}

