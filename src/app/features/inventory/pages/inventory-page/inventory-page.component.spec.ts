import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { InventoryService } from '../../../../core/services/inventory.service';
import { InventoryPageComponent } from './inventory-page.component';

describe('InventoryPageComponent', () => {
  let fixture: ComponentFixture<InventoryPageComponent>;
  let component: InventoryPageComponent;
  let inventoryService: {
    getInventory: ReturnType<typeof vi.fn>;
    getLowStock: ReturnType<typeof vi.fn>;
    getProducts: ReturnType<typeof vi.fn>;
    getWarehouses: ReturnType<typeof vi.fn>;
    getInventoryRecord: ReturnType<typeof vi.fn>;
    getInventoryTransactions: ReturnType<typeof vi.fn>;
    getInventoryTransaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    inventoryService = {
      getInventory: vi.fn().mockReturnValue(of({
        page: 1,
        pageSize: 10,
        totalCount: 0,
        items: []
      })),
      getLowStock: vi.fn().mockReturnValue(of([])),
      getProducts: vi.fn().mockReturnValue(of([])),
      getWarehouses: vi.fn().mockReturnValue(of([])),
      getInventoryRecord: vi.fn().mockReturnValue(of({
        id: 'inventory-record-id',
        productId: 'product-id',
        productName: 'Sample product',
        warehouseId: 'warehouse-id',
        warehouseName: 'Main warehouse',
        quantity: 4
      })),
      getInventoryTransactions: vi.fn().mockReturnValue(of({
        page: 1,
        pageSize: 10,
        totalCount: 0,
        transactions: []
      })),
      getInventoryTransaction: vi.fn().mockReturnValue(of({ id: 'transaction-id' }))
    };

    await TestBed.configureTestingModule({
      imports: [InventoryPageComponent],
      providers: [
        provideRouter([]),
        { provide: InventoryService, useValue: inventoryService },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads inventory details by inventory-record ID, not product ID', () => {
    const record = {
      id: 'inventory-record-id',
      productId: 'product-id',
      productSku: 'SKU-1',
      productName: 'Sample product',
      warehouseId: 'warehouse-id',
      warehouseName: 'Main warehouse',
      quantity: 4
    };

    component.openInventoryDetails(record);

    expect(inventoryService.getInventoryRecord).toHaveBeenCalledWith('inventory-record-id');
    expect(component.detailPayload()).toEqual(expect.objectContaining({
      id: 'inventory-record-id',
      productId: 'product-id'
    }));
  });

  it('does not request record details when the list item has no inventory ID', () => {
    component.openInventoryDetails({
      productId: 'product-id',
      productSku: 'SKU-1',
      productName: 'Sample product'
    });

    expect(inventoryService.getInventoryRecord).not.toHaveBeenCalled();
  });

  it('loads movement history using product and warehouse IDs from the inventory row', () => {
    component.viewHistory({
      id: 'inventory-record-id',
      productId: 'product-id',
      productSku: 'SKU-1',
      productName: 'Sample product',
      warehouseId: 'warehouse-id',
      warehouseName: 'Main warehouse'
    });

    expect(inventoryService.getInventoryTransactions).toHaveBeenCalledWith(expect.objectContaining({
      page: 1,
      productId: 'product-id',
      warehouseId: 'warehouse-id'
    }));
  });

  it('validates movement date ranges and resets server pagination when the page size changes', () => {
    component.movementFilterForm.patchValue({
      fromDate: '2026-10-27',
      toDate: '2026-10-26'
    });
    component.applyMovementFilters();

    expect(component.movementDateError()).toBeTruthy();
    expect(inventoryService.getInventoryTransactions).not.toHaveBeenCalled();

    component.movementFilterForm.reset({
      productId: '',
      warehouseId: '',
      type: '',
      fromDate: '',
      toDate: ''
    });
    component.onTransactionsPageChange({ first: 20, rows: 20 });

    expect(inventoryService.getInventoryTransactions).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      productId: undefined,
      warehouseId: undefined,
      type: undefined,
      fromDate: undefined,
      toDate: undefined
    });
  });
});
