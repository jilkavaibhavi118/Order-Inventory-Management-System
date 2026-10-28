import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from '../api/api-config';
import { AuthService } from '../auth/auth.service';

export const apiHeadersInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(API_BASE_URL)) {
    return next(request);
  }

  const headers: Record<string, string> = {
    'ngrok-skip-browser-warning': 'true'
  };
  const isPublicAuthRequest =
    request.url.endsWith('/api/Auth/login') || request.url.endsWith('/api/Auth/register');
  const token = isPublicAuthRequest ? null : inject(AuthService).getAccessToken();

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return next(request.clone({ setHeaders: headers }));
};
