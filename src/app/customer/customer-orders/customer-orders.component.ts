import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../../core/auth/auth.service';
import { OrderPage, OrderSummary } from '../../core/models/product.model';
import { OrderService } from '../../core/services/order.service';

@Component({
  selector: 'app-customer-orders',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule, CardModule, SkeletonModule, TagModule],
  template: `
    <section class="orders-page">
      <!-- Page Header -->
      <header class="page-header">
        <div class="header-titles">
          <span class="section-kicker">Order Fulfillment Tracking</span>
          <h1>My Orders History</h1>
          <p>Monitor your order statuses, view dispatched warehouse details, and access past invoices.</p>
        </div>

        <p-button
          label="Shop More Products"
          icon="pi pi-arrow-right"
          iconPos="right"
          [outlined]="true"
          routerLink="/shop"
          styleClass="shop-btn"
        />
      </header>

      @if (loading()) {
        <!-- Skeleton Loading State -->
        <div class="orders-grid" aria-label="Loading orders">
          @for (placeholder of placeholders; track placeholder) {
            <div class="order-card skeleton-card">
              <div class="skeleton-top">
                <p-skeleton width="30%" height="1rem" />
                <p-skeleton width="20%" height="1.2rem" borderRadius="999px" />
              </div>
              <p-skeleton width="75%" height="1.4rem" />
              <p-skeleton width="45%" height="1rem" />
              <div class="skeleton-bottom">
                <p-skeleton width="35%" height="1.5rem" />
                <p-skeleton width="25%" height="2rem" borderRadius="0.5rem" />
              </div>
            </div>
          }
        </div>
      } @else if (errorMessage()) {
        <!-- Error State -->
        <div class="state-card error-state">
          <span class="state-icon error-icon"><i class="pi pi-exclamation-triangle" aria-hidden="true"></i></span>
          <h2>Orders Aren't Available Right Now</h2>
          <p>{{ errorMessage() }}</p>
          <p-button label="Try Again" icon="pi pi-refresh" (onClick)="loadOrders()" />
        </div>
      } @else if (orders().length === 0) {
        <!-- Empty Orders State -->
        <div class="state-card empty-state">
          <span class="state-icon"><i class="pi pi-receipt" aria-hidden="true"></i></span>
          <h2>{{ totalCount() > 0 ? 'No Orders On This Page' : 'No Orders Placed Yet' }}</h2>
          <p>{{ totalCount() > 0 ? 'Try navigating to another page to see your past orders.' : 'You haven’t placed an order yet. Explore our live catalog to find products and checkout instantly.' }}</p>
          <p-button label="Explore Marketplace" icon="pi pi-arrow-right" iconPos="right" routerLink="/shop" />
          
          @if (totalPages() > 1) {
            <nav class="pagination-controls" aria-label="Order pages">
              <p-button
                label="Previous"
                icon="pi pi-arrow-left"
                [outlined]="true"
                [disabled]="page() <= 1 || loading()"
                (onClick)="loadOrders(page() - 1)"
              />
              <span class="page-indicator">Page {{ page() }} of {{ totalPages() }}</span>
              <p-button
                label="Next"
                icon="pi pi-arrow-right"
                iconPos="right"
                [outlined]="true"
                [disabled]="page() >= totalPages() || loading()"
                (onClick)="loadOrders(page() + 1)"
              />
            </nav>
          }
        </div>
      } @else {
        <!-- Orders Grid -->
        <div class="orders-grid">
          @for (order of orders(); track order.id) {
            <article class="order-card">
              <!-- Top Row: Reference + Status Pill -->
              <div class="order-header-row">
                <div class="order-ref-group">
                  <span class="order-icon-badge">
                    <i class="pi pi-box" aria-hidden="true"></i>
                  </span>
                  <div class="order-id-meta">
                    <span class="order-ref-label">ORDER ID</span>
                    <strong class="order-ref-code">#{{ order.orderNumber || order.id.slice(0, 8).toUpperCase() }}</strong>
                  </div>
                </div>

                <!-- Status Tag with Custom Severity -->
                <span class="status-pill status-{{ (order.status || 'pending').toLowerCase() }}">
                  <span class="status-dot"></span>
                  <span>{{ order.status || 'Pending' }}</span>
                </span>
              </div>

              <!-- Main Order Info -->
              <div class="order-body">
                <h3 class="order-headline" title="{{ order.items?.[0]?.productName || 'Order Items' }}">
                  {{ order.items?.[0]?.productName || 'Order Package' }}
                  @if ((order.items?.length ?? 0) > 1) {
                    <span class="more-items-tag">+{{ (order.items?.length ?? 1) - 1 }} more</span>
                  }
                </h3>

                <div class="order-date-row">
                  <i class="pi pi-calendar"></i>
                  <span>{{ order.createdAt ? (order.createdAt | date:'mediumDate') : 'Date recorded' }}</span>
                </div>
              </div>

              <!-- Footer with Total and CTA -->
              <div class="order-footer-row">
                <div class="order-pricing">
                  <span class="pricing-label">{{ order.items?.length || 0 }} {{ order.items?.length === 1 ? 'Product' : 'Products' }}</span>
                  <strong class="order-total-amount">{{ order.totalAmount | currency:'INR':'symbol':'1.0-0' }}</strong>
                </div>

                <a class="view-details-btn" [routerLink]="['/my-orders', order.id]">
                  <span>Track Details</span>
                  <i class="pi pi-arrow-up-right" aria-hidden="true"></i>
                </a>
              </div>
            </article>
          }
        </div>

        <!-- Pagination Controls -->
        @if (totalPages() > 1) {
          <nav class="pagination-bar" aria-label="Order pages">
            <p-button
              label="Previous"
              icon="pi pi-arrow-left"
              [outlined]="true"
              [disabled]="page() <= 1 || loading()"
              (onClick)="loadOrders(page() - 1)"
            />
            <span class="page-indicator">Page <strong>{{ page() }}</strong> of {{ totalPages() }}</span>
            <p-button
              label="Next"
              icon="pi pi-arrow-right"
              iconPos="right"
              [outlined]="true"
              [disabled]="page() >= totalPages() || loading()"
              (onClick)="loadOrders(page() + 1)"
            />
          </nav>
        }
      }
    </section>
  `,
  styles: [
    `
      :host { display: block; }

      .orders-page {
        display: grid;
        gap: 2rem;
        max-width: 1360px;
        margin: 0 auto;
        color: #0f172a;
      }

      /* Header */
      .page-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1.25rem;
      }

      .section-kicker {
        color: #4f46e5;
        font-size: 0.72rem;
        font-weight: 750;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0.25rem 0 0.35rem;
        color: #0f172a;
        font-size: clamp(2rem, 4vw, 2.7rem);
        font-weight: 850;
        letter-spacing: -0.04em;
      }

      .header-titles p {
        margin: 0;
        color: #64748b;
        font-size: 0.95rem;
      }

      :host ::ng-deep .shop-btn {
        border-radius: 0.75rem;
        font-weight: 650;
      }

      /* Orders Grid */
      .orders-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
        gap: 1.35rem;
      }

      /* Order Card */
      .order-card {
        display: flex;
        flex-direction: column;
        border-radius: 1.25rem;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.04);
        padding: 1.35rem;
        gap: 1rem;
        transition: all 0.2s ease;
      }

      .order-card:hover {
        transform: translateY(-3px);
        border-color: #cbd5e1;
        box-shadow: 0 14px 30px -4px rgba(15, 23, 42, 0.09);
      }

      /* Top Row */
      .order-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
      }

      .order-ref-group {
        display: flex;
        align-items: center;
        gap: 0.65rem;
      }

      .order-icon-badge {
        display: grid;
        width: 2.3rem;
        height: 2.3rem;
        place-items: center;
        border-radius: 0.75rem;
        background: #eef2ff;
        color: #4f46e5;
        font-size: 0.95rem;
      }

      .order-id-meta {
        display: flex;
        flex-direction: column;
        line-height: 1.15;
      }

      .order-ref-label {
        font-size: 0.62rem;
        color: #94a3b8;
        font-weight: 700;
        letter-spacing: 0.06em;
      }

      .order-ref-code {
        font-size: 0.9rem;
        color: #0f172a;
        letter-spacing: 0.02em;
      }

      /* Status Badges with Glow */
      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.28rem 0.65rem;
        border-radius: 9999px;
        font-size: 0.72rem;
        font-weight: 750;
        text-transform: capitalize;
      }

      .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
      }

      .status-pending {
        background: #fffbeb;
        color: #d97706;
        border: 1px solid #fde68a;
      }
      .status-pending .status-dot {
        background: #f59e0b;
        box-shadow: 0 0 6px #f59e0b;
      }

      .status-processing, .status-shipped {
        background: #eff6ff;
        color: #2563eb;
        border: 1px solid #bfdbfe;
      }
      .status-processing .status-dot, .status-shipped .status-dot {
        background: #3b82f6;
        box-shadow: 0 0 6px #3b82f6;
      }

      .status-delivered, .status-completed {
        background: #ecfdf5;
        color: #059669;
        border: 1px solid #a7f3d0;
      }
      .status-delivered .status-dot, .status-completed .status-dot {
        background: #10b981;
        box-shadow: 0 0 6px #10b981;
      }

      .status-cancelled, .status-rejected {
        background: #fef2f2;
        color: #dc2626;
        border: 1px solid #fecaca;
      }
      .status-cancelled .status-dot, .status-rejected .status-dot {
        background: #ef4444;
      }

      /* Body */
      .order-body {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .order-headline {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 750;
        color: #0f172a;
        display: flex;
        align-items: center;
        gap: 0.45rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .more-items-tag {
        font-size: 0.7rem;
        font-weight: 650;
        color: #64748b;
        background: #f1f5f9;
        padding: 0.15rem 0.45rem;
        border-radius: 9999px;
      }

      .order-date-row {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.78rem;
        color: #94a3b8;
      }

      /* Footer */
      .order-footer-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: auto;
        padding-top: 0.85rem;
        border-top: 1px solid #f1f5f9;
      }

      .order-pricing {
        display: flex;
        flex-direction: column;
      }

      .pricing-label {
        font-size: 0.68rem;
        color: #94a3b8;
      }

      .order-total-amount {
        font-size: 1.18rem;
        font-weight: 850;
        color: #0f172a;
      }

      .view-details-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        padding: 0.5rem 0.85rem;
        border-radius: 0.65rem;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        color: #4f46e5;
        font-size: 0.8rem;
        font-weight: 700;
        text-decoration: none;
        transition: all 0.16s ease;
      }

      .view-details-btn:hover {
        background: #eef2ff;
        border-color: #c7d2fe;
        transform: translateY(-1px);
      }

      /* Skeleton State */
      .skeleton-card {
        padding: 1.35rem;
        gap: 1rem;
      }

      .skeleton-top, .skeleton-bottom {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      /* State Cards */
      .state-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 4rem 1.5rem;
        background: #ffffff;
        border-radius: 1.25rem;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
        max-width: 580px;
        margin: 0 auto;
        gap: 0.85rem;
      }

      .state-icon {
        display: grid;
        width: 3.8rem;
        height: 3.8rem;
        place-items: center;
        border-radius: 1.25rem;
        background: #eef2ff;
        color: #4f46e5;
        font-size: 1.5rem;
      }

      .error-state .error-icon {
        background: #fef2f2;
        color: #dc2626;
      }

      .state-card h2 {
        margin: 0;
        font-size: 1.35rem;
        font-weight: 800;
        color: #0f172a;
      }

      .state-card p {
        margin: 0;
        color: #64748b;
        font-size: 0.92rem;
        line-height: 1.5;
      }

      .pagination-bar {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1.25rem;
        margin-top: 1rem;
      }

      .page-indicator {
        font-size: 0.88rem;
        color: #64748b;
      }

      .page-indicator strong {
        color: #0f172a;
      }

      @media (max-width: 600px) {
        .page-header {
          flex-direction: column;
          align-items: flex-start;
        }

        .orders-grid {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class CustomerOrdersComponent {
  private readonly authService = inject(AuthService);
  private readonly orderService = inject(OrderService);

  protected readonly orders = signal<OrderSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly page = signal(1);
  protected readonly pageSize = 50;
  protected readonly totalCount = signal(0);
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize)));
  protected readonly placeholders = [1, 2, 3];

  ngOnInit(): void {
    this.loadOrders();
  }

  protected loadOrders(page = 1): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.page.set(page);

    const customerId = this.authService.getUserId();
    if (!customerId) {
      this.orders.set([]);
      this.totalCount.set(0);
      this.loading.set(false);
      this.errorMessage.set('We could not identify your customer account. Sign out and sign in again.');
      return;
    }

    this.orderService.getOrders(page, this.pageSize).subscribe({
      next: (result: OrderPage) => {
        const orders = result.orders.filter(
          (order) => order.customerId?.toLowerCase() === customerId.toLowerCase()
        );
        this.orders.set(orders);
        this.totalCount.set(result.totalCount);
        this.loading.set(false);
      },
      error: () => {
        this.orders.set([]);
        this.totalCount.set(0);
        this.loading.set(false);
        this.errorMessage.set('Please check your connection and try again.');
      }
    });
  }

  protected statusSeverity(status?: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return 'success';
      case 'cancelled':
      case 'rejected':
        return 'danger';
      case 'processing':
      case 'shipped':
        return 'info';
      case 'pending':
        return 'warn';
      default:
        return 'secondary';
    }
  }
}
