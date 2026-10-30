import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Order, OrderPage, OrderQuery, OrderRequest, OrderStatusRequest } from '../../models/order.models';

@Injectable({
  providedIn: 'root'
})
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/api/Order`;
  private readonly readCache = new Map<string, Observable<unknown>>();

  getOrders(query: OrderQuery): Observable<OrderPage> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('pageSize', query.pageSize);

    if (query.status) {
      params = params.set('status', query.status);
    }
    if (query.fromDate) {
      params = params.set('fromDate', query.fromDate);
    }
    if (query.toDate) {
      params = params.set('toDate', query.toDate);
    }

    return this.cachedGet<OrderPage>(this.endpoint, params);
  }

  getOrder(id: string): Observable<Order> {
    return this.cachedGet<Order>(`${this.endpoint}/${encodeURIComponent(id)}`);
  }

  createOrder(request: OrderRequest): Observable<void> {
    return this.invalidateAfter(this.http.post<void>(this.endpoint, request));
  }

  updateOrder(id: string, request: OrderRequest): Observable<void> {
    return this.invalidateAfter(this.http.put<void>(`${this.endpoint}/${encodeURIComponent(id)}`, request));
  }

  deleteOrder(id: string): Observable<void> {
    return this.invalidateAfter(this.http.delete<void>(`${this.endpoint}/${encodeURIComponent(id)}`));
  }

  updateStatus(id: string, request: OrderStatusRequest): Observable<void> {
    return this.invalidateAfter(this.http.patch<void>(`${this.endpoint}/${encodeURIComponent(id)}/status`, request));
  }

  private cachedGet<T>(url: string, params?: HttpParams): Observable<T> {
    const key = params?.toString() ? `${url}?${params.toString()}` : url;
    const existing = this.readCache.get(key);
    if (existing) {
      return existing as Observable<T>;
    }

    const request = this.http.get<T>(url, params ? { params } : undefined).pipe(
      catchError(error => {
        this.readCache.delete(key);
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.readCache.set(key, request);
    return request;
  }

  private invalidateAfter<T>(request: Observable<T>): Observable<T> {
    return request.pipe(tap(() => this.readCache.clear()));
  }
}
