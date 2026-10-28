import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../../core/auth/auth.service';
import { OrderSummary } from '../../core/models/product.model';
import { OrderService } from '../../core/services/order.service';

@Component({
  selector: 'app-customer-order-details',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, ButtonModule, CardModule, SkeletonModule, TagModule],
  template: `
    <section class="order-detail-page">
      <!-- Back Navigation Link -->
      <div class="top-nav-bar">
        <a routerLink="/my-orders" class="back-link">
          <i class="pi pi-arrow-left" aria-hidden="true"></i>
          <span>Back to All Orders</span>
        </a>

        @if (order()) {
          <button type="button" class="print-receipt-btn" (click)="printReceipt()">
            <i class="pi pi-print"></i>
            <span>Print Receipt</span>
          </button>
        }
      </div>

      @if (loading()) {
        <!-- Skeleton Loading State -->
        <div class="skeleton-panel">
          <p-skeleton width="20%" height="1.2rem" />
          <p-skeleton width="60%" height="2.2rem" />
          <p-skeleton width="100%" height="8rem" borderRadius="1rem" />
        </div>
      } @else if (errorMessage()) {
        <!-- Error State -->
        <div class="state-card error-state">
          <span class="state-icon"><i class="pi pi-exclamation-circle" aria-hidden="true"></i></span>
          <h2>Unable to Open This Order</h2>
          <p>{{ errorMessage() }}</p>
          <p-button label="Return to Orders" icon="pi pi-arrow-left" routerLink="/my-orders" />
        </div>
      } @else if (order(); as currentOrder) {
        <!-- Header -->
        <header class="page-header">
          <div class="header-titles">
            <span class="section-kicker">Order Confirmation & Tracking</span>
            <h1>Order #{{ currentOrder.orderNumber || currentOrder.id.slice(0, 8).toUpperCase() }}</h1>
            <p>
              Placed on {{ currentOrder.createdAt ? (currentOrder.createdAt | date:'mediumDate') : 'Recorded date' }}
              &bull; Verified Customer Account
            </p>
          </div>

          <!-- Status Tag -->
          <span class="status-pill status-{{ (currentOrder.status || 'pending').toLowerCase() }}">
            <span class="status-dot"></span>
            <span>{{ currentOrder.status || 'Pending' }}</span>
          </span>
        </header>

        <!-- 4-Stage Visual Progress Stepper -->
        @if (isCancelled(currentOrder.status)) {
          <div class="cancelled-banner">
            <i class="pi pi-times-circle"></i>
            <div>
              <strong>Order Cancelled</strong>
              <p>This order has been cancelled and will not be dispatched from warehouse inventory.</p>
            </div>
          </div>
        } @else {
          <div class="order-progress-stepper">
            <div class="stepper-track">
              <!-- Step 1: Placed -->
              <div class="step-node" [class.completed]="getStepIndex(currentOrder.status) >= 1" [class.active]="getStepIndex(currentOrder.status) === 1">
                <div class="node-icon">
                  <i [class]="getStepIndex(currentOrder.status) >= 1 ? 'pi pi-check' : 'pi pi-box'"></i>
                </div>
                <div class="node-copy">
                  <strong>Placed</strong>
                  <span>Order Created</span>
                </div>
              </div>

              <div class="step-line" [class.filled]="getStepIndex(currentOrder.status) >= 2"></div>

              <!-- Step 2: Processing -->
              <div class="step-node" [class.completed]="getStepIndex(currentOrder.status) >= 2" [class.active]="getStepIndex(currentOrder.status) === 2">
                <div class="node-icon">
                  <i [class]="getStepIndex(currentOrder.status) >= 2 ? 'pi pi-check' : 'pi pi-cog'"></i>
                </div>
                <div class="node-copy">
                  <strong>Processing</strong>
                  <span>Warehouse Alloc</span>
                </div>
              </div>

              <div class="step-line" [class.filled]="getStepIndex(currentOrder.status) >= 3"></div>

              <!-- Step 3: Shipped -->
              <div class="step-node" [class.completed]="getStepIndex(currentOrder.status) >= 3" [class.active]="getStepIndex(currentOrder.status) === 3">
                <div class="node-icon">
                  <i [class]="getStepIndex(currentOrder.status) >= 3 ? 'pi pi-check' : 'pi pi-truck'"></i>
                </div>
                <div class="node-copy">
                  <strong>Shipped</strong>
                  <span>In Logistics Transit</span>
                </div>
              </div>

              <div class="step-line" [class.filled]="getStepIndex(currentOrder.status) >= 4"></div>

              <!-- Step 4: Delivered -->
              <div class="step-node" [class.completed]="getStepIndex(currentOrder.status) >= 4" [class.active]="getStepIndex(currentOrder.status) === 4">
                <div class="node-icon">
                  <i class="pi pi-home"></i>
                </div>
                <div class="node-copy">
                  <strong>Delivered</strong>
                  <span>Final Handover</span>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Details Grid: Summary Box + Items Breakdown -->
        <div class="details-grid-layout">
          <!-- Summary Box -->
          <div class="summary-panel">
            <h3>Fulfillment Summary</h3>
            <div class="summary-divider"></div>

            <div class="meta-field">
              <span>Order Reference</span>
              <strong>#{{ currentOrder.orderNumber || currentOrder.id }}</strong>
            </div>

            <div class="meta-field">
              <span>Order Date</span>
              <strong>{{ currentOrder.createdAt ? (currentOrder.createdAt | date:'mediumDate') : '—' }}</strong>
            </div>

            <div class="meta-field">
              <span>Fulfillment Node</span>
              <strong>{{ currentOrder.warehouseId ? ('Hub: ' + currentOrder.warehouseId.slice(0, 8)) : 'Assigned Logistics Hub' }}</strong>
            </div>

            <div class="meta-field">
              <span>Payment & Shipping</span>
              <span class="delivery-pill">Standard Fast Dispatch</span>
            </div>

            <div class="summary-divider"></div>

            <div class="meta-field total-meta-field">
              <span>Total Paid</span>
              <strong class="total-paid-amount">{{ currentOrder.total | currency:'INR':'symbol':'1.0-0' }}</strong>
            </div>
          </div>

          <!-- Items Panel -->
          <div class="items-panel">
            <h3>Items in This Order ({{ currentOrder.items?.length || 0 }})</h3>
            <div class="summary-divider"></div>

            @if (currentOrder.items?.length) {
              <div class="items-list">
                @for (item of currentOrder.items; track item.productId) {
                  <div class="order-item-row">
                    <div class="item-icon-box">
                      <i class="pi pi-box" aria-hidden="true"></i>
                    </div>

                    <div class="item-title-meta">
                      <strong>{{ item.productName || item.productSku || 'Product Item' }}</strong>
                      <span class="item-subline">
                        Quantity: {{ item.quantity }} &bull; Unit: {{ (item.unitPrice ?? item.price ?? 0) | currency:'INR':'symbol':'1.0-0' }}
                      </span>
                    </div>

                    <div class="item-row-price">
                      <span class="item-price-caption">Line Total</span>
                      <strong class="item-price-val">
                        {{ (item.unitPrice ?? item.price ?? 0) * item.quantity | currency:'INR':'symbol':'1.0-0' }}
                      </strong>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <p class="no-items-message">No specific item lines were returned for this order.</p>
            }
          </div>
        </div>
      }
    </section>
  `,
  styles: [
    `
      :host { display: block; }

      .order-detail-page {
        display: grid;
        gap: 1.8rem;
        max-width: 1200px;
        margin: 0 auto;
        color: #0f172a;
      }

      /* Top Navigation Bar */
      .top-nav-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .back-link {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        color: #64748b;
        font-size: 0.85rem;
        font-weight: 650;
        text-decoration: none;
        padding: 0.4rem 0.65rem;
        border-radius: 0.55rem;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        transition: all 0.15s ease;
      }

      .back-link:hover {
        color: #4f46e5;
        border-color: #c7d2fe;
        background: #f8fafc;
      }

      .print-receipt-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        padding: 0.45rem 0.85rem;
        border-radius: 0.55rem;
        border: 1px solid #e2e8f0;
        background: #ffffff;
        color: #334155;
        font-size: 0.82rem;
        font-weight: 650;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .print-receipt-btn:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
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
        font-size: clamp(1.8rem, 4vw, 2.5rem);
        font-weight: 850;
        letter-spacing: -0.04em;
      }

      .header-titles p {
        margin: 0;
        color: #64748b;
        font-size: 0.9rem;
      }

      /* Status Pill */
      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.35rem 0.85rem;
        border-radius: 9999px;
        font-size: 0.8rem;
        font-weight: 750;
        text-transform: capitalize;
      }

      .status-dot {
        width: 7px;
        height: 7px;
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

      /* Stepper */
      .order-progress-stepper {
        padding: 1.8rem 2rem;
        border-radius: 1.25rem;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.04);
      }

      .stepper-track {
        display: flex;
        align-items: center;
        justify-content: space-between;
        position: relative;
      }

      .step-node {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        text-align: center;
        z-index: 2;
      }

      .node-icon {
        display: grid;
        width: 2.8rem;
        height: 2.8rem;
        place-items: center;
        border-radius: 50%;
        background: #f1f5f9;
        color: #94a3b8;
        font-size: 1rem;
        border: 2px solid #e2e8f0;
        transition: all 0.25s ease;
      }

      .step-node.active .node-icon {
        background: #eef2ff;
        border-color: #4f46e5;
        color: #4f46e5;
        box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.15);
      }

      .step-node.completed .node-icon {
        background: #4f46e5;
        border-color: #4f46e5;
        color: #ffffff;
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
      }

      .node-copy {
        display: flex;
        flex-direction: column;
        line-height: 1.2;
      }

      .node-copy strong {
        font-size: 0.85rem;
        color: #0f172a;
      }

      .node-copy span {
        font-size: 0.7rem;
        color: #94a3b8;
      }

      .step-line {
        flex: 1;
        height: 3px;
        background: #e2e8f0;
        margin: 0 0.75rem;
        margin-top: -1.75rem;
        transition: background 0.3s ease;
      }

      .step-line.filled {
        background: #4f46e5;
      }

      .cancelled-banner {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        padding: 1.15rem 1.4rem;
        border-radius: 1rem;
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
      }

      .cancelled-banner i {
        font-size: 1.5rem;
        color: #dc2626;
      }

      .cancelled-banner strong {
        display: block;
        font-size: 0.95rem;
      }

      .cancelled-banner p {
        margin: 0.15rem 0 0;
        font-size: 0.82rem;
      }

      /* Details Grid */
      .details-grid-layout {
        display: grid;
        grid-template-columns: minmax(300px, 1fr) minmax(0, 1.8fr);
        align-items: start;
        gap: 1.5rem;
      }

      .summary-panel, .items-panel {
        padding: 1.6rem;
        border-radius: 1.25rem;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.04);
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
      }

      .summary-panel h3, .items-panel h3 {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 800;
        color: #0f172a;
      }

      .summary-divider {
        height: 1px;
        background: #f1f5f9;
        margin: 0.1rem 0;
      }

      .meta-field {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 0.85rem;
        color: #64748b;
        gap: 0.75rem;
      }

      .meta-field strong {
        color: #0f172a;
        font-weight: 650;
        text-align: right;
      }

      .delivery-pill {
        font-size: 0.75rem;
        font-weight: 700;
        color: #16a34a;
        background: #f0fdf4;
        padding: 0.2rem 0.5rem;
        border-radius: 9999px;
      }

      .total-meta-field {
        align-items: baseline;
      }

      .total-paid-amount {
        font-size: 1.45rem;
        font-weight: 900;
        color: #4f46e5;
      }

      /* Items List */
      .items-list {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
      }

      .order-item-row {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.85rem 0;
        border-bottom: 1px solid #f1f5f9;
      }

      .order-item-row:last-child {
        border-bottom: none;
      }

      .item-icon-box {
        display: grid;
        width: 2.8rem;
        height: 2.8rem;
        place-items: center;
        border-radius: 0.85rem;
        background: #eef2ff;
        color: #4f46e5;
        font-size: 1.1rem;
        flex-shrink: 0;
      }

      .item-title-meta {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
      }

      .item-title-meta strong {
        font-size: 0.95rem;
        color: #0f172a;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .item-subline {
        font-size: 0.78rem;
        color: #94a3b8;
      }

      .item-row-price {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }

      .item-price-caption {
        font-size: 0.65rem;
        color: #94a3b8;
        text-transform: uppercase;
      }

      .item-price-val {
        font-size: 1.05rem;
        font-weight: 800;
        color: #0f172a;
      }

      .no-items-message {
        color: #94a3b8;
        font-size: 0.85rem;
      }

      /* Skeleton State */
      .skeleton-panel {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 2rem;
        background: #ffffff;
        border-radius: 1.25rem;
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
        background: #fef2f2;
        color: #dc2626;
        font-size: 1.5rem;
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
      }

      /* Responsive Breakpoints */
      @media (max-width: 800px) {
        .details-grid-layout {
          grid-template-columns: 1fr;
        }

        .stepper-track {
          overflow-x: auto;
          padding-bottom: 0.5rem;
        }

        .node-copy span {
          display: none;
        }
      }

      @media print {
        .top-nav-bar, .customer-header, .customer-footer {
          display: none !important;
        }
        .order-progress-stepper, .summary-panel, .items-panel {
          box-shadow: none !important;
          border: 1px solid #ccc !important;
        }
      }
    `
  ]
})
export class CustomerOrderDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);
  private readonly authService = inject(AuthService);

  protected readonly order = signal<OrderSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (!orderId) {
      this.loading.set(false);
      this.errorMessage.set('The order ID is missing from this page.');
      return;
    }

    this.orderService.getOrderById(orderId).subscribe({
      next: (order) => {
        const customerId = this.authService.getUserId();
        if (
          !customerId ||
          !order.customerId ||
          order.customerId.toLowerCase() !== customerId.toLowerCase()
        ) {
          this.loading.set(false);
          this.errorMessage.set('This order is not available in your account.');
          return;
        }

        this.order.set(order);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Please check your connection and try again.');
      }
    });
  }

  protected isCancelled(status?: string): boolean {
    const s = status?.toLowerCase();
    return s === 'cancelled' || s === 'rejected';
  }

  protected getStepIndex(status?: string): number {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return 4;
      case 'shipped':
        return 3;
      case 'processing':
        return 2;
      case 'pending':
      default:
        return 1;
    }
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

  protected printReceipt(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }
}
