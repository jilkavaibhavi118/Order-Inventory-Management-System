import { CheckboxModule } from 'primeng/checkbox';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { PaginatorModule } from 'primeng/paginator';
import { Select } from 'primeng/select';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, PLATFORM_ID, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { PaginatorState } from 'primeng/types/paginator';
import { finalize, Subscription } from 'rxjs';
import {
  InventoryAdjustmentRequest,
  InventoryRecord,
  InventoryTransaction,
  InventoryTransactionQuery,
  LowStockRecord,
  Product,
  Warehouse
} from '../../../../models/inventory.models';
import { InventoryService } from '../../../../core/services/inventory.service';
import { environment } from '../../../../../environments/environment';
import { TabsModule } from 'primeng/tabs';

function getNonEmptyMessage(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function getMessageFromObject(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || !('message' in value)) {
    return null;
  }

  return getNonEmptyMessage(value.message);
}

function getMessageFromText(responseText: string): string | null {
  try {
    const parsed: unknown = JSON.parse(responseText);
    return typeof parsed === 'string'
      ? getNonEmptyMessage(parsed)
      : getMessageFromObject(parsed);
  } catch {
    return responseText.startsWith('<') ? null : responseText || null;
  }
}

function getMessageFromBody(body: unknown): string | null {
  return typeof body === 'string'
    ? getMessageFromText(body.trim())
    : getMessageFromObject(body);
}

@Component({
  selector: 'app-inventory-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginatorModule, Select, TabsModule, RouterLink, CheckboxModule],
  templateUrl: './inventory-page.component.html',
  styleUrl: './inventory-page.component.scss'
})
export class InventoryPageComponent implements OnDestroy {
  private readonly inventoryService = inject(InventoryService);
  private readonly http = inject(HttpClient);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** Maps productId → object URL for product thumbnails */
  readonly productImageUrls = signal<Record<string, string>>({});
  private readonly imageSubscriptions: Subscription[] = [];
  private readonly imageObjectUrls: string[] = [];

  readonly activeTab = signal<'overview' | 'movements'>('overview');
  readonly inventory = signal<InventoryRecord[]>([]);
  readonly products = signal<Product[]>([]);
  readonly lowStock = signal<LowStockRecord[]>([]);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly totalInventoryCount = signal(0);
  firstRow = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly inventoryLoading = signal(false);
  readonly lowStockLoading = signal(false);
  readonly saving = signal(false);
  readonly adjustmentDialogOpen = signal(false);
  readonly notice = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  readonly detailRecord = signal<InventoryRecord | null>(null);
  readonly detailPayload = signal<unknown>(null);
  readonly detailLoading = signal(false);
  readonly detailError = signal<string | null>(null);
  private detailRequest?: Subscription;
  readonly transactions = signal<InventoryTransaction[]>([]);
  readonly transactionsPage = signal(1);
  readonly transactionsPageSize = signal(10);
  readonly transactionsTotalCount = signal(0);
  readonly transactionsLoading = signal(false);
  readonly transactionsError = signal<string | null>(null);
  readonly transactionsLoaded = signal(false);
  readonly transactionDetailsId = signal<string | null>(null);
  readonly transactionDetailsRow = signal<InventoryTransaction | null>(null);
  readonly transactionDetailsPayload = signal<unknown>(null);
  readonly transactionDetailsLoading = signal(false);
  readonly transactionDetailsError = signal<string | null>(null);
  readonly movementDateError = signal<string | null>(null);
  readonly invSearch = signal('');
  readonly invWarehouseFilter = signal('');
  readonly invStatusFilter = signal('');

