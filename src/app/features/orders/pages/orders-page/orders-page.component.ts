import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { CheckboxModule } from 'primeng/checkbox';
import { PaginatorModule } from 'primeng/paginator';
import { Select } from 'primeng/select';
import type { PaginatorState } from 'primeng/types/paginator';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { Product, Warehouse } from '../../../../models/inventory.models';
import {
  Order,
  OrderFormModel,
  OrderItem,
  OrderItemFormModel,
  OrderItemRequest,
  OrderPage,
  OrderQuery,
  OrderRequest
} from '../../../../models/order.models';
import { OrdersService } from '../../../../core/services/orders.service';
import { DatePickerModule } from 'primeng/datepicker';

type SortField = 'orderDate' | 'status' | 'customer' | 'total';

@Component({
  selector: 'app-orders-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginatorModule, Select, DatePickerModule, CheckboxModule, RouterLink],
  templateUrl: './orders-page.component.html',
  styleUrl: './orders-page.component.scss'
})
export class OrdersPageComponent {
  private readonly authService = inject(AuthService);
  private readonly ordersService = inject(OrdersService);
  private readonly inventoryService = inject(InventoryService);
  private readonly messageService = inject(MessageService);

  readonly orders = signal<Order[]>([]);
  readonly products = signal<Product[]>([]);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalCount = signal(0);
  readonly statusFilter = signal('');
  readonly fromDateFilter = signal('');
  readonly toDateFilter = signal('');
  readonly sortField = signal<SortField>('orderDate');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');
  readonly orderDialogOpen = signal(false);
  readonly statusDialogOpen = signal(false);
  readonly orderPendingDeletion = signal<Order | null>(null);
  readonly editingOrderId = signal<string | null>(null);
  readonly statusOrderId = signal<string | null>(null);

