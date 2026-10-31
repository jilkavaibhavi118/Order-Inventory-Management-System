import { Component, inject, input } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../core/services/auth.service';


@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  host: {
    '[class.collapsed]': 'collapsed()',
    '[class.mobile-open]': 'mobileOpen()'
  },
  templateUrl: './app-sidebar.component.html',
  styleUrl: './app-sidebar.component.scss'
})
export class AppSidebarComponent {
  readonly collapsed = input(false);
  readonly mobileOpen = input(false);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login').then(
      navigated => {
        if (!navigated) {
          this.reportLogoutNavigationFailure();
        }
      },
      () => this.reportLogoutNavigationFailure()
    );
  }

  private reportLogoutNavigationFailure(): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Navigation failed',
      detail: 'You have been signed out, but the sign-in page could not be opened. Please navigate to /login.',
      life: 5000
    });
  }
}
