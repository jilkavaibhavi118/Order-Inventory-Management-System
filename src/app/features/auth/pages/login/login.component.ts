import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '../../components/auth-layout/auth-layout.component';
import { AuthService } from '../../services/auth.service';

interface LoginFormModel {
  email: FormControl<string>;
  password: FormControl<string>;
  rememberMe: FormControl<boolean>;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly authService = inject(AuthService);

  // Local UI State Signals
  readonly showPassword = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly submissionStatus = signal<'idle' | 'success' | 'error'>('idle');
  readonly statusMessage = signal<string | null>(null);
  readonly showForgotPasswordModal = signal<boolean>(false);

  // Strongly-typed reactive form
  readonly loginForm = new FormGroup<LoginFormModel>({
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
      validators: [Validators.required]
    }),
    rememberMe: new FormControl(false, {
      nonNullable: true
    })
  });

  // Track submission attempt for immediate validation display
  readonly formSubmitted = signal<boolean>(false);

  get emailCtrl(): FormControl<string> {
    return this.loginForm.controls.email;
  }

  get passwordCtrl(): FormControl<string> {
    return this.loginForm.controls.password;
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(visible => !visible);
  }

  isFieldInvalid(control: FormControl): boolean {
    return control.invalid && (control.touched || control.dirty || this.formSubmitted());
  }

  openForgotPassword(event: Event): void {
    event.preventDefault();
    this.showForgotPasswordModal.set(true);
  }

  closeForgotPassword(): void {
    this.showForgotPasswordModal.set(false);
  }

  onSubmit(): void {
    this.formSubmitted.set(true);

    if (this.loginForm.invalid || this.isLoading()) {
      // Focus first invalid field for accessibility
      this.loginForm.markAllAsTouched();
      this.focusFirstInvalidField();
      return;
    }

    this.isLoading.set(true);
    this.submissionStatus.set('idle');
    this.statusMessage.set(null);

    const credentials = this.loginForm.getRawValue();

    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.submissionStatus.set('success');
        this.statusMessage.set(
          'Authentication dispatched successfully. Awaiting backend API connection for role verification and token issuance.'
        );
      },
      error: (err) => {
        this.isLoading.set(false);
        this.submissionStatus.set('error');
        this.statusMessage.set(
          err?.message || 'Authentication request failed. Please check your network connection.'
        );
      }
    });
  }

  private focusFirstInvalidField(): void {
    if (this.emailCtrl.invalid) {
      const emailInput = document.getElementById('login-email');
      emailInput?.focus();
    } else if (this.passwordCtrl.invalid) {
      const passwordInput = document.getElementById('login-password');
      passwordInput?.focus();
    }
  }
}
