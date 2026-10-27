import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResult } from '../../models/api.model';
import {
  InventoryAdjustmentRequest,
  InventoryRecord,
  InventoryTransactionPage,
  InventoryTransactionQuery,
  LowStockRecord,
  Product,
  ProductRequest,
  Supplier,
  SupplierRequest,
  Warehouse,
  WarehouseMutationResponse,
  WarehouseRequest
} from '../../models/inventory.models';
import { PaginatedResponse } from '../../models/api.model';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getInventory(page: number, pageSize: number): Observable<PaginatedResponse<InventoryRecord>> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    return this.http.get<PaginatedResponse<InventoryRecord>>(`${this.apiUrl}/api/Inventory`, { params });
  }

  getInventoryRecord(id: string): Observable<unknown> {
    return this.http.get<unknown>(`${this.apiUrl}/api/Inventory/${encodeURIComponent(id)}`);
  }

  getProductInventory(productId: string): Observable<unknown> {
    return this.http.get<unknown>(
      `${this.apiUrl}/api/Inventory/product/${encodeURIComponent(productId)}`
    );
  }

  getInventoryTransactions(query: InventoryTransactionQuery): Observable<InventoryTransactionPage> {
    let params = new HttpParams();
    if (query.page !== undefined) {
      params = params.set('page', query.page);
    }
    if (query.pageSize !== undefined) {
      params = params.set('pageSize', query.pageSize);
    }
    if (query.productId) {
      params = params.set('productId', query.productId);
    }
    if (query.warehouseId) {
      params = params.set('warehouseId', query.warehouseId);
    }
    if (query.type) {
      params = params.set('type', query.type);
    }
    if (query.fromDate) {
      params = params.set('fromDate', query.fromDate);
    }
    if (query.toDate) {
      params = params.set('toDate', query.toDate);
    }

    return this.http.get<InventoryTransactionPage>(
      `${this.apiUrl}/api/Inventory/transactions`,
      { params }
    );
  }

  getInventoryTransaction(id: string): Observable<unknown> {
    return this.http.get<unknown>(
      `${this.apiUrl}/api/Inventory/transactions/${encodeURIComponent(id)}`
    );
  }

  getLowStock(): Observable<LowStockRecord[]> {
    return this.http.get<LowStockRecord[]>(`${this.apiUrl}/api/Inventory/low-stock`);
  }

  adjustInventory(request: InventoryAdjustmentRequest): Observable<unknown> {
    return this.http.post<unknown>(`${this.apiUrl}/api/Inventory/adjust`, request);
  }

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/api/Product`);
  }

  createProduct(request: ProductRequest): Observable<ApiResult<null>> {
    return this.http.post<ApiResult<null>>(`${this.apiUrl}/api/Product`, request);
  }

  updateProduct(id: string, request: ProductRequest): Observable<ApiResult<null>> {
    return this.http.put<ApiResult<null>>(`${this.apiUrl}/api/Product/${encodeURIComponent(id)}`, request);
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/Product/${encodeURIComponent(id)}`);
  }

  getSuppliers(): Observable<Supplier[]> {
    return this.http.get<Supplier[]>(`${this.apiUrl}/api/Supplier`);
  }

  createSupplier(request: SupplierRequest): Observable<ApiResult<null> | null> {
    return this.http.post<ApiResult<null> | null>(`${this.apiUrl}/api/Supplier`, request);
  }

  updateSupplier(id: string, request: SupplierRequest): Observable<ApiResult<null> | null> {
    return this.http.put<ApiResult<null> | null>(
      `${this.apiUrl}/api/Supplier/${encodeURIComponent(id)}`,
      request
    );
  }

  deleteSupplier(id: string): Observable<ApiResult<null> | null> {
    return this.http.delete<ApiResult<null> | null>(
      `${this.apiUrl}/api/Supplier/${encodeURIComponent(id)}`
    );
  }

  getWarehouses(): Observable<Warehouse[]> {
    return this.http.get<Warehouse[]>(`${this.apiUrl}/api/Warehouse`);
  }

  getWarehouse(id: string): Observable<Warehouse> {
    return this.http.get<Warehouse>(`${this.apiUrl}/api/Warehouse/${encodeURIComponent(id)}`);
  }

  createWarehouse(request: WarehouseRequest): Observable<WarehouseMutationResponse> {
    return this.http.post<WarehouseMutationResponse>(`${this.apiUrl}/api/Warehouse`, request);
  }

  updateWarehouse(id: string, request: WarehouseRequest): Observable<WarehouseMutationResponse> {
    return this.http.put<WarehouseMutationResponse>(
      `${this.apiUrl}/api/Warehouse/${encodeURIComponent(id)}`,
      request
    );
  }

  deleteWarehouse(id: string): Observable<ApiResult<null> | null> {
    return this.http.delete<ApiResult<null> | null>(
      `${this.apiUrl}/api/Warehouse/${encodeURIComponent(id)}`
    );
  }
}
