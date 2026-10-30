import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const platformId = inject(PLATFORM_ID);
  const authService = inject(AuthService);
  const router = inject(Router);

  // localStorage/sessionStorage are browser-only. During SSR, allow navigation to
  // continue so hydration can run the guard in the browser with the real token.
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  return authService.isAuthenticated()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const guestGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!isPlatformBrowser(platformId) || !authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
