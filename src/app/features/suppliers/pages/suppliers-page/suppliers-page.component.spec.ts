import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { InventoryService } from '../../../../core/services/inventory.service';
import { SuppliersPageComponent } from './suppliers-page.component';

describe('SuppliersPageComponent', () => {
  let fixture: ComponentFixture<SuppliersPageComponent>;
  let component: SuppliersPageComponent;
  let inventoryService: {
    getSuppliers: ReturnType<typeof vi.fn>;
    createSupplier: ReturnType<typeof vi.fn>;
    updateSupplier: ReturnType<typeof vi.fn>;
    deleteSupplier: ReturnType<typeof vi.fn>;
  };
  const messageService = { add: vi.fn() };

  beforeEach(async () => {
    inventoryService = {
      getSuppliers: vi.fn().mockReturnValue(of([])),
      createSupplier: vi.fn().mockReturnValue(of({
        success: true,
        message: 'Supplier created.',
        data: null,
        errors: []
      })),
      updateSupplier: vi.fn().mockReturnValue(of({
        success: true,
        message: 'Supplier updated.',
        data: null,
        errors: []
      })),
      deleteSupplier: vi.fn().mockReturnValue(of({
        success: true,
        message: 'Supplier deleted.',
        data: null,
        errors: []
      }))
    };

    await TestBed.configureTestingModule({
      imports: [SuppliersPageComponent],
      providers: [
        { provide: InventoryService, useValue: inventoryService },
        { provide: MessageService, useValue: messageService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SuppliersPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    messageService.add.mockClear();
  });

  it('loads suppliers when opened', () => {
    expect(inventoryService.getSuppliers).toHaveBeenCalled();
  });

  it('creates a supplier and displays the message returned by the API', () => {
    component.openCreateSupplier();
    component.supplierForm.setValue({
      name: 'Example Supplier',
      email: 'supplier@example.com',
      phone: '+1 555 0100',
      address: '1 Main Street'
    });

    component.saveSupplier();

    expect(inventoryService.createSupplier).toHaveBeenCalledWith({
      name: 'Example Supplier',
      email: 'supplier@example.com',
      phone: '+1 555 0100',
      address: '1 Main Street'
    });
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'success',
      detail: 'Supplier created.'
    }));
  });

  it('updates a supplier and confirms deletion before calling the API', () => {
    const supplier = {
      id: 'supplier-id',
      name: 'Example Supplier',
      email: 'supplier@example.com',
      phone: '+1 555 0100',
      address: '1 Main Street'
    };

    component.openEditSupplier(supplier);
    component.supplierForm.controls.name.setValue('Updated Supplier');
    component.saveSupplier();

    expect(inventoryService.updateSupplier).toHaveBeenCalledWith('supplier-id', {
      name: 'Updated Supplier',
      email: 'supplier@example.com',
      phone: '+1 555 0100',
      address: '1 Main Street'
    });

    component.requestDelete(supplier);
    expect(inventoryService.deleteSupplier).not.toHaveBeenCalled();
    component.cancelDelete();
    expect(inventoryService.deleteSupplier).not.toHaveBeenCalled();

    component.requestDelete(supplier);
    component.confirmDelete();
    expect(inventoryService.deleteSupplier).toHaveBeenCalledWith('supplier-id');
  });

  it('shows the selected page of suppliers', () => {
    component.suppliers.set(Array.from({ length: 12 }, (_, index) => ({
      id: `supplier-${index + 1}`,
      name: `Supplier ${index + 1}`
    })));

    component.onPageChange({ first: 10, rows: 10 });

    expect(component.visibleSuppliers()).toHaveLength(2);
    expect(component.visibleSuppliers()[0].id).toBe('supplier-11');
  });
});