  readonly orderSearch = signal('');
  readonly selectedOrderIds = signal<Set<string>>(new Set());
  readonly warehouseOptions = computed(() =>
    this.warehouses().map(warehouse => ({ label: warehouse.name, value: warehouse.id }))
  );
  readonly orderProductOptions = computed(() =>
    this.products().map(product => ({
      label: `${product.name} (${product.sku})`,
      value: product.id
    }))
  );
  readonly filteredOrders = computed(() => {
    const search = this.orderSearch().trim().toLowerCase();
    const status = this.statusFilter().trim().toLowerCase();
    return this.orders().filter(order => {
      const matchesStatus = !status || (order.status || '').toLowerCase().includes(status);
      const matchesSearch = !search || [
        this.displayOrderId(order),
        this.displayCustomer(order),
        this.displayWarehouse(order),
        order.status ?? ''
      ].some(v => v.toLowerCase().includes(search));
      return matchesStatus && matchesSearch;
    });
  });
  readonly visibleOrders = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filteredOrders().slice(start, start + this.pageSize());
  });
  readonly sortedOrders = computed(() => {
    const direction = this.sortDirection() === 'asc' ? 1 : -1;
    const field = this.sortField();

    return [...this.orders()].sort((left, right) => {
      const leftValue = this.sortValue(left, field);
      const rightValue = this.sortValue(right, field);
      return leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: 'base' }) * direction;
    });
  });

  readonly orderForm = new FormGroup<OrderFormModel>({
    customerId: new FormControl(
      { value: '', disabled: true },
      {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
        ]
      }
    ),
    warehouseId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    items: new FormArray<FormGroup<OrderItemFormModel>>([], Validators.minLength(1))
  });

  readonly statusForm = new FormGroup({
    status: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(20)] })
  });

  constructor() {
    this.loadOrders();
    this.inventoryService.getProducts().subscribe({
      next: products => this.products.set(products),
      error: error => this.showApiError(error)
    });
    this.inventoryService.getWarehouses().subscribe({
      next: warehouses => this.warehouses.set(warehouses.filter(warehouse => warehouse.isActive)),
      error: error => this.showApiError(error)
    });
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.totalCount() / this.pageSize()));
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredOrders().length / this.pageSize()));
  }

  setPage(p: number): void {
    this.page.set(Math.max(1, Math.min(p, this.totalPages())));
  }

  minVal(a: number, b: number): number {
    return Math.min(a, b);
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.page();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [1];
    if (current > 3) pages.push(-1);
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
  }

  setStatusFilterTab(status: string): void {
    this.statusFilter.set(status);
    this.page.set(1);
  }

  updateOrderSearch(event: Event): void {
    this.orderSearch.set((event.target as HTMLInputElement).value);
    this.page.set(1);
  }

  updateFromDateFilter(value: string | null): void {
    this.fromDateFilter.set(value ?? '');
  }

  updateToDateFilter(value: string | null): void {
    this.toDateFilter.set(value ?? '');
  }

  orderSelectionKey(order: Order): string | null {
    return order.id ?? order.orderId ?? null;
  }

  isOrderSelected(order: Order): boolean {
    const key = this.orderSelectionKey(order);
    return key !== null && this.selectedOrderIds().has(key);
  }

  areVisibleOrdersSelected(): boolean {
    const visibleOrders = this.visibleOrders();
    return visibleOrders.length > 0 && visibleOrders.every(order => this.isOrderSelected(order));
  }

  toggleOrderSelection(order: Order, selected: boolean): void {
    const key = this.orderSelectionKey(order);
    if (!key) {
      return;
    }

    const selectedIds = new Set(this.selectedOrderIds());
    if (selected) {
      selectedIds.add(key);
    } else {
      selectedIds.delete(key);
    }
    this.selectedOrderIds.set(selectedIds);
  }

  toggleVisibleOrderSelection(selected: boolean): void {
    const selectedIds = new Set(this.selectedOrderIds());
    for (const order of this.visibleOrders()) {
      const key = this.orderSelectionKey(order);
      if (!key) {
        continue;
      }

      if (selected) {
        selectedIds.add(key);
      } else {
        selectedIds.delete(key);
      }
    }
    this.selectedOrderIds.set(selectedIds);
  }

  onPageChange(event: PaginatorState): void {
    if (this.loading()) {
      return;
    }

    const rows = event.rows ?? this.pageSize();
    const first = event.first ?? 0;
    this.pageSize.set(rows);
    this.loadOrders(Math.floor(first / rows) + 1);
  }

  loadOrders(page = this.page()): void {
    this.page.set(page);
    this.loading.set(true);
    const query: OrderQuery = {
      page,
      pageSize: this.pageSize(),
      status: this.statusFilter().trim() || undefined,
      fromDate: this.toDateTime(this.fromDateFilter(), false),
      toDate: this.toDateTime(this.toDateFilter(), true)
    };

    this.ordersService.getOrders(query)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: response => this.setOrderPage(response),
        error: error => this.showApiError(error)
      });
  }

  applyFilters(): void {
    if (
      this.fromDateFilter() &&
      this.toDateFilter() &&
      this.fromDateFilter() > this.toDateFilter()
    ) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid date range',
        detail: 'The start date must be before or equal to the end date.',
        life: 4000
      });
      return;
    }

    this.loadOrders(1);
  }

  clearFilters(): void {
    this.statusFilter.set('');
    this.fromDateFilter.set('');
    this.toDateFilter.set('');
    this.loadOrders(1);
  }

  setStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLInputElement).value);
  }

  sortBy(field: SortField): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
      return;
    }

    this.sortField.set(field);
    this.sortDirection.set(field === 'orderDate' || field === 'total' ? 'desc' : 'asc');
  }

  openCreateOrder(): void {
    this.editingOrderId.set(null);
    this.orderForm.reset({
      customerId: this.authService.currentUserId() ?? '',
      warehouseId: ''
    });
    this.orderForm.controls.items.clear();
    this.addOrderItem();
    this.orderDialogOpen.set(true);
  }

  openEditOrder(order: Order): void {
    const id = this.getOrderId(order);
    if (!id) {
      return;
    }

    this.loading.set(true);
    this.ordersService.getOrder(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: detail => {
          this.editingOrderId.set(id);
          this.orderForm.reset({
            customerId: this.authService.currentUserId() ?? '',
            warehouseId: detail.warehouseId
          });
          this.orderForm.controls.items.clear();
          for (const item of detail.items ?? []) {
            this.orderForm.controls.items.push(this.createItemForm(item));
          }
          if (this.orderForm.controls.items.length === 0) {
            this.addOrderItem();
          }
          this.orderDialogOpen.set(true);
        },
        error: error => this.showApiError(error)
      });
  }

  addOrderItem(item?: OrderItem): void {
    this.orderForm.controls.items.push(this.createItemForm(item));
  }

  removeOrderItem(index: number): void {
    if (this.orderForm.controls.items.length > 1) {
      this.orderForm.controls.items.removeAt(index);
    }
  }

  closeOrderDialog(): void {
    this.orderDialogOpen.set(false);
  }

  saveOrder(): void {
    this.orderForm.markAllAsTouched();
    if (this.orderForm.invalid || this.saving()) {
      return;
    }

    const formValue = this.orderForm.getRawValue();
    const customerId = this.authService.currentUserId();
    if (!customerId) {
      return;
    }
    const request: OrderRequest = {
      customerId,
      warehouseId: formValue.warehouseId,
      items: formValue.items.map((item): OrderItemRequest => ({
        productId: item.productId,
        quantity: item.quantity
      }))
    };
    const orderId = this.editingOrderId();

    this.saving.set(true);
    const request$ = orderId
      ? this.ordersService.updateOrder(orderId, request)
      : this.ordersService.createOrder(request);

    request$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.closeOrderDialog();
        this.messageService.add({
          severity: 'success',
          summary: orderId ? 'Order updated' : 'Order created',
          detail: orderId ? 'The order has been updated.' : 'The order has been created.',
          life: 3500
        });
        this.loadOrders(orderId ? this.page() : 1);
      },
      error: error => this.showApiError(error)
    });
  }

  openStatusDialog(order: Order): void {
    const id = this.getOrderId(order);
    if (!id) {
      return;
    }

    this.statusOrderId.set(id);
    this.statusForm.reset({ status: order.status ?? '' });
    this.statusDialogOpen.set(true);
  }

  closeStatusDialog(): void {
    this.statusDialogOpen.set(false);
  }

  saveStatus(): void {
    this.statusForm.markAllAsTouched();
    if (this.statusForm.invalid || this.saving()) {
      return;
    }

    const id = this.statusOrderId();
    if (!id) {
      return;
    }

    this.saving.set(true);
    this.ordersService.updateStatus(id, this.statusForm.getRawValue())
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.closeStatusDialog();
          this.messageService.add({
            severity: 'success',
            summary: 'Status updated',
            detail: 'The order status has been updated.',
            life: 3500
          });
          this.loadOrders();
        },
        error: error => this.showApiError(error)
      });
  }

  deleteOrder(order: Order): void {
    if (this.getOrderId(order)) {
      this.orderPendingDeletion.set(order);
    }
  }

  cancelDeleteOrder(): void {
    this.orderPendingDeletion.set(null);
  }

  confirmDeleteOrder(): void {
    const order = this.orderPendingDeletion();
    const id = order ? this.getOrderId(order) : null;
    if (!order || !id || this.saving()) {
      return;
    }

    this.orderPendingDeletion.set(null);
    this.saving.set(true);
    this.ordersService.deleteOrder(id)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Order deleted',
            detail: 'The order has been deleted.',
            life: 3500
          });
          this.loadOrders(this.orders().length === 1 && this.page() > 1 ? this.page() - 1 : this.page());
        },
        error: error => this.showApiError(error)
      });
  }

  displayOrderId(order: Order): string {
    return order.orderId ?? order.id ?? 'Order';
  }

  displayCustomer(order: Order): string {
    return order.customerName ?? order.customerId;
  }

  displayWarehouse(order: Order): string {
    return order.warehouseName ?? order.warehouseId;
  }

  displayOrderDate(order: Order): string {
    const date = order.orderDate ?? order.createdAt;
    return date ? new Date(date).toLocaleString() : '—';
  }

  displayItems(order: Order): string {
    return order.items?.map(item => `${item.productName ?? item.productSku ?? item.productId} × ${item.quantity}`).join(', ')
      ?? '—';
  }

  private createItemForm(item?: OrderItem): FormGroup<OrderItemFormModel> {
    return new FormGroup<OrderItemFormModel>({
      productId: new FormControl(item?.productId ?? '', { nonNullable: true, validators: [Validators.required] }),
      quantity: new FormControl(item?.quantity ?? 1, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(1), Validators.max(2147483647)]
      })
    });
  }

  private sortValue(order: Order, field: SortField): string {
    switch (field) {
      case 'orderDate':
        return order.orderDate ?? order.createdAt ?? '';
      case 'status':
        return order.status ?? '';
      case 'customer':
        return this.displayCustomer(order);
      case 'total':
        return String(order.totalAmount ?? 0);
    }
  }

  private getOrderId(order: Order): string | null {
    return order.id ?? order.orderId ?? null;
  }

  private setOrderPage(response: OrderPage): void {
    this.orders.set(response.orders);
    this.totalCount.set(response.totalCount);
    this.page.set(response.page);
    this.pageSize.set(response.pageSize);
  }

  private toDateTime(value: string, endOfDay: boolean): string | undefined {
    if (!value) {
      return undefined;
    }

    const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
    return date.toISOString();
  }

  private showApiError(error: unknown): void {
    const detail = this.getApiMessage(error);
    if (detail) {
      this.messageService.add({
        severity: 'error',
        detail,
        life: 5000
      });
    }
  }

  private getApiMessage(error: unknown): string | null {
    if (!(error instanceof HttpErrorResponse) || error.status === 0) {
      return null;
    }

    const body: unknown = error.error;
    if (typeof body === 'string') {
      const responseText = body.trim();
      try {
        const parsed: unknown = JSON.parse(responseText);
        if (typeof parsed === 'string' && parsed.trim()) {
          return parsed;
        }
        if (typeof parsed === 'object' && parsed !== null && 'message' in parsed) {
          const message = parsed.message;
          return typeof message === 'string' && message.trim() ? message : null;
        }
        return null;
      } catch {
        return responseText.startsWith('<') ? null : responseText || null;
      }
    }

    if (typeof body !== 'object' || body === null || !('message' in body)) {
      return null;
    }

    const message = body.message;
    return typeof message === 'string' && message.trim() ? message : null;
  }
}
