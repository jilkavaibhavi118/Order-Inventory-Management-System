import { Injectable, signal } from '@angular/core';
import { CartItem, Product } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class CartService {
  readonly cartItems = signal<CartItem[]>([]);

  addToCart(product: Product, maxQuantity = Number.POSITIVE_INFINITY): boolean {
    const items = this.cartItems();
    const existing = items.find((item) => item.product.id === product.id);
    if ((existing?.quantity ?? 0) >= maxQuantity) {
      return false;
    }

    if (existing) {
      this.cartItems.set(
        items.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
      return true;
    }

    this.cartItems.set([...items, { product, quantity: 1 }]);
    return true;
  }

  quantityForProduct(productId: string): number {
    return this.cartItems().find((item) => item.product.id === productId)?.quantity ?? 0;
  }

  updateQuantity(productId: string, quantity: number): void {
    this.cartItems.set(
      this.cartItems()
        .map((item) =>
          item.product.id === productId ? { ...item, quantity: Math.max(0, quantity) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  removeFromCart(productId: string): void {
    this.cartItems.set(this.cartItems().filter((item) => item.product.id !== productId));
  }

  clear(): void {
    this.cartItems.set([]);
  }

  get totalItems(): number {
    return this.cartItems().reduce((sum, item) => sum + item.quantity, 0);
  }

  get total(): number {
    return this.cartItems().reduce(
      (sum, item) => sum + Number(item.product.sellPrice ?? 0) * item.quantity,
      0
    );
  }
}
