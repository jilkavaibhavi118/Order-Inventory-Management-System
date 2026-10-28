import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { apiUrl } from '../api/api-config';

export type PreferredPanel = 'admin' | 'customer';

export interface LoginResponse {
  message?: string;
  token?: string;
  userId?: string;
  name?: string;
  data?: {
    token?: string;
    name?: string;
    userId?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly isAuthenticatedState = signal(false);
  readonly currentUserName = signal(this.readStoredUserName());

  constructor(private readonly http: HttpClient) {
    this.syncAuthState();
  }

  register(request: { name: string; email: string; password: string }): Observable<unknown> {
    return this.http.post<unknown>(apiUrl('Auth/register'), request);
  }

  login(email: string, password: string, rememberMe: boolean): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(apiUrl('Auth/login'), { email, password }).pipe(
      tap((response) => {
        const token = response.data?.token ?? response.token;
        if (!token) {
          throw new Error('The login response did not include an access token.');
        }

        if (typeof window !== 'undefined') {
          const preferredStorage = rememberMe ? window.localStorage : window.sessionStorage;
          const otherStorage = rememberMe ? window.sessionStorage : window.localStorage;
          const userId =
            this.asUserId(response.data?.userId ?? response.userId) ??
            this.getUserIdFromToken(token);
          const userName = response.data?.name ?? response.name ?? email;

          preferredStorage.setItem('customer-token', token);
          preferredStorage.setItem('customer-user-name', userName);
          otherStorage.removeItem('customer-token');
          if (userId) {
            preferredStorage.setItem('customer-user-id', userId);
          } else {
            preferredStorage.removeItem('customer-user-id');
          }
          otherStorage.removeItem('customer-user-name');
          otherStorage.removeItem('customer-user-id');
          this.currentUserName.set(userName);
        } else {
          this.currentUserName.set(response.data?.name ?? response.name ?? email);
        }
        this.syncAuthState();
      })
    );
  }

  logout(): void {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('customer-token');
      window.sessionStorage.removeItem('customer-token');
      window.localStorage.removeItem('customer-user-id');
      window.sessionStorage.removeItem('customer-user-id');
      window.localStorage.removeItem('customer-user-name');
      window.sessionStorage.removeItem('customer-user-name');
    }
    this.currentUserName.set('');
    this.syncAuthState();
  }

  getAccessToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.sessionStorage.getItem('customer-token')
      ?? window.localStorage.getItem('customer-token');
  }

  getUserId(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const storedId =
      window.sessionStorage.getItem('customer-user-id') ??
      window.localStorage.getItem('customer-user-id');
    if (storedId) {
      return this.asUserId(storedId);
    }

    const token = this.getAccessToken();
    return token ? this.getUserIdFromToken(token) : null;
  }

  getPreferredPanel(): PreferredPanel | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const panel = localStorage.getItem('preferred-panel');
    return panel === 'admin' || panel === 'customer' ? panel : null;
  }

  setPreferredPanel(panel: PreferredPanel): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferred-panel', panel);
    }
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  private syncAuthState(): void {
    this.isAuthenticatedState.set(this.isAuthenticated());
  }

  private readStoredUserName(): string {
    if (typeof window === 'undefined') {
      return '';
    }

    return window.sessionStorage.getItem('customer-user-name')
      ?? window.localStorage.getItem('customer-user-name')
      ?? '';
  }

  private getUserIdFromToken(token: string): string | null {
    const payload = token.split('.')[1];
    if (!payload || typeof window === 'undefined') {
      return null;
    }

    try {
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const decoded = window.atob(paddedBase64);
      const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
      const claims: unknown = JSON.parse(new TextDecoder().decode(bytes));
      if (!claims || typeof claims !== 'object') {
        return null;
      }

      const values = claims as Record<string, unknown>;
      const claimKeys = [
        'userId',
        'user_id',
        'customerId',
        'customer_id',
        'nameid',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
        'sub'
      ];

      for (const key of claimKeys) {
        const id = this.asUserId(values[key]);
        if (id) {
          return id;
        }
      }
      return null;
    } catch (error) {
      if (error instanceof DOMException || error instanceof SyntaxError) {
        return null;
      }
      throw error;
    }
  }

  private asUserId(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const id = value.trim();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      ? id
      : null;
  }
}
