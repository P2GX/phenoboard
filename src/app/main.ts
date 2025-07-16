import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { importProvidersFrom } from '@angular/core';
import './src/styles.scss';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

console.log("IN MAIN")

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimationsAsync(), 
    importProvidersFrom(ReactiveFormsModule, FormsModule),  
  ]
}).catch(err => console.error(err));
