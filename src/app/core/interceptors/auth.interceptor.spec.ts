import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let httpTestingController: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting()
      ]
    });
    httpTestingController = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    authService.accessToken.set('access-token');
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('adds the bearer token to API requests', () => {
    TestBed.inject(HttpClient).get(`${environment.apiUrl}/api/Order`).subscribe();

    const request = httpTestingController.expectOne(`${environment.apiUrl}/api/Order`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token');
    request.flush([]);
  });

  it('does not add the bearer token to requests outside the API origin', () => {
    TestBed.inject(HttpClient).get('https://example.com/data').subscribe();

    const request = httpTestingController.expectOne('https://example.com/data');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });
});
