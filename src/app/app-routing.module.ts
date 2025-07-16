import { HomeComponent } from './home/home.component';
import { NewTemplateComponent } from './newtemplate/newtemplate.component';
import { AddcaseComponent } from './addcase/addcase.component';
import { TableEditorComponent } from './tableeditor/tableeditor.component';
import { PtTemplateComponent } from './pttemplate/pttemplate.component';
import { VariantListComponent } from './variant_list/variant_list.component';
import { HelpComponent } from './help/help.component';
import { Routes } from '@angular/router';


/* Not using routing currently, consider refactor */

export const appRoutes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'newtemplate', component: NewTemplateComponent },
  { path: 'addcase', component: AddcaseComponent },
  { path: 'tableeditor', component: TableEditorComponent },
  { path: 'pttemplate', component: PtTemplateComponent },
  { path: 'variant_list', component: VariantListComponent },
  { path: 'help', component: HelpComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: '**', redirectTo: '/home' } // Fallback route
];
console.log('=== ROUTING MODULE LOADING DONE ===');