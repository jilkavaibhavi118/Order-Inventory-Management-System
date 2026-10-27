import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { apiHeadersInterceptor } from './core/interceptors/api-headers.interceptor';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch(), withInterceptors([apiHeadersInterceptor])),
    provideRouter(routes),
    provideClientHydration(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: "[data-theme='dark']"
        }
      }
    }),
    MessageService
  ]
};
