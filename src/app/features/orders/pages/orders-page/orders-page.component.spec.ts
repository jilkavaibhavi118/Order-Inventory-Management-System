import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../../core/services/auth.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { OrdersService } from '../../../../core/services/orders.service';
import { OrdersPageComponent } from './orders-page.component';

describe('OrdersPageComponent', () => {
  let fixture: ComponentFixture<OrdersPageComponent>;
  let component: OrdersPageComponent;
  let mockOrdersService: {
    getOrders: ReturnType<typeof vi.fn>;
    getOrder: ReturnType<typeof vi.fn>;
    createOrder: ReturnType<typeof vi.fn>;
    updateOrder: ReturnType<typeof vi.fn>;
    updateStatus: ReturnType<typeof vi.fn>;
    deleteOrder: ReturnType<typeof vi.fn>;
  };
  const messageService = { add: vi.fn() };
  const orderPage = { page: 1, pageSize: 10, totalCount: 25, orders: [] };
  const customerId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

  beforeEach(async () => {
    mockOrdersService = {
      getOrders: vi.fn().mockReturnValue(of(orderPage)),
      getOrder: vi.fn().mockReturnValue(of({})),
      createOrder: vi.fn().mockReturnValue(of({})),
      updateOrder: vi.fn().mockReturnValue(of({})),
      updateStatus: vi.fn().mockReturnValue(of({})),
      deleteOrder: vi.fn().mockReturnValue(of({}))
    };

    await TestBed.configureTestingModule({
      imports: [OrdersPageComponent],
      providers: [
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: AuthService, useValue: { currentUserId: () => customerId } },
        {
          provide: InventoryService,
          useValue: {
            getProducts: vi.fn().mockReturnValue(of([{ id: 'product-id', name: 'Product', sku: 'SKU-1' }])),
            getWarehouses: vi.fn().mockReturnValue(of([{ id: 'warehouse-id', name: 'Main', isActive: true }]))
          }
        },
        { provide: MessageService, useValue: messageService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OrdersPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the paged order list and reference data', () => {
    expect(mockOrdersService.getOrders).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
      status: undefined,
      fromDate: undefined,
      toDate: undefined
    });
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Orders');
  });

  it('submits a valid order payload with its line items', () => {
    component.addOrderItem();
    component.orderForm.setValue({
      customerId: '00000000-0000-0000-0000-000000000000',
      warehouseId: 'warehouse-id',
      items: [{ productId: 'product-id', quantity: 2 }]
    });

    component.saveOrder();

    expect(mockOrdersService.createOrder).toHaveBeenCalledWith({
      customerId,
      warehouseId: 'warehouse-id',
      items: [{ productId: 'product-id', quantity: 2 }]
    });
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'success',
      summary: 'Order created'
    }));
  });

  it('prefills and disables the customer ID from the current account', () => {
    component.openCreateOrder();
    fixture.detectChanges();

    expect(component.orderForm.controls.customerId.value).toBe(customerId);
    const customerIdInput = fixture.nativeElement.querySelector(
      'input[formControlName="customerId"]'
    ) as HTMLInputElement;
    expect(customerIdInput.disabled).toBe(true);
  });

  it('loads the selected server-side order page and page size', () => {
    component.onPageChange({ first: 20, rows: 20 });

    expect(mockOrdersService.getOrders).toHaveBeenLastCalledWith({
      page: 2,
      pageSize: 20,
      status: undefined,
      fromDate: undefined,
      toDate: undefined
    });
  });
});
