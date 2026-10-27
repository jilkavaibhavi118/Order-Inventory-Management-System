import { Component, inject, input } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';


@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  host: {
    '[class.collapsed]': 'collapsed()'
  },
  templateUrl: './app-sidebar.component.html',
  styleUrl: './app-sidebar.component.scss'
})
export class AppSidebarComponent {
  readonly collapsed = input(false);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }
}
