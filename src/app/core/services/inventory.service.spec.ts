import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(InventoryService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('loads a paged inventory list', () => {
    service.getInventory(2, 10).subscribe();

    const request = httpTestingController.expectOne(
      `${environment.apiUrl}/api/Inventory?page=2&pageSize=10`
    );
    expect(request.request.method).toBe('GET');
    request.flush({ page: 2, pageSize: 10, totalCount: 0, items: [] });
  });

  it('loads low-stock products', () => {
    service.getLowStock().subscribe();

    const request = httpTestingController.expectOne(`${environment.apiUrl}/api/Inventory/low-stock`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('loads inventory-record and product-stock details with their distinct IDs', () => {
    service.getInventoryRecord('inventory-record-id').subscribe();
    const recordRequest = httpTestingController.expectOne(
      `${environment.apiUrl}/api/Inventory/inventory-record-id`
    );
    expect(recordRequest.request.method).toBe('GET');
    recordRequest.flush({ id: 'inventory-record-id' });

    service.getProductInventory('product-id').subscribe();
    const productRequest = httpTestingController.expectOne(
      `${environment.apiUrl}/api/Inventory/product/product-id`
    );
    expect(productRequest.request.method).toBe('GET');
    productRequest.flush([]);
  });

  it('loads stock movements with only populated optional parameters', () => {
    service.getInventoryTransactions({
      page: 2,
      pageSize: 20,
      productId: 'product-id',
      warehouseId: '',
      type: 'IN',
      fromDate: '2026-10-01T00:00:00.000Z',
      toDate: undefined
    }).subscribe();

    const request = httpTestingController.expectOne(
      `${environment.apiUrl}/api/Inventory/transactions?page=2&pageSize=20&productId=product-id&type=IN&fromDate=2026-10-01T00:00:00.000Z`
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      page: 2,
      pageSize: 20,
      totalCount: 1,
      transactions: []
    });
  });

  it('loads a stock movement by transaction ID', () => {
    service.getInventoryTransaction('transaction-id').subscribe();

    const request = httpTestingController.expectOne(
      `${environment.apiUrl}/api/Inventory/transactions/transaction-id`
    );
    expect(request.request.method).toBe('GET');
    request.flush({ id: 'transaction-id' });
  });

  it('posts inventory adjustments to the supported endpoint', () => {
    const adjustment = {
      productId: 'product-id',
      warehouseId: 'warehouse-id',
      quantity: 5,
      adjustmentType: 'IN',
      reason: 'Stock received'
    };

    service.adjustInventory(adjustment).subscribe();

    const request = httpTestingController.expectOne(`${environment.apiUrl}/api/Inventory/adjust`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(adjustment);
    request.flush({ success: true });
  });

  it('uses the Product endpoints for product create, update, and delete', () => {
    const product = {
      sku: 'SKU-1',
      name: 'Sample product',
      category: 'General',
      supplierId: 'supplier-id',
      costPrice: 5,
      sellPrice: 10,
      minStock: 2,
      isActive: true
    };

    service.createProduct(product).subscribe();
    const createRequest = httpTestingController.expectOne(`${environment.apiUrl}/api/Product`);
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual(product);
    createRequest.flush({});

    service.updateProduct('product-id', product).subscribe();
    const updateRequest = httpTestingController.expectOne(`${environment.apiUrl}/api/Product/product-id`);
    expect(updateRequest.request.method).toBe('PUT');
    expect(updateRequest.request.body).toEqual(product);
    updateRequest.flush({});

    service.deleteProduct('product-id').subscribe();
    const deleteRequest = httpTestingController.expectOne(`${environment.apiUrl}/api/Product/product-id`);
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush({});
  });

  it('uses the Supplier CRUD endpoints and sends the supplier fields', () => {
    const supplier = {
      name: 'Example Supplier',
      email: 'supplier@example.com',
      phone: '+1 555 0100',
      address: '1 Main Street'
    };

    service.getSuppliers().subscribe();
    const listRequest = httpTestingController.expectOne(`${environment.apiUrl}/api/Supplier`);
    expect(listRequest.request.method).toBe('GET');
    listRequest.flush([]);

    service.createSupplier(supplier).subscribe();
    const createRequest = httpTestingController.expectOne(`${environment.apiUrl}/api/Supplier`);
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual(supplier);
    createRequest.flush({ success: true, message: 'Supplier created.', data: null, errors: [] });

    service.updateSupplier('supplier-id', supplier).subscribe();
    const updateRequest = httpTestingController.expectOne(`${environment.apiUrl}/api/Supplier/supplier-id`);
    expect(updateRequest.request.method).toBe('PUT');
    expect(updateRequest.request.body).toEqual(supplier);
    updateRequest.flush({ success: true, message: 'Supplier updated.', data: null, errors: [] });

    service.deleteSupplier('supplier-id').subscribe();
    const deleteRequest = httpTestingController.expectOne(`${environment.apiUrl}/api/Supplier/supplier-id`);
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush({ success: true, message: 'Supplier deleted.', data: null, errors: [] });
  });

  it('uses the Warehouse CRUD endpoints and sends the warehouse fields', () => {
    const warehouse = {
      name: 'Main Warehouse',
      location: 'North building',
      isActive: true
    };
    const savedWarehouse = { id: 'warehouse-id', ...warehouse };

    service.getWarehouses().subscribe();
    const listRequest = httpTestingController.expectOne(`${environment.apiUrl}/api/Warehouse`);
    expect(listRequest.request.method).toBe('GET');
    listRequest.flush([savedWarehouse]);

    service.getWarehouse('warehouse-id').subscribe();
    const getRequest = httpTestingController.expectOne(`${environment.apiUrl}/api/Warehouse/warehouse-id`);
    expect(getRequest.request.method).toBe('GET');
    getRequest.flush(savedWarehouse);

    service.createWarehouse(warehouse).subscribe();
    const createRequest = httpTestingController.expectOne(`${environment.apiUrl}/api/Warehouse`);
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual(warehouse);
    createRequest.flush(savedWarehouse);

    service.updateWarehouse('warehouse-id', warehouse).subscribe();
    const updateRequest = httpTestingController.expectOne(`${environment.apiUrl}/api/Warehouse/warehouse-id`);
    expect(updateRequest.request.method).toBe('PUT');
    expect(updateRequest.request.body).toEqual(warehouse);
    updateRequest.flush(savedWarehouse);

    service.deleteWarehouse('warehouse-id').subscribe();
    const deleteRequest = httpTestingController.expectOne(`${environment.apiUrl}/api/Warehouse/warehouse-id`);
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush({ success: true, message: 'Warehouse deleted.', data: null, errors: [] });
  });
});
