import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../services/auth.service';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let mockAuthService: {
    login: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
    isAuthenticating: ReturnType<typeof signal<boolean>>;
  };

  beforeEach(async () => {
    mockAuthService = {
      login: vi.fn(),
      register: vi.fn().mockReturnValue(
        of({
          success: true,
          message: 'Mock registration successful'
        })
      ),
      isAuthenticating: signal<boolean>(false)
    };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the register component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form as invalid', () => {
    expect(component.registerForm.valid).toBe(false);
    expect(component.fullNameCtrl.value).toBe('');
    expect(component.emailCtrl.value).toBe('');
    expect(component.passwordCtrl.value).toBe('');
    expect(component.confirmPasswordCtrl.value).toBe('');
    expect(component.acceptTermsCtrl.value).toBe(false);
  });

  it('should validate full name requirement and minlength', () => {
    const ctrl = component.fullNameCtrl;
    expect(ctrl.hasError('required')).toBe(true);

    ctrl.setValue('J');
    expect(ctrl.hasError('minlength')).toBe(true);

    ctrl.setValue('John Doe');
    expect(ctrl.valid).toBe(true);
  });

  it('should validate email format', () => {
    const ctrl = component.emailCtrl;
    ctrl.setValue('not-an-email');
    expect(ctrl.valid).toBe(false);

    ctrl.setValue('john.doe@enterprise.com');
    expect(ctrl.valid).toBe(true);
  });

  it('should compute password strength dynamically', () => {
    expect(component.passwordStrength().level).toBe('empty');

    component.passwordCtrl.setValue('Pass123!');
    expect(component.currentPassword()).toBe('Pass123!');
    expect(component.passwordStrength().level).toBe('strong');
    expect(component.passwordStrength().percent).toBe(100);
  });

  it('should validate password mismatch', () => {
    component.passwordCtrl.setValue('Secret123!');
    component.confirmPasswordCtrl.setValue('Different123!');
    component.registerForm.updateValueAndValidity();

    expect(component.confirmPasswordCtrl.hasError('passwordMismatch')).toBe(true);
    expect(component.registerForm.valid).toBe(false);

    component.confirmPasswordCtrl.setValue('Secret123!');
    component.registerForm.updateValueAndValidity();
    expect(component.confirmPasswordCtrl.hasError('passwordMismatch')).toBe(false);
  });

  it('should require terms acceptance', () => {
    expect(component.acceptTermsCtrl.hasError('required')).toBe(true);

    component.acceptTermsCtrl.setValue(true);
    expect(component.acceptTermsCtrl.valid).toBe(true);
  });

  it('should toggle password visibility signals independently', () => {
    expect(component.showPassword()).toBe(false);
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBe(true);

    expect(component.showConfirmPassword()).toBe(false);
    component.toggleConfirmPasswordVisibility();
    expect(component.showConfirmPassword()).toBe(true);
  });

  it('should not call authService on submit if form is invalid', () => {
    component.onSubmit();
    expect(mockAuthService.register).not.toHaveBeenCalled();
    expect(component.formSubmitted()).toBe(true);
    expect(component.isFieldInvalid(component.fullNameCtrl)).toBe(true);
  });

  it('should submit valid registration data successfully', () => {
    component.fullNameCtrl.setValue('Jane Smith');
    component.emailCtrl.setValue('jane@enterprise.com');
    component.passwordCtrl.setValue('SecurePass123!');
    component.confirmPasswordCtrl.setValue('SecurePass123!');
    component.acceptTermsCtrl.setValue(true);

    component.onSubmit();
    expect(mockAuthService.register).toHaveBeenCalledWith({
      fullName: 'Jane Smith',
      email: 'jane@enterprise.com',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!',
      acceptTerms: true
    });

    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.submissionStatus()).toBe('success');
    expect(component.statusMessage()).toContain('Customer registration details dispatched');
  });

  it('should handle registration failure gracefully', () => {
    mockAuthService.register.mockReturnValue(throwError(() => new Error('Registration failed')));

    component.fullNameCtrl.setValue('Jane Smith');
    component.emailCtrl.setValue('jane@enterprise.com');
    component.passwordCtrl.setValue('SecurePass123!');
    component.confirmPasswordCtrl.setValue('SecurePass123!');
    component.acceptTermsCtrl.setValue(true);

    component.onSubmit();
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.submissionStatus()).toBe('error');
    expect(component.statusMessage()).toContain('Registration failed');
  });

  it('should open and close terms modal', () => {
    expect(component.showTermsModal()).toBe(false);
    const mockEvent = { preventDefault: vi.fn() } as unknown as Event;
    component.openTermsModal(mockEvent);
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(component.showTermsModal()).toBe(true);

    component.closeTermsModal();
    expect(component.showTermsModal()).toBe(false);
  });
});
