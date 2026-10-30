import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthenticationError, AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem('orderflow-access-token');
    sessionStorage.removeItem('orderflow-access-token');
    localStorage.removeItem('orderflow-user-id');
    sessionStorage.removeItem('orderflow-user-id');
    localStorage.removeItem('orderflow-user-name');
    sessionStorage.removeItem('orderflow-user-name');
    localStorage.removeItem('orderflow-user-email');
    sessionStorage.removeItem('orderflow-user-email');
    localStorage.removeItem('orderflow-user-role');
    sessionStorage.removeItem('orderflow-user-role');

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.removeItem('orderflow-access-token');
    sessionStorage.removeItem('orderflow-access-token');
    localStorage.removeItem('orderflow-user-id');
    sessionStorage.removeItem('orderflow-user-id');
    localStorage.removeItem('orderflow-user-name');
    sessionStorage.removeItem('orderflow-user-name');
    localStorage.removeItem('orderflow-user-email');
    sessionStorage.removeItem('orderflow-user-email');
    localStorage.removeItem('orderflow-user-role');
    sessionStorage.removeItem('orderflow-user-role');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('uses the API profile name for the header when present', () => {
    service.setCurrentUser({
      success: true,
      message: 'Logged in',
      data: {
        userId: 'user-id',
        name: 'Vaibhavi Jilka',
        email: 'vaibhavi.jilka@example.com',
        role: 'Admin',
        token: 'test-token'
      },
      errors: []
    }, 'vaibhavi.jilka@example.com');

    expect(service.currentUserName()).toBe('Vaibhavi Jilka');
  });

  it('derives a readable header name from the login email when no profile name is returned', () => {
    service.setCurrentUser({
      success: true,
      message: 'Logged in',
      data: {
        userId: 'user-id',
        name: '',
        email: 'vaibhavi.jilka@example.com',
        role: 'Admin',
        token: 'test-token'
      },
      errors: []
    }, 'vaibhavi.jilka@example.com');

    expect(service.currentUserName()).toBe('Vaibhavi Jilka');
  });

  it('clears the current user name on logout', () => {
    service.setCurrentUser({
      success: true,
      message: 'Logged in',
      data: {
        userId: 'user-id',
        name: 'Vaibhavi Jilka',
        email: 'vaibhavi.jilka@example.com',
        role: 'Admin',
        token: 'test-token'
      },
      errors: []
    }, 'vaibhavi.jilka@example.com');

    service.logout();

    expect(service.currentUserName()).toBe('');
    expect(service.accessToken()).toBeNull();
  });

  it('stores the login token in persistent storage when remember me is enabled', () => {
    service.login({
      email: 'vaibhavi.jilka@example.com',
      password: 'password',
      rememberMe: true
    }).subscribe();

    httpTestingController.expectOne(`${environment.apiUrl}/api/Auth/login`).flush({
      success: true,
      message: 'Logged in',
      data: {
        userId: 'user-id',
        name: 'Vaibhavi Jilka',
        email: 'vaibhavi.jilka@example.com',
        role: 'Admin',
        token: 'access-token'
      },
      errors: []
    });

    expect(service.accessToken()).toBe('access-token');
    expect(service.currentUserId()).toBe('user-id');
    expect(localStorage.getItem('orderflow-access-token')).toBe('access-token');
    expect(localStorage.getItem('orderflow-user-id')).toBe('user-id');
    expect(localStorage.getItem('orderflow-user-name')).toBe('Vaibhavi Jilka');
    expect(localStorage.getItem('orderflow-user-email')).toBe('vaibhavi.jilka@example.com');
    expect(localStorage.getItem('orderflow-user-role')).toBe('Admin');
    expect(sessionStorage.getItem('orderflow-access-token')).toBeNull();
  });

  it('stores the login token for the current browser session when remember me is disabled', () => {
    service.login({
      email: 'vaibhavi.jilka@example.com',
      password: 'password',
      rememberMe: false
    }).subscribe();

    httpTestingController.expectOne(`${environment.apiUrl}/api/Auth/login`).flush({
      success: true,
      message: 'Logged in',
      data: {
        userId: 'user-id',
        name: 'Vaibhavi Jilka',
        email: 'vaibhavi.jilka@example.com',
        role: 'Admin',
        token: 'access-token'
      },
      errors: []
    });

    expect(service.accessToken()).toBe('access-token');
    expect(service.currentUserId()).toBe('user-id');
    expect(sessionStorage.getItem('orderflow-access-token')).toBe('access-token');
    expect(sessionStorage.getItem('orderflow-user-id')).toBe('user-id');
    expect(sessionStorage.getItem('orderflow-user-name')).toBe('Vaibhavi Jilka');
    expect(sessionStorage.getItem('orderflow-user-email')).toBe('vaibhavi.jilka@example.com');
    expect(sessionStorage.getItem('orderflow-user-role')).toBe('Admin');
    expect(localStorage.getItem('orderflow-access-token')).toBeNull();
  });

  it('rejects unsuccessful login responses without storing authentication state', () => {
    const errors: unknown[] = [];
    service.login({
      email: 'vaibhavi.jilka@example.com',
      password: 'password',
      rememberMe: true
    }).subscribe({ error: error => errors.push(error) });

    httpTestingController.expectOne(`${environment.apiUrl}/api/Auth/login`).flush({
      success: false,
      message: 'Invalid credentials.',
      data: {
        userId: 'user-id',
        name: 'Vaibhavi Jilka',
        email: 'vaibhavi.jilka@example.com',
        role: 'Admin',
        token: 'access-token'
      },
      errors: []
    });

    expect(errors[0]).toBeInstanceOf(AuthenticationError);
    expect(errors[0]).toMatchObject({ message: 'Invalid credentials.' });
    expect(service.accessToken()).toBeNull();
    expect(localStorage.getItem('orderflow-access-token')).toBeNull();
  });

  it('clears expired authentication state and stored identity', () => {
    const tokenPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 }));
    const expiredToken = `header.${tokenPayload}.signature`;
    service.accessToken.set(expiredToken);
    localStorage.setItem('orderflow-access-token', expiredToken);
    localStorage.setItem('orderflow-user-name', 'Old User');
    localStorage.setItem('orderflow-user-email', 'old@example.com');
    localStorage.setItem('orderflow-user-role', 'Admin');

    expect(service.isAuthenticated()).toBe(false);
    expect(service.accessToken()).toBeNull();
    expect(service.currentUserName()).toBe('');
    expect(service.currentUserEmail()).toBe('');
    expect(service.currentUserRole()).toBeNull();
    expect(localStorage.getItem('orderflow-access-token')).toBeNull();
    expect(localStorage.getItem('orderflow-user-name')).toBeNull();
  });
});
