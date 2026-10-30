import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../../core/services/auth.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { OrdersService } from '../../../../core/services/orders.service';
import { DashboardPageComponent } from './dashboard-page.component';

describe('DashboardPageComponent', () => {
  let fixture: ComponentFixture<DashboardPageComponent>;
  let component: DashboardPageComponent;
  let inventoryService: {
    getInventory: ReturnType<typeof vi.fn>;
    getProducts: ReturnType<typeof vi.fn>;
    getSuppliers: ReturnType<typeof vi.fn>;
    getWarehouses: ReturnType<typeof vi.fn>;
    getLowStock: ReturnType<typeof vi.fn>;
    getInventoryTransactions: ReturnType<typeof vi.fn>;
  };
  let ordersService: {
    getOrders: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    inventoryService = {
      getInventory: vi.fn().mockReturnValue(of({
        items: [
          { productId: 'in-stock', productSku: 'IN-1', productName: 'In stock item', quantity: 10, minStock: 2 },
          { productId: 'low-stock', productSku: 'LOW-1', productName: 'Low stock item', quantity: 3, minStock: 5 },
          { productId: 'out-of-stock', productSku: 'OUT-1', productName: 'Out of stock item', quantity: 0, minStock: 2 }
        ],
        totalCount: 3,
        page: 1,
        pageSize: 100
      })),
      getProducts: vi.fn().mockReturnValue(of([{ id: 'product-1' }, { id: 'product-2' }])),
      getSuppliers: vi.fn().mockReturnValue(of([{ id: 'supplier-1' }])),
      getWarehouses: vi.fn().mockReturnValue(of([{ id: 'warehouse-1' }])),
      getLowStock: vi.fn().mockReturnValue(of([{
        productId: 'product-1',
        productSku: 'SKU-1',
        productName: 'Sample product',
        productIsActive: true,
        minStock: 4,
        totalQuantity: 2,
        warehouseCount: 1
      }])),
      getInventoryTransactions: vi.fn().mockReturnValue(of({
        page: 1,
        pageSize: 5,
        totalCount: 5,
        transactions: []
      }))
    };
    ordersService = {
      getOrders: vi.fn().mockReturnValue(of({
        page: 1,
        pageSize: 1,
        totalCount: 27,
        orders: []
      }))
    };

    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
      providers: [
        provideRouter([]),
        { provide: InventoryService, useValue: inventoryService },
        { provide: OrdersService, useValue: ordersService },
        { provide: AuthService, useValue: { currentUserName: signal('Operator') } },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('uses complete list lengths and the API order total metadata', () => {
    expect(component.productsCount()).toBe(2);
    expect(component.ordersCount()).toBe(27);
    expect(component.warehousesCount()).toBe(1);
    expect(component.lowStockCount()).toBe(1);
    expect(ordersService.getOrders).toHaveBeenCalledWith({ page: 1, pageSize: 100 });
    expect(component.suppliersCount()).toBe(1);
    expect(component.stockDistribution()).toMatchObject({
      inStock: 1,
      lowStock: 1,
      outOfStock: 1,
      total: 3
    });
  });

  it('builds monthly chart paths from API order and movement dates', () => {
    const now = new Date();
    component.recentOrders.set([{
      customerId: 'customer-1',
      warehouseId: 'warehouse-1',
      orderDate: new Date(now.getFullYear(), now.getMonth(), 12).toISOString()
    }]);
    component.transactionsPreview.set([{
      id: 'transaction-1',
      productId: 'product-1',
      productSku: 'SKU-1',
      productName: 'Sample product',
      warehouseId: 'warehouse-1',
      warehouseName: 'Main warehouse',
      quantityChanged: 2,
      type: 'IN',
      previousStock: 1,
      newStock: 3,
      reason: 'Restock',
      referenceId: 'ref-1',
      createdAt: new Date(now.getFullYear(), now.getMonth(), 10).toISOString()
    }]);

    const currentMonth = component.chartBuckets().at(-1);
    expect(currentMonth?.orders).toBe(1);
    expect(currentMonth?.movements).toBe(1);
    expect(component.chartPath('orders')).toContain('C');
    expect(component.chartPath('movements')).toContain('C');
  });

  it('reports metric errors and retries that section independently', () => {
    inventoryService.getProducts.mockReturnValue(throwError(() => new Error('API unavailable')));
    component.retryProducts();
    fixture.detectChanges();

    expect(component.productsError()).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Unable to load this dashboard data. Try again.');
    expect(inventoryService.getProducts).toHaveBeenCalledTimes(2);
    expect(inventoryService.getWarehouses).toHaveBeenCalledTimes(1);
  });
});
