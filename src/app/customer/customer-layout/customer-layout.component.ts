import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Popover, PopoverModule } from 'primeng/popover';
import { ToastModule } from 'primeng/toast';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-customer-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, ButtonModule, PopoverModule, ToastModule],
  template: `
    <div class="customer-shell">
      <header class="customer-header">
        <div class="header-inner">
          <!-- Brand Logo -->
          <a class="brand-wrap" routerLink="/shop" aria-label="OrderFlow home">
            <span class="brand-mark">
              <i class="pi pi-box" aria-hidden="true"></i>
            </span>
            <div class="brand-titles">
              <span class="brand-name">OrderFlow</span>
              <span class="brand-badge">MARKETPLACE</span>
            </div>
          </a>

          <!-- Navigation Links -->
          <nav class="customer-nav" aria-label="Customer navigation">
            <a routerLink="/shop" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
              <i class="pi pi-th-large" aria-hidden="true"></i>
              <span>Shop Catalog</span>
            </a>
            <a routerLink="/cart" routerLinkActive="active" class="cart-link">
              <i class="pi pi-shopping-bag" aria-hidden="true"></i>
              <span>My Cart</span>
              @if (cartCount() > 0) {
                <span class="cart-badge" aria-label="{{ cartCount() }} items in cart">{{ cartCount() }}</span>
              }
            </a>
            <a routerLink="/my-orders" routerLinkActive="active">
              <i class="pi pi-receipt" aria-hidden="true"></i>
              <span>Order History</span>
            </a>
          </nav>

          <!-- User Profile & Action Menu -->
          <div class="header-actions">
            <button
              #accountButton
              type="button"
              class="account-button"
              aria-label="Open account menu"
              aria-haspopup="true"
              (click)="accountPopover.toggle($event, accountButton)"
            >
              <span class="account-avatar">{{ accountInitial() }}</span>
              <div class="account-meta">
                <span class="account-name">{{ accountName() }}</span>
                <!-- <span class="account-role">Customer</span> -->
              </div>
              <i class="pi pi-chevron-down account-chevron" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </header>

      <main class="customer-main">
        <router-outlet></router-outlet>
      </main>

      <p-toast position="top-right" />

      <p-popover #accountPopover styleClass="modern-account-popover">
        <div class="account-popover-content">
          <div class="popover-header">
            <span class="popover-avatar">{{ accountInitial() }}</span>
            <div class="popover-user-details">
              <strong>{{ accountName() }}</strong>
              <span class="badge-customer"><i class="pi pi-verified"></i> Verified Customer</span>
            </div>
          </div>

          <div class="popover-divider"></div>

          <div class="popover-actions">
            <a routerLink="/select-panel" (click)="accountPopover.hide()" class="popover-item">
              <i class="pi pi-sliders-h"></i>
              <span>Switch Panel (Admin / Customer)</span>
            </a>
            <a routerLink="/my-orders" (click)="accountPopover.hide()" class="popover-item">
              <i class="pi pi-receipt"></i>
              <span>View All Past Orders</span>
            </a>
            <a routerLink="/shop" (click)="accountPopover.hide()" class="popover-item">
              <i class="pi pi-shopping-bag"></i>
              <span>Continue Shopping</span>
            </a>
          </div>

          <div class="popover-divider"></div>

          <p-button
            label="Sign Out"
            icon="pi pi-sign-out"
            severity="danger"
            [outlined]="true"
            styleClass="popover-logout-btn"
            (onClick)="logout(accountPopover)"
          />
        </div>
      </p-popover>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background-color: #f8fafc;
        color: #0f172a;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
      }

      .customer-shell {
        display: flex;
        min-height: 100vh;
        flex-direction: column;
      }

      /* Sticky Glassmorphic Header */
      .customer-header {
        position: sticky;
        top: 0;
        z-index: 40;
        background: rgba(255, 255, 255, 0.88);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        border-bottom: 1px solid rgba(226, 232, 240, 0.85);
        box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.04);
        transition: all 0.2s ease;
      }

      .header-inner {
        max-width: 1440px;
        margin: 0 auto;
        padding: 0.75rem clamp(1rem, 3.5vw, 2.5rem);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1.5rem;
      }

      /* Brand Styling */
      .brand-wrap {
        display: inline-flex;
        align-items: center;
        gap: 0.75rem;
        text-decoration: none;
        color: #0f172a;
        user-select: none;
      }

      .brand-mark {
        display: grid;
        width: 2.45rem;
        height: 2.45rem;
        place-items: center;
        border-radius: 0.85rem;
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        box-shadow: 0 8px 18px -4px rgba(79, 70, 229, 0.38);
        color: white;
        font-size: 1.15rem;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .brand-wrap:hover .brand-mark {
        transform: scale(1.05);
        box-shadow: 0 10px 22px -4px rgba(79, 70, 229, 0.45);
      }

      .brand-titles {
        display: flex;
        flex-direction: column;
        line-height: 1.1;
      }

      .brand-name {
        font-size: 1.18rem;
        font-weight: 800;
        letter-spacing: -0.035em;
        color: #0f172a;
      }

      .brand-badge {
        font-size: 0.62rem;
        font-weight: 750;
        letter-spacing: 0.12em;
        color: #4f46e5;
        text-transform: uppercase;
        margin-top: 1px;
      }

      /* Navigation Links */
      .customer-nav {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        background: rgba(241, 245, 249, 0.7);
        padding: 0.28rem;
        border-radius: 9999px;
        border: 1px solid rgba(226, 232, 240, 0.8);
      }

      .customer-nav a {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        padding: 0.52rem 1.05rem;
        border-radius: 9999px;
        color: #64748b;
        font-size: 0.85rem;
        font-weight: 600;
        text-decoration: none;
        transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .customer-nav a:hover {
        color: #4f46e5;
        background: rgba(255, 255, 255, 0.8);
      }

      .customer-nav a.active {
        background: #ffffff;
        color: #4f46e5;
        box-shadow: 0 2px 8px rgba(79, 70, 229, 0.12);
        font-weight: 700;
      }

      .customer-nav a i {
        font-size: 0.95rem;
      }

      /* Animated Cart Badge */
      .cart-badge {
        display: inline-grid;
        place-items: center;
        min-width: 1.3rem;
        height: 1.3rem;
        padding: 0 0.35rem;
        border-radius: 9999px;
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
        color: white;
        font-size: 0.68rem;
        font-weight: 750;
        animation: cartPulse 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      @keyframes cartPulse {
        0% { transform: scale(0.6); }
        50% { transform: scale(1.25); }
        100% { transform: scale(1); }
      }

      /* Account Button */
      .header-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .account-button {
        display: inline-flex;
        align-items: center;
        gap: 0.65rem;
        padding: 0.32rem 0.85rem 0.32rem 0.35rem;
        border: 1px solid #e2e8f0;
        border-radius: 9999px;
        background: #ffffff;
        color: #334155;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
        transition: all 0.18s ease;
      }

      .account-button:hover {
        border-color: #c7d2fe;
        background: #faf5ff;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.08);
      }

      .account-avatar, .popover-avatar {
        display: grid;
        width: 2.1rem;
        height: 2.1rem;
        flex: 0 0 auto;
        place-items: center;
        border-radius: 50%;
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
        color: white;
        font-size: 0.82rem;
        font-weight: 750;
        box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
      }

      .account-meta {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        line-height: 1.15;
      }

      .account-name {
        max-width: 130px;
        overflow: hidden;
        color: #0f172a;
        font-size: 0.82rem;
        font-weight: 650;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .account-role {
        font-size: 0.66rem;
        color: #64748b;
      }

      .account-chevron {
        font-size: 0.65rem;
        color: #94a3b8;
        transition: transform 0.2s ease;
      }

      /* Popover Panel Customization */
      :host ::ng-deep .modern-account-popover .p-popover-content {
        padding: 1.1rem;
        border-radius: 1rem;
        box-shadow: 0 16px 40px -6px rgba(15, 23, 42, 0.16);
      }

      .account-popover-content {
        display: flex;
        flex-direction: column;
        min-width: 250px;
        gap: 0.75rem;
      }

      .popover-header {
        display: flex;
        align-items: center;
        gap: 0.85rem;
      }

      .popover-avatar {
        width: 2.6rem;
        height: 2.6rem;
        font-size: 0.95rem;
      }

      .popover-user-details {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }

      .popover-user-details strong {
        color: #0f172a;
        font-size: 0.92rem;
      }

      .badge-customer {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.68rem;
        color: #16a34a;
        font-weight: 600;
      }

      .popover-divider {
        height: 1px;
        background: #f1f5f9;
        margin: 0.15rem 0;
      }

      .popover-actions {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .popover-item {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        padding: 0.55rem 0.65rem;
        border-radius: 0.55rem;
        color: #334155;
        font-size: 0.82rem;
        font-weight: 550;
        text-decoration: none;
        transition: background 0.15s ease, color 0.15s ease;
      }

      .popover-item:hover {
        background: #f8fafc;
        color: #4f46e5;
      }

      .popover-item i {
        font-size: 0.9rem;
        color: #64748b;
      }

      :host ::ng-deep .popover-logout-btn {
        width: 100%;
        justify-content: center;
        font-size: 0.82rem;
        font-weight: 600;
        border-radius: 0.55rem;
        min-height: 38px;
      }

      /* Main Shell & Footer */
      .customer-main {
        width: min(100%, 1440px);
        flex: 1;
        margin: 0 auto;
        padding: clamp(1.2rem, 3.5vw, 2.5rem);
      }

      .customer-footer {
        margin-top: auto;
        background: #ffffff;
        border-top: 1px solid #e2e8f0;
        padding: 1.8rem clamp(1rem, 3.5vw, 2.5rem);
        color: #64748b;
        font-size: 0.82rem;
      }

      .footer-inner {
        max-width: 1440px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .footer-left {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .footer-logo {
        font-weight: 750;
        color: #0f172a;
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
      }

      .footer-logo i {
        color: #4f46e5;
      }

      .footer-left p {
        margin: 0;
        color: #94a3b8;
        font-size: 0.78rem;
      }

      /* Mobile Responsive Styles */
      @media (max-width: 860px) {
        .header-inner {
          flex-wrap: wrap;
          padding: 0.65rem 1rem;
          gap: 0.75rem;
        }

        .customer-nav {
          order: 3;
          width: 100%;
          justify-content: space-around;
          border-radius: 0.75rem;
          padding: 0.3rem;
        }

        .customer-nav a {
          flex: 1;
          justify-content: center;
          padding: 0.55rem 0.5rem;
          font-size: 0.8rem;
        }

        .account-meta {
          display: none;
        }

        .customer-main {
          padding: 1rem;
        }

        .footer-inner {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `
  ]
})
export class CustomerLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly cartService = inject(CartService);
  private readonly router = inject(Router);

  protected readonly cartCount = computed(() => this.cartService.totalItems);
  protected readonly accountName = computed(() => this.authService.currentUserName() || 'Account');
  protected readonly accountInitial = computed(() => this.accountName().trim().charAt(0).toUpperCase() || 'U');

  protected logout(popover: Popover): void {
    popover.hide();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
