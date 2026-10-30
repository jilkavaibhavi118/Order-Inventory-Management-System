import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then(component => component.LoginComponent),
    title: 'OrderFlow — Sign In'
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then(component => component.RegisterComponent),
    title: 'OrderFlow — Create Customer Account'
  },

  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard-page/dashboard-page.component')
            .then(component => component.DashboardPageComponent),
        title: 'OrderFlow — Dashboard'
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./features/inventory/pages/inventory-page/inventory-page.component')
            .then(component => component.InventoryPageComponent),
        title: 'OrderFlow — Inventory'
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/products/pages/products-page/products-page.component')
            .then(component => component.ProductsPageComponent),
        title: 'OrderFlow — Products'
      },
      {
        path: 'suppliers',
        loadComponent: () =>
          import('./features/suppliers/pages/suppliers-page/suppliers-page.component')
            .then(component => component.SuppliersPageComponent),
        title: 'OrderFlow — Suppliers'
      },
      {
        path: 'warehouses',
        loadComponent: () =>
          import('./features/warehouses/pages/warehouses-page/warehouses-page.component')
            .then(component => component.WarehousesPageComponent),
        title: 'OrderFlow — Warehouses'
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/orders/pages/orders-page/orders-page.component')
            .then(component => component.OrdersPageComponent),
        title: 'OrderFlow — Orders'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
