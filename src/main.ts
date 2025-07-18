import { bootstrapApplication } from "@angular/platform-browser";
import { importProvidersFrom } from '@angular/core';
import { AppComponent } from "./app/app.component";
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule } from '@angular/forms';  // <-- Import this

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      BrowserAnimationsModule,
      MatMenuModule,
      MatButtonModule,
      ReactiveFormsModule,
    ),
  ],
}).catch(err => console.error(err));