  readonly invWarehouseOptions = computed(() => [
    { label: 'All warehouses', value: '' },
    ...this.warehouses().map(w => ({ label: w.name, value: w.id }))
  ]);
  readonly warehouseOptions = computed(() =>
    this.warehouses().map(warehouse => ({ label: warehouse.name, value: warehouse.id }))
  );
  readonly activeWarehouseOptions = computed(() =>
    this.warehouses()
      .filter(warehouse => warehouse.isActive)
      .map(warehouse => ({
        label: `${warehouse.name} — ${warehouse.location}`,
        value: warehouse.id
      }))
  );
  readonly inventoryProductOptions = computed(() =>
    this.products().map(product => ({
      label: `${product.name} (${product.sku})`,
      value: product.id
    }))
  );
  readonly movementTypeOptions = [
    { label: 'IN', value: 'IN' },
    { label: 'OUT', value: 'OUT' }
  ];

  readonly invStatusOptions = [
    { label: 'All status', value: '' },
    { label: 'In Stock', value: 'in-stock' },
    { label: 'Low Stock', value: 'low-stock' },
    { label: 'Out of Stock', value: 'out-of-stock' }
  ];

  get invWarehouseFilterValue(): string {
    return this.invWarehouseFilter();
  }

  set invWarehouseFilterValue(val: string) {
    this.invWarehouseFilter.set(val ?? '');
  }

  get invStatusFilterValue(): string {
    return this.invStatusFilter();
  }

  set invStatusFilterValue(val: string) {
    this.invStatusFilter.set(val ?? '');
  }

  readonly filteredInventory = computed(() => {
    const search = this.invSearch().trim().toLowerCase();
    const warehouseId = this.invWarehouseFilter();
    const status = this.invStatusFilter();
    return this.inventory().filter(item => {
      const qty = item.quantity ?? item.totalQuantity ?? 0;
      const min = item.minStock ?? 0;
      const matchesSearch = !search || [
        item.productName ?? '', item.productSku ?? '', item.warehouseName ?? ''
      ].some(v => v.toLowerCase().includes(search));
      const matchesWarehouse = !warehouseId || item.warehouseId === warehouseId;
      let matchesStatus = true;
      if (status === 'in-stock') matchesStatus = qty > min;
      else if (status === 'low-stock') matchesStatus = qty > 0 && qty <= min;
      else if (status === 'out-of-stock') matchesStatus = qty === 0;
      return matchesSearch && matchesWarehouse && matchesStatus;
    });
  });

