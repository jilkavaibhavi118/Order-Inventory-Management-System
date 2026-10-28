import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'dashboard', renderMode: RenderMode.Client },
  { path: 'inventory', renderMode: RenderMode.Client },
  { path: 'products', renderMode: RenderMode.Client },
  { path: 'suppliers', renderMode: RenderMode.Client },
  { path: 'warehouses', renderMode: RenderMode.Client },
  { path: 'orders', renderMode: RenderMode.Client },
  {
    path: '**',
    renderMode: RenderMode.Server
  }
];
