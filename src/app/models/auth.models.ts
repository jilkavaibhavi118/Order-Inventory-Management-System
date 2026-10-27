import type { FormControl } from '@angular/forms';

export type UserRole = 'admin' | 'customer';


export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    userId: string;
    name: string;
    email: string;
    role: string;
    token: string;
    expiresAt?: string;
  };
  errors: string[];
}

export interface RegisterFormModel {
  fullName: FormControl<string>;
  email: FormControl<string>;
  password: FormControl<string>;
  confirmPassword: FormControl<string>;
}

export interface RegisterCredentials {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data: null;
  errors: string[];
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: AuthUser;
  token?: string;
  redirectUrl?: string;
}

export interface PasswordRule {
  id: string;
  label: string;
  met: boolean;
}

export type PasswordStrengthLevel = 'empty' | 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordStrength {
  score: number; // 0 to 4
  level: PasswordStrengthLevel;
  label: string;
  percent: number; // 0 to 100
  rules: PasswordRule[];
}
