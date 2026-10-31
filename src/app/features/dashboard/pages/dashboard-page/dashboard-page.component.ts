import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, PLATFORM_ID, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InventoryService } from '../../../../core/services/inventory.service';
import { OrdersService } from '../../../../core/services/orders.service';
import { AuthService } from '../../../../core/services/auth.service';
import { InventoryRecord, InventoryTransaction, LowStockRecord } from '../../../../models/inventory.models';
import { Order } from '../../../../models/order.models';

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
  private readonly authService = inject(AuthService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly userName = this.authService.currentUserName;
  readonly today = new Date();
  readonly chartBuckets = computed(() => {
    const now = this.today;
    const buckets = Array.from({ length: 6 }, (_, index) => {
      const month = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      return {
        key: month.getFullYear() * 12 + month.getMonth(),
        label: month.toLocaleString('en', { month: 'short' }),
        orders: 0,
        movements: 0
      };
    });

    for (const order of this.recentOrders()) {
      const date = new Date(order.orderDate ?? order.createdAt ?? '');
      if (Number.isNaN(date.getTime())) {
        continue;
      }

      const bucket = buckets.find(item => item.key === date.getFullYear() * 12 + date.getMonth());
      if (bucket) {
        bucket.orders += 1;
      }
    }

    for (const transaction of this.transactionsPreview()) {
      const date = new Date(transaction.createdAt);
      if (Number.isNaN(date.getTime())) {
        continue;
      }

      const bucket = buckets.find(item => item.key === date.getFullYear() * 12 + date.getMonth());
      if (bucket) {
        bucket.movements += 1;
      }
    }

    return buckets;
  });
  readonly chartMax = computed(() => {
    const peak = Math.max(1, ...this.chartBuckets().flatMap(bucket => [bucket.orders, bucket.movements]));
    return Math.ceil(peak / 4) * 4;
  });
  readonly stockRecords = signal<InventoryRecord[]>([]);
  readonly stockRecordsLoading = signal(false);
  readonly stockRecordsError = signal<string | null>(null);
  readonly stockDistribution = computed(() => {
    const records = this.stockRecords();
    const outOfStock = records.filter(record => (record.quantity ?? record.totalQuantity ?? 0) <= 0).length;
    const lowStock = records.filter(record => {
      const quantity = record.quantity ?? record.totalQuantity ?? 0;
      return quantity > 0 && record.minStock !== undefined && quantity <= record.minStock;
    }).length;
    const inStock = records.length - outOfStock - lowStock;
    const total = records.length;
    const outPercent = total ? outOfStock / total * 100 : 0;
    const lowPercent = total ? lowStock / total * 100 : 0;
    const inPercent = total ? inStock / total * 100 : 0;

    return {
      inStock,
      lowStock,
      outOfStock,
      total,
      inPercent,
      lowPercent,
      outPercent,
      gradient: `conic-gradient(#22c55e 0 ${inPercent}%, #f59e0b ${inPercent}% ${inPercent + lowPercent}%, #ef4444 ${inPercent + lowPercent}% 100%)`
    };
  });
  readonly totalUnits = computed(() =>
    this.stockRecords().reduce((sum, record) => sum + (record.quantity ?? record.totalQuantity ?? 0), 0)
  );
  readonly stockByLocation = computed(() => {
    const totals = new Map<string, number>();
    for (const record of this.stockRecords()) {
      const name = record.warehouseName?.trim() || 'Unassigned';
      totals.set(name, (totals.get(name) ?? 0) + (record.quantity ?? record.totalQuantity ?? 0));
    }

    const rows = [...totals.entries()]
      .map(([name, units]) => ({ name, units }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 6);
    const max = Math.max(1, ...rows.map(row => row.units));
    const total = rows.reduce((sum, row) => sum + row.units, 0);

    return rows.map(row => ({
      ...row,
      share: total ? (row.units / total) * 100 : 0,
      width: (row.units / max) * 100
    }));
  });
  readonly topMovingProducts = computed(() => {
    const totals = new Map<string, { name: string; sku: string; units: number; movements: number }>();
    for (const transaction of this.transactionsPreview()) {
      const entry = totals.get(transaction.productId) ?? {
        name: transaction.productName,
        sku: transaction.productSku,
        units: 0,
        movements: 0
      };
      entry.units += Math.abs(transaction.quantityChanged);
      entry.movements += 1;
      totals.set(transaction.productId, entry);
    }

    const rows = [...totals.values()].sort((a, b) => b.units - a.units).slice(0, 5);
    const max = Math.max(1, ...rows.map(row => row.units));
    return rows.map(row => ({ ...row, width: (row.units / max) * 100 }));
  });
  readonly recentActivity = computed(() =>
    [...this.transactionsPreview()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6)
  );
  readonly recentOrdersPreview = computed(() => this.recentOrders().slice(0, 6));
  readonly chartTicks = computed(() => {
    const max = this.chartMax();
    return [1, 0.75, 0.5, 0.25, 0].map(fraction => ({
      y: 180 - fraction * 145,
      label: Math.round(max * fraction)
    }));
  });
  readonly productsCount = signal<number | null>(null);
  readonly ordersCount = signal<number | null>(null);
  readonly warehousesCount = signal<number | null>(null);
  readonly suppliersCount = signal<number | null>(null);
  readonly lowStockCount = signal<number | null>(null);
  readonly lowStockPreview = signal<LowStockRecord[]>([]);
  readonly recentOrders = signal<Order[]>([]);
  readonly transactionsPreview = signal<InventoryTransaction[]>([]);
  readonly productsLoading = signal(false);
  readonly ordersLoading = signal(false);
  readonly warehousesLoading = signal(false);
  readonly suppliersLoading = signal(false);
  readonly lowStockLoading = signal(false);
  readonly transactionsLoading = signal(false);
  readonly productsError = signal<string | null>(null);
  readonly ordersError = signal<string | null>(null);
  readonly warehousesError = signal<string | null>(null);
  readonly suppliersError = signal<string | null>(null);
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
    this.loadSuppliers();
    this.loadLowStock();
    this.loadTransactions();
    this.loadStockRecords();
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

  retrySuppliers(): void {
    this.loadSuppliers();
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
    this.ordersService.getOrders({ page: 1, pageSize: 100 }).subscribe({
      next: response => {
        this.ordersCount.set(response.totalCount);
        this.recentOrders.set(response.orders);
      },
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

  private loadSuppliers(): void {
    this.suppliersLoading.set(true);
    this.suppliersError.set(null);
    this.inventoryService.getSuppliers().subscribe({
      next: suppliers => this.suppliersCount.set(suppliers.length),
      error: error => {
        this.suppliersError.set(this.getErrorMessage(error));
        this.suppliersLoading.set(false);
      },
      complete: () => this.suppliersLoading.set(false)
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
    this.inventoryService.getInventoryTransactions({ page: 1, pageSize: 100 }).subscribe({
      next: response => this.transactionsPreview.set(response.transactions),
      error: error => {
        this.transactionsError.set(this.getErrorMessage(error));
        this.transactionsLoading.set(false);
      },
      complete: () => this.transactionsLoading.set(false)
    });
  }

  private loadStockRecords(): void {
    this.stockRecordsLoading.set(true);
    this.stockRecordsError.set(null);
    this.inventoryService.getInventory(1, 100).subscribe({
      next: response => this.stockRecords.set(response.items),
      error: error => {
        this.stockRecordsError.set(this.getErrorMessage(error));
        this.stockRecordsLoading.set(false);
      },
      complete: () => this.stockRecordsLoading.set(false)
    });
  }

  chartPath(series: 'orders' | 'movements'): string {
    const points = this.chartBuckets().map((bucket, index) => ({
      x: 42 + index * 92,
      y: 180 - (bucket[series] / this.chartMax()) * 145
    }));

    return points.reduce((path, point, index) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`;
      }

      const previous = points[index - 1];
      const middleX = (previous.x + point.x) / 2;
      return `${path} C ${middleX} ${previous.y}, ${middleX} ${point.y}, ${point.x} ${point.y}`;
    }, '');
  }

  chartX(index: number): number {
    return 42 + index * 92;
  }

  chartY(value: number): number {
    return 180 - (value / this.chartMax()) * 145;
  }

  chartArea(series: 'orders' | 'movements'): string {
    return `${this.chartPath(series)} L 502 180 L 42 180 Z`;
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
