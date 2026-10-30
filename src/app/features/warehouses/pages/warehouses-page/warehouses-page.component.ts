import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { PaginatorModule } from 'primeng/paginator';
import type { PaginatorState } from 'primeng/types/paginator';
import { finalize } from 'rxjs';
import { InventoryService } from '../../../../core/services/inventory.service';
import { Warehouse, WarehouseRequest } from '../../../../models/inventory.models';

@Component({
  selector: 'app-warehouses-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PaginatorModule],
  templateUrl: './warehouses-page.component.html',
  styleUrl: './warehouses-page.component.scss'
})
export class WarehousesPageComponent {
  private readonly inventoryService = inject(InventoryService);
  private readonly messageService = inject(MessageService);

  readonly warehouses = signal<Warehouse[]>([]);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly warehouseSearch = signal('');
  readonly warehouseStatusFilter = signal('');
  readonly filteredWarehouses = computed(() => {
    const search = this.warehouseSearch().trim().toLowerCase();
    const status = this.warehouseStatusFilter();
    return this.warehouses().filter(w => {
      const matchesStatus = !status || (status === 'active' ? w.isActive : !w.isActive);
      const matchesSearch = !search || [w.name, w.location].some(v => v.toLowerCase().includes(search));
      return matchesStatus && matchesSearch;
    });
  });
  readonly visibleWarehouses = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filteredWarehouses().slice(start, start + this.pageSize());
  });
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly dialogOpen = signal(false);
  readonly editingWarehouseId = signal<string | null>(null);
  readonly warehousePendingDeletion = signal<Warehouse | null>(null);

  readonly warehouseForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)]
    }),
    location: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(250)]
    }),
    isActive: new FormControl(true, { nonNullable: true })
  });

  constructor() {
    this.loadWarehouses();
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredWarehouses().length / this.pageSize()));
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

  updateWarehouseSearch(event: Event): void {
    this.warehouseSearch.set((event.target as HTMLInputElement).value);
    this.page.set(1);
  }

  onPageChange(event: PaginatorState): void {
    const rows = event.rows ?? this.pageSize();
    const first = event.first ?? 0;
    this.pageSize.set(rows);
    this.page.set(Math.floor(first / rows) + 1);
  }

  loadWarehouses(): void {
    this.loading.set(true);
    this.inventoryService.getWarehouses()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: warehouses => {
          this.warehouses.set(warehouses);
          this.page.set(Math.min(this.page(), Math.max(1, Math.ceil(warehouses.length / this.pageSize()))));
        },
        error: error => this.showApiError(error)
      });
  }

  openCreateWarehouse(): void {
    this.editingWarehouseId.set(null);
    this.warehouseForm.reset({ name: '', location: '', isActive: true });
    this.dialogOpen.set(true);
  }

  openEditWarehouse(warehouse: Warehouse): void {
    this.editingWarehouseId.set(warehouse.id);
    this.warehouseForm.setValue({
      name: warehouse.name,
      location: warehouse.location,
      isActive: warehouse.isActive
    });
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
    this.warehouseForm.markAsUntouched();
  }

  saveWarehouse(): void {
    this.warehouseForm.markAllAsTouched();
    if (this.warehouseForm.invalid || this.saving()) {
      return;
    }

    const request: WarehouseRequest = this.warehouseForm.getRawValue();
    const id = this.editingWarehouseId();
    const request$ = id
      ? this.inventoryService.updateWarehouse(id, request)
      : this.inventoryService.createWarehouse(request);

    this.saving.set(true);
    request$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: response => {
        this.closeDialog();
        this.messageService.add({
          severity: 'success',
          detail: response?.message || (id ? 'Warehouse updated successfully.' : 'Warehouse created successfully.'),
          life: 4000
        });
        this.loadWarehouses();
      },
      error: error => this.showApiError(error)
    });
  }

  requestDelete(warehouse: Warehouse): void {
    this.warehousePendingDeletion.set(warehouse);
  }

  cancelDelete(): void {
    this.warehousePendingDeletion.set(null);
  }

  confirmDelete(): void {
    const warehouse = this.warehousePendingDeletion();
    if (!warehouse || this.saving()) {
      return;
    }

    this.warehousePendingDeletion.set(null);
    this.saving.set(true);
    this.inventoryService.deleteWarehouse(warehouse.id)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: response => {
          if (response?.message?.trim()) {
            this.messageService.add({
              severity: 'success',
              detail: response.message,
              life: 4000
            });
          }
          this.loadWarehouses();
        },
        error: error => this.showApiError(error)
      });
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
      const text = body.trim();
      try {
        const parsed: unknown = JSON.parse(text);
        if (typeof parsed === 'string') {
          return parsed.trim() || null;
        }
        if (typeof parsed === 'object' && parsed !== null && 'message' in parsed) {
          const message = parsed.message;
          return typeof message === 'string' && message.trim() ? message : null;
        }
        return null;
      } catch {
        return text.startsWith('<') ? null : text || null;
      }
    }

    if (typeof body === 'object' && body !== null && 'message' in body) {
      const message = body.message;
      return typeof message === 'string' && message.trim() ? message : null;
    }

    return null;
  }
}
