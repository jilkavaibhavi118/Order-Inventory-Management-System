import { FormControl, FormGroup } from '@angular/forms';
import { evaluatePasswordStrength, passwordMatchValidator } from './password-match.validator';

describe('Password Validators', () => {
  describe('passwordMatchValidator', () => {
    let form: FormGroup;

    beforeEach(() => {
      form = new FormGroup(
        {
          password: new FormControl(''),
          confirmPassword: new FormControl('')
        },
        { validators: passwordMatchValidator('password', 'confirmPassword') }
      );
    });

    it('should return null when both controls are empty', () => {
      expect(form.errors).toBeNull();
      expect(form.get('confirmPassword')?.errors).toBeNull();
    });

    it('should return null when confirmPassword is empty even if password has value (let required handle it)', () => {
      form.get('password')?.setValue('Secret123!');
      form.updateValueAndValidity();
      expect(form.errors).toBeNull();
      expect(form.get('confirmPassword')?.hasError('passwordMismatch')).toBe(false);
    });

    it('should flag passwordMismatch when values do not match', () => {
      form.get('password')?.setValue('Secret123!');
      form.get('confirmPassword')?.setValue('DifferentPassword!');
      form.updateValueAndValidity();

      expect(form.errors).toEqual({ passwordMismatch: true });
      expect(form.get('confirmPassword')?.hasError('passwordMismatch')).toBe(true);
    });

    it('should clear passwordMismatch error when passwords become identical', () => {
      form.get('password')?.setValue('Secret123!');
      form.get('confirmPassword')?.setValue('DifferentPassword!');
      form.updateValueAndValidity();
      expect(form.get('confirmPassword')?.hasError('passwordMismatch')).toBe(true);

      form.get('confirmPassword')?.setValue('Secret123!');
      form.updateValueAndValidity();
      expect(form.errors).toBeNull();
      expect(form.get('confirmPassword')?.hasError('passwordMismatch')).toBe(false);
    });
  });

  describe('evaluatePasswordStrength', () => {
    it('should handle empty password', () => {
      const res = evaluatePasswordStrength('');
      expect(res.level).toBe('empty');
      expect(res.score).toBe(0);
      expect(res.percent).toBe(0);
      expect(res.rules.every(r => !r.met)).toBe(true);
    });

    it('should evaluate weak password', () => {
      const res = evaluatePasswordStrength('abc');
      expect(res.level).toBe('weak');
      expect(res.rules.find(r => r.id === 'lowercase')?.met).toBe(true);
      expect(res.rules.find(r => r.id === 'length')?.met).toBe(false);
    });

    it('should evaluate fair password', () => {
      // 8 chars, lowercase, uppercase (3 rules)
      const res = evaluatePasswordStrength('Password');
      expect(res.level).toBe('fair');
      expect(res.score).toBe(3);
    });

    it('should evaluate good password', () => {
      // 8 chars, lowercase, uppercase, number (4 rules)
      const res = evaluatePasswordStrength('Password123');
      expect(res.level).toBe('good');
      expect(res.score).toBe(4);
    });

    it('should evaluate strong password', () => {
      // 8 chars, lowercase, uppercase, number, special (5 rules)
      const res = evaluatePasswordStrength('Password123!');
      expect(res.level).toBe('strong');
      expect(res.score).toBe(5);
      expect(res.percent).toBe(100);
      expect(res.rules.every(r => r.met)).toBe(true);
    });
  });
});
