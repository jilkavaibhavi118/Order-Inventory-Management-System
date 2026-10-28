import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  // Local UI State Signals
  readonly showPassword = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly submissionStatus = signal<'idle' | 'success' | 'error'>('idle');
  readonly statusMessage = signal<string | null>(null);
  readonly showForgotPasswordModal = signal<boolean>(false);

  // Strongly-typed reactive form
  readonly loginForm = new FormGroup({
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
      next: response => {
        this.isLoading.set(false);
        this.submissionStatus.set('success');
        this.statusMessage.set(response.message);
        this.authService.setCurrentUser(response, credentials.email);
        this.messageService.add({
          severity: 'success',
          summary: 'Login successful',
          detail: response.message,
          life: 3000
        });
        // A successful sign-in always opens the workspace selector first.
        void this.router.navigate(['/select-panel']);
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
    if (this.emailCtrl.invalid) {
      const emailInput = document.getElementById('login-email');
      emailInput?.focus();
    } else if (this.passwordCtrl.invalid) {
      const passwordInput = document.getElementById('login-password');
      passwordInput?.focus();
    }
  }
}
