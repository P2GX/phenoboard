import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withHashLocation } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { importProvidersFrom } from '@angular/core';

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(BrowserAnimationsModule),  
    importProvidersFrom(CommonModule),  
    provideRouter(routes, withHashLocation()),// 👈 Use hash-based routing for Tauri
    { provide: BrowserAnimationsModule, useValue: BrowserAnimationsModule }
  ]
}).catch(err => console.error(err));
