# HyperStock - Admin Frontend

Enterprise-grade Angular 21 application for managing HyperStock admin users, roles, permissions, and system configuration with a modern reactive architecture.

## Technology Stack

| Technology | Version | Purpose |
|---|---|---|
| Angular | 21 | Framework - Standalone Components, Signals API |
| TypeScript | 5.9 | Type-safe development |
| PrimeNG | 21.1.1 | Enterprise UI component library |
| Angular Signals | - | Reactive state management |
| RxJS | 7.8 | Async programming with observables |
| SCSS | - | Advanced styling with variables and mixins |

## Prerequisites

- Node.js 18+ and npm 9+
- Angular CLI 21+ (`npm install -g @angular/cli`)
- Git for version control

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd hyperstock-frontend-V2

# Install dependencies
npm install

# Start development server
npm start

# Navigate to http://localhost:4200
```

## Project Structure

```
src/
app/
  core/
    guards/
      auth.guard.ts           - Protects authenticated routes
      no-auth.guard.ts        - Redirects logged-in users away from /login
      admin.guard.ts          - Restricts routes to Admin role
    interceptors/
      auth.interceptor.ts     - Attaches Bearer token; handles token refresh on 401
    services/
      auth.service.ts         - Authentication, token & permission management
      auth-error.service.ts   - Prevents duplicate 401 handling
      theme.service.ts        - Dark/light mode, accent color, sidebar state
  features/
    auth/                     - Login page
    dashboard/                - Dashboard overview
    users/                    - Admin user, role & permission management
  layout/
    layout.component.ts       - Main layout wrapper
    sidebar/                  - Permission-driven navigation sidebar
    topbar/                   - Top bar with theme palette & user menu
  models/
    auth.model.ts             - Auth, user, profile & permission interfaces
  app.config.ts               - Providers, interceptors, router config
  app.routes.ts               - Route definitions
environments/
  environment.ts              - Development
  environment.staging.ts      - Staging
  environment.production.ts   - Production
styles.scss                   - Global styles
```

## Authentication Flow

### 1. Login

```
POST /api/v1/admin/auth/login
Body: { email, password }
```

On success the service:
- Stores `accessToken` + `refreshToken` in `localStorage`
- Decodes the JWT to extract the user role
- Immediately calls `GET /api/v1/admin/auth/me` to fetch permissions

### 2. Fetch Permissions (/me)

```
GET /api/v1/admin/auth/me
Header: Authorization: Bearer <accessToken>
```

Expected response shape:

```json
{
  "isSuccess": true,
  "value": {
    "userId": "...",
    "name": "...",
    "email": "...",
    "role": "Admin",
    "permissions": ["Dashboard", "ManageAdminUser", "RolePermissions", "ManageAdminPermissions"]
  }
}
```

- Permissions are cached in `localStorage` (`si_permissions`) for instant display on next page load.
- They are refreshed from the server on every app start.
- The sidebar reactively hides menu items the user has no permission for.

### 3. Token Refresh

When the server responds with **401 Unauthorized** the interceptor automatically:
1. Calls `POST /api/v1/admin/auth/refresh-token` with the stored refresh token.
2. Retries the original request with the new access token.
3. If the refresh token is also expired/invalid -> clears session and redirects to `/login`.

Concurrent requests that 401 at the same time are **queued** and retried with the single new token (no duplicate refresh calls).

```
POST /api/v1/admin/auth/refresh-token
Body: { refreshToken: "<stored refresh token>" }
```

### 4. Logout

- Clears `si_access_token`, `si_refresh_token`, `si_user_info`, `si_permissions` from `localStorage`
- Navigates to `/login`
- Cross-tab sync via `StorageEvent` - all open tabs log out simultaneously

### LocalStorage Keys

| Key | Purpose |
|---|---|
| `si_access_token` | JWT access token |
| `si_refresh_token` | Refresh token |
| `si_user_info` | Cached UserInfo JSON |
| `si_permissions` | Cached permissions array JSON |
| `si_remember_me` | Whether to persist session |
| `si_tab_count` | Open tab counter for session cleanup |

## Navigation (Sidebar)

The sidebar is **permission-driven** - each item is shown only when the user's `/me` permissions include the relevant module key.

| Menu Item | Module Key | Action Checked | Route |
|---|---|---|---|
| **Dashboard** | *(none — always visible)* | — | `/dashboard` |
| Manage Users (group) | any child | — | — |
| - Manage Admin User | `adminUsers` | `adminUsers.list` | `/users/admin` |
| - Role & Permissions | `adminRoles` | `adminRoles.list` | `/users/roles` |
| - Manage Admin Permissions | `adminPermissions` | `adminPermissions.list` | `/users/permissions` |

> **Logic:**
> - While `/me` is loading → show all items (optimistic)
> - Module key absent from response → no restriction (e.g., Dashboard)
> - Module key present, action key present → use its boolean value
> - Module key present, action key absent → allow if any action in that module is `true`
> - Module key present with empty object (`{}`) → deny

### Permission Keys (AppPermissions constant)

```typescript
import { AppPermissions } from './models/auth.model';

