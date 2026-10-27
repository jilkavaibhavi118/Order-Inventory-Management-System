import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { InventoryService } from '../../../../core/services/inventory.service';
import { OrdersService } from '../../../../core/services/orders.service';
import { DashboardPageComponent } from './dashboard-page.component';

describe('DashboardPageComponent', () => {
  let fixture: ComponentFixture<DashboardPageComponent>;
  let component: DashboardPageComponent;
  let inventoryService: {
    getProducts: ReturnType<typeof vi.fn>;
    getWarehouses: ReturnType<typeof vi.fn>;
    getLowStock: ReturnType<typeof vi.fn>;
    getInventoryTransactions: ReturnType<typeof vi.fn>;
  };
  let ordersService: {
    getOrders: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    inventoryService = {
      getProducts: vi.fn().mockReturnValue(of([{ id: 'product-1' }, { id: 'product-2' }])),
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
    expect(ordersService.getOrders).toHaveBeenCalledWith({ page: 1, pageSize: 1 });
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
