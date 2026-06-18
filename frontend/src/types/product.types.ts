export interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  costPrice?: number;
  imageUrl?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  categoryId?: number;
  categoryName?: string;
  barcode?: string;
  unit?: string;
  minStockLevel?: number;
  maxStockLevel?: number;
  reorderPoint?: number;
  taxRate?: number;
  isTaxable?: boolean;
  allowDecimalQuantity?: boolean;
  tags?: string;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
  currentStock?: number;
  isLowStock?: boolean;
}
