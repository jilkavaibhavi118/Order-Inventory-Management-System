import type { FormArray, FormControl, FormGroup } from '@angular/forms';

export interface OrderItemRequest {
  productId: string;
  quantity: number;
}

export interface OrderRequest {
  customerId: string;
  warehouseId: string;
  items: OrderItemRequest[];
}

export interface OrderStatusRequest {
  status: string;
}

export interface OrderItemFormModel {
  productId: FormControl<string>;
  quantity: FormControl<number>;
}

export interface OrderFormModel {
  customerId: FormControl<string>;
  warehouseId: FormControl<string>;
  items: FormArray<FormGroup<OrderItemFormModel>>;
}

export interface OrderItem {
  productId: string;
  productName?: string;
  productSku?: string;
  quantity: number;
  unitPrice?: number;
}

export interface Order {
  id?: string;
  orderId?: string;
  customerId: string;
  customerName?: string;
  warehouseId: string;
  warehouseName?: string;
  status?: string;
  orderDate?: string;
  createdAt?: string;
  totalAmount?: number;
  items?: OrderItem[];
}

export interface OrderPage {
  page: number;
  pageSize: number;
  totalCount: number;
  orders: Order[];
}

export interface OrderQuery {
  page: number;
  pageSize: number;
  status?: string;
  fromDate?: string;
  toDate?: string;
}
