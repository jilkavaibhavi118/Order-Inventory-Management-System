import { Component, computed, inject, output } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss'
})
export class AppHeaderComponent {
  readonly sidebarToggle = output<void>();
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);

  readonly userName = this.authService.currentUserName;
  readonly userRole = this.authService.currentUserRole;
  readonly userInitials = computed(() => {
    const name = this.userName().trim();
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toLocaleUpperCase())
      .join('');
    return initials || '?';
  });
  readonly roleLabel = computed(() => {
    const role = this.userRole()?.trim();
    return role ? role.charAt(0).toLocaleUpperCase() + role.slice(1) : '';
  });
  readonly theme = this.themeService.theme;

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
