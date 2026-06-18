import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Line,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Radar,
  RadarChart,
  ComposedChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  AreaChart,
  Legend,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { DollarSign, ShoppingBag, MapPin, BarChart3, Activity, Users, Calendar, ShoppingCart, Package, TrendingUp, IndianRupee, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Download, Upload, FileText } from 'lucide-react';
import {
  getAdminDashboard,
  DashboardStats,
  getRevenueTrends,
  getCategoryDistribution,
  getWeeklySales,
  getBranchPerformanceData,
  getInventoryStatus, // Added this import
} from '../../services/dashboardService';
import subscriptionService, {
  SubscriptionPlanResponse,
  SubscriptionUsageResponse,
} from '../../services/subscriptionService';
import TopProductsReport from '../../components/reports/TopProductsReport';
import branchService from '../../services/branchService';
import userService from '../../services/userService';
import productService from '../../services/productService';
import toast from '../../utils/toast';
import customerService, { Customer } from '../../services/customerService';
import { motion } from 'framer-motion';
import adminReportService from '../../services/adminReportService';

// --- Type Overrides for Recharts TS Compatibility Errors ---
const SafePolarAngleAxis = PolarAngleAxis as any;
const SafePolarRadiusAxis = PolarRadiusAxis as any;
const SafePolarGrid = PolarGrid as any;
const SafeRadar = Radar as any;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  },
} as const;

// --- Interfaces ---
interface BranchPerformance {
  name: string;
  revenue: number;
  orders: number;
  status: string;
}

interface UsageStats {
  label: string;
  current: number;
  limit: number;
  color: string;
  percent: number;
  isLimitReached: boolean;
}

interface RevenueTrendData {
  month: string;
  revenue: number;
  profit: number;
}

interface ProductCategoryData {
  name: string;
  value: number;
  color: string;
}

interface CustomerSatisfactionData {
  subject: string;
  A: number;
  B: number;
  fullMark: number;
}

interface WeeklySalesData {
  day: string;
  sales: number;
  orders: number;
}

interface EmployeePerformanceData {
  name: string;
  efficiency: number;
  sales: number;
}


interface CustomerPerformanceData {
  customerName: string;
  orders: number;
}
interface CashierPerformanceData {
  name: string;
  orders: number;
}
interface InventoryStatusData {
  category: string;
  inStock: number;
  outOfStock: number;
  lowStock: number;
}

interface MonthlyTrafficData {
  month: string;
  online: number;
  inStore: number;
}

interface AuditBranchRow {
  id: number;
  name: string;
  communication: string;
  status: string;
  location: string;
  isHeadBranch: boolean;
  createdAt?: string;
}

type AdminOverviewStats = DashboardStats & {
  totalEmployees?: number;
};

