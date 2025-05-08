import { Component, OnInit } from '@angular/core';
import { HpoloaderComponent } from '../components/hpoloader/hpoloader.component';
import { PhetoolsloaderComponent } from "../components/phetoolsloader/phetoolsloader.component";
import { ConfigService } from "../services/config.service";
import { SettingsService } from "../services/settings.service";

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HpoloaderComponent, PhetoolsloaderComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {

  constructor(settingsService: SettingsService, configService: ConfigService) {
  }

  ngOnInit(): void {

  }
}
