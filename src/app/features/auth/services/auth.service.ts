import { Injectable, signal } from '@angular/core';
import { Observable, delay, of, tap } from 'rxjs';
import { AuthResponse, LoginCredentials, RegisterCredentials } from '../models/auth.models';

/**
 * Authentication Service
 *
 * Provides the boundary between UI components and backend authentication services.
 * Currently configured with realistic simulated responses for UI evaluation,
 * ready to be swapped with HttpClient endpoints when the backend API is connected.
 *
 * Note: Adheres strictly to the architectural boundary:
 * - No fabricated credentials stored in localStorage/sessionStorage.
 * - No fake authentication state assumed.
 * - Real role verification and JWT handling will be managed via HttpClient upon backend availability.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Local UI-visible loading state signal
  readonly isAuthenticating = signal<boolean>(false);

  /**
   * Submits user credentials for authentication.
   *
   * Future Integration:
   * return this.http.post<AuthResponse>('/api/v1/auth/login', credentials);
   */
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    this.isAuthenticating.set(true);

    // Realistic network latency simulation for UI verification
    return of<AuthResponse>({
      success: true,
      message: 'Authentication request dispatched successfully. Ready for backend validation.',
      user: undefined,
      token: undefined
    }).pipe(
      delay(750),
      tap(() => this.isAuthenticating.set(false))
    );
  }

  /**
   * Registers a new customer account.
   * Note: Only customer registration is supported through the public interface.
   *
   * Future Integration:
   * return this.http.post<AuthResponse>('/api/v1/auth/register', credentials);
   */
  register(credentials: RegisterCredentials): Observable<AuthResponse> {
    this.isAuthenticating.set(true);

    return of<AuthResponse>({
      success: true,
      message: 'Account registration dispatched successfully. Ready for backend validation.',
      user: undefined,
      token: undefined
    }).pipe(
      delay(750),
      tap(() => this.isAuthenticating.set(false))
    );
  }
}
