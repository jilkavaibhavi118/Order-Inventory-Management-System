import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should handle login dispatch and update isAuthenticating state', async () => {
    expect(service.isAuthenticating()).toBe(false);

    const loginPromise = firstValueFrom(
      service.login({ email: 'test@example.com', password: 'Password123!', rememberMe: true })
    );

    expect(service.isAuthenticating()).toBe(true);

    const response = await loginPromise;
    expect(response.success).toBe(true);
    expect(service.isAuthenticating()).toBe(false);
  });

  it('should handle register dispatch and update isAuthenticating state', async () => {
    expect(service.isAuthenticating()).toBe(false);

    const registerPromise = firstValueFrom(
      service.register({
        fullName: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        acceptTerms: true
      })
    );

    expect(service.isAuthenticating()).toBe(true);

    const response = await registerPromise;
    expect(response.success).toBe(true);
    expect(service.isAuthenticating()).toBe(false);
  });
});
