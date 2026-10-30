import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnDestroy, PLATFORM_ID, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { PaginatorModule } from 'primeng/paginator';
import { Select } from 'primeng/select';
import type { PaginatorState } from 'primeng/types/paginator';
import { MessageService } from 'primeng/api';
import { finalize, Subscription } from 'rxjs';
import { Product, Supplier } from '../../../../models/inventory.models';
import { InventoryService } from '../../../../core/services/inventory.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginatorModule, Select],
  templateUrl: './products-page.component.html',
  styleUrl: './products-page.component.scss',
})
export class ProductsPageComponent implements OnDestroy {
  private readonly inventoryService = inject(InventoryService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly products = signal<Product[]>([]);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly searchTerm = signal('');
  readonly categoryFilter = signal('');
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
  readonly selectedProductImage = signal<File | null>(null);
  readonly productImageUrls = signal<Record<string, string>>({});
  readonly productImageErrors = signal<Record<string, boolean>>({});

  readonly statusFilter = signal('');
  private stockRequest?: Subscription;
  private readonly imageSubscriptions: Subscription[] = [];
  private readonly imageObjectUrls: string[] = [];

  readonly statusOptions = [
    { label: 'All Status', value: '' },
    { label: 'In Stock', value: 'in-stock' },
    { label: 'Low Stock', value: 'low-stock' },
    { label: 'Out of Stock', value: 'out-of-stock' },
  ];

  readonly categories = computed(() =>
    [
      ...new Set(
        this.products()
          .map((product) => product.category.trim())
          .filter(Boolean),
      ),
    ].sort((first, second) => first.localeCompare(second)),
  );

  readonly categoryOptions = computed(() => [
    { label: 'All Categories', value: '' },
    ...this.categories().map((cat) => ({ label: cat, value: cat })),
  ]);

  get categoryFilterValue(): string {
    return this.categoryFilter();
  }

  set categoryFilterValue(val: string) {
    this.categoryFilter.set(val ?? '');
    this.page.set(1);
  }

  get statusFilterValue(): string {
    return this.statusFilter();
  }

  set statusFilterValue(val: string) {
    this.statusFilter.set(val ?? '');
    this.page.set(1);
  }
  readonly inStockCount = computed(
    () => this.products().filter((p) => p.isActive && p.minStock > 10).length,
  );
  readonly lowStockCount = computed(
    () => this.products().filter((p) => p.isActive && p.minStock > 0 && p.minStock <= 10).length,
  );
  readonly outOfStockCount = computed(
    () => this.products().filter((p) => !p.isActive || p.minStock === 0).length,
  );
  readonly filteredProducts = computed(() => {
    const search = this.searchTerm().trim().toLocaleLowerCase();
    const category = this.categoryFilter();
    const status = this.statusFilter();
    return this.products().filter((product) => {
      const matchesCategory = !category || product.category === category;
      const matchesSearch =
        !search ||
        [product.name, product.sku, product.category, this.supplierName(product.supplierId)].some(
          (value) => value.toLocaleLowerCase().includes(search),
        );
      let matchesStatus = true;
      if (status === 'in-stock') matchesStatus = product.isActive && product.minStock > 10;
      else if (status === 'low-stock')
        matchesStatus = product.isActive && product.minStock > 0 && product.minStock <= 10;
      else if (status === 'out-of-stock')
        matchesStatus = !product.isActive || product.minStock === 0;
      return matchesCategory && matchesSearch && matchesStatus;
    });
  });
  readonly visibleProducts = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filteredProducts().slice(start, start + this.pageSize());
  });

  readonly productForm = new FormGroup({
    sku: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)],
    }),
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
    }),
    category: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    supplierId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    costPrice: new FormControl(0.01, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.01), Validators.max(999999999)],
    }),
    sellPrice: new FormControl(0.01, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.01), Validators.max(999999999)],
    }),
    minStock: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(1000)],
    }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  constructor() {
    this.loadProducts();
    this.inventoryService.getSuppliers().subscribe({
      next: (suppliers) => this.suppliers.set(suppliers),
      error: (error) => this.showApiError(error),
    });
  }

  ngOnDestroy(): void {
    this.stockRequest?.unsubscribe();
    this.clearProductImages();
  }

  supplierName(supplierId: string): string {
    return (
      this.suppliers().find((supplier) => supplier.id === supplierId)?.name ?? 'Unknown supplier'
    );
  }

 getProductImageUrl(product: Product): string | null {
  const imageUrl = product.imageUrl;

  if (!imageUrl) {
    return null;
  }

  return this.productImageUrl(imageUrl);
}


