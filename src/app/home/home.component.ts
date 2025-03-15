import { Component } from '@angular/core';
import { HpoloaderComponent } from '../components/hpoloader/hpoloader.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HpoloaderComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

}
