import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { NewTemplateComponent } from './newtemplate/newtemplate.component';
import { AddcaseComponent } from './addcase/addcase.component';
import { TableEditorComponent } from './tableeditor/tableeditor.component';
import { PtTemplateComponent } from './pttemplate/pttemplate.component';
import { VariantListComponent } from './variant_list/variant_list.component';
import { HelpComponent } from './help/help.component';
import { StatusComponent } from './status/status.component';
import { PhenopacketDetailComponent } from './phenopacketdetail/phenopacketdetail.component';
import { RepoComponent } from './repo/repo.component';



/* Not using routing currently, consider refactor */

export const appRoutes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'newtemplate', component: NewTemplateComponent },
  { path: 'addcase', component: AddcaseComponent },
  { path: 'tableeditor', component: TableEditorComponent },
  { path: 'pttemplate', component: PtTemplateComponent },
  { path: 'variant_list', component: VariantListComponent },
  { path: 'status', component: StatusComponent },
  { path: 'repo', component: RepoComponent },
  { path: 'help', component: HelpComponent },
  { path: 'phenopacket/:id', component: PhenopacketDetailComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: '**', redirectTo: '/home' } // Fallback route
];
@NgModule({
  imports: [RouterModule.forRoot(appRoutes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
