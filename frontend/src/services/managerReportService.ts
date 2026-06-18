import api from './api';

export interface ManagerImportResult {
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

const managerReportService = {
  exportInventoryCsv: async (startDate?: string, endDate?: string) => {
    const response = await api.get('/manager/reports/inventory/export', {
      params: { startDate, endDate },
      responseType: 'blob',
    });
    downloadBlob(response.data, `branch_inventory_turnover_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  },

  exportInventoryPdf: async (startDate?: string, endDate?: string) => {
    const response = await api.get('/manager/reports/inventory/export', {
      params: { format: 'pdf', startDate, endDate },
      responseType: 'blob',
    });
    downloadBlob(response.data, `branch_inventory_turnover_${new Date().toISOString().slice(0, 10)}.pdf`, 'application/pdf');
  },

  importInventoryCsv: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ManagerImportResult>('/manager/reports/inventory/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  exportEmployeePerformanceCsv: async (startDate?: string, endDate?: string) => {
    const response = await api.get('/manager/reports/employees/export', {
      params: { startDate, endDate },
      responseType: 'blob',
    });
    downloadBlob(response.data, `branch_employee_performance_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  },

  exportEmployeePerformancePdf: async (startDate?: string, endDate?: string) => {
    const response = await api.get('/manager/reports/users/export', {
      params: { format: 'pdf', startDate, endDate },
      responseType: 'blob',
    });
    downloadBlob(response.data, `branch_employee_performance_${new Date().toISOString().slice(0, 10)}.pdf`, 'application/pdf');
  },

  importEmployeesCsv: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ManagerImportResult>('/manager/reports/employees/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getSalesReport: async (startDate?: string, endDate?: string) => {
    const response = await api.get('/manager/reports/sales', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getPaymentAuditLog: async (params: { startDate?: string; endDate?: string; method?: string; status?: string }) => {
    const response = await api.get('/manager/reports/payments/audit-log', { params });
    return response.data;
  },

  exportDashboardCsv: async (startDate?: string, endDate?: string) => {
    const response = await api.get('/manager/reports/dashboard/export', {
      params: { format: 'csv', startDate, endDate },
      responseType: 'blob',
    });
    downloadBlob(response.data, `branch_sales_report_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  },

  exportDashboardPdf: async (startDate?: string, endDate?: string) => {
    const response = await api.get('/manager/reports/dashboard/export', {
      params: { format: 'pdf', startDate, endDate },
      responseType: 'blob',
    });
    downloadBlob(response.data, `branch_sales_report_${new Date().toISOString().slice(0, 10)}.pdf`, 'application/pdf');
  },

  importDashboardCsv: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ManagerImportResult>('/manager/reports/dashboard/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export default managerReportService;