// --- Main Component ---
const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [liveRevenueData, setLiveRevenueData] = useState<any[]>([]);
  const [categoryDist, setCategoryDist] = useState<any[]>([]);
  const [weeklySales, setWeeklySales] = useState<any[]>([]);
  const [branchPerf, setBranchPerf] = useState<any[]>([]);
  const [inventoryStatus, setInventoryStatus] = useState<any[]>([]); // New State for live inventory
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlanResponse | null>(null);
  const [subscriptionUsage, setSubscriptionUsage] = useState<SubscriptionUsageResponse | null>(null);
  const [auditBranches, setAuditBranches] = useState<AuditBranchRow[]>([]);
  const [branchPage, setBranchPage] = useState(1);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState('week');
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [topCashiers, setTopCashiers] = useState<CashierPerformanceData[]>([]);
  // Helper function to calculate date range
  const getDateRange = (range: string): { startDate: string; endDate: string } => {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    let startDate = endDate;

    switch (range) {
      case 'today':
        startDate = endDate;
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        startDate = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        startDate = monthAgo.toISOString().split('T')[0];
        break;
      case 'year':
        const yearAgo = new Date(today);
        yearAgo.setFullYear(today.getFullYear() - 1);
        startDate = yearAgo.toISOString().split('T')[0];
        break;
      default:
        startDate = endDate;
    }

    return { startDate, endDate };
  };

  // Helper function to get chart title based on date range
  const getSalesChartTitle = (): string => {
    switch (dateRange) {
      case 'today':
        return "Today's Sales";
      case 'week':
        return 'Weekly Sales Velocity';
      case 'month':
        return 'Monthly Sales Velocity';
      case 'year':
        return 'Yearly Sales Velocity';
      default:
        return 'Sales Velocity';
    }
  };

  // Helper function to get time period label
  const getTimePeriodLabel = (): string => {
    switch (dateRange) {
      case 'today':
        return 'Today';
      case 'week':
        return 'Last 7 Days';
      case 'month':
        return 'Last 30 Days';
      case 'year':
        return 'Last 12 Months';
      default:
        return 'All Time';
    }
  };

  const handleDashboardExport = async (format: 'csv' | 'pdf') => {
    const { startDate, endDate } = getDateRange(dateRange);
    try {
      setReportBusy(true);
      if (format === 'pdf') {
        await adminReportService.exportDashboardPdf(startDate, endDate);
      } else {
        await adminReportService.exportDashboardCsv(startDate, endDate);
      }

      const [salesReport, paymentAuditLog] = await Promise.all([
        adminReportService.getSalesReport(startDate, endDate),
        adminReportService.getPaymentAuditLog({ startDate, endDate }),
      ]);

      toast.success(
        `Report ready: ${salesReport.transactionCount} transactions, ${paymentAuditLog.length} payment audit rows`
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.message || `Failed to export ${format.toUpperCase()} report`);
    } finally {
      setReportBusy(false);
    }
  };


  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);

        // Calculate date range based on selected filter
        const { startDate, endDate } = getDateRange(dateRange);

        // Fetching all datasets in parallel including the new Inventory Status
        // const [dashboardData, revenueData, catData, weeklyData, branchData, invStatusData, planData, usageData] = await Promise.all([
        const [dashboardData, revenueData, catData, weeklyData, branchData, invStatusData, planData, usageData, customerData, employeePerformance] = await Promise.all([
          getAdminDashboard(startDate, endDate).catch(() => null),
          
          getRevenueTrends(startDate, endDate).catch(() => []),
          getCategoryDistribution(startDate, endDate).catch(() => []),
          getWeeklySales(startDate, endDate).catch(() => []),
          getBranchPerformanceData(startDate, endDate).catch(() => []),
          getInventoryStatus(startDate, endDate).catch(() => []), // Added live call
          subscriptionService.getCurrentPlan().catch(() => null),
          subscriptionService.getUsageStatistics().catch(() => null),
          customerService.getAll(0, 500).catch(() => null),
          adminReportService.getEmployeePerformance(undefined, startDate, endDate).catch(() => []),
        ]);

        console.log('Live Revenue API Data:', revenueData);
        console.log('Category Distribution Data:', catData);

        const normalizedRevenue = Array.isArray(revenueData) ? revenueData : [revenueData].filter(Boolean);
        setLiveRevenueData(normalizedRevenue);
        setStats(dashboardData);
        setCategoryDist(catData || []);
        setWeeklySales(weeklyData || []);
        setBranchPerf(branchData || []);
        setInventoryStatus(invStatusData || []); // Set live inventory data
        setSubscriptionPlan(planData);
        setSubscriptionUsage(usageData);

        const customerRows = customerData?.data?.content || customerData?.data || [];
        setAllCustomers(Array.isArray(customerRows) ? customerRows : []);
        setTopCashiers(
          (Array.isArray(employeePerformance) ? employeePerformance : [])
            .filter((employee: any) => Number(employee?.ordersProcessed || 0) > 0)
            .sort((first: any, second: any) => Number(second?.ordersProcessed || 0) - Number(first?.ordersProcessed || 0))
            .slice(0, 5)
            .map((employee: any) => ({
              name: employee.employeeName || 'Unknown',
              orders: Number(employee.ordersProcessed || 0),
            })),
        );

        const branchList = await branchService.getBranches().catch(() => []);
        const normalizedBranches: AuditBranchRow[] = (Array.isArray(branchList) ? branchList : []).map((b: any) => ({
          id: b.id,
          name: b.name || 'Unknown',
          communication: [b.email, b.phone].filter(Boolean).join(' | ') || 'N/A',
          status: b.status || 'UNKNOWN',
          location: [b.address, b.city, b.state].filter(Boolean).join(', ') || 'N/A',
          isHeadBranch: Boolean(b.isMainBranch),
          createdAt: b.createdAt,
        }));
        setAuditBranches(normalizedBranches);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();

    const updateDateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      };
      setCurrentDate(now.toLocaleDateString('en-US', options));
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, [dateRange]); // Re-fetch when dateRange changes

  const downloadCsv = (filename: string, rows: string[][]) => {
    const escapeCell = (value: any) => {
      const cell = String(value ?? '');
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    };
    const csv = rows.map((row) => row.map(escapeCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const exportBranchCsv = async () => {
    const rows = [
      ['Branch Name/Id', 'Communication', 'Operational Status', 'Branch Location'],
      ...auditBranches.map((b) => [
        `${b.name} / ${b.id}`,
        b.communication,
        b.status,
        b.location,
      ]),
    ];
    downloadCsv(`branches_${new Date().toISOString().split('T')[0]}.csv`, rows);
  };

  const exportUsersCsv = async () => {
    const response = await userService.getUsers(0, 500);
    const users = response?.data?.content || [];
    const filtered = users.filter((u: any) => ['ROLE_BRANCH_MANAGER', 'ROLE_CASHIER'].includes(u.role));
    const rows = [
      ['User ID', 'Name', 'Email', 'Role', 'Status', 'Branch ID'],
      ...filtered.map((u: any) => [
        u.id,
        `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
        u.email || 'N/A',
        u.role || 'N/A',
        u.status || 'N/A',
        u.branchId ?? 'N/A',
      ]),
    ];
    downloadCsv(`users_manager_cashier_${new Date().toISOString().split('T')[0]}.csv`, rows);
  };

  const exportProductsCsv = async () => {
    const response = await productService.getProducts(0, 1000);
    const products = response?.data?.content || [];
    const rows = [
      ['Product ID', 'Name', 'SKU', 'Price', 'Status', 'Category'],
      ...products.map((p: any) => [
        p.id,
        p.name || 'N/A',
        p.sku || 'N/A',
        p.price ?? 'N/A',
        p.status || 'N/A',
        p.categoryName || p.category?.name || 'N/A',
      ]),
    ];
    downloadCsv(`products_${new Date().toISOString().split('T')[0]}.csv`, rows);
  };

  const exportRevenueCsv = async () => {
    const rows = [
      ['Month', 'Revenue', 'Profit'],
      ...finalRevenueChartData.map((r: any) => [r.month, r.revenue, r.profit]),
    ];
    downloadCsv(`revenue_${new Date().toISOString().split('T')[0]}.csv`, rows);
  };

  const handleExportSelection = async (type: 'branch' | 'user' | 'product' | 'revenue') => {
    try {
      setIsGeneratingReport(true);
      if (type === 'branch') await exportBranchCsv();
      if (type === 'user') await exportUsersCsv();
      if (type === 'product') await exportProductsCsv();
      if (type === 'revenue') await exportRevenueCsv();
      toast.success('CSV exported successfully');
      setIsExportModalOpen(false);
    } catch (error) {
      toast.error('Failed to export CSV');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // --- Data Transformation Layer ---

  const finalRevenueChartData = useMemo(() => {
    return liveRevenueData.map((item) => ({
      month: item.month || 'Unknown',
      revenue: item.revenue || 0,
      profit: (item.revenue || 0) * 0.22,
      transactions: item.transactions || 0,
    }));
  }, [liveRevenueData]);

  const productCategoryData = useMemo(() => {
    return categoryDist.map((item, i) => ({
      name: item.categoryName || 'Uncategorized',
      value: item.count || 0,
      color: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'][i % 6],
    }));
  }, [categoryDist]);

  const branchPerformance: BranchPerformance[] = (stats?.recentOrders || [])
    .map((o) => ({
      name: o.cashierName || 'Global',
      revenue: o.total || 0,
      orders: 1,
      status: 'Active',
    }))
    .slice(0, 4);

  const usageStats: UsageStats[] = useMemo(() => {
    if (!subscriptionUsage) {
      return [
        { label: 'Branches', current: 0, limit: 0, color: '#3b82f6', percent: 0, isLimitReached: false },
        { label: 'Users', current: 0, limit: 0, color: '#10b981', percent: 0, isLimitReached: false },
        { label: 'Products', current: 0, limit: 0, color: '#f59e0b', percent: 0, isLimitReached: false },
      ];
    }

    const toPercent = (current: number, limit: number) => {
      if (!limit) return 0;
      return Math.min((current / limit) * 100, 100);
    };

    return [
      {
        label: 'Branches',
        current: subscriptionUsage.currentBranches,
        limit: subscriptionUsage.maxBranches,
        color: '#3b82f6',
        percent: toPercent(subscriptionUsage.currentBranches, subscriptionUsage.maxBranches),
        isLimitReached: subscriptionUsage.branchLimitReached,
      },
      {
        label: 'Users',
        current: subscriptionUsage.currentUsers,
        limit: subscriptionUsage.maxUsers,
        color: '#10b981',
        percent: toPercent(subscriptionUsage.currentUsers, subscriptionUsage.maxUsers),
        isLimitReached: subscriptionUsage.userLimitReached,
      },
      {
        label: 'Products',
        current: subscriptionUsage.currentProducts,
        limit: subscriptionUsage.maxProducts,
        color: '#f59e0b',
        percent: toPercent(subscriptionUsage.currentProducts, subscriptionUsage.maxProducts),
        isLimitReached: subscriptionUsage.productLimitReached,
      },
    ];
  }, [subscriptionUsage]);

  const customerSatisfactionData: CustomerSatisfactionData[] = [
    { subject: 'Quality', A: 120, B: 110, fullMark: 150 },
    { subject: 'Service', A: 98, B: 130, fullMark: 150 },
    { subject: 'Price', A: 86, B: 130, fullMark: 150 },
    { subject: 'Delivery', A: 99, B: 100, fullMark: 150 },
    { subject: 'Store', A: 85, B: 90, fullMark: 150 },
  ];

  const headBranch = useMemo(
    () => auditBranches.find((b) => b.isHeadBranch) || auditBranches[0],
    [auditBranches]
  );
  const rotatingBranches = useMemo(
    () => auditBranches.filter((b) => !headBranch || b.id !== headBranch.id),
    [auditBranches, headBranch]
  );
  const rotatingTotalPages = Math.max(1, Math.ceil(rotatingBranches.length / 3));
  const pagedRotating = useMemo(() => {
    const safePage = Math.min(Math.max(branchPage, 1), rotatingTotalPages);
    const start = (safePage - 1) * 3;
    return rotatingBranches.slice(start, start + 3);
  }, [branchPage, rotatingBranches, rotatingTotalPages]);
  const auditRowsToDisplay = useMemo(
    () => [headBranch, ...pagedRotating].filter(Boolean) as AuditBranchRow[],
    [headBranch, pagedRotating]
  );

    const topCustomerPerformanceData: CustomerPerformanceData[] = useMemo(() => {
    return allCustomers
      .map((customer) => ({
        customerName:
          customer.name ||
          `${customer.firstName || ''} ${customer.lastName || ''}`.trim() ||
          'Unknown Customer',
        orders: Number(customer.totalPurchases || 0),
      }))
      .filter((customer) => customer.orders > 0)
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5);
  }, [allCustomers]);

  const topCustomer = topCustomerPerformanceData[0];
  const topCashier = topCashiers[0];

  const customersAddedCount = useMemo(() => {
    const now = new Date();
    const start = new Date(now);

    if (dateRange === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (dateRange === 'week') {
      start.setDate(now.getDate() - 7);
    } else if (dateRange === 'month') {
      start.setMonth(now.getMonth() - 1);
    } else if (dateRange === 'year') {
      start.setFullYear(now.getFullYear() - 1);
    }

    return allCustomers.filter((customer) => {
      if (!customer.createdAt) return false;
      const createdAt = new Date(customer.createdAt);
      if (Number.isNaN(createdAt.getTime())) return false;

      if (dateRange === 'today') {
        return createdAt >= start;
      }

      return createdAt >= start && createdAt <= now;
    }).length;
  }, [allCustomers, dateRange]);

  // --- Waterfall Chart Data Preparation ---
  const waterfallChartData = useMemo(() => {
    let baseData: any[] = [];

    if (dateRange === 'month' || dateRange === 'year') {
      baseData = finalRevenueChartData.map(d => ({
        ...d,
        sales: d.revenue || 0,
        label: d.month
      }));
    } else {
      // For 'today' and 'week', use weeklySales
      baseData = (weeklySales || []).map(d => ({
        ...d,
        sales: d.sales || 0,
        label: d.date
      }));
    }

    return baseData.map((d, i, arr) => {
      const prevSum = arr.slice(0, i).reduce((sum, item) => sum + (item.sales || 0), 0);
      return {
        ...d,
        base: prevSum,
        displaySales: d.sales || 0,
        label: d.label
      };
    });
  }, [dateRange, finalRevenueChartData, weeklySales]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white relative overflow-hidden">
        <div className="text-xl font-bold text-slate-900 animate-pulse z-10">
          Loading Intelligence...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans text-slate-900 relative">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <Header />

        <main className="flex-1 overflow-y-auto pt-2 px-6 pb-10">
          <motion.div
            className="max-w-7xl mx-auto space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Page Header */}
            <motion.header className="mb-6" variants={itemVariants}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1 block">
                    Enterprise Administration
                  </span>
                  <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    Dashboard Analytics
                  </h1>
                  <p className="text-slate-500 font-medium">
                    Global Overview • {currentDate}
                  </p>
                </div>
                {/* Date Filter + Report Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDashboardExport('csv')}
                    disabled={reportBusy}
                    className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-60"
                    title="Export Sales Report CSV"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDashboardExport('pdf')}
                    disabled={reportBusy}
                    className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-60"
                    title="Export Sales Report PDF"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-emerald-500 rounded-xl text-sm font-bold text-emerald-700 hover:bg-emerald-50 transition-all shadow-sm"
                    >
                      <Calendar className="w-4 h-4" />
                      <span className="capitalize">{dateRange === 'today' ? "Today" : dateRange}</span>
                      <div className={`w-4 h-4 transition-transform duration-200 ${isDateDropdownOpen ? 'rotate-180' : ''}`}>
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {isDateDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setIsDateDropdownOpen(false)}
                        />
                        <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                          {['today', 'week', 'month', 'year'].map((filter) => (
                            <button
                              key={filter}
                              onClick={() => {
                                setDateRange(filter);
                                setIsDateDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm font-bold capitalize transition-colors ${dateRange === filter
                                ? 'bg-emerald-50 text-emerald-700 font-bold border-l-4 border-emerald-500'
                                : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                }`}
                            >
                              {filter}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.header>

            {/* KPI Stats */}
            <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" variants={itemVariants}>
              <StatCard
                title="Total Revenue"
                value={`₹${(stats?.totalRevenue ?? 0).toLocaleString()}`}
                icon={<IndianRupee className="w-5 h-5 text-emerald-600" />}
                color="emerald"
                growth={stats?.salesGrowthPercentage || 0}
              />
              <StatCard
                title="Total Orders"
                value={`${(stats?.totalOrders ?? 0).toLocaleString()}`}
                icon={<ShoppingCart className="w-5 h-5 text-blue-600" />}
                color="blue"
                growth={stats?.totalOrders && stats?.monthOrders ? Math.round((stats.monthOrders / (stats.totalOrders - stats.monthOrders || 1)) * 100) : 0}
              />
              <StatCard
                title="Active Branches"
                value={`${(stats?.activeBranches ?? 0).toLocaleString()}`}
                icon={<Package className="w-5 h-5 text-orange-600" />}
                color="orange"
                growth={(() => {
                  const now = new Date();
                  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                  const branchesBeforeThisMonth = auditBranches.filter(b => b.createdAt && new Date(b.createdAt) < startOfCurrentMonth).length;
                  const newThisMonth = auditBranches.length - branchesBeforeThisMonth;
                  if (branchesBeforeThisMonth === 0) return auditBranches.length > 0 ? 100 : 0;
                  return Math.round((newThisMonth / branchesBeforeThisMonth) * 100);
                })()}
              />
              <StatCard
                title="Total Customers"
                value={`${customersAddedCount.toLocaleString()}`}
                icon={<Users className="w-5 h-5 text-purple-600" />}
                color="purple"
                onClick={() => navigate('/customers')}
              />
            </motion.div>

            {/* Top Six Charts in 2-column grid */}
            <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6" variants={itemVariants}>
              {/* 1. Sales Velocity (Waterfall Chart) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-widest text-left">
                    <BarChart3 size={18} className="text-blue-600" /> {getSalesChartTitle()}
                  </h3>
                  <span className="text-[10px] bg-slate-50 text-slate-400 px-2 py-1 rounded font-bold uppercase">{getTimePeriodLabel()}</span>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={waterfallChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-3 rounded-xl shadow-xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-500 mb-1">{data.label}</p>
                                <p className="text-sm font-black text-emerald-600">₹{(data.sales || 0).toLocaleString()}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="base" stackId="a" fill="transparent" />
                      <Bar dataKey="displaySales" stackId="a" fill="#10b981" radius={[4, 4, 4, 4]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 2. Order Volume (Area Chart) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-widest text-left">
                    <Package size={18} className="text-purple-600" /> Order Volume
                  </h3>
                  <span className="text-[10px] bg-slate-50 text-slate-400 px-2 py-1 rounded font-bold uppercase">{getTimePeriodLabel()}</span>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dateRange === 'month' || dateRange === 'year' ? finalRevenueChartData : weeklySales}>
                      <defs>
                        <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey={dateRange === 'month' || dateRange === 'year' ? 'month' : 'date'} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                      <Area
                        type="monotone"
                        name="Orders"
                        dataKey="transactions"
                        stroke="#8b5cf6"
                        strokeWidth={4}
                        fill="url(#colorOrders)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 3. Category Distribution (Radial Bar Chart) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-6 text-sm uppercase tracking-widest text-left">
                  Category Distribution
                </h3>
                <div className="h-[300px] flex justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      innerRadius="30%"
                      outerRadius="100%"
                      data={productCategoryData}
                      startAngle={180}
                      endAngle={0}
                    >
                      <RadialBar
                        label={{ position: 'insideStart', fill: '#fff' }}
                        background
                        dataKey="value"
                      >
                        {productCategoryData.map((entry, index) => (
                          <Cell key={`category-cell-${index}`} fill={entry.color} />
                        ))}
                      </RadialBar>
                      <Legend
                        iconSize={10}
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                      />
                      <Tooltip />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 4. Revenue Trend (Composed Chart) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-6 text-sm uppercase tracking-widest text-left">Revenue Trend</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={finalRevenueChartData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        tickFormatter={(val) => (val ? val.substring(0, 3) : '')}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        fill="url(#colorRevenue)"
                        stroke="none"
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#10b981', stroke: '#fff' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="profit"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 5. Revenue by Branch (Horizontal Bar Chart) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-6 text-sm uppercase tracking-widest flex items-center gap-2 text-left">
                  <MapPin size={16} className="text-emerald-500" /> Branch performance
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={branchPerf} margin={{ left: 20 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="branchName" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }} width={80} />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                      <Bar dataKey="revenue" fill="#10b981" radius={[0, 10, 10, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 6. Inventory Status (Icon Chart) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-6 text-sm uppercase tracking-widest text-left">Inventory Health</h3>
                <div className="h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="grid grid-cols-1 gap-4">
                    {inventoryStatus.map((item, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${item.outOfStock > 0 ? 'bg-red-100 text-red-600' : item.lowStock > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            <Package size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{item.category}</p>
                            <p className="text-[10px] text-slate-500 font-medium">In Stock: {item.inStock} items</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {item.outOfStock > 0 && (
                            <div className="flex flex-col items-center">
                              <AlertTriangle size={14} className="text-red-500" />
                              <span className="text-[10px] font-bold text-red-600">{item.outOfStock}</span>
                            </div>
                          )}
                          {item.lowStock > 0 && (
                            <div className="flex flex-col items-center">
                              <Activity size={14} className="text-amber-500" />
                              <span className="text-[10px] font-bold text-amber-600">{item.lowStock}</span>
                            </div>
                          )}
                          {item.outOfStock === 0 && item.lowStock === 0 && (
                            <div className="flex flex-col items-center">
                              <CheckCircle size={14} className="text-emerald-500" />
                              <span className="text-[10px] font-bold text-emerald-600">Purely Stocked</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div className="mt-6" variants={itemVariants}>
              <TopProductsReport />
            </motion.div>


            <motion.div className="grid grid-cols-1 xl:grid-cols-2 gap-6" variants={itemVariants}>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-3xl sm:text-2xl tracking-tight flex items-center gap-2">
                      <Users size={20} className="text-blue-600" />
                      Top Customer Performance
                    </h3>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-3">
                      This {dateRange === 'today' ? 'day' : dateRange} - Top 5 Customers
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/customers')}
                    className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors inline-flex items-center gap-1"
                  >
                    View Customers <ChevronRight size={16} />
                  </button>
                </div>

                <div className="text-right mb-3">
                  <p className="text-sm font-bold text-blue-600">
                    {topCustomer
                      ? `Top: ${topCustomer.customerName} (${topCustomer.orders} orders)`
                      : 'Top: No customer data'}
                  </p>
                </div>

                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={topCustomerPerformanceData}
                      margin={{ top: 6, right: 16, left: 16, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis
                        type="number"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="customerName"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#0f172a', fontSize: 12 }}
                        width={110}
                      />
                      <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        formatter={(value: number) => [`${value} orders`, 'Orders']}
                      />
                      <Bar dataKey="orders" fill="#0b79ef" radius={[0, 10, 10, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-3xl sm:text-2xl tracking-tight flex items-center gap-2">
                      <Users size={20} className="text-purple-600" />
                      Top Cashier Performance
                    </h3>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-3">
                      This {dateRange === 'today' ? 'day' : dateRange} - All Branches
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/users')}
                    className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors inline-flex items-center gap-1"
                  >
                    View Staff <ChevronRight size={16} />
                  </button>
                </div>

                <div className="text-right mb-3">
                  <p className="text-sm font-bold text-purple-600">
                    {topCashier
                      ? `Top: ${topCashier.name} (${topCashier.orders} orders)`
                      : 'Top: No cashier data'}
                  </p>
                </div>

                <div className="h-[260px]">
                  {topCashiers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <Users className="w-8 h-8 mb-2 opacity-20" />
                      <p className="text-xs font-medium italic">No cashier orders found for this period</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={topCashiers}
                        margin={{ top: 6, right: 16, left: 16, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                        <XAxis
                          type="number"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          allowDecimals={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#0f172a', fontSize: 12 }}
                          width={110}
                        />
                        <Tooltip
                          cursor={{ fill: '#f8fafc' }}
                          formatter={(value: number) => [`${value} orders`, 'Orders']}
                        />
                        <Bar dataKey="orders" fill="#8b5cf6" radius={[0, 10, 10, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Subscription Usage - Full Width */}
            <motion.div className="bg-slate-900 text-white rounded-xl p-8 shadow-2xl border border-slate-800 w-full mb-6" variants={itemVariants}>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="font-bold text-xl text-white">
                    Plan: {subscriptionPlan?.planType || 'Unknown'}
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Status: {subscriptionUsage ? 'Usage Monitoring Active' : 'Usage Data Unavailable'}
                  </p>
                </div>
                <div className="px-4 py-2 bg-slate-800 rounded-xl border border-slate-700">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Active Subscription</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {usageStats.map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm font-semibold mb-2 text-slate-300">
                      <span>{item.label}</span>
                      <span>
                        {item.current} <span className="text-slate-500">/ {item.limit}</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${item.percent}%`,
                          backgroundColor: item.isLimitReached ? '#ef4444' : item.color,
                        }}
                      ></div>
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] text-slate-400">
                      <span>{item.percent.toFixed(1)}% used</span>
                      <span className={item.isLimitReached ? 'text-red-400' : ''}>
                        {item.isLimitReached ? 'Limit reached' : `${Math.max(item.limit - item.current, 0)} left`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* System Audit Log */}
            <motion.div className="bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-800 text-white" variants={itemVariants}>
              <div className="flex flex-col bg-slate-900">
                <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="font-bold text-lg text-white text-left">System Audit Log</h3>
                  <button
                    onClick={() => setIsExportModalOpen(true)}
                    disabled={isGeneratingReport}
                    className="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs hover:bg-slate-700 transition-colors"
                  >
                    {isGeneratingReport ? 'Exporting...' : 'Export CSV'}
                  </button>
                </div>
                <div className="overflow-x-auto p-4 text-left">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="text-slate-400 uppercase text-[10px] tracking-widest">
                      <tr>
                        <th className="px-4 py-3 border-b border-white/5">BranchName/Id</th>
                        <th className="px-4 py-3 border-b border-white/5">Communication</th>
                        <th className="px-4 py-3 border-b border-white/5">Operational Status</th>
                        <th className="px-4 py-3 border-b border-white/5">BranchLocation</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {auditRowsToDisplay.map((row) => (
                        <AuditBranchRowDark key={row.id} row={row} />
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-8 pb-6 flex items-center justify-between text-xs text-slate-400">
                  <span>Showing 4 branches per page (Head branch fixed)</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setBranchPage((p) => Math.max(1, p - 1))}
                      disabled={branchPage <= 1}
                      className="p-1 text-slate-300 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Previous page"
                      title="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span>{branchPage} / {rotatingTotalPages}</span>
                    <button
                      onClick={() => setBranchPage((p) => Math.min(rotatingTotalPages, p + 1))}
                      disabled={branchPage >= rotatingTotalPages}
                      className="p-1 text-slate-300 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Next page"
                      title="Next page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </main>
        {isExportModalOpen && (
          <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-white rounded-xl p-6 shadow-2xl">
              <h4 className="text-lg font-bold text-slate-900 mb-1">Export CSV</h4>
              <p className="text-sm text-slate-500 mb-5">Choose a dataset to download.</p>
              <div className="space-y-3">
                <button onClick={() => handleExportSelection('branch')} className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50">CSV for Branch</button>
                <button onClick={() => handleExportSelection('user')} className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50">CSV for User (Manager + Cashier)</button>
                <button onClick={() => handleExportSelection('product')} className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50">CSV for Product</button>
                <button onClick={() => handleExportSelection('revenue')} className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50">CSV for Revenue</button>
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={() => setIsExportModalOpen(false)} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Sub-Components ---

const StatCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  growth?: number;
  growthLabel?: string;
  onClick?: () => void;
}> = ({ title, value, icon, growth, growthLabel = 'MoM', onClick }) => {
  const isPositive = growth !== undefined && growth > 0;
  const isNegative = growth !== undefined && growth < 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-shadow ${onClick ? 'cursor-pointer hover:border-emerald-200 hover:shadow-md' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {title}
        </span>
        <div className={`p-2 rounded-lg bg-slate-50 transition-colors`}>
          {icon}
        </div>
      </div>
      <div className="flex flex-col">
        <div className={`text-2xl font-black ${title.includes('Revenue') ? 'text-emerald-600' : 'text-slate-900'} tracking-tight`}>
          {value}
        </div>
        {growth !== undefined && growth !== 0 && (
          <div className="flex items-center gap-1 mt-1">
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${isPositive ? 'bg-emerald-50 text-emerald-600' : isNegative ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'}`}>
              {isPositive ? '+' : ''}{growth}%
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {growthLabel}
            </span>
          </div>
        )}
      </div>
    </button>
  );
};

const AuditBranchRowDark: React.FC<{ row: AuditBranchRow }> = ({ row }) => {
  const statusColor =
    row.status === 'ACTIVE'
      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
      : 'bg-orange-500/10 text-orange-300 border-orange-500/20';
  return (
    <tr className="hover:bg-slate-800/50 transition-colors">
      <td className="px-4 py-4 font-medium text-xs text-left">{row.name} / {row.id}</td>
      <td className="px-4 py-4 text-slate-400 text-xs text-left">{row.communication}</td>
      <td className="px-4 py-4 text-left">
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-medium border ${statusColor}`}>
          {row.status}
        </span>
      </td>
      <td className="px-4 py-4 font-medium text-white text-xs">{row.location}</td>
    </tr>
  );
};

export default AdminDashboardPage;

