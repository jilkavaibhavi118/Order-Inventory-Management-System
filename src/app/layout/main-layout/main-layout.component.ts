import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterModule,
  RouterOutlet
} from '@angular/router';
import { AppHeaderComponent } from '../app-header/app-header.component';
import { AppSidebarComponent } from '../app-sidebar/app-sidebar.component';

const MOBILE_BREAKPOINT = '(max-width: 900px)';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, AppHeaderComponent, AppSidebarComponent, RouterModule],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly sidebarCollapsed = signal(false);
  readonly mobileNavOpen = signal(false);
  readonly isNavigating = signal(false);
  readonly routeLoading = signal(false);

  constructor() {
    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      if (event instanceof NavigationStart) {
        this.isNavigating.set(true);
        this.routeLoading.set(true);
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.routeLoading.set(false);
        this.mobileNavOpen.set(false);
        setTimeout(() => this.isNavigating.set(false), 200);
      }
    });
  }

  /** Collapses the sidebar on desktop and opens the slide-over menu on small screens. */
  toggleSidebar(): void {
    if (this.isBrowser && window.matchMedia(MOBILE_BREAKPOINT).matches) {
      this.mobileNavOpen.update(open => !open);
      return;
    }

    this.sidebarCollapsed.update(collapsed => !collapsed);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }
}
