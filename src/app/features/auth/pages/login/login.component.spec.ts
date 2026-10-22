import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../services/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthService: {
    login: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
    isAuthenticating: ReturnType<typeof signal<boolean>>;
  };

  beforeEach(async () => {
    mockAuthService = {
      login: vi.fn().mockReturnValue(
        of({
          success: true,
          message: 'Mock login successful'
        })
      ),
      register: vi.fn(),
      isAuthenticating: signal<boolean>(false)
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the login component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form controls with empty values', () => {
    expect(component.emailCtrl.value).toBe('');
    expect(component.passwordCtrl.value).toBe('');
    expect(component.loginForm.controls.rememberMe.value).toBe(false);
    expect(component.loginForm.valid).toBe(false);
  });

  it('should validate email requirement and format', () => {
    const email = component.emailCtrl;
    expect(email.valid).toBe(false);
    expect(email.hasError('required')).toBe(true);

    email.setValue('invalid-email');
    expect(email.valid).toBe(false);
    expect(email.hasError('pattern') || email.hasError('email')).toBe(true);

    email.setValue('valid.user@company.com');
    expect(email.valid).toBe(true);
  });

  it('should validate password requirement', () => {
    const pwd = component.passwordCtrl;
    expect(pwd.valid).toBe(false);
    expect(pwd.hasError('required')).toBe(true);

    pwd.setValue('Secret123!');
    expect(pwd.valid).toBe(true);
  });

  it('should toggle password visibility signal', () => {
    expect(component.showPassword()).toBe(false);
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBe(true);
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBe(false);
  });

  it('should not call authService on submit if form is invalid', () => {
    component.onSubmit();
    expect(mockAuthService.login).not.toHaveBeenCalled();
    expect(component.formSubmitted()).toBe(true);
    expect(component.isFieldInvalid(component.emailCtrl)).toBe(true);
  });

  it('should submit valid credentials and display success feedback', () => {
    component.emailCtrl.setValue('operator@orderflow.io');
    component.passwordCtrl.setValue('SecurePass123!');
    component.loginForm.controls.rememberMe.setValue(true);

    component.onSubmit();
    expect(mockAuthService.login).toHaveBeenCalledWith({
      email: 'operator@orderflow.io',
      password: 'SecurePass123!',
      rememberMe: true
    });

    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.submissionStatus()).toBe('success');
    expect(component.statusMessage()).toContain('Authentication dispatched successfully');
  });

  it('should prevent duplicate submission while already loading', () => {
    component.isLoading.set(true);
    component.emailCtrl.setValue('operator@orderflow.io');
    component.passwordCtrl.setValue('SecurePass123!');

    component.onSubmit();
    expect(mockAuthService.login).not.toHaveBeenCalled();
  });

  it('should handle service errors gracefully', () => {
    mockAuthService.login.mockReturnValue(throwError(() => new Error('Service Unavailable')));

    component.emailCtrl.setValue('operator@orderflow.io');
    component.passwordCtrl.setValue('SecurePass123!');
    component.onSubmit();

    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.submissionStatus()).toBe('error');
    expect(component.statusMessage()).toContain('Service Unavailable');
  });

  it('should open and close forgot password modal', () => {
    expect(component.showForgotPasswordModal()).toBe(false);
    const mockEvent = { preventDefault: vi.fn() } as unknown as Event;
    component.openForgotPassword(mockEvent);
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(component.showForgotPasswordModal()).toBe(true);

    component.closeForgotPassword();
    expect(component.showForgotPasswordModal()).toBe(false);
  });
});
