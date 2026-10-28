import { Component, inject, OnDestroy, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { AppFooterComponent } from '../app-footer/app-footer.component';
import { AppHeaderComponent } from '../app-header/app-header.component';
import { AppSidebarComponent } from '../app-sidebar/app-sidebar.component';


@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, AppHeaderComponent, AppSidebarComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly routerSubscription: Subscription;
  readonly sidebarCollapsed = signal(false);
  readonly routeLoading = signal(false);

  constructor() {
    this.routerSubscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.routeLoading.set(true);
      } else if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        this.routeLoading.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.routerSubscription.unsubscribe();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(collapsed => !collapsed);
  }
}
