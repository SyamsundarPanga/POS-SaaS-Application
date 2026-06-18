import api from './api';

export interface InventoryTurnoverItem {
  productId: number;
  productName: string;
  sku: string;
  beginningInventory: number;
  endingInventory: number;
  quantitySold: number;
  turnoverRatio: number;
  turnoverFlag: 'HIGH' | 'NORMAL' | 'LOW';
}

export interface EmployeePerformanceItem {
  userId: number;
  employeeName: string;
  branchId: number | null;
  ordersProcessed: number;
  totalRevenue: number;
  avgOrderValue: number;
}

export interface PaymentAuditLogItem {
  paymentId: number;
  method: string;
  amount: number;
  status: string;
  timestamp: string;
  gatewayReference: string | null;
  orderNumber: string | null;
}

export interface SalesReport {
  startDate: string;
  endDate: string;
  totalRevenue: number;
  transactionCount: number;
  topProducts: Array<{
    id: number;
    name: string;
    sku: string;
    quantitySold: number;
    revenue: number;
  }>;
  paymentBreakdown: Array<{
    method: string;
    amount: number;
    percentage: number;
  }>;
}

export interface ImportResult {
  totalRows: number;
  importedRows: number;
  failedRows: number;
  errors: string[];
}

const downloadBlob = (data: BlobPart, fileName: string, type: string) => {
  const blob = new Blob([data], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const adminReportService = {
  getInventoryTurnover: async (startDate?: string, endDate?: string) => {
    const response = await api.get<InventoryTurnoverItem[]>('/admin/reports/inventory/turnover', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  exportInventoryCsv: async (startDate?: string, endDate?: string) => {
    const response = await api.get('/admin/reports/inventory/export', {
      params: { format: 'csv', startDate, endDate },
      responseType: 'blob',
    });
    downloadBlob(response.data, `inventory_turnover_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  },

  exportInventoryPdf: async (startDate?: string, endDate?: string) => {
    const response = await api.get('/admin/reports/inventory/export', {
      params: { format: 'pdf', startDate, endDate },
      responseType: 'blob',
    });
    downloadBlob(response.data, `inventory_turnover_${new Date().toISOString().slice(0, 10)}.pdf`, 'application/pdf');
  },

  importInventoryCsv: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ImportResult>('/admin/reports/inventory/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getEmployeePerformance: async (branchId?: number, startDate?: string, endDate?: string) => {
    const response = await api.get<EmployeePerformanceItem[]>('/admin/reports/users/employee-performance', {
      params: { branchId, startDate, endDate },
    });
    return response.data;
  },

  exportEmployeePerformanceCsv: async (branchId?: number, startDate?: string, endDate?: string) => {
    const response = await api.get('/admin/reports/users/export', {
      params: { format: 'csv', branchId, startDate, endDate },
      responseType: 'blob',
    });
    downloadBlob(response.data, `employee_performance_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  },

  exportEmployeePerformancePdf: async (branchId?: number, startDate?: string, endDate?: string) => {
    const response = await api.get('/admin/reports/users/export', {
      params: { format: 'pdf', branchId, startDate, endDate },
      responseType: 'blob',
    });
    downloadBlob(response.data, `employee_performance_${new Date().toISOString().slice(0, 10)}.pdf`, 'application/pdf');
  },

  importUsersCsv: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ImportResult>('/admin/reports/users/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getSalesReport: async (startDate?: string, endDate?: string) => {
    const response = await api.get<SalesReport>('/admin/reports/sales', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getPaymentAuditLog: async (params: {
    startDate?: string;
    endDate?: string;
    method?: string;
    status?: string;
  }) => {
    const response = await api.get<PaymentAuditLogItem[]>('/admin/reports/payments/audit-log', {
      params,
    });
    return response.data;
  },

  exportDashboardCsv: async (startDate?: string, endDate?: string) => {
    const response = await api.get('/admin/reports/dashboard/export', {
      params: { format: 'csv', startDate, endDate },
      responseType: 'blob',
    });
    downloadBlob(response.data, `sales_report_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  },

  exportOrdersCsv: async (startDate?: string, endDate?: string, branchId?: number) => {
    const response = await api.get('/admin/reports/orders/export', {
      params: { format: 'csv', startDate, endDate, branchId },
      responseType: 'blob',
    });
    downloadBlob(response.data, `sales_orders_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  },

  exportOrdersPdf: async (startDate?: string, endDate?: string, branchId?: number) => {
    const response = await api.get('/admin/reports/orders/export', {
      params: { format: 'pdf', startDate, endDate, branchId },
      responseType: 'blob',
    });
    downloadBlob(response.data, `sales_orders_${new Date().toISOString().slice(0, 10)}.pdf`, 'application/pdf');
  },

  exportDashboardPdf: async (startDate?: string, endDate?: string) => {
    const response = await api.get('/admin/reports/dashboard/export', {
      params: { format: 'pdf', startDate, endDate },
      responseType: 'blob',
    });
    downloadBlob(response.data, `sales_report_${new Date().toISOString().slice(0, 10)}.pdf`, 'application/pdf');
  },

  importDashboardCsv: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ImportResult>('/admin/reports/dashboard/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  exportProducts: async (format: 'csv' | 'pdf' = 'csv') => {
    const response = await api.get('/admin/reports/products/export', {
      params: { format },
      responseType: 'blob',
    });
    const ext = format === 'pdf' ? 'pdf' : 'csv';
    const type = format === 'pdf' ? 'application/pdf' : 'text/csv';
    downloadBlob(response.data, `products_catalog_${new Date().toISOString().slice(0, 10)}.${ext}`, type);
  },

  importProductsCsv: async (file: File, mapping?: Record<string, string>) => {
    const formData = new FormData();
    formData.append('file', file);
    if (mapping) {
      formData.append('mapping', JSON.stringify(mapping));
    }
    const response = await api.post<ImportResult>('/admin/reports/products/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export default adminReportService;
