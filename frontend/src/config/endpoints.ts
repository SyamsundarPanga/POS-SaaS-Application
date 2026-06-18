// API Endpoints Configuration
export const API_ENDPOINTS = {
  // Categories
  CATEGORIES: '/categories',
  CATEGORY_BY_ID: (id: number) => `/categories/${id}`,

  // Payments
  PAYMENTS: '/payments',
  PAYMENT_HISTORY: '/payments/history',
  PROCESS_PAYMENT: '/payments/process',
  SPLIT_PAYMENT: '/payments/split',
  REFUND_PAYMENT: (id: number) => `/payments/${id}/refund`,

  // Subscriptions
  SUBSCRIPTION: '/subscriptions/current',
  SUBSCRIPTION_PLANS: '/subscriptions/plans',
  UPGRADE_PLAN: '/subscriptions/upgrade',
  DOWNGRADE_PLAN: '/subscriptions/downgrade',
  USAGE_METRICS: '/subscriptions/usage',
  BILLING_HISTORY: '/subscriptions/billing',
  PAYMENT_METHODS: '/subscriptions/payment-methods',

  // Dashboard
  DASHBOARD_METRICS: '/dashboard/metrics',
  EMPLOYEE_PERFORMANCE: '/dashboard/employee-performance',
  LOW_STOCK_ALERTS: '/dashboard/low-stock',
  STOCK_THRESHOLD: (productId: number) => `/dashboard/stock-threshold/${productId}`,

  // Notifications
  NOTIFICATIONS: '/notifications',
  NOTIFICATION_BY_ID: (id: number) => `/notifications/${id}`,
  MARK_AS_READ: (id: number) => `/notifications/${id}/read`,
  MARK_ALL_READ: '/notifications/read-all',
  CLEAR_ALL_NOTIFICATIONS: '/notifications/clear-all',
  UNREAD_COUNT: '/notifications/unread-count',
  NOTIFICATION_PREFERENCES: '/notifications/preferences',

  // Settings
  SETTINGS: '/settings',
  COMPANY_PROFILE: '/settings/company',
  TAX_CONFIG: '/settings/tax',
  RECEIPT_TEMPLATE: '/settings/receipt-template',
  EMAIL_TEMPLATE: '/settings/email-template',
  PAYMENT_GATEWAY: '/settings/payment-gateway',

  // Reports
  SALES_REPORT: '/reports/sales',
  INVENTORY_REPORT: '/reports/inventory',
  EMPLOYEE_REPORT: '/reports/employee-performance',
  CUSTOMER_ANALYTICS: '/reports/customer-analytics',
  REVENUE_TRENDS: '/reports/revenue-trends',

  // Admin
  MULTI_BRANCH_ANALYTICS: '/admin/analytics/branches',
  BULK_IMPORT: '/admin/products/bulk-import',
  CUSTOMER_SEGMENTATION: '/admin/customers/segments',
  AUDIT_LOGS: '/admin/audit-logs',
  SYSTEM_HEALTH: '/admin/system-health',
  API_KEYS: '/admin/api-keys',

  // Employees
  EMPLOYEES: '/employees',
  EMPLOYEE_BY_ID: (id: number) => `/employees/${id}`,

  // Stock Transfer
  STOCK_TRANSFER: '/inventory/transfer',

  // Export
  EXPORT_CSV: '/export/csv',
  EXPORT_EXCEL: '/export/excel',
  EXPORT_PDF: '/export/pdf',
};
