import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { InventoryService } from '../../../../core/services/inventory.service';
import { environment } from '../../../../../environments/environment';
import { ProductsPageComponent } from './products-page.component';

describe('ProductsPageComponent', () => {
  let fixture: ComponentFixture<ProductsPageComponent>;
  let component: ProductsPageComponent;
  let httpTestingController: HttpTestingController;
  let mockInventoryService: {
    getProducts: ReturnType<typeof vi.fn>;
    getProductInventory: ReturnType<typeof vi.fn>;
    getSuppliers: ReturnType<typeof vi.fn>;
    createProduct: ReturnType<typeof vi.fn>;
    updateProduct: ReturnType<typeof vi.fn>;
    deleteProduct: ReturnType<typeof vi.fn>;
  };
  const messageService = { add: vi.fn() };

  beforeEach(async () => {
    mockInventoryService = {
      getProducts: vi.fn().mockReturnValue(of([])),
      getProductInventory: vi.fn().mockReturnValue(of([{ warehouseId: 'warehouse-id', quantity: 4 }])),
      getSuppliers: vi.fn().mockReturnValue(of([{ id: 'supplier-id', name: 'Supplier' }])),
      createProduct: vi.fn().mockReturnValue(of({ message: 'Product created successfully.' })),
      updateProduct: vi.fn().mockReturnValue(of({})),
      deleteProduct: vi.fn().mockReturnValue(of({}))
    };

    await TestBed.configureTestingModule({
      imports: [ProductsPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: MessageService, useValue: messageService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductsPageComponent);
    component = fixture.componentInstance;
    httpTestingController = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('loads products in the dedicated product page', () => {
    expect(mockInventoryService.getProducts).toHaveBeenCalled();
    expect(mockInventoryService.getSuppliers).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Products');
  });

  it('creates products from the product page form', () => {
    component.productForm.setValue({
      sku: 'SKU-100',
      name: 'Sample item',
      category: 'General',
      supplierId: 'supplier-id',
      costPrice: 5,
      sellPrice: 10,
      minStock: 2,
      description: '',
      isActive: true
    });

    component.saveProduct();

    const submittedData = mockInventoryService.createProduct.mock.calls[0][0] as FormData;
    expect(submittedData).toBeInstanceOf(FormData);
    expect(submittedData.get('SKU')).toBe('SKU-100');
    expect(submittedData.get('Name')).toBe('Sample item');
    expect(submittedData.get('Description')).toBe('');
    expect(submittedData.get('IsActive')).toBe('true');
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'success',
      detail: 'Product created successfully.'
    }));
  });

  it('loads product thumbnails as authenticated image blobs', () => {
    const product = {
      id: 'product-image-id',
      sku: 'SKU-IMAGE',
      name: 'Image item',
      category: 'General',
      supplierId: 'supplier-id',
      costPrice: 5,
      sellPrice: 10,
      minStock: 2,
      isActive: true,
      imageUrl: '/images/product.png'
    };
    const originalCreateObjectUrl = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn().mockReturnValue('blob:product-image')
    });

    try {
      mockInventoryService.getProducts.mockReturnValueOnce(of([product]));
      component.loadProducts();
      const request = httpTestingController.expectOne(`${environment.apiUrl}/images/product.png`);
      expect(request.request.responseType).toBe('blob');
      request.flush(new Blob(['image-bytes'], { type: 'image/png' }));

      expect(component.getProductImageUrl(product)).toBe('blob:product-image');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.product-image')?.getAttribute('src'))
        .toBe('blob:product-image');
      expect(component.productImageErrors()[product.id]).toBeUndefined();
    } finally {
      if (originalCreateObjectUrl) {
        Object.defineProperty(URL, 'createObjectURL', originalCreateObjectUrl);
      } else {
        Reflect.deleteProperty(URL, 'createObjectURL');
      }
    }
  });

  it('asks for confirmation before deleting a product', () => {
    const product = {
      id: 'product-id',
      sku: 'SKU-100',
      name: 'Sample item',
      category: 'General',
      supplierId: 'supplier-id',
      costPrice: 5,
      sellPrice: 10,
      minStock: 2,
      isActive: true
    };

    component.deleteProduct(product);

    expect(component.productPendingDeletion()).toEqual(product);
    expect(mockInventoryService.deleteProduct).not.toHaveBeenCalled();

    component.cancelDeleteConfirmation();
    expect(component.productPendingDeletion()).toBeNull();
    expect(mockInventoryService.deleteProduct).not.toHaveBeenCalled();

    component.deleteProduct(product);
    component.confirmDeleteProduct();

    expect(component.productPendingDeletion()).toBeNull();
    expect(mockInventoryService.deleteProduct).toHaveBeenCalledWith('product-id');
  });

  it('shows the selected page of products', () => {
    component.products.set(Array.from({ length: 12 }, (_, index) => ({
      id: `product-${index + 1}`,
      sku: `SKU-${index + 1}`,
      name: `Product ${index + 1}`,
      category: 'General',
      supplierId: 'supplier-id',
      costPrice: 1,
      sellPrice: 2,
      minStock: 1,
      isActive: true
    })));

    component.onPageChange({ first: 10, rows: 10 });

    expect(component.visibleProducts()).toHaveLength(2);
    expect(component.visibleProducts()[0].id).toBe('product-11');
  });

  it('filters products by search text and category', () => {
    component.products.set([
      {
        id: 'product-1',
        sku: 'SKU-1',
        name: 'Rose mug',
        category: 'Home',
        supplierId: 'supplier-id',
        costPrice: 1,
        sellPrice: 2,
        minStock: 1,
        isActive: true
      },
      {
        id: 'product-2',
        sku: 'SKU-2',
        name: 'Desk lamp',
        category: 'Office',
        supplierId: 'supplier-id',
        costPrice: 3,
        sellPrice: 4,
        minStock: 1,
        isActive: true
      }
    ]);

    component.updateSearch({ target: { value: 'rose' } } as unknown as Event);
    expect(component.filteredProducts().map(product => product.id)).toEqual(['product-1']);

    component.updateSearch({ target: { value: '' } } as unknown as Event);
    component.updateCategory({ target: { value: 'Office' } } as unknown as Event);
    expect(component.filteredProducts().map(product => product.id)).toEqual(['product-2']);
  });

  it('loads stock details using the selected product ID', () => {
    const product = {
      id: 'product-id',
      sku: 'SKU-100',
      name: 'Sample item',
      category: 'General',
      supplierId: 'supplier-id',
      costPrice: 5,
      sellPrice: 10,
      minStock: 2,
      isActive: true
    };

    component.viewStock(product);

    expect(mockInventoryService.getProductInventory).toHaveBeenCalledWith('product-id');
    expect(component.stockPayload()).toEqual([{ warehouseId: 'warehouse-id', quantity: 4 }]);
  });
});
