import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { authGuard as customerAuthGuard } from './core/auth/auth.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'select-panel'
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(component => component.LoginComponent),
    title: 'OrderFlow — Sign In'
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(component => component.RegisterComponent),
    title: 'OrderFlow — Create Customer Account'
  },
  {
    path: 'select-panel',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./customer/select-panel/select-panel.component').then(component => component.SelectPanelComponent),
    title: 'OrderFlow — Select Workspace'
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
    path: '',
    loadComponent: () =>
      import('./customer/customer-layout/customer-layout.component').then(component => component.CustomerLayoutComponent),
    canActivate: [customerAuthGuard],
    children: [
      {
        path: 'shop',
        loadComponent: () =>
          import('./customer/customer-shop/customer-shop.component').then(component => component.CustomerShopComponent),
        title: 'OrderFlow — Customer Marketplace'
      },
      {
        path: 'cart',
        loadComponent: () =>
          import('./customer/customer-cart/customer-cart.component').then(component => component.CustomerCartComponent),
        title: 'OrderFlow — Shopping Cart'
      },
      {
        path: 'my-orders',
        loadComponent: () =>
          import('./customer/customer-orders/customer-orders.component').then(component => component.CustomerOrdersComponent),
        title: 'OrderFlow — My Orders'
      },
      {
        path: 'my-orders/:id',
        loadComponent: () =>
          import('./customer/customer-order-details/customer-order-details.component').then(component => component.CustomerOrderDetailComponent),
        title: 'OrderFlow — Order Details'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'select-panel'
  }
];
