import { isPlatformBrowser } from '@angular/common';
import { Component, computed, ElementRef, HostListener, inject, input, output, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router} from '@angular/router';
import { MessageService } from 'primeng/api';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { InventoryService } from '../../core/services/inventory.service';
import { ThemeService } from '../../core/services/theme.service';
import { LowStockRecord, Product } from '../../models/inventory.models';

interface PageLink {
  label: string;
  path: string;
  icon: string;
}

type HeaderMenu = 'search' | 'notifications' | 'user';

const PAGE_LINKS: PageLink[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'pi-th-large' },
  { label: 'Orders', path: '/orders', icon: 'pi-shopping-cart' },
  { label: 'Inventory', path: '/inventory', icon: 'pi-warehouse' },
  { label: 'Products', path: '/products', icon: 'pi-box' },
  { label: 'Suppliers', path: '/suppliers', icon: 'pi-truck' },
  { label: 'Warehouses', path: '/warehouses', icon: 'pi-building' }
];

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss'
})
export class AppHeaderComponent {
  readonly sidebarCollapsed = input(false);
  readonly mobileNavOpen = input(false);
  readonly sidebarToggle = output<void>();

  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly inventoryService = inject(InventoryService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly userName = this.authService.currentUserName;
  readonly userEmail = this.authService.currentUserEmail;
  readonly userRole = this.authService.currentUserRole;
  readonly theme = this.themeService.theme;

  readonly openMenu = signal<HeaderMenu | null>(null);
  readonly searchQuery = signal('');
  readonly activeResult = signal(0);
  readonly products = signal<Product[]>([]);
  readonly lowStock = signal<LowStockRecord[]>([]);
  private productsRequested = false;

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

  readonly lowStockCount = computed(() => this.lowStock().length);
  readonly lowStockPreview = computed(() => this.lowStock().slice(0, 5));

  readonly pageResults = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase();
    return PAGE_LINKS.filter(page => !query || page.label.toLocaleLowerCase().includes(query));
  });

  readonly productResults = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase();
    if (!query) {
      return [];
    }

    return this.products()
      .filter(product =>
        product.name.toLocaleLowerCase().includes(query) || product.sku.toLocaleLowerCase().includes(query)
      )
      .slice(0, 5);
  });

  private readonly resultCount = computed(() => this.pageResults().length + this.productResults().length);

  constructor() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => {
        this.openMenu.set(null);
      });

    if (this.isBrowser) {
      this.inventoryService.getLowStock().subscribe({
        next: records => this.lowStock.set(records),
        error: () => this.lowStock.set([])
      });
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.openMenu() && !this.host.nativeElement.contains(event.target as Node)) {
      this.openMenu.set(null);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.openMenu.set(null);
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleMenu(menu: HeaderMenu): void {
    this.openMenu.update(current => (current === menu ? null : menu));
  }

  openSearch(): void {
    this.openMenu.set('search');
    this.loadProducts();
  }

  updateSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.activeResult.set(0);
    this.openSearch();
  }

  moveResult(step: number, event: Event): void {
    event.preventDefault();
    const count = this.resultCount();
    if (count > 0) {
      this.activeResult.update(index => (index + step + count) % count);
    }
  }

  submitSearch(event: Event): void {
    event.preventDefault();
    const index = this.activeResult();
    const pages = this.pageResults();
    if (index < pages.length) {
      this.goToPage(pages[index]);
      return;
    }

    const product = this.productResults()[index - pages.length];
    if (product) {
      this.goToProduct(product);
    }
  }

  goToPage(page: PageLink): void {
    this.closeSearch();
    void this.router.navigateByUrl(page.path);
  }

  goToProduct(product: Product): void {
    this.closeSearch();
    void this.router.navigate(['/products'], { queryParams: { search: product.name } });
  }

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

  private closeSearch(): void {
    this.searchQuery.set('');
    this.activeResult.set(0);
    this.openMenu.set(null);
  }

  private loadProducts(): void {
    if (this.productsRequested || !this.isBrowser) {
      return;
    }

    this.productsRequested = true;
    this.inventoryService.getProducts().subscribe({
      next: products => this.products.set(products),
      error: () => {
        this.productsRequested = false;
      }
    });
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
