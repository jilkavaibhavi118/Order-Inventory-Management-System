import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { MessageService } from 'primeng/api';
import { App } from './app';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { InventoryService } from './core/services/inventory.service';
import { OrdersService } from './core/services/orders.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideRouter(routes),
        MessageService,
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => true,
            currentUserName: () => '',
            getAccessToken: () => 'test-token',
            getUserId: () => 'test-user',
            logout: vi.fn()
          }
        },
        {
          provide: InventoryService,
          useValue: {
            getProducts: () => of([]),
            getWarehouses: () => of([]),
            getLowStock: () => of([]),
            getInventoryTransactions: () => of({ page: 1, pageSize: 5, totalCount: 0, transactions: [] })
          }
        },
        {
          provide: OrdersService,
          useValue: {
            getOrders: () => of({ page: 1, pageSize: 1, totalCount: 0, orders: [] })
          }
        }
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the router outlet', () => {
    const fixture = TestBed.createComponent(App);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('should render the existing admin dashboard at /dashboard', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(App);

    await router.navigateByUrl('/dashboard');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('app-dashboard-page h1')?.textContent?.trim()).toBe('Dashboard');
    expect(page.querySelector('app-admin-placeholder')).toBeNull();
  });

  it('should navigate from login to the registration screen', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(App);

    await router.navigateByUrl('/login');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const login = fixture.nativeElement as HTMLElement;
    const registerLink = login.querySelector<HTMLAnchorElement>('#link-to-register');
    expect(registerLink).toBeTruthy();
    registerLink?.click();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/register');
    expect((fixture.nativeElement as HTMLElement).querySelector('#register-form')).toBeTruthy();
  });
});
