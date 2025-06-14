import { bootstrapApplication } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { AppComponent } from './app.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { importProvidersFrom } from '@angular/core';
import { appConfig } from './app.config';
import './src/styles.scss';

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(BrowserAnimationsModule),  
    importProvidersFrom(CommonModule, ReactiveFormsModule, FormsModule),  
    ...appConfig.providers
  ]
}).catch(err => console.error(err));
