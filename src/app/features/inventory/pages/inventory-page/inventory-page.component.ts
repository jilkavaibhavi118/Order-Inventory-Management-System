import { HttpErrorResponse } from '@angular/common/http';
import { PaginatorModule } from 'primeng/paginator';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, PLATFORM_ID, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
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

@Component({
  selector: 'app-inventory-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PaginatorModule],
  templateUrl: './inventory-page.component.html',
  styleUrl: './inventory-page.component.scss'
})
export class InventoryPageComponent implements OnDestroy {
  private readonly inventoryService = inject(InventoryService);
  private readonly messageService = inject(MessageService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

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
    quantity: new FormControl<number | null>(1, { validators: [Validators.min(1)] }),
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
  }

  selectTab(tab: 'overview' | 'movements'): void {
    this.activeTab.set(tab);
    if (tab === 'movements' && !this.transactionsLoaded() && !this.transactionsLoading()) {
      this.loadTransactions(1);
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
      next: response => this.products.set(response),
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

    const { quantity, ...requiredFields } = this.adjustmentForm.getRawValue();
    const request: InventoryAdjustmentRequest = {
      ...requiredFields,
      ...(quantity === null ? {} : { quantity })
    };
    this.saving.set(true);
    this.inventoryService.adjustInventory(request)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: response => {
          this.closeAdjustment();
          this.messageService.add({
            severity: 'success',
            summary: 'Inventory updated',
            detail: this.getResponseMessage(response) ?? 'Inventory adjustment recorded.',
            life: 4000
          });
          this.loadInventory();
          this.loadLowStock();
          if (this.activeTab() === 'movements') {
            this.loadTransactions(1);
          }
        },
        error: error => this.showApiError(error)
      });
  }



  private loadWarehouses(): void {
    this.inventoryService.getWarehouses().subscribe({
      next: response => this.warehouses.set(response),
      error: error => this.showApiError(error)
    });
  }

  private showApiError(error: unknown): void {
    const message = this.getApiMessage(error);
    this.messageService.add({
      severity: 'error',
      summary: 'Request failed',
      detail: message ?? 'Unable to complete the request. Please try again.',
      life: 5000
    });
  }

  private getApiMessage(error: unknown): string | null {
    if (!(error instanceof HttpErrorResponse)) {
      return null;
    }

    if (error.status === 0) {
      return 'Unable to reach the server. Check your connection and try again.';
    }

    return this.extractResponseMessage(error.error);
  }

  private getResponseMessage(response: unknown): string | null {
    return this.extractResponseMessage(response);
  }

  private extractResponseMessage(response: unknown): string | null {
    if (typeof response === 'string') {
      const text = response.trim();
      if (!text) {
        return null;
      }

      try {
        return this.extractResponseMessage(JSON.parse(text));
      } catch {
        return text.startsWith('<') ? null : text;
      }
    }

    if (Array.isArray(response)) {
      const messages = response
        .map(value => this.extractResponseMessage(value))
        .filter((message): message is string => Boolean(message));
      return messages.length ? [...new Set(messages)].join(' ') : null;
    }

    if (typeof response !== 'object' || response === null) {
      return null;
    }

    if ('errors' in response) {
      const message = this.extractResponseMessage(response.errors);
      if (message) {
        return message;
      }
    }

    for (const key of ['message', 'detail', 'title'] as const) {
      const value = key in response ? response[key] : null;
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    const nestedMessages = Object.values(response)
      .map(value => this.extractResponseMessage(value))
      .filter((message): message is string => Boolean(message));
    return nestedMessages.length ? [...new Set(nestedMessages)].join(' ') : null;
  }


}
