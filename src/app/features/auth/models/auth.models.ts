export type UserRole = 'admin' | 'customer';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterCredentials {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
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
