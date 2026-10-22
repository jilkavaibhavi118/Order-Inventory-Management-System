import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { PasswordRule, PasswordStrength } from '../models/auth.models';

/**
 * Validates that the confirm password control value matches the password control value.
 * Sets the 'passwordMismatch' error directly on the confirm password control for clean template bindings.
 */
export function passwordMatchValidator(
  passwordControlName: string = 'password',
  confirmPasswordControlName: string = 'confirmPassword'
): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const passwordCtrl = group.get(passwordControlName);
    const confirmPasswordCtrl = group.get(confirmPasswordControlName);

    if (!passwordCtrl || !confirmPasswordCtrl) {
      return null;
    }

    // If confirm password is untouched or empty, let 'required' validator handle emptiness
    if (!confirmPasswordCtrl.value) {
      clearMismatchError(confirmPasswordCtrl);
      return null;
    }

    if (passwordCtrl.value !== confirmPasswordCtrl.value) {
      const currentErrors = confirmPasswordCtrl.errors || {};
      confirmPasswordCtrl.setErrors({
        ...currentErrors,
        passwordMismatch: true
      });
      return { passwordMismatch: true };
    } else {
      clearMismatchError(confirmPasswordCtrl);
      return null;
    }
  };
}

function clearMismatchError(control: AbstractControl): void {
  if (control.hasError('passwordMismatch')) {
    const errors = { ...control.errors };
    delete errors['passwordMismatch'];
    const hasRemainingErrors = Object.keys(errors).length > 0;
    control.setErrors(hasRemainingErrors ? errors : null);
  }
}

/**
 * Calculates password strength and rule satisfaction metrics.
 */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      level: 'empty',
      label: 'Enter password',
      percent: 0,
      rules: [
        { id: 'length', label: 'At least 8 characters', met: false },
        { id: 'uppercase', label: 'At least one uppercase letter (A-Z)', met: false },
        { id: 'lowercase', label: 'At least one lowercase letter (a-z)', met: false },
        { id: 'number', label: 'At least one number (0-9)', met: false },
        { id: 'special', label: 'At least one special character (!@#$%^&*)', met: false }
      ]
    };
  }

  const rules: PasswordRule[] = [
    { id: 'length', label: 'At least 8 characters', met: password.length >= 8 },
    { id: 'uppercase', label: 'At least one uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { id: 'lowercase', label: 'At least one lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { id: 'number', label: 'At least one number (0-9)', met: /[0-9]/.test(password) },
    { id: 'special', label: 'At least one special character (!@#$%^&*)', met: /[^A-Za-z0-9]/.test(password) }
  ];

  const metCount = rules.filter(r => r.met).length;

  let level: PasswordStrength['level'] = 'weak';
  let label = 'Weak';
  let percent = 20;

  if (metCount <= 2) {
    level = 'weak';
    label = 'Weak';
    percent = Math.max(20, metCount * 20);
  } else if (metCount === 3) {
    level = 'fair';
    label = 'Fair';
    percent = 60;
  } else if (metCount === 4) {
    level = 'good';
    label = 'Good';
    percent = 80;
  } else if (metCount === 5) {
    level = 'strong';
    label = 'Strong';
    percent = 100;
  }

  return {
    score: metCount,
    level,
    label,
    percent,
    rules
  };
}
