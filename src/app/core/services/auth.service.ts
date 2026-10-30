import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, finalize, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LoginCredentials,
  LoginRequest,
  LoginResponse,
  RegisterCredentials,
  RegisterResponse,
  RegisterRequest
} from '../../models/auth.models';

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly accessTokenKey = 'orderflow-access-token';
  private readonly userIdKey = 'orderflow-user-id';
  private readonly userNameKey = 'orderflow-user-name';
  private readonly userEmailKey = 'orderflow-user-email';
  private readonly userRoleKey = 'orderflow-user-role';
  private readonly http = inject(HttpClient);
  readonly isAuthenticating = signal(false);
  readonly accessToken = signal(this.readStoredToken());
  readonly currentUserId = signal(this.readStoredUserId());
  readonly currentUserName = signal(this.readStoredUserName());
  readonly currentUserEmail = signal(this.readStoredUserEmail());
  readonly currentUserRole = signal(this.readStoredUserRole());

  setCurrentUser(response: LoginResponse, email: string): void {
    const claims = this.getTokenClaims(response.data?.token ?? this.accessToken());
    const userEmail = response.data?.email || email || this.getClaim(claims, [
      'email',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'
    ]);
    const displayName = response.data?.name
      || this.getClaim(claims, [
        'name',
        'fullName',
        'full_name',
        'given_name',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'
      ])
      || this.getClaim(claims, ['preferred_username', 'unique_name', 'username'])
      || this.readableEmailName(userEmail);

    this.currentUserName.set(displayName);
    this.currentUserEmail.set(userEmail);
    this.currentUserRole.set(response.data?.role || this.getClaim(claims, [
      'role',
      'roles',
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
    ]));
  }

  logout(): void {
    this.currentUserName.set('');
    this.currentUserEmail.set('');
    this.currentUserRole.set(null);
    this.accessToken.set(null);
    this.currentUserId.set(null);
    this.clearStoredAuth();
  }

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    const request: LoginRequest = {
      email: credentials.email,
      password: credentials.password
    };

    return this.sendRequest<LoginResponse>('login', request).pipe(
      tap(response => {
        if (!response.success) {
          throw new AuthenticationError(response.message || 'Login was not successful.');
        }

        if (!response.data?.token) {
          throw new AuthenticationError('The login response did not include an access token.');
        }

        this.storeAuth(
          response.data.token,
          response.data.userId,
          credentials.rememberMe,
          credentials.email,
          response
        );
      })
    );
  }

  register(credentials: RegisterCredentials): Observable<RegisterResponse> {
    const request: RegisterRequest = {
      name: credentials.fullName,
      email: credentials.email,
      password: credentials.password
    };

    return this.sendRequest<RegisterResponse>('register', request);
  }

  private sendRequest<TResponse>(
    endpoint: 'login' | 'register',
    request: LoginRequest | RegisterRequest
  ): Observable<TResponse> {
    this.isAuthenticating.set(true);

    return this.http.post<TResponse>(`${environment.apiUrl}/api/Auth/${endpoint}`, request).pipe(
      finalize(() => this.isAuthenticating.set(false))
    );
  }

  isAuthenticated(): boolean {
    const token = this.accessToken();
    if (!token) {
      return false;
    }

    if (this.isTokenExpired(token)) {
      this.accessToken.set(null);
      this.currentUserId.set(null);
      this.currentUserName.set('');
      this.currentUserEmail.set('');
      this.currentUserRole.set(null);
      this.clearStoredAuth();
      return false;
    }

    return true;
  }

  getValidAccessToken(): string | null {
    return this.isAuthenticated() ? this.accessToken() : null;
  }

  private storeAuth(
    token: string,
    userId: string,
    rememberMe: boolean,
    email: string,
    response: LoginResponse
  ): void {
    this.accessToken.set(token);
    this.currentUserId.set(userId);
    this.setCurrentUser(response, email);
    if (typeof window === 'undefined') {
      return;
    }

    const persistentStorage = rememberMe ? window.localStorage : window.sessionStorage;
    const temporaryStorage = rememberMe ? window.sessionStorage : window.localStorage;
    persistentStorage.setItem(this.accessTokenKey, token);
    persistentStorage.setItem(this.userIdKey, userId);
    persistentStorage.setItem(this.userNameKey, this.currentUserName());
    persistentStorage.setItem(this.userEmailKey, this.currentUserEmail());
    if (this.currentUserRole()) {
      persistentStorage.setItem(this.userRoleKey, this.currentUserRole()!);
    } else {
      persistentStorage.removeItem(this.userRoleKey);
    }
    temporaryStorage.removeItem(this.accessTokenKey);
    temporaryStorage.removeItem(this.userIdKey);
    temporaryStorage.removeItem(this.userNameKey);
    temporaryStorage.removeItem(this.userEmailKey);
    temporaryStorage.removeItem(this.userRoleKey);

    // Keep customer-panel authentication compatible with the shared login.
    persistentStorage.setItem('customer-token', token);
    persistentStorage.setItem('customer-user-id', userId);
    persistentStorage.setItem('customer-user-name', this.currentUserName() || email);
    temporaryStorage.removeItem('customer-token');
    temporaryStorage.removeItem('customer-user-id');
    temporaryStorage.removeItem('customer-user-name');
  }

  private readStoredToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const token = window.sessionStorage.getItem(this.accessTokenKey)
      ?? window.localStorage.getItem(this.accessTokenKey);
    if (token && this.isTokenExpired(token)) {
      this.clearStoredAuth();
      return null;
    }

    return token;
  }

  private readStoredUserId(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.sessionStorage.getItem(this.userIdKey)
      ?? window.localStorage.getItem(this.userIdKey);
  }

  private readStoredUserName(): string {
    if (typeof window === 'undefined') {
      return '';
    }

    const storedName = window.sessionStorage.getItem(this.userNameKey)
      ?? window.localStorage.getItem(this.userNameKey);
    if (storedName) {
      return storedName;
    }

    const token = this.accessToken();
    const claims = token ? this.getTokenClaims(token) : null;
    return this.getClaim(claims, [
      'name',
      'fullName',
      'full_name',
      'given_name',
      'preferred_username',
      'unique_name',
      'username'
    ]) || this.readStoredUserEmail()
      || window.sessionStorage.getItem('customer-user-name')
      || window.localStorage.getItem('customer-user-name')
      || '';
  }

  private readStoredUserEmail(): string {
    if (typeof window === 'undefined') {
      return '';
    }

    const storedEmail = window.sessionStorage.getItem(this.userEmailKey)
      ?? window.localStorage.getItem(this.userEmailKey);
    if (storedEmail) {
      return storedEmail;
    }

    const token = this.accessToken();
    const claims = token ? this.getTokenClaims(token) : null;
    return this.getClaim(claims, [
      'email',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'
    ]);
  }

  private readStoredUserRole(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const storedRole = window.sessionStorage.getItem(this.userRoleKey)
      ?? window.localStorage.getItem(this.userRoleKey);
    if (storedRole) {
      return storedRole;
    }

    const token = this.accessToken();
    const claims = token ? this.getTokenClaims(token) : null;
    return this.getClaim(claims, [
      'role',
      'roles',
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
    ]);
  }

  private getTokenClaims(token: string | null): Record<string, unknown> | null {
    if (!token || typeof window === 'undefined') {
      return null;
    }

    const payload = token.split('.')[1];
    if (!payload) {
      return null;
    }

    try {
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const decoded = window.atob(paddedBase64);
      const bytes = Uint8Array.from(decoded, character => character.charCodeAt(0));
      const claims: unknown = JSON.parse(new TextDecoder().decode(bytes));
      return typeof claims === 'object' && claims !== null
        ? claims as Record<string, unknown>
        : null;
    } catch (error) {
      if (error instanceof DOMException || error instanceof SyntaxError) {
        return null;
      }
      throw error;
    }
  }

  private getClaim(claims: Record<string, unknown> | null, keys: string[]): string {
    for (const key of keys) {
      const claim = claims?.[key];
      if (typeof claim === 'string' && claim.trim()) {
        return claim.trim();
      }
      if (Array.isArray(claim)) {
        const firstValue = claim.find(value => typeof value === 'string' && value.trim());
        if (typeof firstValue === 'string') {
          return firstValue.trim();
        }
      }
    }
    return '';
  }

  private isTokenExpired(token: string): boolean {
    const expiration = this.getTokenClaims(token)?.['exp'];
    return typeof expiration === 'number' && expiration * 1000 <= Date.now();
  }

  private readableEmailName(email: string): string {
    const localPart = email.split('@')[0];
    return localPart
      .split(/[._-]+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toLocaleUpperCase() + part.slice(1))
      .join(' ') || email;
  }

  private clearStoredAuth(): void {
    if (typeof window === 'undefined') {
      return;
    }

    for (const storage of [window.localStorage, window.sessionStorage]) {
      for (const key of [
        this.accessTokenKey,
        this.userIdKey,
        this.userNameKey,
        this.userEmailKey,
        this.userRoleKey,
        'customer-token',
        'customer-user-id',
        'customer-user-name'
      ]) {
        storage.removeItem(key);
      }
    }
  }
}
