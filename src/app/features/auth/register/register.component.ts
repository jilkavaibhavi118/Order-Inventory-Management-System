import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { PasswordStrength, RegisterFormModel } from '../../../models/auth.models';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { HttpErrorResponse } from '@angular/common/http';
import { evaluatePasswordStrength, passwordMatchValidator } from '../validators/password-match.validator';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly themeService = inject(ThemeService);

  // Local UI State Signals
  readonly theme = this.themeService.theme;
  readonly showPassword = signal<boolean>(false);
  readonly showConfirmPassword = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly formSubmitted = signal<boolean>(false);
  readonly submissionStatus = signal<'idle' | 'success' | 'error'>('idle');
  readonly statusMessage = signal<string | null>(null);
  readonly showTermsModal = signal<boolean>(false);

  // Password value signal for real-time reactivity in template
  readonly currentPassword = signal<string>('');

  // Password strength computation signal
  readonly passwordStrength = computed<PasswordStrength>(() =>
    evaluatePasswordStrength(this.currentPassword())
  );

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  readonly registerForm = new FormGroup<RegisterFormModel>(
    {
      fullName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2)]
      }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.email,
          Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
        ]
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/)
        ]
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required]
      })
    },
    {
      validators: [passwordMatchValidator('password', 'confirmPassword')]
    }
  );

  constructor() {
    // Keep currentPassword signal synced with form control for reactive strength analysis
    this.registerForm.controls.password.valueChanges.subscribe(value => {
      this.currentPassword.set(value || '');
    });
  }

  get fullNameCtrl(): FormControl<string> {
    return this.registerForm.controls.fullName;
  }

  get emailCtrl(): FormControl<string> {
    return this.registerForm.controls.email;
  }

  get passwordCtrl(): FormControl<string> {
    return this.registerForm.controls.password;
  }

  get confirmPasswordCtrl(): FormControl<string> {
    return this.registerForm.controls.confirmPassword;
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update(v => !v);
  }

  isFieldInvalid(control: FormControl): boolean {
    return control.invalid && (control.touched || control.dirty || this.formSubmitted());
  }

  openTermsModal(event: Event): void {
    event.preventDefault();
    this.showTermsModal.set(true);
  }

  closeTermsModal(): void {
    this.showTermsModal.set(false);
  }

  onSubmit(): void {
    this.formSubmitted.set(true);

    if (this.registerForm.invalid || this.isLoading()) {
      this.registerForm.markAllAsTouched();
      this.focusFirstInvalidField();
      return;
    }

    this.isLoading.set(true);
    this.submissionStatus.set('idle');
    this.statusMessage.set(null);

    const formValues = this.registerForm.getRawValue();

    this.authService.register(formValues).subscribe({
      next: response => {
        this.isLoading.set(false);
        this.submissionStatus.set('success');
        this.statusMessage.set(response.message);
        this.messageService.add({
          severity: 'success',
          summary: 'Registration successful',
          detail: response.message,
          life: 4000
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        this.submissionStatus.set('error');
        const message = this.getApiMessage(err);
        this.statusMessage.set(message);
        if (message) {
          this.messageService.add({
            severity: 'error',
            detail: message,
            life: 5000
          });
        }
      }
    });
  }

  private getApiMessage(error: unknown): string | null {
    if (!(error instanceof HttpErrorResponse) || error.status === 0) {
      return null;
    }

    const body: unknown = error.error;
    if (typeof body === 'string') {
      const responseText = body.trim();
      try {
        const parsed: unknown = JSON.parse(responseText);
        if (typeof parsed === 'string' && parsed.trim()) {
          return parsed;
        }
        if (typeof parsed === 'object' && parsed !== null && 'message' in parsed) {
          const message = parsed.message;
          return typeof message === 'string' && message.trim() ? message : null;
        }
        return null;
      } catch {
        return responseText.startsWith('<') ? null : responseText || null;
      }
    }

    if (typeof body !== 'object' || body === null || !('message' in body)) {
      return null;
    }

    const message = body.message;
    return typeof message === 'string' && message.trim() ? message : null;
  }

  private focusFirstInvalidField(): void {
    if (this.fullNameCtrl.invalid) {
      document.getElementById('register-name')?.focus();
    } else if (this.emailCtrl.invalid) {
      document.getElementById('register-email')?.focus();
    } else if (this.passwordCtrl.invalid) {
      document.getElementById('register-password')?.focus();
    } else if (this.confirmPasswordCtrl.invalid) {
      document.getElementById('register-confirm-password')?.focus();
    }
  }
}
