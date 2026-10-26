import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PaginatorModule } from 'primeng/paginator';
import type { PaginatorState } from 'primeng/types/paginator';
import { MessageService } from 'primeng/api';
import { finalize, Subscription } from 'rxjs';
import { Product, ProductRequest, Supplier } from '../../../../models/inventory.models';
import { InventoryService } from '../../../../core/services/inventory.service';

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PaginatorModule],
  templateUrl: './products-page.component.html',
  styleUrl: './products-page.component.scss'
})
export class ProductsPageComponent implements OnDestroy {
  private readonly inventoryService = inject(InventoryService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  readonly products = signal<Product[]>([]);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly suppliers = signal<Supplier[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly dialogOpen = signal(false);
  readonly editingProductId = signal<string | null>(null);
  readonly productPendingDeletion = signal<Product | null>(null);
  readonly stockProduct = signal<Product | null>(null);
  readonly stockPayload = signal<unknown>(null);
  readonly stockLoading = signal(false);
  readonly stockError = signal<string | null>(null);
  private stockRequest?: Subscription;
  readonly visibleProducts = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.products().slice(start, start + this.pageSize());
  });

  readonly productForm = new FormGroup({
    sku: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(50)] }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2), Validators.maxLength(100)] }),
    category: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    supplierId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    costPrice: new FormControl(0.01, { nonNullable: true, validators: [Validators.required, Validators.min(0.01), Validators.max(999999999)] }),
    sellPrice: new FormControl(0.01, { nonNullable: true, validators: [Validators.required, Validators.min(0.01), Validators.max(999999999)] }),
    minStock: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    isActive: new FormControl(true, { nonNullable: true })
  });

  constructor() {
    this.loadProducts();
    this.inventoryService.getSuppliers().subscribe({
      next: suppliers => this.suppliers.set(suppliers),
      error: error => this.showApiError(error)
    });
  }

  ngOnDestroy(): void {
    this.stockRequest?.unsubscribe();
  }

  supplierName(supplierId: string): string {
    return this.suppliers().find(supplier => supplier.id === supplierId)?.name ?? 'Unknown supplier';
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.products().length / this.pageSize()));
  }

  onPageChange(event: PaginatorState): void {
    const rows = event.rows ?? this.pageSize();
    const first = event.first ?? 0;
    this.pageSize.set(rows);
    this.page.set(Math.floor(first / rows) + 1);
  }

  viewStock(product: Product): void {
    this.stockProduct.set(product);
    this.loadProductStock();
  }

  viewMovementHistory(product: Product): void {
    void this.router.navigate(['/inventory'], {
      queryParams: { tab: 'movements', productId: product.id }
    });
  }

  retryProductStock(): void {
    if (this.stockProduct()) {
      this.loadProductStock();
    }
  }

  closeProductStock(): void {
    this.stockRequest?.unsubscribe();
    this.stockRequest = undefined;
    this.stockProduct.set(null);
    this.stockPayload.set(null);
    this.stockError.set(null);
    this.stockLoading.set(false);
  }

  formatPayload(payload: unknown): string {
    return JSON.stringify(payload, null, 2) ?? String(payload);
  }

  private loadProductStock(): void {
    const product = this.stockProduct();
    if (!product) {
      return;
    }

    this.stockRequest?.unsubscribe();
    this.stockPayload.set(null);
    this.stockError.set(null);
    this.stockLoading.set(true);
    this.stockRequest = this.inventoryService.getProductInventory(product.id)
      .pipe(finalize(() => this.stockLoading.set(false)))
      .subscribe({
        next: payload => this.stockPayload.set(payload),
        error: error => this.stockError.set(this.getApiMessage(error) ?? 'Unable to load product stock. Try again.')
      });
  }

  loadProducts(): void {
    this.loading.set(true);
    this.inventoryService.getProducts()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: products => {
          this.products.set(products);
          this.page.set(Math.min(this.page(), Math.max(1, Math.ceil(products.length / this.pageSize()))));
        },
        error: error => this.showApiError(error)
      });
  }

  openCreateProduct(): void {
    this.editingProductId.set(null);
    this.productForm.reset({
      sku: '',
      name: '',
      category: '',
      supplierId: '',
      costPrice: 0.01,
      sellPrice: 0.01,
      minStock: 0,
      isActive: true
    });
    this.dialogOpen.set(true);
  }

  openEditProduct(product: Product): void {
    this.editingProductId.set(product.id);
    this.productForm.setValue({
      sku: product.sku,
      name: product.name,
      category: product.category,
      supplierId: product.supplierId,
      costPrice: product.costPrice,
      sellPrice: product.sellPrice,
      minStock: product.minStock,
      isActive: product.isActive
    });
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
    this.productForm.markAsUntouched();
  }

  saveProduct() {
    this.productForm.markAllAsTouched();
    if (this.productForm.invalid || this.saving()) {
      return;
    }

    const request: ProductRequest = this.productForm.getRawValue();
    const id = this.editingProductId();
    this.saving.set(true);
    const request$ = id
      ? this.inventoryService.updateProduct(id, request)
      : this.inventoryService.createProduct(request);

    request$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: response => {
        this.closeDialog();
          this.messageService.add({
            severity: 'success',
            detail: response?.message || 'Product saved successfully.',
            life: 3500
          });

        this.loadProducts();
      },
      error: error => this.showApiError(error)
    });
  }

  deleteProduct(product: Product): void {
    this.productPendingDeletion.set(product);
  }

  cancelDeleteConfirmation(): void {
    this.productPendingDeletion.set(null);
  }

  confirmDeleteProduct(): void {
    const product = this.productPendingDeletion();
    if (!product || this.saving()) {
      return;
    }

    this.productPendingDeletion.set(null);
    this.saving.set(true);
    this.inventoryService.deleteProduct(product.id)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Product deleted',
            detail: `${product.name} has been deleted.`,
            life: 3500
          });
          this.loadProducts();
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
