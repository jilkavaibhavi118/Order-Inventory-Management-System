import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InventoryService } from '../../../../core/services/inventory.service';
import { OrdersService } from '../../../../core/services/orders.service';
import { InventoryTransaction, LowStockRecord } from '../../../../models/inventory.models';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss'
})
export class DashboardPageComponent {
  private readonly inventoryService = inject(InventoryService);
  private readonly ordersService = inject(OrdersService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly productsCount = signal<number | null>(null);
  readonly ordersCount = signal<number | null>(null);
  readonly warehousesCount = signal<number | null>(null);
  readonly lowStockCount = signal<number | null>(null);
  readonly lowStockPreview = signal<LowStockRecord[]>([]);
  readonly transactionsPreview = signal<InventoryTransaction[]>([]);
  readonly productsLoading = signal(false);
  readonly ordersLoading = signal(false);
  readonly warehousesLoading = signal(false);
  readonly lowStockLoading = signal(false);
  readonly transactionsLoading = signal(false);
  readonly productsError = signal<string | null>(null);
  readonly ordersError = signal<string | null>(null);
  readonly warehousesError = signal<string | null>(null);
  readonly lowStockError = signal<string | null>(null);
  readonly transactionsError = signal<string | null>(null);

  constructor() {
    if (this.isBrowser) {
      this.refresh();
    }
  }

  refresh(): void {
    this.loadProducts();
    this.loadOrders();
    this.loadWarehouses();
    this.loadLowStock();
    this.loadTransactions();
  }

  retryProducts(): void {
    this.loadProducts();
  }

  retryOrders(): void {
    this.loadOrders();
  }

  retryWarehouses(): void {
    this.loadWarehouses();
  }

  retryLowStock(): void {
    this.loadLowStock();
  }

  retryTransactions(): void {
    this.loadTransactions();
  }

  private loadProducts(): void {
    this.productsLoading.set(true);
    this.productsError.set(null);
    this.inventoryService.getProducts().subscribe({
      next: products => this.productsCount.set(products.length),
      error: error => {
        this.productsError.set(this.getErrorMessage(error));
        this.productsLoading.set(false);
      },
      complete: () => this.productsLoading.set(false)
    });
  }

  private loadOrders(): void {
    this.ordersLoading.set(true);
    this.ordersError.set(null);
    this.ordersService.getOrders({ page: 1, pageSize: 1 }).subscribe({
      next: response => this.ordersCount.set(response.totalCount),
      error: error => {
        this.ordersError.set(this.getErrorMessage(error));
        this.ordersLoading.set(false);
      },
      complete: () => this.ordersLoading.set(false)
    });
  }

  private loadWarehouses(): void {
    this.warehousesLoading.set(true);
    this.warehousesError.set(null);
    this.inventoryService.getWarehouses().subscribe({
      next: warehouses => this.warehousesCount.set(warehouses.length),
      error: error => {
        this.warehousesError.set(this.getErrorMessage(error));
        this.warehousesLoading.set(false);
      },
      complete: () => this.warehousesLoading.set(false)
    });
  }

  private loadLowStock(): void {
    this.lowStockLoading.set(true);
    this.lowStockError.set(null);
    this.inventoryService.getLowStock().subscribe({
      next: products => {
        this.lowStockCount.set(products.length);
        this.lowStockPreview.set(products.slice(0, 5));
      },
      error: error => {
        this.lowStockError.set(this.getErrorMessage(error));
        this.lowStockLoading.set(false);
      },
      complete: () => this.lowStockLoading.set(false)
    });
  }

  private loadTransactions(): void {
    this.transactionsLoading.set(true);
    this.transactionsError.set(null);
    this.inventoryService.getInventoryTransactions({ page: 1, pageSize: 5 }).subscribe({
      next: response => this.transactionsPreview.set(response.transactions),
      error: error => {
        this.transactionsError.set(this.getErrorMessage(error));
        this.transactionsLoading.set(false);
      },
      complete: () => this.transactionsLoading.set(false)
    });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body: unknown = error.error;
      if (typeof body === 'object' && body !== null && 'message' in body) {
        const message = body.message;
        if (typeof message === 'string' && message.trim()) {
          return message;
        }
      }

      if (typeof body === 'string') {
        const text = body.trim();
        try {
          const parsed: unknown = JSON.parse(text);
          if (typeof parsed === 'object' && parsed !== null && 'message' in parsed) {
            const message = parsed.message;
            if (typeof message === 'string' && message.trim()) {
              return message;
            }
          }
        } catch {
          if (text && !text.startsWith('<')) {
            return text;
          }
        }
      }
    }

    return 'Unable to load this dashboard data. Try again.';
  }
}
