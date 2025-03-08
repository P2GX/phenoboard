import { Routes, withRouterConfig } from "@angular/router";
import { provideRouter } from "@angular/router";
import { HomeComponent } from "./home/home.component";
import { ClipboardComponent } from "./clipboard/clipboard.component";
import { SettingsComponent } from "./settings/settings.component";

export const routes: Routes = [
    { path: '', component: HomeComponent}, // default route
    { path: 'settings', component: SettingsComponent},
    { path: 'clipboard', component: ClipboardComponent },
];

// Provide router in `main.ts`
export const appConfig = [
    provideRouter(routes )
  ];
