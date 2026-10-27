import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Order, OrderPage, OrderQuery, OrderRequest, OrderStatusRequest } from '../../models/order.models';

@Injectable({
  providedIn: 'root'
})
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/api/Order`;

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

    return this.http.get<OrderPage>(this.endpoint, { params });
  }

  getOrder(id: string): Observable<Order> {
    return this.http.get<Order>(`${this.endpoint}/${encodeURIComponent(id)}`);
  }

  createOrder(request: OrderRequest): Observable<void> {
    return this.http.post<void>(this.endpoint, request);
  }

  updateOrder(id: string, request: OrderRequest): Observable<void> {
    return this.http.put<void>(`${this.endpoint}/${encodeURIComponent(id)}`, request);
  }

  deleteOrder(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${encodeURIComponent(id)}`);
  }

  updateStatus(id: string, request: OrderStatusRequest): Observable<void> {
    return this.http.patch<void>(`${this.endpoint}/${encodeURIComponent(id)}/status`, request);
  }
}
