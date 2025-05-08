import { ApplicationConfig } from "@angular/core";
import { provideRouter } from "@angular/router";

import { routes } from "./app.routes";
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { MyPreset } from '../assets/themes/mytheme';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes), provideAnimationsAsync(),
    providePrimeNG({
        theme: {
            preset: MyPreset,
            options: {
                cssLayer: {
                    name: 'primeng',
                    order:  'tailwind-base, primeng, tailwind-utilities'
                },
                darkModeSelector: '.my-app-dark'
            }
        }
    })],
};


