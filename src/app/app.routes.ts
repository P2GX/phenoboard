import { Routes, withComponentInputBinding, withHashLocation } from "@angular/router";
import { provideRouter } from "@angular/router";
import { HomeComponent } from "./home/home.component";
import { AddcaseComponent } from "./addcase/addcase.component";
import { SettingsComponent } from "./settings/settings.component";
import { TableComponent } from "./table/table.component";
import { HelpComponent } from "./help/help.component";
import { PhetoolsComponent } from "./phetools/phetools.component";

export const routes: Routes = [
    { path: '', component: HomeComponent}, // default route
    { path: 'settings', component: SettingsComponent},
    { path: 'textmining', component: AddcaseComponent },
    { path: 'table', component: TableComponent },
    { path: 'phetools', component: PhetoolsComponent},
    { path: 'help/:topic', component: HelpComponent },
];

/* Provide router in `main.ts`
export const appConfig = [
    provideRouter(routes )
  ];

 export const appConfig = [
    provideRouter(routes, withComponentInputBinding(), withHashLocation())
];
*/