  readonly visibleInventory = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filteredInventory().slice(start, start + this.pageSize());
  });
  private transactionsRequest?: Subscription;
  private transactionDetailsRequest?: Subscription;

  readonly movementFilterForm = new FormGroup({
    productId: new FormControl('', { nonNullable: true }),
    warehouseId: new FormControl('', { nonNullable: true }),
    type: new FormControl('', { nonNullable: true }),
    fromDate: new FormControl('', { nonNullable: true }),
    toDate: new FormControl('', { nonNullable: true })
  });

  readonly adjustmentForm = new FormGroup({
    productId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    warehouseId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    quantity: new FormControl(1, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    adjustmentType: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(20)]
    }),
    reason: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(250)]
    })
  });

  constructor() {
    const queryParams = this.route.snapshot.queryParamMap;
    const openMovements = queryParams.get('tab') === 'movements';
    this.activeTab.set(openMovements ? 'movements' : 'overview');
    this.movementFilterForm.patchValue({
      productId: queryParams.get('productId') ?? '',
      warehouseId: queryParams.get('warehouseId') ?? ''
    });

    if (this.isBrowser) {
      this.loadInventory();
      this.loadLowStock();
      this.loadProducts();
      this.loadWarehouses();
      if (openMovements) {
        this.loadTransactions();
      }
      const transactionId = queryParams.get('transactionId');
      if (transactionId) {
        this.openTransactionDetailsById(transactionId);
      }
    }
  }

  ngOnDestroy(): void {
    this.detailRequest?.unsubscribe();
    this.transactionsRequest?.unsubscribe();
    this.transactionDetailsRequest?.unsubscribe();
    this.imageSubscriptions.forEach(s => s.unsubscribe());
    this.imageObjectUrls.forEach(url => URL.revokeObjectURL(url));
  }

  selectTab(tab: 'overview' | 'movements'): void {
    this.activeTab.set(tab);
    if (tab === 'movements' && !this.transactionsLoaded() && !this.transactionsLoading()) {
      this.loadTransactions(1);
    }
  }


  totalInvPages(): number {
    return Math.max(1, Math.ceil(this.totalInventoryCount() / this.pageSize()));
  }

  goInvPage(p: number): void {
    const target = Math.max(1, Math.min(p, this.totalInvPages()));
    this.loadInventory(target);
  }

  minVal(a: number, b: number): number {
    return Math.min(a, b);
  }

  getInvPageNumbers(): number[] {
    const total = this.totalInvPages();
    const current = this.page();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [1];
    if (current > 3) pages.push(-1);
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
  }

  updateInvSearch(event: Event): void {
    this.invSearch.set((event.target as HTMLInputElement).value);
  }

  updateInvWarehouse(event: Event): void {
    this.invWarehouseFilter.set((event.target as HTMLSelectElement).value);
  }

  updateInvStatus(event: Event): void {
    this.invStatusFilter.set((event.target as HTMLSelectElement).value);
  }

  /* ── Product image helpers ── */

  /** Resolve a relative imageUrl to a full API URL */
  productImageUrl(imageUrl: string): string {
    if (/^(https?:|data:|blob:)/i.test(imageUrl)) return imageUrl;
    return imageUrl.startsWith('/')
      ? `${environment.apiUrl}${imageUrl}`
      : `${environment.apiUrl}/${imageUrl}`;
  }

  /** Get the resolved image URL for a product, using cached blob URL if available */
  getProductImage(productId: string): string | null {
    const cached = this.productImageUrls()[productId];
    if (cached) return cached;
    const product = this.products().find(p => p.id === productId);
    return product?.imageUrl ? this.productImageUrl(product.imageUrl) : null;
  }

  /** Hide broken images and show placeholder icon */
  hideBrokenImage(event: Event): void {
    const img = event.currentTarget as HTMLImageElement;
    img.style.display = 'none';
    const placeholder = document.createElement('div');
    placeholder.className = 'product-image-placeholder';
    placeholder.innerHTML = '<i class="pi pi-image" aria-hidden="true"></i>';
    img.replaceWith(placeholder);
  }

  /** Load product images as blob URLs for faster rendering */
  private loadProductImages(products: Product[]): void {
    this.imageSubscriptions.forEach(s => s.unsubscribe());
    this.imageObjectUrls.forEach(url => URL.revokeObjectURL(url));
    this.imageSubscriptions.length = 0;
    this.imageObjectUrls.length = 0;
    this.productImageUrls.set({});

    if (typeof URL.createObjectURL !== 'function') return;

    for (const product of products) {
      if (!product.imageUrl) continue;
      const sub = this.http
        .get(this.productImageUrl(product.imageUrl), { responseType: 'blob' })
        .subscribe({
          next: blob => {
            const objectUrl = URL.createObjectURL(blob);
            this.imageObjectUrls.push(objectUrl);
            this.productImageUrls.update(urls => ({ ...urls, [product.id]: objectUrl }));
          },
          error: () => undefined
        });
      this.imageSubscriptions.push(sub);
    }
  }

  onPageChange(event: PaginatorState): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? this.pageSize();
    this.firstRow.set(first);
    this.pageSize.set(rows);
    this.loadInventory(Math.floor(first / rows) + 1);
  }

  loadInventory(page: number = this.page()): void {
    this.inventoryLoading.set(true);
    this.inventoryService.getInventory(page, this.pageSize())
      .pipe(finalize(() => this.inventoryLoading.set(false)))
      .subscribe({
        next: response => {
          this.inventory.set(response.items);
          this.totalInventoryCount.set(response.totalCount);
          this.page.set(response.page);
        },
        error: error => this.showApiError(error)
      });
  }

  openInventoryDetails(record: InventoryRecord): void {
    if (!record.id) {
      return;
    }

    this.detailRecord.set(record);
    this.loadInventoryDetails();
  }

  retryInventoryDetails(): void {
    if (this.detailRecord()) {
      this.loadInventoryDetails();
    }
  }

  closeInventoryDetails(): void {
    this.detailRequest?.unsubscribe();
    this.detailRequest = undefined;
    this.detailRecord.set(null);
    this.detailPayload.set(null);
    this.detailError.set(null);
    this.detailLoading.set(false);
  }

  formatPayload(payload: unknown): string {
    return JSON.stringify(payload, null, 2) ?? String(payload);
  }

  viewHistory(record: InventoryRecord): void {
    this.movementFilterForm.patchValue({
      productId: record.productId,
      warehouseId: record.warehouseId ?? ''
    });
    this.activeTab.set('movements');
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        tab: 'movements',
        productId: record.productId,
        warehouseId: record.warehouseId ?? null,
        transactionId: null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
    this.loadTransactions(1);
  }

  applyMovementFilters(): void {
    const { fromDate, toDate } = this.movementFilterForm.getRawValue();
    if (fromDate && toDate && fromDate > toDate) {
      this.movementDateError.set('The start date must be before or equal to the end date.');
      return;
    }

    this.movementDateError.set(null);
    this.loadTransactions(1);
  }

  resetMovementFilters(): void {
    this.movementFilterForm.reset({
      productId: '',
      warehouseId: '',
      type: '',
      fromDate: '',
      toDate: ''
    });
    this.movementDateError.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: 'movements', productId: null, warehouseId: null, transactionId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
    this.loadTransactions(1);
  }

  onTransactionsPageChange(event: PaginatorState): void {
    const rows = event.rows ?? this.transactionsPageSize();
    const first = event.first ?? 0;
    if (rows !== this.transactionsPageSize()) {
      this.transactionsPageSize.set(rows);
      this.loadTransactions(1);
      return;
    }
    this.loadTransactions(Math.floor(first / rows) + 1);
  }

  retryTransactions(): void {
    this.loadTransactions(this.transactionsPage());
  }

  openTransactionDetails(transaction: InventoryTransaction): void {
    this.transactionDetailsRow.set(transaction);
    this.openTransactionDetailsById(transaction.id);
  }

  openTransactionDetailsById(id: string): void {
    this.transactionDetailsId.set(id);
    this.loadTransactionDetails();
  }

  retryTransactionDetails(): void {
    this.loadTransactionDetails();
  }

  closeTransactionDetails(): void {
    this.transactionDetailsRequest?.unsubscribe();
    this.transactionDetailsRequest = undefined;
    this.transactionDetailsId.set(null);
    this.transactionDetailsRow.set(null);
    this.transactionDetailsPayload.set(null);
    this.transactionDetailsError.set(null);
    this.transactionDetailsLoading.set(false);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { transactionId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private loadTransactions(page: number = this.transactionsPage()): void {
    this.transactionsRequest?.unsubscribe();
    this.transactionsPage.set(page);
    this.transactionsLoading.set(true);
    this.transactionsError.set(null);

    const values = this.movementFilterForm.getRawValue();
    const query: InventoryTransactionQuery = {
      page,
      pageSize: this.transactionsPageSize(),
      productId: values.productId.trim() || undefined,
      warehouseId: values.warehouseId.trim() || undefined,
      type: values.type || undefined,
      fromDate: values.fromDate ? this.dateTimeBound(values.fromDate, false) : undefined,
      toDate: values.toDate ? this.dateTimeBound(values.toDate, true) : undefined
    };

    this.transactionsRequest = this.inventoryService.getInventoryTransactions(query)
      .pipe(finalize(() => this.transactionsLoading.set(false)))
      .subscribe({
        next: response => {
          this.transactions.set(response.transactions);
          this.transactionsLoaded.set(true);
          this.transactionsPage.set(response.page);
          this.transactionsPageSize.set(response.pageSize);
          this.transactionsTotalCount.set(response.totalCount);
        },
        error: error => {
          this.transactionsError.set(this.getApiMessage(error) ?? 'Unable to load stock movements. Try again.');
        }
      });
  }

  private loadTransactionDetails(): void {
    const id = this.transactionDetailsId();
    if (!id) {
      return;
    }

    this.transactionDetailsRequest?.unsubscribe();
    this.transactionDetailsPayload.set(null);
    this.transactionDetailsError.set(null);
    this.transactionDetailsLoading.set(true);
    this.transactionDetailsRequest = this.inventoryService.getInventoryTransaction(id)
      .pipe(finalize(() => this.transactionDetailsLoading.set(false)))
      .subscribe({
        next: payload => this.transactionDetailsPayload.set(payload),
        error: error => {
          this.transactionDetailsError.set(
            this.getApiMessage(error) ?? 'Unable to load transaction details. Try again.'
          );
        }
      });
  }

  private dateTimeBound(date: string, endOfDay: boolean): string {
    const localDateTime = `${date}T${endOfDay ? '23:59:59.999' : '00:00:00'}`;
    return new Date(localDateTime).toISOString();
  }

  private loadInventoryDetails(): void {
    const recordId = this.detailRecord()?.id;
    if (!recordId) {
      return;
    }

    this.detailRequest?.unsubscribe();
    this.detailPayload.set(null);
    this.detailError.set(null);
    this.detailLoading.set(true);
    this.detailRequest = this.inventoryService.getInventoryRecord(recordId)
      .pipe(finalize(() => this.detailLoading.set(false)))
      .subscribe({
        next: payload => this.detailPayload.set(payload),
        error: error => this.detailError.set(this.getApiMessage(error) ?? 'Unable to load inventory details. Try again.')
      });
  }

  loadLowStock(): void {
    this.lowStockLoading.set(true);
    this.inventoryService.getLowStock()
      .pipe(finalize(() => this.lowStockLoading.set(false)))
      .subscribe({
        next: response => this.lowStock.set(response),
        error: error => this.showApiError(error)
      });
  }

  loadProducts(): void {
    this.inventoryService.getProducts().subscribe({
      next: response => {
        this.products.set(response);
        this.loadProductImages(response);
      },
      error: error => this.showApiError(error)
    });
  }

  openAdjustment(): void {
    this.adjustmentForm.reset({
      productId: '',
      warehouseId: '',
      quantity: 1,
      adjustmentType: '',
      reason: ''
    });
    this.adjustmentDialogOpen.set(true);
  }

  closeAdjustment(): void {
    this.adjustmentDialogOpen.set(false);
  }

  adjustStock(): void {
    this.adjustmentForm.markAllAsTouched();
    if (this.adjustmentForm.invalid || this.saving()) {
      return;
    }

    const request: InventoryAdjustmentRequest = this.adjustmentForm.getRawValue();
    this.saving.set(true);
    this.inventoryService.adjustInventory(request)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.closeAdjustment();
          this.showNotice('success', 'Inventory adjustment recorded.');
          this.loadInventory();
          this.loadLowStock();
          if (this.activeTab() === 'movements') {
            this.loadTransactions(1);
          }
        },
        error: error => this.showApiError(error)
      });
  }



  dismissNotice(): void {
    this.notice.set(null);
  }

  private loadWarehouses(): void {
    this.inventoryService.getWarehouses().subscribe({
      next: response => this.warehouses.set(response),
      error: error => this.showApiError(error)
    });
  }

  private showNotice(type: 'success' | 'error', message: string): void {
    this.notice.set({ type, message });
  }

  private showApiError(error: unknown): void {
    const message = this.getApiMessage(error);
    if (message) {
      this.showNotice('error', message);
    }
  }

  private getApiMessage(error: unknown): string | null {
    if (!(error instanceof HttpErrorResponse) || error.status === 0) {
      return null;
    }

    return getMessageFromBody(error.error);
  }


}
