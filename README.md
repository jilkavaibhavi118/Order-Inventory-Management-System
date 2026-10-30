# Order and Inventory Management System

An Angular web application for managing products, inventory, orders, suppliers, and warehouses. It includes a dashboard, customer authentication, and a responsive interface built with PrimeNG.

## Features

- Dashboard with order and inventory summaries
- Product, inventory, supplier, and warehouse management
- Order listing and status management
- Customer registration and login
- Authenticated application routes
- Angular server-side rendering and client hydration

## Technology

- Angular 22
- TypeScript 6
- PrimeNG 21 and PrimeIcons
- RxJS 7
- SCSS
- Angular SSR with Express

## Prerequisites

- Node.js compatible with Angular 22
- npm (the project specifies npm 11.13.0)

## Getting started

```bash
git clone <repository-url>
cd Order-Inventory-Management-System
npm install
```

Configure the backend API base URL in `src/environments/environment.ts` before running the app. The frontend calls the API for authentication and order, product, inventory, supplier, and warehouse data.

Start the development server:

```bash
npm start
```

Open [http://localhost:4200](http://localhost:4200).

## Available scripts

| Command | Description |
|---|---|
| `npm start` | Start the Angular development server |
| `npm run build` | Create a production build, including the server bundle |
| `npm run watch` | Build in development mode and rebuild on changes |
| `npm test` | Run the unit tests |
| `npm run serve:ssr:Order-And-Inventory-Management-System` | Serve the built SSR application |

Run the SSR server after building:

```bash
npm run build
npm run serve:ssr:Order-And-Inventory-Management-System
```

## Project structure

```text
src/
  app/
    core/
      guards/         # Authentication and guest route guards
      interceptors/   # HTTP interceptors
      services/       # Authentication, orders, inventory, and theme services
    features/
      auth/           # Login and registration
      dashboard/      # Dashboard page
      inventory/      # Inventory pages
      orders/         # Order pages
      products/       # Product pages
      suppliers/      # Supplier pages
      warehouses/     # Warehouse pages
    layout/           # Header, sidebar, footer, and main layout
    models/           # Shared API and domain types
    app.routes.ts     # Lazy-loaded application routes
  environments/       # API and build environment configuration
  styles.scss         # Global styles
```

## Authentication

The login and registration pages use the backend endpoints under `/api/Auth`. Authenticated pages are protected by a route guard, and the HTTP auth interceptor attaches the stored access token to requests. The “remember me” option controls whether authentication data is stored for the browser session or persisted in local storage.

## Development notes

- Features are organized by route and loaded lazily.
- Shared API and domain types belong in `src/app/models`.
- Configure the API base URL through the environment configuration rather than hard-coding it in feature components.

## Helpful links

- [Angular documentation](https://angular.dev)
- [PrimeNG documentation](https://primeng.org)
- [RxJS documentation](https://rxjs.dev)
