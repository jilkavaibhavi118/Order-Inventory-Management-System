import { computed, inject, Injectable } from '@angular/core';
import { AuthService as SharedAuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sharedAuthService = inject(SharedAuthService);

  readonly currentUserName = computed(() => this.sharedAuthService.currentUserName());
  readonly currentUserId = () => this.sharedAuthService.getUserId();

  logout(): void {
    this.sharedAuthService.logout();
  }
}
