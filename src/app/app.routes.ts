import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { LoginComponent } from './customer/login/login.component';
import { SelectPanelComponent } from './customer/select-panel/select-panel.component';
import { RegisterComponent } from './customer/register/register.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'select-panel', component: SelectPanelComponent, canActivate: [authGuard] },
  {
    path: '',
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component').then((module) => module.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard-page/dashboard-page.component').then(
            (module) => module.DashboardPageComponent
          )
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./features/inventory/pages/inventory-page/inventory-page.component').then(
            (module) => module.InventoryPageComponent
          )
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/products/pages/products-page/products-page.component').then(
            (module) => module.ProductsPageComponent
          )
      },
      {
        path: 'suppliers',
        loadComponent: () =>
          import('./features/suppliers/pages/suppliers-page/suppliers-page.component').then(
            (module) => module.SuppliersPageComponent
          )
      },
      {
        path: 'warehouses',
        loadComponent: () =>
          import('./features/warehouses/pages/warehouses-page/warehouses-page.component').then(
            (module) => module.WarehousesPageComponent
          )
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/orders/pages/orders-page/orders-page.component').then(
            (module) => module.OrdersPageComponent
          )
      }
    ]
  },
  {
    path: '',
    loadComponent: () =>
      import('./customer/customer-layout/customer-layout.component').then((module) => module.CustomerLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'shop', pathMatch: 'full' },
      {
        path: 'shop',
        loadComponent: () =>
          import('./customer/customer-shop/customer-shop.component').then((module) => module.CustomerShopComponent)
      },
      {
        path: 'cart',
        loadComponent: () =>
          import('./customer/customer-cart/customer-cart.component').then((module) => module.CustomerCartComponent)
      },
      {
        path: 'my-orders',
        loadComponent: () =>
          import('./customer/customer-orders/customer-orders.component').then((module) => module.CustomerOrdersComponent)
      },
      {
        path: 'my-orders/:id',
        loadComponent: () =>
          import('./customer/customer-order-details/customer-order-details.component').then(
            (module) => module.CustomerOrderDetailComponent
          )
      }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
