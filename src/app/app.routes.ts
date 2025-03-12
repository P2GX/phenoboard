import { Routes, withRouterConfig } from "@angular/router";
import { provideRouter } from "@angular/router";
import { HomeComponent } from "./home/home.component";
import { TextminingComponent } from "./textmining/textmining.component";
import { SettingsComponent } from "./settings/settings.component";
import { TableComponent } from "./table/table.component";
import { HelpComponent } from "./help/help.component";

export const routes: Routes = [
    { path: '', component: HomeComponent}, // default route
    { path: 'settings', component: SettingsComponent},
    { path: 'textmining', component: TextminingComponent },
    { path: 'table', component: TableComponent },
    { path: 'help/:topic', component: HelpComponent },
];

// Provide router in `main.ts`
export const appConfig = [
    provideRouter(routes )
  ];
