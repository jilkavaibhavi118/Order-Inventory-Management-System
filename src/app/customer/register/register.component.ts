import { Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

interface PasswordRule {
  id: string;
  label: string;
  met: boolean;
}

interface PasswordStrength {
  score: number;
  level: 'empty' | 'weak' | 'fair' | 'good' | 'strong';
  label: string;
  percent: number;
  rules: PasswordRule[];
}

function passwordMatchValidator(passwordName: string, confirmationName: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get(passwordName);
    const confirmation = group.get(confirmationName);
    if (!password || !confirmation) {
      return null;
    }

    const errors = { ...(confirmation.errors ?? {}) };
    if (!confirmation.value) {
      delete errors['passwordMismatch'];
      confirmation.setErrors(Object.keys(errors).length ? errors : null);
      return null;
    }

    if (password.value !== confirmation.value) {
      confirmation.setErrors({ ...errors, passwordMismatch: true });
      return { passwordMismatch: true };
    }

    delete errors['passwordMismatch'];
    confirmation.setErrors(Object.keys(errors).length ? errors : null);
    return null;
  };
}

function evaluatePasswordStrength(password: string): PasswordStrength {
  const rules: PasswordRule[] = [
    { id: 'length', label: 'At least 8 characters', met: password.length >= 8 },
    { id: 'uppercase', label: 'At least one uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { id: 'lowercase', label: 'At least one lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { id: 'number', label: 'At least one number (0-9)', met: /\d/.test(password) },
    { id: 'special', label: 'At least one special character', met: /[^A-Za-z0-9]/.test(password) }
  ];
  const score = rules.filter((rule) => rule.met).length;
  const level: PasswordStrength['level'] = !password
    ? 'empty'
    : score <= 2
      ? 'weak'
      : score === 3
        ? 'fair'
        : score === 4
          ? 'good'
          : 'strong';
  const labels: Record<PasswordStrength['level'], string> = {
    empty: 'Enter password',
    weak: 'Weak',
    fair: 'Fair',
    good: 'Good',
    strong: 'Strong'
  };

  return {
    score,
    level,
    label: labels[level],
    percent: score * 20,
    rules
  };
}


@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);

  // Local UI State Signals
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

  readonly registerForm = new FormGroup(
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

    this.authService.register({
      fullName: formValues.fullName,
      email: formValues.email,
      password: formValues.password,
      confirmPassword: formValues.confirmPassword
    }).subscribe({
      next: response => {
        this.isLoading.set(false);
        this.submissionStatus.set('success');
        const message = this.getResponseMessage(response) ?? 'Registration successful.';
        this.statusMessage.set(message);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.submissionStatus.set('error');
        const message = this.getApiMessage(err);
        const errorMessage = message ?? 'Registration failed. Please try again.';
        this.statusMessage.set(errorMessage);
      }
    });
  }

  private getResponseMessage(response: unknown): string | null {
    if (typeof response !== 'object' || response === null || !('message' in response)) {
      return null;
    }

    const message = response.message;
    return typeof message === 'string' && message.trim() ? message : null;
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
