import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { PaginatorModule } from 'primeng/paginator';
import type { PaginatorState } from 'primeng/types/paginator';
import { finalize } from 'rxjs';
import { InventoryService } from '../../../../core/services/inventory.service';
import { Supplier, SupplierRequest } from '../../../../models/inventory.models';

@Component({
  selector: 'app-suppliers-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PaginatorModule],
  templateUrl: './suppliers-page.component.html',
  styleUrl: './suppliers-page.component.scss'
})
export class SuppliersPageComponent {
  private readonly inventoryService = inject(InventoryService);
  private readonly messageService = inject(MessageService);

  readonly suppliers = signal<Supplier[]>([]);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly visibleSuppliers = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.suppliers().slice(start, start + this.pageSize());
  });
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly dialogOpen = signal(false);
  readonly editingSupplierId = signal<string | null>(null);
  readonly supplierPendingDeletion = signal<Supplier | null>(null);

  readonly supplierForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)]
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(254)]
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(30)]
    }),
    address: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(250)]
    })
  });

  constructor() {
    this.loadSuppliers();
  }

  onPageChange(event: PaginatorState): void {
    const rows = event.rows ?? this.pageSize();
    const first = event.first ?? 0;
    this.pageSize.set(rows);
    this.page.set(Math.floor(first / rows) + 1);
  }

  loadSuppliers(): void {
    this.loading.set(true);
    this.inventoryService.getSuppliers()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: suppliers => {
          this.suppliers.set(suppliers);
          this.page.set(Math.min(this.page(), Math.max(1, Math.ceil(suppliers.length / this.pageSize()))));
        },
        error: error => this.showApiError(error)
      });
  }

  openCreateSupplier(): void {
    this.editingSupplierId.set(null);
    this.supplierForm.reset({ name: '', email: '', phone: '', address: '' });
    this.dialogOpen.set(true);
  }

  openEditSupplier(supplier: Supplier): void {
    this.editingSupplierId.set(supplier.id);
    this.supplierForm.setValue({
      name: supplier.name,
      email: supplier.email ?? '',
      phone: supplier.phone ?? '',
      address: supplier.address ?? ''
    });
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
    this.supplierForm.markAsUntouched();
  }

  saveSupplier(): void {
    this.supplierForm.markAllAsTouched();
    if (this.supplierForm.invalid || this.saving()) {
      return;
    }

    const request: SupplierRequest = this.supplierForm.getRawValue();
    const id = this.editingSupplierId();
    const request$ = id
      ? this.inventoryService.updateSupplier(id, request)
      : this.inventoryService.createSupplier(request);

    this.saving.set(true);
    request$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: response => {
        this.closeDialog();
          this.messageService.add({
            severity: 'success',
            detail: response?.message || 'Supplier saved successfully.',
            life: 4000
          });

        this.loadSuppliers();
      },
      error: error => this.showApiError(error)
    });
  }

  requestDelete(supplier: Supplier): void {
    this.supplierPendingDeletion.set(supplier);
  }

  cancelDelete(): void {
    this.supplierPendingDeletion.set(null);
  }

  formatDate(value?: string): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  confirmDelete(): void {
    const supplier = this.supplierPendingDeletion();
    if (!supplier || this.saving()) {
      return;
    }

    this.supplierPendingDeletion.set(null);
    this.saving.set(true);
    this.inventoryService.deleteSupplier(supplier.id)
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
          this.loadSuppliers();
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
