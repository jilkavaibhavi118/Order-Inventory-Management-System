import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

export const ngrokInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.apiUrl.includes('.ngrok-free.dev') || !req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const updatedRequest = req.clone({
    setHeaders: {
      'ngrok-skip-browser-warning': 'true'
    }
  });

  return next(updatedRequest);
};
