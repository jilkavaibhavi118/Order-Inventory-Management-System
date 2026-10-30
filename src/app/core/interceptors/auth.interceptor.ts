import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthService).getValidAccessToken();
  const isApiRequest = request.url.startsWith(environment.apiUrl);

  if (!token || !isApiRequest || request.headers.has('Authorization')) {
    return next(request);
  }

  return next(request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  }));
};
