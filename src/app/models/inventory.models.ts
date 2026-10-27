import type { ApiResult } from './api.model';

export interface InventoryRecord {
  id?: string;
  productId: string;
  productSku: string;
  productName: string;
  warehouseId?: string;
  warehouseName?: string;
  quantity?: number;
  totalQuantity?: number;
  minStock?: number;
  productIsActive?: boolean;
}

export interface LowStockRecord {
  productId: string;
  productSku: string;
  productName: string;
  productIsActive: boolean;
  minStock: number;
  totalQuantity: number;
  warehouseCount: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  supplierId: string;
  costPrice: number;
  sellPrice: number;
  minStock: number;
  isActive: boolean;
  createdAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface SupplierRequest {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
}

export interface WarehouseRequest {
  name: string;
  location: string;
  isActive: boolean;
}

export type WarehouseMutationResponse =
  | (Warehouse & { message?: string })
  | ApiResult<Warehouse>
  | null;

export interface ProductRequest {
  sku: string;
  name: string;
  category: string;
  supplierId: string;
  costPrice: number;
  sellPrice: number;
  minStock: number;
  isActive: boolean;
}

export interface InventoryAdjustmentRequest {
  productId: string;
  warehouseId: string;
  quantity?: number;
  adjustmentType: string;
  reason: string;
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  quantityChanged: number;
  type: string;
  previousStock: number;
  newStock: number;
  reason: string;
  referenceId: string;
  createdAt: string;
}

export interface InventoryTransactionPage {
  page: number;
  pageSize: number;
  totalCount: number;
  transactions: InventoryTransaction[];
}

export interface InventoryTransactionQuery {
  page?: number;
  pageSize?: number;
  productId?: string;
  warehouseId?: string;
  type?: string;
  fromDate?: string;
  toDate?: string;
}
