import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
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
    adjustInventory: ReturnType<typeof vi.fn>;
  };
  const messageService = { add: vi.fn() };

  beforeEach(async () => {
    messageService.add.mockClear();
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
      getInventoryTransaction: vi.fn().mockReturnValue(of({ id: 'transaction-id' })),
      adjustInventory: vi.fn().mockReturnValue(of(null))
    };

    await TestBed.configureTestingModule({
      imports: [InventoryPageComponent],
      providers: [
        provideRouter([]),
        { provide: InventoryService, useValue: inventoryService },
        { provide: MessageService, useValue: messageService },
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

  it('sends an adjustment and displays the API success message in a toast', () => {
    inventoryService.adjustInventory.mockReturnValueOnce(of({ message: 'Stock adjusted successfully.' }));
    component.adjustmentForm.patchValue({
      productId: 'product-id',
      warehouseId: 'warehouse-id',
      quantity: 50,
      adjustmentType: 'IN',
      reason: 'Stock received'
    });

    component.adjustStock();

    expect(inventoryService.adjustInventory).toHaveBeenCalledWith({
      productId: 'product-id',
      warehouseId: 'warehouse-id',
      quantity: 50,
      adjustmentType: 'IN',
      reason: 'Stock received'
    });
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'success',
      detail: 'Stock adjusted successfully.'
    }));
  });

  it('shows backend validation errors in a toast and omits optional quantity', () => {
    inventoryService.adjustInventory.mockReturnValueOnce(throwError(() => new HttpErrorResponse({
      status: 400,
      error: {
        title: 'One or more validation errors occurred.',
        errors: {
          AdjustmentType: ['The adjustment type is invalid.']
        }
      }
    })));
    component.adjustmentForm.patchValue({
      productId: 'product-id',
      warehouseId: 'warehouse-id',
      quantity: null,
      adjustmentType: 'IN',
      reason: 'Stock received'
    });

    component.adjustStock();

    expect(inventoryService.adjustInventory).toHaveBeenCalledWith({
      productId: 'product-id',
      warehouseId: 'warehouse-id',
      adjustmentType: 'IN',
      reason: 'Stock received'
    });
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'error',
      detail: 'The adjustment type is invalid.'
    }));
  });
});
