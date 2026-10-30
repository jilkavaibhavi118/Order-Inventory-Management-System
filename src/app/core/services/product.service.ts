import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Product, ProductInventory } from '../../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private readonly http: HttpClient) {}

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${environment.apiUrl}/api/Product`);
  }

  getProductById(productId: string): Observable<Product> {
    return this.http.get<Product>(`${environment.apiUrl}/api/Product/${encodeURIComponent(productId)}`);
  }

  getInventoryForProduct(productId: string): Observable<ProductInventory> {
    return this.http.get<ProductInventory>(
      `${environment.apiUrl}/api/Inventory/product/${encodeURIComponent(productId)}`
    );
  }
}