AppPermissions.AdminUsers         // 'adminUsers'
AppPermissions.AdminRoles         // 'adminRoles'
AppPermissions.AdminPermissions   // 'adminPermissions'
AppPermissions.OnboardingScreen   // 'onboardingScreen'
AppPermissions.LinnworksSettings  // 'linnworksSettings'
AppPermissions.Sliders            // 'sliders'
// ... and more (see auth.model.ts)
```

To check a specific action (e.g., create) in a component:

```typescript
authService.hasPermission(AppPermissions.AdminUsers, 'create') // checks adminUsers.create
authService.hasPermission(AppPermissions.AdminUsers)           // checks adminUsers.list (default)
```

## Theming

The topbar includes a theme palette popover with:
- 12 preset accent colors (blue, green, purple, orange, cyan, pink, red, indigo, teal, rose, amber, violet)
- Dark / light mode toggle
- Custom color picker - pick any hex color and a full PrimeNG palette is generated automatically via HSL manipulation

## Architecture & Coding Standards

### Standalone Components

All components are standalone with explicit `imports` and `inject()` for DI:

```typescript
@Component({
  selector: 'app-feature',
  imports: [CommonModule, FormsModule, TableModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeatureComponent {
  private service = inject(FeatureService);
}
```

### Signals-Based State Management

```typescript
data = signal<Item[]>([]);
loading = signal(false);
totalCount = computed(() => this.data().length);
```

### Reactive Filter & Pagination Pattern

#### Dual Signal Pattern (Form vs Applied)

```typescript
// Form signals (UI bindings)
searchText = signal('');

// Applied signals (trigger API via effect)
private appliedSearchText = signal('');

// Pagination (never in effect dependencies)
pageNumber = signal<number>(1);
pageSize = signal<number>(100);
firstRow = signal<number>(0);
```

#### Effect - Filters Only

```typescript
constructor() {
  effect(() => {
    this.appliedSearchText(); // tracked
    this.loadData();
  });
}
```

#### Apply Filters (Reset Pagination First)

```typescript
applyFilters() {
  this.pageNumber.set(1);
  this.firstRow.set(0);
  this.appliedSearchText.set(this.searchText()); // triggers effect
}
```

#### Pagination / Sort - Direct Calls (not via effect)

```typescript
onPageChange(event: any) {
  const page = Math.floor(event.first / event.rows) + 1;
  this.pageNumber.set(page);
  this.firstRow.set(event.first);
  this.loadData(); // called directly
}
```

### Service Pattern

```typescript
@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);

  getData(params: QueryParams): Observable<DataResponse> {
    let httpParams = new HttpParams();
    // Use !== undefined for numeric values (0 is valid but falsy)
    if (params.pageNumber !== undefined) {
      httpParams = httpParams.set('PageNumber', params.pageNumber.toString());
    }
    return this.http.get<DataResponse>(url, { params: httpParams });
  }
}
```

### Table Header Styling

All `p-table` headers use a **primary-color background** defined once in `src/styles.scss`:

```scss
.p-datatable .p-datatable-thead > tr > th {
  background: var(--p-primary-color) !important;
  color: var(--p-primary-contrast-color) !important;
}
```

**Do NOT** add per-component table header overrides — the global rule in `styles.scss` applies to every list page automatically.
Sort icon and column title colors inherit `--p-primary-contrast-color` so they remain readable on any accent.

### Table Row Action Menu

All list pages with row-level actions must use a **`p-menu` popup** (ellipsis trigger) instead of standalone icon buttons.
This provides a consistent, extensible UX for adding future actions without refactoring the column layout.

#### Pattern

```typescript
// component.ts
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

// In component imports array:
imports: [ ..., MenuModule ]

getMenuItems(item: ItemType): MenuItem[] {
  return [
    { label: 'Edit',   icon: 'pi pi-pencil', command: () => this.navigateToEdit(item.id) },
    { label: 'Delete', icon: 'pi pi-trash',  command: () => this.deleteItem(item.id) },
  ];
}
```

```html
<!-- In ng-template pTemplate="body" -->
<td>
  <p-menu #rowMenu [model]="getMenuItems(item)" [popup]="true" appendTo="body" />
  <p-button
    icon="pi pi-ellipsis-v"
    severity="secondary"
    [text]="true"
    [rounded]="true"
    (onClick)="rowMenu.toggle($event)"
  />
</td>
```

**Rules:**
- Always use `appendTo="body"` to avoid clipping inside scrollable table containers
- The Actions column header width should be fixed: `style="width: 5rem"`
- Keep the trigger button as `pi pi-ellipsis-v` (vertical ellipsis) — do NOT use pencil/trash icons directly in the column
- Menu item labels must always include both `icon` and `label` — never icon-only items in the menu

## Scripts

```bash
npm start          # Start dev server (http://localhost:4200)
npm run build      # Build for production
npm test           # Run unit tests
npm run watch      # Build in watch mode
```

## Environment Configuration

```typescript
// environment.ts (development)
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5273'
};

// environment.production.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.production.com'
};
```

## Contributing

1. Create a feature branch: `git checkout -b feat/new-feature`
2. Follow the Angular Signals patterns described above
3. Use `ChangeDetectionStrategy.OnPush` on every component
4. Commit with conventional commit messages: `feat(scope): description`
5. Open a pull request

### Commit Types

`feat` - `fix` - `refactor` - `style` - `docs` - `test` - `chore`

## Additional Resources

- [Angular Documentation](https://angular.dev)
- [PrimeNG Components](https://primeng.org)
- [Angular Signals Guide](https://angular.dev/guide/signals)
- [RxJS Documentation](https://rxjs.dev)

---

**Angular**: 22 | **PrimeNG**: 21.1.1 | **TypeScript**: 5.9
