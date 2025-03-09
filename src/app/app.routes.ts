import { Routes, withRouterConfig } from "@angular/router";
import { provideRouter } from "@angular/router";
import { HomeComponent } from "./home/home.component";
import { TextminingComponent } from "./textmining/textmining.component";
import { SettingsComponent } from "./settings/settings.component";

export const routes: Routes = [
    { path: '', component: HomeComponent}, // default route
    { path: 'settings', component: SettingsComponent},
    { path: 'textmining', component: TextminingComponent },
];

// Provide router in `main.ts`
export const appConfig = [
    provideRouter(routes )
  ];
