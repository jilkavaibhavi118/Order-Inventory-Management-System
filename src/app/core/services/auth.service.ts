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

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly accessTokenKey = 'orderflow-access-token';
  private readonly userIdKey = 'orderflow-user-id';
  private readonly http = inject(HttpClient);
  readonly isAuthenticating = signal(false);
  readonly currentUserName = signal('');
  readonly accessToken = signal(this.readStoredToken());
  readonly currentUserId = signal(this.readStoredUserId());

  setCurrentUser(response: LoginResponse, email: string): void {
    const emailName = email.split('@')[0]
      .split(/[._-]+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toLocaleUpperCase() + part.slice(1))
      .join(' ');

    this.currentUserName.set(response.data.name || emailName || email);
  }

  logout(): void {
    this.currentUserName.set('');
    this.accessToken.set(null);
    this.currentUserId.set(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(this.accessTokenKey);
      window.sessionStorage.removeItem(this.accessTokenKey);
      window.localStorage.removeItem(this.userIdKey);
      window.sessionStorage.removeItem(this.userIdKey);
    }
  }

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    const request: LoginRequest = {
      email: credentials.email,
      password: credentials.password
    };

    return this.sendRequest<LoginResponse>('login', request).pipe(
      tap(response => this.storeAuth(
        response.data.token,
        response.data.userId,
        credentials.rememberMe
      ))
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

  private storeAuth(token: string, userId: string, rememberMe: boolean): void {
    this.accessToken.set(token);
    this.currentUserId.set(userId);
    if (typeof window === 'undefined') {
      return;
    }

    const persistentStorage = rememberMe ? window.localStorage : window.sessionStorage;
    const temporaryStorage = rememberMe ? window.sessionStorage : window.localStorage;
    persistentStorage.setItem(this.accessTokenKey, token);
    persistentStorage.setItem(this.userIdKey, userId);
    temporaryStorage.removeItem(this.accessTokenKey);
    temporaryStorage.removeItem(this.userIdKey);
  }

  private readStoredToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.sessionStorage.getItem(this.accessTokenKey)
      ?? window.localStorage.getItem(this.accessTokenKey);
  }

  private readStoredUserId(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.sessionStorage.getItem(this.userIdKey)
      ?? window.localStorage.getItem(this.userIdKey);
  }
}
