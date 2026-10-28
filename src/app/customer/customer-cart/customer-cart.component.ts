import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { ProductService } from '../../core/services/product.service';
import { InventoryRecord } from '../../core/models/product.model';

@Component({
  selector: 'app-customer-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule, CardModule, InputNumberModule, TagModule],
  template: `
    <section class="cart-page">
      <!-- Page Header -->
      <header class="cart-header">
        <div class="header-titles">
          <span class="section-kicker">Review & Checkout</span>
          <h1>Your Shopping Cart</h1>
          <p>Review items in your order, verify quantities, and dispatch from available inventory.</p>
        </div>

        @if (items().length > 0) {
          <div class="header-badges">
            <span class="item-count-pill">
              <i class="pi pi-shopping-bag"></i>
              <span>{{ totalItems() }} {{ totalItems() === 1 ? 'Item' : 'Items' }}</span>
            </span>
          </div>
        }
      </header>

      @if (items().length === 0) {
        <!-- Empty Cart State -->
        <div class="empty-state-box">
          <div class="empty-icon-wrap">
            <i class="pi pi-shopping-cart" aria-hidden="true"></i>
          </div>
          <h2>Your Cart is Currently Empty</h2>
          <p>You haven't added any products to your cart yet. Explore our live catalog to discover items in stock.</p>
          <p-button
            label="Explore Products"
            icon="pi pi-arrow-right"
            iconPos="right"
            routerLink="/shop"
            styleClass="explore-btn"
          />
        </div>
      } @else {
        <!-- Two Column Checkout Layout -->
        <div class="cart-grid-layout">
          <!-- Left Column: Items List -->
          <div class="cart-items-column">
            @for (item of items(); track item.product.id) {
              <article class="cart-item-card">
                <!-- Art / Monogram Thumbnail -->
                <div class="item-art-thumb" [class]="artClass(item.product.category)">
                  <span>{{ item.product.name.charAt(0) }}</span>
                </div>

                <!-- Product Info -->
                <div class="item-details">
                  <span class="item-cat-badge">{{ item.product.category || 'General' }}</span>
                  <h3 title="{{ item.product.name }}">{{ item.product.name }}</h3>
                  <span class="item-sku">SKU: {{ item.product.sku }}</span>
                  <strong class="item-unit-price">{{ item.product.sellPrice | currency:'INR':'symbol':'1.0-0' }} each</strong>
                </div>

                <!-- Quantity Increment / Decrement Stepper -->
                <div class="item-stepper-control">
                  <span class="stepper-label">Quantity</span>
                  <div class="stepper-buttons">
                    <button
                      type="button"
                      class="step-btn"
                      aria-label="Decrease quantity"
                      (click)="updateQuantity(item.product.id, item.quantity - 1)"
                    >
                      <i class="pi pi-minus"></i>
                    </button>
                    
                    <span class="quantity-number">{{ item.quantity }}</span>

                    <button
                      type="button"
                      class="step-btn"
                      aria-label="Increase quantity"
                      (click)="updateQuantity(item.product.id, item.quantity + 1)"
                    >
                      <i class="pi pi-plus"></i>
                    </button>
                  </div>

                  <button
                    type="button"
                    class="remove-item-btn"
                    (click)="remove(item.product.id)"
                    title="Remove item from cart"
                  >
                    <i class="pi pi-trash"></i>
                    <span>Remove</span>
                  </button>
                </div>

                <!-- Item Subtotal Amount -->
                <div class="item-total-box">
                  <span class="line-total-caption">Total</span>
                  <strong class="line-total-amount">
                    {{ (item.product.sellPrice ?? 0) * item.quantity | currency:'INR':'symbol':'1.0-0' }}
                  </strong>
                </div>
              </article>
            }
          </div>

          <!-- Right Column: Sticky Summary Box -->
          <aside class="cart-summary-column">
            <div class="summary-card">
              <span class="summary-kicker">Order Overview</span>
              <h2>Order Summary</h2>

              <div class="summary-divider"></div>

              <div class="summary-rows-group">
                <div class="summary-row">
                  <span>Total Items</span>
                  <strong>{{ totalItems() }}</strong>
                </div>
                <div class="summary-row">
                  <span>Cart Subtotal</span>
                  <strong>{{ totalAmount() | currency:'INR':'symbol':'1.0-0' }}</strong>
                </div>
                <div class="summary-row">
                  <span>Warehouse Delivery</span>
                  <span class="delivery-status-free">Free Standard Dispatch</span>
                </div>
              </div>

              <div class="summary-divider"></div>

              <div class="summary-total-row">
                <div>
                  <span class="total-label">Grand Total</span>
                  <span class="tax-note">All taxes included</span>
                </div>
                <strong class="grand-total-amount">{{ totalAmount() | currency:'INR':'symbol':'1.0-0' }}</strong>
              </div>

              <!-- Real-time Warehouse Inventory Assurance -->
              <div class="warehouse-assurance-box">
                <i class="pi pi-building text-primary"></i>
                <div class="assurance-text">
                  <strong>Multi-Warehouse Routing</strong>
                  <p>Checked automatically during placement to route from the closest hub.</p>
                </div>
              </div>

              <p-button
                label="Place Order Now"
                icon="pi pi-arrow-right"
                iconPos="right"
                [fluid]="true"
                [loading]="checkoutBusy()"
                [disabled]="checkoutBusy()"
                styleClass="place-order-button"
                (onClick)="checkout()"
              />

              <div class="security-guarantee">
                <i class="pi pi-shield" aria-hidden="true"></i>
                <span>Encrypted & Verified Order Processing</span>
              </div>
            </div>
          </aside>
        </div>
      }
    </section>
  `,
  styles: [
    `
      :host { display: block; }

      .cart-page {
        display: grid;
        gap: 2rem;
        max-width: 1360px;
        margin: 0 auto;
        color: #0f172a;
      }

      /* Page Header */
      .cart-header {
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

      .item-count-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        padding: 0.45rem 0.9rem;
        border-radius: 9999px;
        background: #eef2ff;
        color: #4f46e5;
        font-size: 0.82rem;
        font-weight: 750;
      }

      /* Empty State Box */
      .empty-state-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 4.5rem 1.5rem;
        background: #ffffff;
        border-radius: 1.5rem;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
        max-width: 600px;
        margin: 2rem auto;
        gap: 0.85rem;
      }

      .empty-icon-wrap {
        display: grid;
        width: 4.5rem;
        height: 4.5rem;
        place-items: center;
        border-radius: 1.5rem;
        background: #eef2ff;
        color: #4f46e5;
        font-size: 1.8rem;
        margin-bottom: 0.5rem;
      }

      .empty-state-box h2 {
        margin: 0;
        font-size: 1.45rem;
        font-weight: 800;
        color: #0f172a;
      }

      .empty-state-box p {
        margin: 0;
        color: #64748b;
        font-size: 0.92rem;
        max-width: 440px;
        line-height: 1.5;
      }

      :host ::ng-deep .explore-btn {
        margin-top: 0.5rem;
        border-radius: 0.75rem;
        padding: 0.75rem 1.4rem;
        font-weight: 700;
      }

      /* Two Column Layout */
      .cart-grid-layout {
        display: grid;
        grid-template-columns: minmax(0, 1.85fr) minmax(320px, 1fr);
        align-items: start;
        gap: 1.8rem;
      }

      .cart-items-column {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      /* Cart Item Card */
      .cart-item-card {
        display: grid;
        grid-template-columns: 88px minmax(0, 1.4fr) auto auto;
        align-items: center;
        gap: 1.25rem;
        padding: 1.25rem;
        border-radius: 1.25rem;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.04);
        transition: all 0.18s ease;
      }

      .cart-item-card:hover {
        border-color: #cbd5e1;
        box-shadow: 0 8px 24px -4px rgba(15, 23, 42, 0.08);
      }

      .item-art-thumb {
        display: grid;
        width: 88px;
        height: 88px;
        place-items: center;
        border-radius: 1rem;
        background: linear-gradient(135deg, #eef2ff, #e0e7ff);
        flex-shrink: 0;
      }

      .art-accessories {
        background: linear-gradient(135deg, #fef3c7, #fed7aa);
      }

      .art-general {
        background: linear-gradient(135deg, #dcfce7, #bbf7d0);
      }

      .item-art-thumb span {
        display: grid;
        width: 46px;
        height: 46px;
        place-items: center;
        border-radius: 0.85rem;
        background: rgba(255, 255, 255, 0.95);
        color: #4f46e5;
        font-size: 1.4rem;
        font-weight: 850;
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15);
      }

      .item-details {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        min-width: 0;
      }

      .item-cat-badge {
        font-size: 0.65rem;
        font-weight: 750;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #4f46e5;
      }

      .item-details h3 {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 750;
        color: #0f172a;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .item-sku {
        font-size: 0.75rem;
        color: #94a3b8;
      }

      .item-unit-price {
        font-size: 0.9rem;
        color: #475569;
        margin-top: 0.15rem;
      }

      /* Stepper Control */
      .item-stepper-control {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.35rem;
      }

      .stepper-label {
        font-size: 0.68rem;
        color: #94a3b8;
        font-weight: 600;
        text-transform: uppercase;
      }

      .stepper-buttons {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.25rem;
        border-radius: 9999px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
      }

      .step-btn {
        display: grid;
        width: 1.85rem;
        height: 1.85rem;
        place-items: center;
        border-radius: 50%;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        color: #475569;
        cursor: pointer;
        font-size: 0.72rem;
        transition: all 0.15s ease;
      }

      .step-btn:hover {
        background: #eef2ff;
        border-color: #c7d2fe;
        color: #4f46e5;
      }

      .quantity-number {
        min-width: 1.7rem;
        text-align: center;
        font-size: 0.9rem;
        font-weight: 750;
        color: #0f172a;
      }

      .remove-item-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        background: none;
        border: none;
        color: #ef4444;
        font-size: 0.72rem;
        font-weight: 600;
        cursor: pointer;
        padding: 0.2rem 0.4rem;
        border-radius: 0.35rem;
        transition: background 0.15s ease;
      }

      .remove-item-btn:hover {
        background: #fef2f2;
      }

      /* Line Total Amount */
      .item-total-box {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        min-width: 85px;
      }

      .line-total-caption {
        font-size: 0.68rem;
        color: #94a3b8;
        text-transform: uppercase;
      }

      .line-total-amount {
        font-size: 1.15rem;
        font-weight: 850;
        color: #0f172a;
      }

      /* Summary Aside */
      .cart-summary-column {
        position: sticky;
        top: 90px;
      }

      .summary-card {
        padding: 1.6rem;
        border-radius: 1.4rem;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        box-shadow: 0 12px 32px -4px rgba(15, 23, 42, 0.08);
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .summary-kicker {
        color: #4f46e5;
        font-size: 0.68rem;
        font-weight: 750;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .summary-card h2 {
        margin: 0;
        font-size: 1.35rem;
        font-weight: 800;
        color: #0f172a;
        letter-spacing: -0.025em;
      }

      .summary-divider {
        height: 1px;
        background: #f1f5f9;
        margin: 0.2rem 0;
      }

      .summary-rows-group {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .summary-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 0.88rem;
        color: #64748b;
      }

      .summary-row strong {
        color: #0f172a;
        font-weight: 700;
      }

      .delivery-status-free {
        font-size: 0.78rem;
        font-weight: 700;
        color: #16a34a;
        background: #f0fdf4;
        padding: 0.2rem 0.5rem;
        border-radius: 9999px;
      }

      .summary-total-row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
      }

      .total-label {
        display: block;
        font-size: 1.05rem;
        font-weight: 800;
        color: #0f172a;
      }

      .tax-note {
        display: block;
        font-size: 0.72rem;
        color: #94a3b8;
      }

      .grand-total-amount {
        font-size: 1.6rem;
        font-weight: 900;
        color: #4f46e5;
        letter-spacing: -0.035em;
      }

      .warehouse-assurance-box {
        display: flex;
        align-items: flex-start;
        gap: 0.65rem;
        padding: 0.75rem;
        border-radius: 0.75rem;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
      }

      .warehouse-assurance-box i {
        font-size: 1.15rem;
        color: #4f46e5;
        margin-top: 2px;
      }

      .assurance-text strong {
        display: block;
        font-size: 0.78rem;
        color: #0f172a;
      }

      .assurance-text p {
        margin: 2px 0 0;
        font-size: 0.72rem;
        color: #64748b;
        line-height: 1.35;
      }

      :host ::ng-deep .place-order-button {
        min-height: 48px;
        border-radius: 0.85rem;
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        border: none;
        font-size: 0.95rem;
        font-weight: 750;
        box-shadow: 0 8px 20px -2px rgba(79, 70, 229, 0.35);
      }

      :host ::ng-deep .place-order-button:hover:not(:disabled) {
        background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%);
        transform: translateY(-1px);
        box-shadow: 0 10px 24px -2px rgba(79, 70, 229, 0.45);
      }

      .security-guarantee {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.45rem;
        color: #94a3b8;
        font-size: 0.74rem;
        margin-top: 0.2rem;
      }

      /* Responsive Breakpoints */
      @media (max-width: 900px) {
        .cart-grid-layout {
          grid-template-columns: 1fr;
        }

        .cart-summary-column {
          position: static;
        }
      }

      @media (max-width: 600px) {
        .cart-item-card {
          grid-template-columns: 65px 1fr;
          gap: 0.85rem;
          padding: 1rem;
        }

        .item-art-thumb {
          width: 65px;
          height: 65px;
        }

        .item-art-thumb span {
          width: 36px;
          height: 36px;
          font-size: 1.1rem;
        }

        .item-stepper-control {
          grid-column: 1 / -1;
          flex-direction: row;
          justify-content: space-between;
          border-top: 1px solid #f1f5f9;
          padding-top: 0.65rem;
          margin-top: 0.25rem;
        }

        .item-total-box {
          grid-column: 1 / -1;
          align-items: flex-start;
          flex-direction: row;
          justify-content: space-between;
        }
      }
    `
  ]
})
export class CustomerCartComponent {
  private readonly authService = inject(AuthService);
  private readonly cartService = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly productService = inject(ProductService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  protected readonly items = this.cartService.cartItems;
  protected readonly checkoutBusy = signal(false);
  protected readonly totalItems = computed(() => this.items().reduce((sum, item) => sum + item.quantity, 0));
  protected readonly totalAmount = computed(() =>
    this.items().reduce((sum, item) => sum + Number(item.product.sellPrice ?? 0) * item.quantity, 0)
  );

  protected updateQuantity(productId: string, quantity: number): void {
    this.cartService.updateQuantity(productId, Number.isFinite(quantity) ? quantity : 1);
  }

  protected remove(productId: string): void {
    this.cartService.removeFromCart(productId);
  }

  protected artClass(category: string): string {
    const normalized = category?.toLowerCase() || '';
    return normalized.includes('electronic')
      ? 'art-electronics'
      : normalized.includes('accessor')
        ? 'art-accessories'
        : 'art-general';
  }

  protected checkout(): void {
    const cartItems = this.items();
    if (cartItems.length === 0 || this.checkoutBusy()) {
      return;
    }

    const customerId = this.authService.getUserId();
    if (!customerId) {
      this.showCheckoutError('Your login did not provide a customer account ID. Sign out and sign in again, or contact support.');
      return;
    }

    this.checkoutBusy.set(true);
    forkJoin(cartItems.map((item) => this.productService.getInventoryForProduct(item.product.id))).subscribe({
      next: (inventories) => {
        const warehouseId = this.findWarehouseForCart(cartItems, inventories);
        if (!warehouseId) {
          this.checkoutBusy.set(false);
          this.showCheckoutError('No single warehouse currently has enough stock for every item in your cart.');
          return;
        }

        this.orderService.createOrder({
          customerId,
          warehouseId,
          items: cartItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity
          }))
        }).subscribe({
          next: () => {
            this.cartService.clear();
            this.checkoutBusy.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Order placed',
              detail: 'Your order has been submitted successfully.',
              life: 3000
            });
            void this.router.navigate(['/my-orders']);
          },
          error: () => {
            this.checkoutBusy.set(false);
            this.showCheckoutError('We couldn’t place your order. Your cart is unchanged; please try again.');
          }
        });
      },
      error: () => {
        this.checkoutBusy.set(false);
        this.showCheckoutError('We couldn’t verify current inventory. Your cart is unchanged; please try again.');
      }
    });
  }

  private findWarehouseForCart(
    cartItems: ReturnType<CartService['cartItems']>,
    inventories: Array<{ warehouses: InventoryRecord[] }>
  ): string | null {
    const warehouseAvailability = cartItems.map((item, index) => {
      const quantities = new Map<string, number>();
      for (const warehouse of inventories[index]?.warehouses ?? []) {
        const warehouseId = warehouse.warehouseId;
        const quantity =
          warehouse.availableQuantity ??
          warehouse.quantityOnHand ??
          warehouse.stockQuantity ??
          warehouse.quantity;

        if (warehouseId && typeof quantity === 'number' && Number.isFinite(quantity)) {
          quantities.set(warehouseId, quantity);
        }
      }
      return { required: item.quantity, quantities };
    });

    const firstItemWarehouses = warehouseAvailability[0]?.quantities.keys() ?? [];
    for (const warehouseId of firstItemWarehouses) {
      if (warehouseAvailability.every(({ required, quantities }) => (quantities.get(warehouseId) ?? 0) >= required)) {
        return warehouseId;
      }
    }
    return null;
  }

  private showCheckoutError(detail: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Unable to place order',
      detail,
      life: 5000
    });
  }
}
