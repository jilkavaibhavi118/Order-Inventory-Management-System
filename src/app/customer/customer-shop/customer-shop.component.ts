import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { ProductService } from '../../core/services/product.service';
import { InventoryRecord, Product } from '../../core/models/product.model';

interface CategoryOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-customer-shop',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    DialogModule,
    InputTextModule,
    ProgressSpinnerModule,
    SelectModule,
    SkeletonModule,
    TagModule
  ],
  template: `
    <section class="shop-page">
      <!-- Modern Hero Section -->
      <header class="shop-hero">
        <div class="hero-content">
          <div class="hero-badge">
            <span class="pulse-indicator"></span>
            <i class="pi pi-sparkles" aria-hidden="true"></i>
            <span>OrderFlow Live Catalog &bull; Direct From Warehouse</span>
          </div>
          <h1>Explore Premium Products,<br /><span class="gradient-text">Delivered With Speed.</span></h1>
          <p>Real-time inventory verification across our nationwide logistics hubs. Add your favorite items to your cart or order instantly.</p>
          
          <div class="hero-quick-stats">
            <div class="stat-pill">
              <i class="pi pi-check-circle"></i>
              <span>Live Stock Check</span>
            </div>
            <div class="stat-pill">
              <i class="pi pi-shield"></i>
              <span>Verified Authenticity</span>
            </div>
            <div class="stat-pill">
              <i class="pi pi-send"></i>
              <span>Fast Multi-Warehouse Routing</span>
            </div>
          </div>
        </div>

        <div class="hero-art-showcase" aria-hidden="true">
          <div class="glow-orb glow-primary"></div>
          <div class="glow-orb glow-secondary"></div>
          <div class="art-card-preview">
            <div class="art-card-top">
              <span class="preview-badge"><i class="pi pi-bolt"></i> Instant Dispatch</span>
              <span class="preview-sku">WH-ROUTED</span>
            </div>
            <div class="preview-icon">
              <i class="pi pi-box"></i>
            </div>
            <div class="art-card-bottom">
              <strong>OrderFlow Marketplace</strong>
              <span>Always in sync with inventory</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Catalog Controls & Filters -->
      <section class="catalog-section" aria-labelledby="catalog-title">
        <div class="catalog-heading">
          <div class="heading-title-group">
            <span class="section-kicker">Curated Inventory</span>
            <h2 id="catalog-title">All Products</h2>
          </div>
          <div class="heading-stats">
            <span class="product-count-badge">
              <i class="pi pi-objects-column"></i>
              <span>{{ filteredProducts().length }} {{ filteredProducts().length === 1 ? 'Product' : 'Products' }}</span>
            </span>
          </div>
        </div>

        <!-- Filter Bar with Search and Dropdown -->
        <div class="catalog-toolbar">
          <label class="search-control">
            <i class="pi pi-search search-icon" aria-hidden="true"></i>
            <input
              pInputText
              type="search"
              [ngModel]="searchTerm()"
              (ngModelChange)="searchTerm.set($event)"
              placeholder="Search products by name or SKU..."
              autocomplete="off"
            />
            @if (searchTerm()) {
              <button type="button" class="clear-search-btn" aria-label="Clear search" (click)="searchTerm.set('')">
                <i class="pi pi-times" aria-hidden="true"></i>
              </button>
            }
          </label>

          <div class="toolbar-select-wrapper">
            <p-select
              [options]="categoryOptions()"
              [ngModel]="selectedCategory()"
              (ngModelChange)="selectedCategory.set($event)"
              optionLabel="label"
              optionValue="value"
              aria-label="Filter by category"
              styleClass="modern-category-select"
            />
          </div>
        </div>

        <!-- Interactive Category Filter Chips -->
        <nav class="category-chips-bar" aria-label="Quick category filter">
          @for (cat of categoryOptions(); track cat.value) {
            <button
              type="button"
              class="category-chip"
              [class.active]="selectedCategory() === cat.value"
              (click)="selectedCategory.set(cat.value)"
            >
              <span>{{ cat.label }}</span>
              <span class="chip-count">{{ getCategoryCount(cat.value) }}</span>
            </button>
          }
        </nav>
      </section>

      <!-- Loading Skeleton State -->
      @if (loading()) {
        <div class="product-grid" aria-label="Loading products">
          @for (placeholder of loadingPlaceholders; track placeholder) {
            <div class="product-card skeleton-card">
              <div class="skeleton-header">
                <p-skeleton height="160px" styleClass="skeleton-art" />
              </div>
              <div class="skeleton-body">
                <p-skeleton width="30%" height="1rem" />
                <p-skeleton width="80%" height="1.4rem" />
                <p-skeleton width="50%" height="1.6rem" />
                <p-skeleton width="100%" height="2.4rem" borderRadius="0.75rem" />
              </div>
            </div>
          }
        </div>
      } @else if (errorMessage()) {
        <!-- Error State -->
        <div class="state-card error-state">
          <span class="state-icon error-icon"><i class="pi pi-exclamation-triangle" aria-hidden="true"></i></span>
          <h3>We Couldn't Load The Catalog</h3>
          <p>{{ errorMessage() }}</p>
          <p-button label="Refresh Catalog" icon="pi pi-refresh" (onClick)="loadProducts()" styleClass="p-button-primary" />
        </div>
      } @else if (filteredProducts().length === 0) {
        <!-- Empty Results State -->
        <div class="state-card empty-state">
          <span class="state-icon"><i class="pi pi-search" aria-hidden="true"></i></span>
          <h3>No Products Found</h3>
          <p>We couldn't find any products matching your search criteria. Try a different keyword or reset filters.</p>
          <p-button label="Reset Filters" icon="pi pi-filter-slash" [outlined]="true" (onClick)="clearFilters()" />
        </div>
      } @else {
        <!-- Products Grid -->
        <div class="product-grid">
          @for (product of filteredProducts(); track product.id) {
            <article class="product-card" [class.in-cart]="cartQuantity(product) > 0">
              <!-- Visual Art / Thumbnail with Monogram -->
              <div class="product-art" [class]="artClass(product)">
                <div class="art-ambient-glow"></div>
                <span class="art-category-pill">{{ product.category || 'General' }}</span>
                <span class="art-sku-pill">SKU {{ product.sku }}</span>
                
                <div class="product-monogram">
                  <span>{{ product.name.charAt(0) }}</span>
                </div>
              </div>

              <!-- Product Details -->
              <div class="product-info">
                <div class="product-title-row">
                  <h3 title="{{ product.name }}">{{ product.name }}</h3>
                </div>

                <div class="product-meta-row">
                  <span class="product-category-text">{{ product.category || 'General' }}</span>
                  
                  <!-- Stock Indicator Tag -->
                  @if (isStockLoading(product)) {
                    <p-skeleton width="4.5rem" height="1.35rem" borderRadius="999px" />
                  } @else if (stockError(product)) {
                    <p-tag value="Stock Checking" severity="secondary" styleClass="modern-stock-tag" />
                  } @else {
                    <span
                      class="stock-pill"
                      [class.in-stock]="!isOutOfStock(product)"
                      [class.out-of-stock]="isOutOfStock(product)"
                    >
                      <i [class]="isOutOfStock(product) ? 'pi pi-times-circle' : 'pi pi-check-circle'"></i>
                      <span>{{ availabilityText(product) }}</span>
                    </span>
                  }
                </div>

                <!-- Price and Subtotal Preview -->
                <div class="product-pricing">
                  <div class="price-block">
                    <span class="price-caption">Unit Price</span>
                    <strong class="price-amount">{{ product.sellPrice ?? 0 | currency:'INR':'symbol':'1.2-2' }}</strong>
                  </div>

                  @if (cartQuantity(product) > 0) {
                    <div class="cart-chip-status">
                      <i class="pi pi-shopping-bag"></i>
                      <span>{{ cartQuantity(product) }} in cart</span>
                    </div>
                  }
                </div>
              </div>

              <!-- Card Action Controls -->
              <div class="product-actions">
                <button
                  type="button"
                  class="action-btn quick-view-btn details-button"
                  (click)="openDetails(product)"
                  title="View detailed product & stock breakdown"
                >
                  <i class="pi pi-eye" aria-hidden="true"></i>
                  <span>View product details</span>
                </button>

                <div class="main-ctas">
                  <button
                    type="button"
                    class="action-btn add-cart-btn"
                    [disabled]="!canAddToCart(product) || isBuying(product)"
                    (click)="addToCart(product)"
                  >
                    <i [class]="canAddToCart(product) ? 'pi pi-plus' : 'pi pi-check'" aria-hidden="true"></i>
                    <span>{{ canAddToCart(product) ? 'Add to cart' : (isOutOfStock(product) ? 'Out of stock' : 'Limit reached') }}</span>
                  </button>

                  <button
                    type="button"
                    class="action-btn buy-now-btn"
                    [disabled]="!canPurchase(product) || isBuying(product)"
                    (click)="buyNow(product)"
                    title="1-click checkout"
                  >
                    <i [class]="isBuying(product) ? 'pi pi-spin pi-spinner' : 'pi pi-bolt'" aria-hidden="true"></i>
                    <span>{{ isBuying(product) ? 'Processing…' : 'Buy now' }}</span>
                  </button>
                </div>
              </div>
            </article>
          }
        </div>
      }

      <!-- Product Quick-View Modal -->
      <p-dialog
        [visible]="detailsVisible()"
        (visibleChange)="detailsVisible.set($event)"
        [modal]="true"
        [draggable]="false"
        [resizable]="false"
        [style]="{ width: 'min(92vw, 32rem)' }"
        styleClass="modern-product-dialog"
        header="Product Information"
      >
        @if (selectedProduct(); as product) {
          @if (detailsLoading()) {
            <div class="details-loading-state" role="status">
              <p-progress-spinner strokeWidth="3" ariaLabel="Loading product details" />
              <span>Fetching latest inventory and warehouse info…</span>
            </div>
          } @else if (detailsError()) {
            <div class="details-error-state" role="alert">
              <i class="pi pi-exclamation-circle"></i>
              <p>{{ detailsError() }}</p>
              <p-button label="Retry" icon="pi pi-refresh" [outlined]="true" (onClick)="loadProductDetails(product)" />
            </div>
          } @else {
            <div class="modal-product-content">
              <div class="modal-art-box" [class]="artClass(product)">
                <span class="modal-monogram">{{ product.name.charAt(0) }}</span>
                <span class="modal-category-tag">{{ product.category || 'General' }}</span>
              </div>

              <div class="modal-details-body">
                <span class="modal-sku">SKU: {{ product.sku }}</span>
                <h2 class="modal-title">{{ product.name }}</h2>
                <div class="modal-price-tag">
                  <span class="price-label">Price:</span>
                  <strong>{{ product.sellPrice | currency:'INR':'symbol':'1.0-0' }}</strong>
                </div>

                <div class="modal-inventory-status">
                  <div class="status-indicator-box">
                    <i [class]="isOutOfStock(product) ? 'pi pi-times-circle text-danger' : 'pi pi-check-circle text-success'"></i>
                    <div class="status-text-group">
                      <strong>{{ isOutOfStock(product) ? 'Out of Stock' : 'In Stock & Verified' }}</strong>
                      <p>
                        @if (isStockLoading(product)) {
                          Checking multi-warehouse availability…
                        } @else if (stockError(product)) {
                          Availability verification temporarily unavailable.
                        } @else {
                          {{ availabilityText(product) }} in logistics hubs.
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }

          <ng-template #footer>
            <div class="modal-footer-actions">
              <p-button label="Close" [text]="true" (onClick)="detailsVisible.set(false)" />
              
              <p-button
                [label]="canAddToCart(product) ? 'Add to Cart' : (isOutOfStock(product) ? 'Out of Stock' : 'Limit Reached')"
                [icon]="canAddToCart(product) ? 'pi pi-shopping-bag' : 'pi pi-check'"
                [outlined]="true"
                [disabled]="detailsLoading() || detailsError() || !canAddToCart(product) || isBuying(product)"
                (onClick)="addToCart(product)"
              />

              <p-button
                label="Buy Now (1-Click)"
                icon="pi pi-bolt"
                [loading]="isBuying(product)"
                [disabled]="detailsLoading() || detailsError() || !canPurchase(product) || isBuying(product)"
                (onClick)="buyNow(product)"
              />
            </div>
          </ng-template>
        }
      </p-dialog>
    </section>
  `,
  styles: [
    `
      :host { display: block; }

      .shop-page {
        display: grid;
        gap: 2.2rem;
        max-width: 1440px;
        margin: 0 auto;
        color: #0f172a;
      }

      /* Modern Hero Section */
      .shop-hero {
        position: relative;
        overflow: hidden;
        border-radius: 1.5rem;
        padding: clamp(2rem, 4.5vw, 3.5rem);
        background: linear-gradient(125deg, #ffffff 0%, #f4f6ff 55%, #ede9fe 100%);
        border: 1px solid #e2e8f0;
        box-shadow: 0 16px 40px -10px rgba(79, 70, 229, 0.08);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 2rem;
      }

      .hero-content {
        position: relative;
        z-index: 2;
        max-width: 650px;
      }

      .hero-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.35rem 0.85rem;
        border-radius: 9999px;
        background: rgba(79, 70, 229, 0.08);
        border: 1px solid rgba(79, 70, 229, 0.2);
        color: #4f46e5;
        font-size: 0.75rem;
        font-weight: 750;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .pulse-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: #4f46e5;
        box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.7);
        animation: pulseEffect 1.8s infinite;
      }

      @keyframes pulseEffect {
        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.7); }
        70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(79, 70, 229, 0); }
        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
      }

      .hero-content h1 {
        margin: 0.9rem 0 0.75rem;
        color: #0f172a;
        font-size: clamp(2rem, 4.5vw, 3.2rem);
        font-weight: 850;
        letter-spacing: -0.04em;
        line-height: 1.12;
      }

      .gradient-text {
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .hero-content p {
        margin: 0;
        color: #475569;
        font-size: 1rem;
        line-height: 1.6;
      }

      .hero-quick-stats {
        display: flex;
        flex-wrap: wrap;
        gap: 0.65rem;
        margin-top: 1.4rem;
      }

      .stat-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        padding: 0.35rem 0.75rem;
        border-radius: 0.65rem;
        background: rgba(255, 255, 255, 0.85);
        border: 1px solid #e2e8f0;
        font-size: 0.78rem;
        font-weight: 600;
        color: #334155;
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
      }

      .stat-pill i {
        color: #4f46e5;
        font-size: 0.82rem;
      }

      /* Hero Art Graphic */
      .hero-art-showcase {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 320px;
        height: 240px;
        flex-shrink: 0;
      }

      .glow-orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(50px);
        pointer-events: none;
      }

      .glow-primary {
        width: 180px;
        height: 180px;
        background: rgba(79, 70, 229, 0.28);
        top: 20px;
        left: 20px;
      }

      .glow-secondary {
        width: 150px;
        height: 150px;
        background: rgba(124, 58, 237, 0.25);
        bottom: 10px;
        right: 10px;
      }

      .art-card-preview {
        position: relative;
        z-index: 2;
        width: 260px;
        padding: 1.25rem;
        border-radius: 1.25rem;
        background: rgba(255, 255, 255, 0.92);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(226, 232, 240, 0.9);
        box-shadow: 0 16px 36px -6px rgba(79, 70, 229, 0.15);
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        transform: rotate(-3deg);
        transition: transform 0.3s ease;
      }

      .art-card-preview:hover {
        transform: rotate(0deg) scale(1.02);
      }

      .art-card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .preview-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.65rem;
        font-weight: 750;
        color: #16a34a;
        background: #f0fdf4;
        padding: 0.25rem 0.5rem;
        border-radius: 9999px;
      }

      .preview-sku {
        font-size: 0.65rem;
        color: #94a3b8;
        font-weight: 600;
      }

      .preview-icon {
        display: grid;
        width: 3.5rem;
        height: 3.5rem;
        place-items: center;
        margin: 0.2rem auto;
        border-radius: 1rem;
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
        color: white;
        font-size: 1.6rem;
        box-shadow: 0 8px 20px -2px rgba(79, 70, 229, 0.4);
      }

      .art-card-bottom {
        display: flex;
        flex-direction: column;
        text-align: center;
        line-height: 1.25;
      }

      .art-card-bottom strong {
        font-size: 0.85rem;
        color: #0f172a;
      }

      .art-card-bottom span {
        font-size: 0.72rem;
        color: #64748b;
      }

      /* Catalog Section & Toolbar */
      .catalog-section {
        display: grid;
        gap: 1.2rem;
      }

      .catalog-heading {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1rem;
      }

      .section-kicker {
        color: #4f46e5;
        font-size: 0.72rem;
        font-weight: 750;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .catalog-heading h2 {
        margin: 0.25rem 0 0;
        color: #0f172a;
        font-size: 1.65rem;
        font-weight: 800;
        letter-spacing: -0.035em;
      }

      .product-count-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        padding: 0.45rem 0.85rem;
        border-radius: 9999px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        color: #475569;
        font-size: 0.82rem;
        font-weight: 650;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      }

      .catalog-toolbar {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 240px;
        gap: 0.85rem;
      }

      .search-control {
        position: relative;
        display: flex;
        align-items: center;
        border: 1px solid #e2e8f0;
        border-radius: 0.85rem;
        background: #ffffff;
        padding: 0 1rem;
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.03);
        transition: all 0.18s ease;
      }

      .search-control:focus-within {
        border-color: #6366f1;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
      }

      .search-icon {
        color: #94a3b8;
        font-size: 1.05rem;
        margin-right: 0.65rem;
      }

      .search-control input {
        width: 100%;
        border: none;
        outline: none;
        padding: 0.82rem 0;
        font-size: 0.9rem;
        color: #0f172a;
        background: transparent;
      }

      .clear-search-btn {
        display: grid;
        width: 1.7rem;
        height: 1.7rem;
        place-items: center;
        border-radius: 50%;
        background: #f1f5f9;
        color: #64748b;
        border: none;
        cursor: pointer;
        transition: background 0.15s ease;
      }

      .clear-search-btn:hover {
        background: #e2e8f0;
        color: #0f172a;
      }

      :host ::ng-deep .modern-category-select {
        width: 100%;
        min-height: 46px;
        border-radius: 0.85rem;
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.03);
        border: 1px solid #e2e8f0;
      }

      /* Quick Category Chips */
      .category-chips-bar {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        overflow-x: auto;
        padding-bottom: 0.4rem;
        scrollbar-width: thin;
      }

      .category-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.45rem 0.9rem;
        border-radius: 9999px;
        border: 1px solid #e2e8f0;
        background: #ffffff;
        color: #475569;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.15s ease;
      }

      .category-chip:hover {
        border-color: #cbd5e1;
        background: #f8fafc;
      }

      .category-chip.active {
        background: #4f46e5;
        border-color: #4f46e5;
        color: #ffffff;
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
      }

      .chip-count {
        padding: 0.1rem 0.4rem;
        border-radius: 9999px;
        background: rgba(0, 0, 0, 0.06);
        font-size: 0.7rem;
      }

      .category-chip.active .chip-count {
        background: rgba(255, 255, 255, 0.25);
        color: #ffffff;
      }

      /* Product Grid Layout */
      .product-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(265px, 1fr));
        gap: 1.4rem;
      }

      /* Modern Product Card */
      .product-card {
        display: flex;
        flex-direction: column;
        border-radius: 1.25rem;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.05);
        overflow: hidden;
        transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .product-card:hover {
        transform: translateY(-4px);
        border-color: #c7d2fe;
        box-shadow: 0 16px 36px -4px rgba(79, 70, 229, 0.12);
      }

      .product-card.in-cart {
        border-color: #a5b4fc;
        background: linear-gradient(180deg, #ffffff 0%, #faf5ff 100%);
      }

      /* Card Artwork Area */
      .product-art {
        position: relative;
        display: grid;
        height: 165px;
        place-items: center;
        background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
        overflow: hidden;
      }

      .art-electronics {
        background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
      }

      .art-accessories {
        background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
      }

      .art-general {
        background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
      }

      .art-ambient-glow {
        position: absolute;
        width: 110px;
        height: 110px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.7);
        filter: blur(20px);
      }

      .art-category-pill, .art-sku-pill {
        position: absolute;
        z-index: 2;
        font-size: 0.65rem;
        font-weight: 750;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        padding: 0.25rem 0.55rem;
        border-radius: 0.5rem;
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(6px);
      }

      .art-category-pill {
        top: 0.85rem;
        left: 0.85rem;
        color: #4f46e5;
      }

      .art-sku-pill {
        bottom: 0.85rem;
        right: 0.85rem;
        color: #64748b;
      }

      .product-monogram {
        position: relative;
        z-index: 2;
        display: grid;
        width: 72px;
        height: 72px;
        place-items: center;
        border-radius: 1.25rem;
        background: rgba(255, 255, 255, 0.95);
        border: 2px solid rgba(255, 255, 255, 0.8);
        box-shadow: 0 10px 24px -2px rgba(79, 70, 229, 0.2);
        color: #4f46e5;
        font-size: 2rem;
        font-weight: 850;
        transition: transform 0.2s ease;
      }

      .product-card:hover .product-monogram {
        transform: scale(1.08);
      }

      /* Card Information Content */
      .product-info {
        display: flex;
        flex-direction: column;
        flex: 1;
        padding: 1.1rem 1.15rem 0.75rem;
        gap: 0.65rem;
      }

      .product-title-row h3 {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 750;
        color: #0f172a;
        letter-spacing: -0.025em;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .product-meta-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
      }

      .product-category-text {
        font-size: 0.75rem;
        color: #64748b;
      }

      .stock-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.22rem 0.55rem;
        border-radius: 9999px;
        font-size: 0.7rem;
        font-weight: 700;
      }

      .stock-pill.in-stock {
        background: #ecfdf5;
        color: #059669;
        border: 1px solid #a7f3d0;
      }

      .stock-pill.out-of-stock {
        background: #fef2f2;
        color: #dc2626;
        border: 1px solid #fecaca;
      }

      .product-pricing {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        margin-top: auto;
        padding-top: 0.4rem;
        border-top: 1px solid #f1f5f9;
      }

      .price-block {
        display: flex;
        flex-direction: column;
      }

      .price-caption {
        font-size: 0.68rem;
        color: #94a3b8;
        text-transform: uppercase;
        font-weight: 600;
      }

      .price-amount {
        font-size: 1.25rem;
        font-weight: 850;
        color: #0f172a;
        letter-spacing: -0.03em;
      }

      .cart-chip-status {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.25rem 0.55rem;
        border-radius: 0.5rem;
        background: #eef2ff;
        color: #4f46e5;
        font-size: 0.72rem;
        font-weight: 700;
      }

      /* Card Action Buttons */
      .product-actions {
        display: flex;
        flex-direction: column;
        gap: 0.55rem;
        padding: 0.65rem 1.15rem 1.15rem;
      }

      .action-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.45rem;
        font-family: inherit;
        font-size: 0.8rem;
        font-weight: 700;
        border-radius: 0.75rem;
        border: 1px solid transparent;
        cursor: pointer;
        padding: 0.6rem 0.75rem;
        transition: all 0.16s ease;
      }

      .quick-view-btn {
        background: #ffffff;
        border-color: #e2e8f0;
        color: #475569;
        font-size: 0.75rem;
        padding: 0.45rem;
      }

      .quick-view-btn:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
        color: #0f172a;
      }

      .main-ctas {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
      }

      .add-cart-btn {
        background: #4f46e5;
        color: #ffffff;
      }

      .add-cart-btn:hover:not(:disabled) {
        background: #4338ca;
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
      }

      .buy-now-btn {
        background: #ffffff;
        border-color: #c7d2fe;
        color: #4f46e5;
      }

      .buy-now-btn:hover:not(:disabled) {
        background: #eef2ff;
        border-color: #818cf8;
      }

      .action-btn:disabled {
        background: #f1f5f9;
        border-color: #e2e8f0;
        color: #94a3b8;
        cursor: not-allowed;
        box-shadow: none;
      }

      /* Skeleton State */
      .skeleton-card {
        padding: 1rem;
        gap: 0.85rem;
      }

      .skeleton-body {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
      }

      /* State Cards (Empty, Error) */
      .state-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 3.5rem 1.5rem;
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

      .state-card h3 {
        margin: 0;
        font-size: 1.3rem;
        font-weight: 800;
        color: #0f172a;
      }

      .state-card p {
        margin: 0;
        color: #64748b;
        font-size: 0.9rem;
        line-height: 1.5;
      }

      /* Quick-View Modal Styles */
      .modal-product-content {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .modal-art-box {
        position: relative;
        display: grid;
        height: 180px;
        place-items: center;
        border-radius: 1rem;
        background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
        overflow: hidden;
      }

      .modal-monogram {
        display: grid;
        width: 80px;
        height: 80px;
        place-items: center;
        border-radius: 1.5rem;
        background: #ffffff;
        box-shadow: 0 10px 24px rgba(79, 70, 229, 0.2);
        color: #4f46e5;
        font-size: 2.2rem;
        font-weight: 850;
      }

      .modal-category-tag {
        position: absolute;
        top: 0.85rem;
        left: 0.85rem;
        padding: 0.25rem 0.65rem;
        border-radius: 0.5rem;
        background: rgba(255, 255, 255, 0.9);
        color: #4f46e5;
        font-size: 0.72rem;
        font-weight: 750;
        text-transform: uppercase;
      }

      .modal-details-body {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
      }

      .modal-sku {
        font-size: 0.72rem;
        color: #94a3b8;
        font-weight: 700;
        text-transform: uppercase;
      }

      .modal-title {
        margin: 0;
        font-size: 1.4rem;
        font-weight: 800;
        color: #0f172a;
      }

      .modal-price-tag {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
      }

      .modal-price-tag strong {
        font-size: 1.5rem;
        font-weight: 850;
        color: #4f46e5;
      }

      .modal-inventory-status {
        padding: 0.85rem;
        border-radius: 0.85rem;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
      }

      .status-indicator-box {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
      }

      .status-indicator-box i {
        font-size: 1.25rem;
        margin-top: 2px;
      }

      .status-text-group strong {
        display: block;
        font-size: 0.85rem;
        color: #0f172a;
      }

      .status-text-group p {
        margin: 2px 0 0;
        font-size: 0.78rem;
        color: #64748b;
      }

      .text-success { color: #16a34a; }
      .text-danger { color: #dc2626; }

      .modal-footer-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.65rem;
        width: 100%;
      }

      .details-loading-state, .details-error-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem 1rem;
        gap: 1rem;
        color: #64748b;
        text-align: center;
      }

      /* Responsive Breakpoints */
      @media (max-width: 860px) {
        .shop-hero {
          flex-direction: column;
          align-items: flex-start;
          padding: 1.8rem 1.4rem;
        }

        .hero-art-showcase {
          display: none;
        }

        .catalog-toolbar {
          grid-template-columns: 1fr;
        }

        .product-grid {
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1rem;
        }

        .main-ctas {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class CustomerShopComponent {
  private readonly authService = inject(AuthService);
  private readonly productService = inject(ProductService);
  private readonly orderService = inject(OrderService);
  private readonly cartService = inject(CartService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  protected readonly products = signal<Product[]>([]);
  protected readonly searchTerm = signal('');
  protected readonly selectedCategory = signal('');
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly stockQuantities = signal<Record<string, number>>({});
  protected readonly stockLoading = signal<Record<string, boolean>>({});
  protected readonly stockErrors = signal<Record<string, boolean>>({});
  protected readonly selectedProduct = signal<Product | null>(null);
  protected readonly detailsVisible = signal(false);
  protected readonly detailsLoading = signal(false);
  protected readonly detailsError = signal('');
  protected readonly buyingProducts = signal<Record<string, boolean>>({});
  protected readonly loadingPlaceholders = [1, 2, 3, 4, 5, 6];

  protected readonly categoryOptions = computed<CategoryOption[]>(() => [
    { label: 'All Categories', value: '' },
    ...Array.from(
      new Map(
        this.products()
          .filter((product) => product.category)
          .map((product) => [product.category.trim().toLowerCase(), product.category.trim()])
      ).entries()
    )
      .map(([value, label]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label))
  ]);

  protected readonly filteredProducts = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const category = this.selectedCategory();

    return this.products().filter((product) => {
      const matchesSearch =
        !term || product.name.toLowerCase().includes(term) || product.sku.toLowerCase().includes(term);
      const matchesCategory =
        !category || product.category.trim().toLowerCase() === category;
      return product.isActive && matchesSearch && matchesCategory;
    });
  });

  ngOnInit(): void {
    this.loadProducts();
  }

  protected getCategoryCount(categoryValue: string): number {
    if (!categoryValue) {
      return this.products().length;
    }
    return this.products().filter(
      (p) => p.category?.trim().toLowerCase() === categoryValue.toLowerCase()
    ).length;
  }

  protected loadProducts(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.stockQuantities.set({});
    this.stockErrors.set({});
    this.stockLoading.set({});

    this.productService.getProducts().subscribe({
      next: (products) => {
        const activeProducts = (products ?? []).filter((product) => product.isActive);
        this.products.set(activeProducts);
        this.loading.set(false);
        activeProducts.forEach((product) => this.loadProductStock(product));
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Please check your connection and try again.');
      }
    });
  }

  protected addToCart(product: Product): void {
    if (!this.canPurchase(product)) {
      return;
    }

    const stock = this.stockQuantities()[product.id] ?? 0;
    if (!this.cartService.addToCart(product, stock)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Stock limit reached',
        detail: `Only ${stock} unit${stock === 1 ? '' : 's'} available in inventory.`,
        life: 3000
      });
      return;
    }

    this.messageService.add({
      severity: 'success',
      summary: 'Added to Cart',
      detail: `${product.name} is now in your cart.`,
      life: 2500
    });
  }

  protected openDetails(product: Product): void {
    this.selectedProduct.set(product);
    this.detailsVisible.set(true);
    this.loadProductDetails(product);
  }

  protected loadProductDetails(product: Product): void {
    this.detailsLoading.set(true);
    this.detailsError.set('');
    this.productService.getProductById(product.id).subscribe({
      next: (details) => {
        this.selectedProduct.set(details);
        this.detailsLoading.set(false);
      },
      error: () => {
        this.detailsLoading.set(false);
        this.detailsError.set('We could not load the latest details. Please try again.');
      }
    });
  }

  protected buyNow(product: Product): void {
    if (!this.canPurchase(product) || this.isBuying(product)) {
      return;
    }

    const customerId = this.authService.getUserId();
    if (!customerId) {
      this.showOrderError('Your account ID is missing from the login session. Sign out and sign in again.');
      return;
    }

    this.buyingProducts.update((state) => ({ ...state, [product.id]: true }));
    this.productService.getInventoryForProduct(product.id).subscribe({
      next: (inventory) => {
        const warehouseId = this.findWarehouseWithStock(inventory.warehouses ?? [], 1);
        if (!warehouseId) {
          this.buyingProducts.update((state) => ({ ...state, [product.id]: false }));
          this.showOrderError('No warehouse has an available unit of this product right now.');
          return;
        }

        this.orderService.createOrder({
          customerId,
          warehouseId,
          items: [{ productId: product.id, quantity: 1 }]
        }).subscribe({
          next: () => {
            this.buyingProducts.update((state) => ({ ...state, [product.id]: false }));
            this.detailsVisible.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Order placed',
              detail: `${product.name} has been ordered successfully.`,
              life: 3000
            });
            void this.router.navigate(['/my-orders']);
          },
          error: () => {
            this.buyingProducts.update((state) => ({ ...state, [product.id]: false }));
            this.showOrderError('We could not place the order. Please try again.');
          }
        });
      },
      error: () => {
        this.buyingProducts.update((state) => ({ ...state, [product.id]: false }));
        this.showOrderError('We could not verify current inventory. Please try again.');
      }
    });
  }

  protected clearFilters(): void {
    this.searchTerm.set('');
    this.selectedCategory.set('');
  }

  protected formatPrice(value?: number | null): string {
    return Number(value ?? 0).toLocaleString('en-IN');
  }

  protected isStockLoading(product: Product): boolean {
    return !!this.stockLoading()[product.id];
  }

  protected stockError(product: Product): boolean {
    return !!this.stockErrors()[product.id];
  }

  protected isOutOfStock(product: Product): boolean {
    return !this.isStockLoading(product) && !this.stockError(product) && this.stockQuantities()[product.id] === 0;
  }

  protected canPurchase(product: Product): boolean {
    return !this.isStockLoading(product) &&
      !this.stockError(product) &&
      (this.stockQuantities()[product.id] ?? 0) > 0;
  }

  protected canAddToCart(product: Product): boolean {
    return this.canPurchase(product) &&
      this.cartService.quantityForProduct(product.id) < (this.stockQuantities()[product.id] ?? 0);
  }

  protected isBuying(product: Product): boolean {
    return !!this.buyingProducts()[product.id];
  }

  protected cartQuantity(product: Product): number {
    return this.cartService.quantityForProduct(product.id);
  }

  protected unitPrice(product: Product): number {
    const price = Number(product.sellPrice ?? 0);
    return Number.isFinite(price) && price >= 0 ? price : 0;
  }

  protected availabilityText(product: Product): string {
    const quantity = this.stockQuantities()[product.id];
    if (quantity === undefined) {
      return 'Checking stock';
    }
    return quantity === 0 ? 'Out of stock' : `${quantity} in stock`;
  }

  protected artClass(product: Product): string {
    const category = product.category?.toLowerCase() || '';
    if (category.includes('electronic')) {
      return 'art-electronics';
    }
    if (category.includes('accessor')) {
      return 'art-accessories';
    }
    return 'art-general';
  }

  private loadProductStock(product: Product): void {
    this.stockLoading.update((values) => ({ ...values, [product.id]: true }));

    this.productService.getInventoryForProduct(product.id).subscribe({
      next: (inventory) => {
        const total = inventory.totalQuantity;
        if (typeof total !== 'number' || !Number.isFinite(total) || total < 0) {
          this.stockErrors.update((values) => ({ ...values, [product.id]: true }));
          this.stockLoading.update((values) => ({ ...values, [product.id]: false }));
          return;
        }

        this.stockQuantities.update((values) => ({ ...values, [product.id]: total }));
        this.stockLoading.update((values) => ({ ...values, [product.id]: false }));
      },
      error: () => {
        this.stockErrors.update((values) => ({ ...values, [product.id]: true }));
        this.stockLoading.update((values) => ({ ...values, [product.id]: false }));
      }
    });
  }

  private findWarehouseWithStock(warehouses: InventoryRecord[], quantity: number): string | null {
    return warehouses.find((warehouse) => {
      const available =
        warehouse.availableQuantity ??
        warehouse.quantityOnHand ??
        warehouse.stockQuantity ??
        warehouse.quantity;
      return warehouse.warehouseId &&
        typeof available === 'number' &&
        Number.isFinite(available) &&
        available >= quantity;
    })?.warehouseId ?? null;
  }

  private showOrderError(detail: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Unable to place order',
      detail,
      life: 5000
    });
  }
}
