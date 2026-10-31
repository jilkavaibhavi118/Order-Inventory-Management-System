import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { InventoryService } from '../../../../core/services/inventory.service';
import { WarehousesPageComponent } from './warehouses-page.component';

describe('WarehousesPageComponent', () => {
  let fixture: ComponentFixture<WarehousesPageComponent>;
  let component: WarehousesPageComponent;
  let inventoryService: {
    getWarehouses: ReturnType<typeof vi.fn>;
    getWarehouse: ReturnType<typeof vi.fn>;
    createWarehouse: ReturnType<typeof vi.fn>;
    updateWarehouse: ReturnType<typeof vi.fn>;
    deleteWarehouse: ReturnType<typeof vi.fn>;
  };
  const messageService = { add: vi.fn() };

  beforeEach(async () => {
    inventoryService = {
      getWarehouses: vi.fn().mockReturnValue(of([])),
      getWarehouse: vi.fn(),
      createWarehouse: vi.fn().mockReturnValue(of({
        success: true,
        message: 'Warehouse created.',
        data: null,
        errors: []
      })),
      updateWarehouse: vi.fn().mockReturnValue(of({
        success: true,
        message: 'Warehouse updated.',
        data: null,
        errors: []
      })),
      deleteWarehouse: vi.fn().mockReturnValue(of({
        success: true,
        message: 'Warehouse deleted.',
        data: null,
        errors: []
      }))
    };

    await TestBed.configureTestingModule({
      imports: [WarehousesPageComponent],
      providers: [
        provideRouter([]),
        { provide: InventoryService, useValue: inventoryService },
        { provide: MessageService, useValue: messageService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WarehousesPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    messageService.add.mockClear();
  });

  it('loads the warehouse list', () => {
    expect(inventoryService.getWarehouses).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Warehouses');
  });

  it('creates a warehouse using the API request shape', () => {
    component.openCreateWarehouse();
    component.warehouseForm.setValue({
      name: 'Main Warehouse',
      location: 'North building',
      isActive: true
    });

    component.saveWarehouse();

    expect(inventoryService.createWarehouse).toHaveBeenCalledWith({
      name: 'Main Warehouse',
      location: 'North building',
      isActive: true
    });
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'success',
      detail: 'Warehouse created.'
    }));
  });

  it('updates a warehouse and requires confirmation before deletion', () => {
    const warehouse = {
      id: 'warehouse-id',
      name: 'Main Warehouse',
      location: 'North building',
      isActive: true
    };

    component.openEditWarehouse(warehouse);
    component.warehouseForm.controls.location.setValue('South building');
    component.saveWarehouse();

    expect(inventoryService.updateWarehouse).toHaveBeenCalledWith('warehouse-id', {
      name: 'Main Warehouse',
      location: 'South building',
      isActive: true
    });

    component.requestDelete(warehouse);
    expect(inventoryService.deleteWarehouse).not.toHaveBeenCalled();
    component.cancelDelete();
    expect(inventoryService.deleteWarehouse).not.toHaveBeenCalled();

    component.requestDelete(warehouse);
    component.confirmDelete();
    expect(inventoryService.deleteWarehouse).toHaveBeenCalledWith('warehouse-id');
  });

  it('paginates the loaded warehouses', () => {
    component.warehouses.set(Array.from({ length: 12 }, (_, index) => ({
      id: `warehouse-${index + 1}`,
      name: `Warehouse ${index + 1}`,
      location: `Location ${index + 1}`,
      isActive: true
    })));

    component.onPageChange({ first: 10, rows: 10 });

    expect(component.visibleWarehouses()).toHaveLength(2);
    expect(component.visibleWarehouses()[0].id).toBe('warehouse-11');
  });
});
