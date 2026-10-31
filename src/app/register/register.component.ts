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
import { ProgressBarModule } from 'primeng/progressbar';
import { PasswordRule, PasswordStrength } from '../models/auth.models';
import { AuthService } from '../core/services/auth.service';


function passwordMatchValidator(passwordName: string, confirmationName: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get(passwordName);
    const confirmation = group.get(confirmationName);
    if (!password || !confirmation) {
      return null;
    }

    const errors = { ...confirmation.errors };
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
  let level: PasswordStrength['level'];

  if (!password) {
    level = 'empty';
  } else if (score <= 2) {
    level = 'weak';
  } else if (score === 3) {
    level = 'fair';
  } else if (score === 4) {
    level = 'good';
  } else {
    level = 'strong';
  }

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

function getNonEmptyMessage(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function getMessageFromObject(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || !('message' in value)) {
    return null;
  }

  return getNonEmptyMessage(value.message);
}

function getMessageFromText(responseText: string): string | null {
  try {
    const parsed: unknown = JSON.parse(responseText);
    return typeof parsed === 'string'
      ? getNonEmptyMessage(parsed)
      : getMessageFromObject(parsed);
  } catch {
    return responseText.startsWith('<') ? null : responseText || null;
  }
}

function getMessageFromBody(body: unknown): string | null {
  return typeof body === 'string'
    ? getMessageFromText(body.trim())
    : getMessageFromObject(body);
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ProgressBarModule],
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
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/)
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

    return getMessageFromBody(error.error);
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
