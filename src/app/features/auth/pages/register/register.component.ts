import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '../../components/auth-layout/auth-layout.component';
import { PasswordStrength } from '../../models/auth.models';
import { AuthService } from '../../services/auth.service';
import { evaluatePasswordStrength, passwordMatchValidator } from '../../validators/password-match.validator';

interface RegisterFormModel {
  fullName: FormControl<string>;
  email: FormControl<string>;
  password: FormControl<string>;
  confirmPassword: FormControl<string>;
  acceptTerms: FormControl<boolean>;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
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
      }),
      acceptTerms: new FormControl(false, {
        nonNullable: true,
        validators: [Validators.requiredTrue]
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

  get acceptTermsCtrl(): FormControl<boolean> {
    return this.registerForm.controls.acceptTerms;
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
      next: (response) => {
        this.isLoading.set(false);
        this.submissionStatus.set('success');
        this.statusMessage.set(
          'Customer registration details dispatched successfully. Awaiting backend API connection for account provisioning.'
        );
      },
      error: (err) => {
        this.isLoading.set(false);
        this.submissionStatus.set('error');
        this.statusMessage.set(
          err?.message || 'Registration request could not be processed. Please check your connection.'
        );
      }
    });
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
    } else if (this.acceptTermsCtrl.invalid) {
      document.getElementById('register-terms')?.focus();
    }
  }
}
