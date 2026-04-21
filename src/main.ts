// src/main.ts
import { bootstrapApplication } from "@angular/platform-browser";
import { importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { AppComponent } from "./app/app.component";
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app/app-routing.module'

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),provideRouter(appRoutes), 
    importProvidersFrom(
      BrowserAnimationsModule,
      MatMenuModule,
      MatButtonModule,
      ReactiveFormsModule,
    ),
  ],
}).then(() => {
  setTimeout(() => {
    (window as any).__TAURI__?.webviewWindow?.getCurrent()?.openDevtools?.();
  }, 300);
}).catch(err => console.error(err));