productImageUrl(imageUrl: string): string {
  if (!imageUrl) {
    return '';
  }

  // Already a complete URL
  if (/^(https?:|data:|blob:)/i.test(imageUrl)) {
    return imageUrl;
  }

  // Remove trailing /api from the API URL
  const baseUrl = environment.apiUrl
    .replace(/\/api\/?$/i, '')
    .replace(/\/+$/, '');

  // Convert relative path into an absolute URL
  const path = imageUrl.replace(/^\/+/, '');

  return `${baseUrl}/${path}`;
}


  onProductImageError(event: Event): void {
    const image = event.target as HTMLImageElement;

    image.onerror = null;
    image.style.display = 'none';
  }

  hideBrokenImage(event: Event): void {
    const image = event.currentTarget as HTMLImageElement;
    image.style.display = 'none';

    const placeholder = document.createElement('div');
    placeholder.className = 'product-image-placeholder';
    placeholder.setAttribute('aria-label', 'Image unavailable');
    placeholder.innerHTML = '<i class="pi pi-image" aria-hidden="true"></i>';
    image.replaceWith(placeholder);
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.filteredProducts().length / this.pageSize()));
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredProducts().length / this.pageSize()));
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
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: number[] = [1];
    if (current > 3) pages.push(-1);
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
  }

  onPageChange(event: PaginatorState): void {
    const rows = event.rows ?? this.pageSize();
    const first = event.first ?? 0;
    this.pageSize.set(rows);
    this.page.set(Math.floor(first / rows) + 1);
  }

  updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.page.set(1);
  }

  updateCategory(event: Event): void {
    this.categoryFilter.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
  }

  updateStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
  }

  viewStock(product: Product): void {
    this.stockProduct.set(product);
    this.loadProductStock();
  }

  viewMovementHistory(product: Product): void {
    void this.router.navigate(['/inventory'], {
      queryParams: { tab: 'movements', productId: product.id },
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
    this.stockRequest = this.inventoryService
      .getProductInventory(product.id)
      .pipe(finalize(() => this.stockLoading.set(false)))
      .subscribe({
        next: (payload) => this.stockPayload.set(payload),
        error: (error) =>
          this.stockError.set(
            this.getApiMessage(error) ?? 'Unable to load product stock. Try again.',
          ),
      });
  }

  loadProducts(): void {
    this.loading.set(true);

    this.inventoryService
      .getProducts()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (products) => {
          this.products.set(products);
          this.loadProductImages(products);

          this.page.set(
            Math.min(this.page(), Math.max(1, Math.ceil(products.length / this.pageSize()))),
          );
        },
        error: (error) => this.showApiError(error),
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
      description: '',
      isActive: true,
    });
    this.selectedProductImage.set(null);
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
      description: product.description ?? '',
      isActive: product.isActive,
    });
    this.selectedProductImage.set(null);
    this.dialogOpen.set(true);
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedProductImage.set(input.files?.item(0) ?? null);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
    this.selectedProductImage.set(null);
    this.productForm.markAsUntouched();
  }

  saveProduct() {
    this.productForm.markAllAsTouched();
    if (this.productForm.invalid || this.saving()) {
      return;
    }

    const formValue = this.productForm.getRawValue();
    const request = new FormData();
    request.append('SKU', formValue.sku);
    request.append('Name', formValue.name);
    request.append('Category', formValue.category);
    request.append('SupplierId', formValue.supplierId);
    request.append('CostPrice', String(formValue.costPrice));
    request.append('SellPrice', String(formValue.sellPrice));
    request.append('MinStock', String(formValue.minStock));
    request.append('Description', formValue.description.trim());
    request.append('IsActive', String(formValue.isActive));

    const image = this.selectedProductImage();
    if (image) {
      request.append('Image', image, image.name);
    }

    const id = this.editingProductId();
    this.saving.set(true);
    const request$ = id
      ? this.inventoryService.updateProduct(id, request)
      : this.inventoryService.createProduct(request);

    request$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (response) => {
        this.closeDialog();
        this.messageService.add({
          severity: 'success',
          detail: response?.message || 'Product saved successfully.',
          life: 3500,
        });

        this.loadProducts();
      },
      error: (error) => this.showApiError(error),
    });
  }

  private loadProductImages(products: Product[]): void {
    this.clearProductImages();
    if (!this.isBrowser || typeof URL.createObjectURL !== 'function') {
      return;
    }

    for (const product of products) {
      const imageUrl = product.imageUrl;
      if (!imageUrl) {
        continue;
      }

      if (/^(data:|blob:)/i.test(imageUrl)) {
        this.productImageUrls.update((urls) => ({ ...urls, [product.id]: imageUrl }));
        continue;
      }

      const subscription = this.http
        .get(this.productImageUrl(imageUrl), { responseType: 'blob' })
        .subscribe({
          next: (blob) => {
            if (blob.size === 0) {
              this.productImageErrors.update((errors) => ({ ...errors, [product.id]: true }));
              return;
            }
            const objectUrl = URL.createObjectURL(blob);
            this.imageObjectUrls.push(objectUrl);
            this.productImageUrls.update((urls) => ({ ...urls, [product.id]: objectUrl }));
          },
          error: () =>
            this.productImageErrors.update((errors) => ({ ...errors, [product.id]: true })),
        });
      this.imageSubscriptions.push(subscription);
    }
  }

  private clearProductImages(): void {
    this.imageSubscriptions.forEach((subscription) => subscription.unsubscribe());
    this.imageSubscriptions.length = 0;
    this.imageObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.imageObjectUrls.length = 0;
    this.productImageUrls.set({});
    this.productImageErrors.set({});
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
    this.inventoryService
      .deleteProduct(product.id)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Product deleted',
            detail: `${product.name} has been deleted.`,
            life: 3500,
          });
          this.loadProducts();
        },
        error: (error) => this.showApiError(error),
      });
  }

  private showApiError(error: unknown): void {
    const detail = this.getApiMessage(error);
    if (detail) {
      this.messageService.add({
        severity: 'error',
        detail,
        life: 5000,
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
