import api from './api';

export interface DashboardStats {
  // Overview Stats
  totalRevenue: number;
  todaySales: number;
  yesterdaySales: number;
  weekSales: number;
  monthSales: number;
  salesGrowthPercentage: number;

  todayOrders: number;
  weekOrders: number;
  monthOrders: number;
  totalOrders: number;

  totalCustomers: number;
  newCustomersThisMonth: number;
  activeCustomers: number;

  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;

  activeBranches: number;
  activeEmployees: number;

  // Sales Trends
  salesTrends: SalesTrend[];

  // Top Products
  topProducts: TopProduct[];

  // Payment Distribution
  paymentDistribution: Record<string, PaymentDistribution>;

  // Recent Orders
  recentOrders: OrderSummary[];

  // Low Stock Alerts
  lowStockAlerts: LowStockAlert[];
}

export interface RevenueTrend {
  month: string;
  revenue: number;
  profit: number;
  transactions: number;
}

export interface SalesTrend {
  date: string;
  sales: number;
  orders: number;
}

export interface TopProduct {
  productId: number;
  productName: string;
  sku: string;
  quantitySold: number;
  revenue: number;
}

export interface PaymentDistribution {
  method: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface OrderSummary {
  id: number;
  orderNumber: string;
  total: number;
  createdAt: string;
  status: string;
  cashierName: string;
}

export interface LowStockAlert {
  productId: number;
  productName: string;
  sku: string;
  currentStock: number;
  minStockLevel: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  branchId: number;
  branchName: string;
}
export interface CategoryDistribution {
  categoryName: string;
  count: number;
}

export interface InventoryStatus {
  category: string;
  inStock: number;
  outOfStock: number;
  lowStock: number;
}
export interface BranchDashboard {
  branchId: number;
  branchName: string;

  todaySales: number;
  weekSales: number;
  monthSales: number;
  salesGrowthPercentage: number;

  todayOrders: number;
  weekOrders: number;
  monthOrders: number;

  activeEmployees: number;
  employeesOnShift: number;

  totalProducts: number;
  lowStockProducts: number;
  inventoryValue: number;

  salesTrends: SalesTrend[];
  topProducts: TopProduct[];
  paymentDistribution: Record<string, PaymentDistribution>;
  recentOrders: OrderSummary[];
  lowStockAlerts: LowStockAlert[];
}
export interface WeeklySales {
  date: string; // Matches LocalDate from Java
  sales: number; // Matches BigDecimal from Java
  transactions: number; // Number of orders
}

export interface BranchPerformanceData {
  branchName: string;
  revenue: number;
}

/**
 * Get admin dashboard statistics (enterprise-wide) with optional date range
 */
export const getAdminDashboard = async (startDate?: string, endDate?: string): Promise<DashboardStats> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await api.get(`/dashboard/admin/overview?${params.toString()}`);
  return response.data;
};

/**
 * Get branch dashboard statistics
 */
export const getBranchDashboard = async (branchId: number): Promise<BranchDashboard> => {
  const response = await api.get(`/dashboard/branch/${branchId}`);
  return response.data;
};

export const getRevenueTrends = async (startDate?: string, endDate?: string): Promise<RevenueTrend> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await api.get(`/dashboard/admin/revenue-trend?${params.toString()}`);
  return response.data;
};

export const getCategoryDistribution = async (startDate?: string, endDate?: string): Promise<CategoryDistribution[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await api.get(`/dashboard/admin/category-distribution?${params.toString()}`);
  return response.data;
};

export const getInventoryStatus = async (startDate?: string, endDate?: string): Promise<InventoryStatus[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await api.get(`/dashboard/admin/inventory-status?${params.toString()}`);
  return response.data;
};

/**
 * Get manager dashboard statistics (branch-specific)
 */
export const getManagerDashboard = async (days: number = 7): Promise<any> => {
  const response = await api.get(`/dashboard/manager?days=${days}`);
  return response.data;
};

/**
 * Get manager's today summary
 */
export const getManagerTodaySummary = async (): Promise<any> => {
  const response = await api.get('/dashboard/manager/today-summary');
  return response.data;
};

/**
 * Get today's total revenue
 */
export const getTodaysRevenue = async (): Promise<number> => {
  const response = await api.get('/dashboard/todays-revenue');
  return response.data;
};

/**
 * Get today's transaction count
 */
export const getTodaysTransactions = async (): Promise<number> => {
  const response = await api.get('/dashboard/todays-transactions');
  return response.data;
};

/**
 * Get today's average order value
 */
export const getAverageOrderValue = async (): Promise<number> => {
  const response = await api.get('/dashboard/average-order-value');
  return response.data;
};

export const getWeeklySales = async (startDate?: string, endDate?: string): Promise<WeeklySales[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await api.get(`/dashboard/admin/weekly-sales?${params.toString()}`);
  return response.data;
};

export const getBranchPerformanceData = async (startDate?: string, endDate?: string): Promise<BranchPerformanceData[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await api.get(`/dashboard/admin/branch-performance-data?${params.toString()}`);
  return response.data;
};

export default {
  getAdminDashboard,
  getBranchDashboard,
  getManagerDashboard,
  getManagerTodaySummary,
  getTodaysRevenue,
  getTodaysTransactions,
  getAverageOrderValue,
  getWeeklySales,
  getBranchPerformanceData,
  getRevenueTrends,
  getCategoryDistribution,
  getInventoryStatus,
};
