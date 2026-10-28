export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  supplierId?: string | null;
  costPrice?: number | null;
  sellPrice?: number | null;
  minStock?: number | null;
  description?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  createdAt?: string | null;
}

export interface InventoryRecord {
  id?: string;
  productId?: string;
  warehouseId?: string;
  quantity?: number | null;
  quantityOnHand?: number | null;
  availableQuantity?: number | null;
  stockQuantity?: number | null;
  lastUpdatedAt?: string | null;
}

export interface ProductInventory {
  productId: string;
  productSku: string;
  productName: string;
  totalQuantity: number;
  isLowStock: boolean;
  warehouses: InventoryRecord[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderSummary {
  id: string;
  // orderId?: string;
  orderNumber?: string;
  customerId?: string;
  warehouseId?: string;
  status?: string;
  total?: number;
  createdAt?: string;
  items?: Array<{
    productId: string;
    productName?: string;
    productSku?: string;
    quantity: number;
    price?: number;
    unitPrice?: number;
  }>;
}

export interface OrderPage {
  orders: OrderSummary[];
  items?: OrderSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface CreateOrderRequest {
  customerId: string;
  warehouseId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}
