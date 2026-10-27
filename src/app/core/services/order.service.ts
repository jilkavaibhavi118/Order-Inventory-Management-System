import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { apiUrl } from '../api/api-config';
import { CreateOrderRequest, OrderPage, OrderSummary } from '../models/product.model';

interface OrderListResponse {
  orders?: OrderSummary[];
  items?: OrderSummary[];
  page?: number;
  pageSize?: number;
  totalCount?: number;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  constructor(private readonly http: HttpClient) {}

  getOrders(page = 1, pageSize = 50): Observable<OrderPage> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);

    return this.http
      .get<OrderPage | OrderListResponse | OrderSummary[]>(apiUrl('Order'), { params })
      .pipe(map((response) => this.normalizeOrderPage(response, page, pageSize)));
  }

  getOrderById(id: string): Observable<OrderSummary> {
    return this.http
      .get<OrderSummary>(apiUrl(`Order/${encodeURIComponent(id)}`))
      .pipe(map((order) => this.normalizeOrder(order)));
  }

  createOrder(payload: CreateOrderRequest): Observable<OrderSummary> {
    return this.http.post<OrderSummary>(apiUrl('Order'), payload);
  }

  private normalizeOrderPage(
    response: OrderPage | OrderListResponse | OrderSummary[],
    requestedPage: number,
    requestedPageSize: number
  ): OrderPage {
    if (Array.isArray(response)) {
      return {
        orders: response.map((order) => this.normalizeOrder(order)),
        page: requestedPage,
        pageSize: requestedPageSize,
        totalCount: response.length
      };
    }

    const orders = (response.orders ?? response.items ?? []).map((order) => this.normalizeOrder(order));
    return {
      orders,
      page: response.page ?? requestedPage,
      pageSize: response.pageSize ?? requestedPageSize,
      totalCount: response.totalCount ?? orders.length
    };
  }

  private normalizeOrder(order: OrderSummary): OrderSummary {
    const id = order.id || '';
    return { ...order, id };
  }
}
