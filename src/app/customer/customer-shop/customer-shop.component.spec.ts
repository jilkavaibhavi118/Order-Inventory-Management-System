import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { ProductService } from '../../core/services/product.service';
import { CustomerShopComponent } from './customer-shop.component';

describe('CustomerShopComponent', () => {
  let fixture: ComponentFixture<CustomerShopComponent>;
  let cartService: CartService;
  let orderServiceMock: { createOrder: ReturnType<typeof vi.fn> };
  let productServiceMock: {
    getProducts: ReturnType<typeof vi.fn>;
    getInventoryForProduct: ReturnType<typeof vi.fn>;
    getProductById: ReturnType<typeof vi.fn>;
  };

  const product = {
    id: 'product-1',
    sku: 'SKU-1',
    name: 'Sample product',
    category: 'Electronics',
    sellPrice: 125,
    isActive: true
  };

  beforeEach(async () => {
    orderServiceMock = { createOrder: vi.fn(() => of({ id: 'order-1' })) };
    productServiceMock = {
      getProducts: vi.fn(() => of([product])),
      getInventoryForProduct: vi.fn(() => of({
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        totalQuantity: 3,
        isLowStock: false,
        warehouses: [{ warehouseId: 'warehouse-1', quantity: 3 }]
      })),
      getProductById: vi.fn(() => of(product))
    };

    await TestBed.configureTestingModule({
      imports: [CustomerShopComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        MessageService,
        { provide: AuthService, useValue: { getUserId: () => '11111111-1111-4111-8111-111111111111' } },
        { provide: OrderService, useValue: orderServiceMock },
        { provide: ProductService, useValue: productServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CustomerShopComponent);
    cartService = TestBed.inject(CartService);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders product details, Add to cart, and Buy now actions in each card', () => {
    const card = fixture.nativeElement.querySelector('.product-card') as HTMLElement;
    const text = card.textContent ?? '';

    expect(text).toContain('View product details');
    expect(text).toContain('Add to cart');
    expect(text).toContain('Buy now');
  });

  it('adds an in-stock product to the client-side cart', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const addButton = Array.from(buttons).find((button) =>
      button.textContent?.includes('Add to cart')
    );

    expect(addButton).toBeTruthy();
    addButton?.click();
    fixture.detectChanges();

    expect(cartService.totalItems).toBe(1);
  });

  it('loads the selected product from the product details API', async () => {
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const detailsButton = Array.from(buttons).find((button) =>
      button.textContent?.includes('View product details')
    );

    detailsButton?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(productServiceMock.getProductById).toHaveBeenCalledWith(product.id);
  });

  it('places a Buy now order through the backend order API', async () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const buyButton = Array.from(buttons).find((button) => button.textContent?.includes('Buy now'));

    buyButton?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(orderServiceMock.createOrder).toHaveBeenCalledWith({
      customerId: '11111111-1111-4111-8111-111111111111',
      warehouseId: 'warehouse-1',
      items: [{ productId: product.id, quantity: 1 }]
    });
  });
});
