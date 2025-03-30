import { Component } from '@angular/core';
import { HpoloaderComponent } from '../components/hpoloader/hpoloader.component';
import { PhetoolsloaderComponent } from "../components/phetoolsloader/phetoolsloader.component";

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HpoloaderComponent, PhetoolsloaderComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

}
