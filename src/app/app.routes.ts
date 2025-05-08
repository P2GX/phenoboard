import { Routes} from "@angular/router";
import { HomeComponent } from "./home/home.component";

import { TutorialComponent } from "./tutorial/tutorial.component";

export const routes: Routes = [
    { path: '', component: HomeComponent}, // default route
    { path: 'tutorial', component: TutorialComponent},
];
