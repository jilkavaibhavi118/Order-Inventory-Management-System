export interface ProductFormModel {
  sku: string;
  name: string;
  category: string;
  supplierId: string;
  costPrice: number;
  sellPrice: number;
  minStock: number;
  isActive: boolean;
}

export interface InventoryAdjustmentFormModel {
  productId: string;
  warehouseId: string;
  quantity: number;
  adjustmentType: string;
  reason: string;
}
