import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideClientHydration } from '@angular/platform-browser';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

import { routes } from './app.routes';
import { ngrokInterceptor } from './core/interceptors/ngrok-interceptor';
import { authInterceptor } from './core/interceptors/auth.interceptor';

/** Aura recoloured to the OrderFlow blue and navy palette. */
const OrderFlowPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554'
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.700}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.800}',
          activeColor: '{primary.900}'
        }
      },
      dark: {
        primary: {
          color: '{primary.500}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.400}',
          activeColor: '{primary.300}'
        },
        surface: {
          0: '#ffffff',
          50: '#f8fafc',
          100: '#e2e8f0',
          200: '#cbd5e1',
          300: '#94a3b8',
          400: '#64748b',
          500: '#475569',
          600: '#2a3550',
          700: '#222d47',
          800: '#182238',
          900: '#121a2d',
          950: '#0b1020'
        }
      }
    }
  }
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    MessageService,
    provideHttpClient(
      withInterceptors([ngrokInterceptor, authInterceptor])
    ),
    provideRouter(routes),
    provideClientHydration(),
    providePrimeNG({
      theme: {
        preset: OrderFlowPreset,
        options: {
          darkModeSelector: "[data-theme='dark']"
        }
      }
    })
  ]
};
