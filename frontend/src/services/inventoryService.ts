import api from './api';

export interface InventoryItem {
  id: number | null;
  tenantId: string;
  productId: number;
  productName: string;
  sku: string;
  productBarcode: string;
  price: number;
  productStatus: string;
  branchId: number | null;
  branchName: string | null;
  quantity: number;
  lowStockThreshold: number;
  reservedQuantity: number;
  availableQuantity: number;
  isLowStock: boolean;
  lastRestockDate: string | null;
  lastSaleDate: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  hasInventory?: boolean; // Flag to indicate if inventory record exists
}

export interface StockAdjustment {
  productId: number;
  branchId?: number | null;
  quantity: number;
  movementType: 'RESTOCK' | 'ADJUSTMENT' | 'WRITE_OFF' | 'RETURN' | 'INITIAL_STOCK';
  notes?: string;
  referenceType?: string;
  referenceId?: number;
}

export interface StockTransfer {
  productId: number;
  fromBranchId: number;
  toBranchId: number;
  quantity: number;
  notes?: string;
}

export interface LowStockAlert {
  productId: number;
  productName: string;
  sku: string;
  branchId: number | null;
  branchName: string | null;
  currentStock: number;
  threshold: number;
  deficit: number;
  reorderCost: number | null;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface StockMovement {
  id: number;
  productId: number;
  productName: string;
  branchId: number;
  branchName: string;
  type: string;
  quantity: number;
  reason: string;
  performedBy: string;
  createdAt: string;
}

const inventoryService = {
  getAll: (page: number = 0, size: number = 100, branchId?: number) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('size', size.toString());
    if (branchId) params.append('branchId', branchId.toString());
    return api.get(`/inventory?${params.toString()}`);
  },

  getByBranch: (branchId: number, page: number = 0, size: number = 100) =>
    api.get(`/inventory/branch/${branchId}?page=${page}&size=${size}`),

  getByProductAndBranch: (productId: number, branchId: number) =>
    api.get(`/inventory/product/${productId}/branch/${branchId}`),

  /**
   * Get products with no sales in the last N days (dead stock analysis)
   */
  getDeadStock: (days: number = 90, branchId?: number) =>
    api.get('/inventory/dead-stock', { params: { days, ...(branchId ? { branchId } : {}) } }),

  getLowStockAlerts: (branchId?: number) =>
    api.get('/inventory/low-stock', { params: branchId ? { branchId } : undefined }),

  getLowStockAlertsByBranch: (branchId: number) =>
    api.get('/inventory/low-stock', { params: { branchId } }),

  adjustStock: (data: StockAdjustment) => api.post('/inventory/adjust', data),

  transferStock: (data: StockTransfer) => api.post('/inventory/transfer', data),

  getTransferHistory: (page: number = 0, size: number = 50, branchId?: number) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('size', size.toString());
    if (branchId) params.append('branchId', branchId.toString());
    return api.get(`/inventory/transfers?${params.toString()}`);
  },

  getTransferBranches: () => api.get('/inventory/transfer/branches'),

  getCurrentStock: (productId: number) => api.get(`/inventory/product/${productId}/stock`),

  updateLowStockThreshold: (data: { productId: number; branchId: number; lowStockThreshold: number }) =>
    api.put('/inventory/threshold', data),

  getInventoryReportByCategory: (categoryId: number, branchId?: number) =>
    api.get('/inventory/report', { params: { categoryId, branchId } }),

  getInventoryValuation: (branchId?: number) =>
    api.get('/inventory/valuation', { params: branchId ? { branchId } : undefined }),

  getMovements: (productId?: number, branchId?: number) => {
    const params = new URLSearchParams();
    if (productId) params.append('productId', productId.toString());
    if (branchId) params.append('branchId', branchId.toString());
    return api.get(`/inventory/movements?${params.toString()}`);
  },
};

export default inventoryService;
