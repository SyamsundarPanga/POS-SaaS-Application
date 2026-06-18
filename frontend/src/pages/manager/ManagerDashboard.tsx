import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import toast from '../../utils/toast';
import {
    DollarSign,
    IndianRupee,
    ShoppingCart,
    TrendingUp,
    Package,
    AlertTriangle,
    Users,
    Clock,
    CheckCircle,
    Calendar,
    Filter,
    Download,
    Upload,
    FileText,
    ArrowRight
} from 'lucide-react';
import { getManagerDashboard } from '../../services/dashboardService';
import managerReportService from '../../services/managerReportService';
import { fetchMyProfile } from '../../store/slices/authSlice';
import { fetchLowStockAlerts } from '../../store/slices/inventorySlice';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    RadialBarChart,
    RadialBar,
} from 'recharts';

// --- Type Overrides for Recharts TS Compatibility Errors ---
const SafePolarAngleAxis = PolarAngleAxis as any;
const SafePolarRadiusAxis = PolarRadiusAxis as any;
const SafePolarGrid = PolarGrid as any;
const SafeRadar = Radar as any;

interface DashboardStats {
    revenue: number;
    transactions: number;
    orders: number;
    averageOrderValue: number;
    salesTrend: Array<{ date: string; revenue: number; transactions: number }>;
    paymentDistribution: Array<{ method: string; amount: number; percentage: number }>;
    topProducts: Array<{
        id: number;
        name: string;
        sku: string;
        quantitySold: number;
        revenue: number;
    }>;
    topCashiers: Array<{
        id: number;
        name: string;
        ordersProcessed: number;
        totalRevenue: number;
        avgOrderValue: number;
    }>;






    lowStockProducts: Array<{
        id: number;
        name: string;
        sku: string;
        currentStock: number;
        threshold: number;
    }>;
    activeCashiers: Array<{
        id: number;
        name: string;
        shiftStart: string;
        transactionsToday: number;
        salesToday: number;
        status: string;
    }>;
}

interface ManagerDashboardApiResponse {
    todaySummary: {
        todayRevenue: number;
        todayTransactions: number;
        orders?: number;
        averageOrderValue: number;
    };
    salesTrend: Array<{ date: string; revenue: number; transactions: number }>;
    paymentDistribution: Array<{ method: string; amount: number; percentage: number }>;
    topProducts: Array<{
        id: number | null;
        name: string;
        sku: string;
        quantitySold: number;
        revenue: number;
    }>;
    topCashiers?: Array<{
        userId: number;
        employeeName: string;
        branchId: number;
        ordersProcessed: number;
        totalRevenue: number;
        avgOrderValue: number;
    }>;
    lowStockAlerts: Array<{
        id: number;
        name: string;
        sku: string;
        currentStock: number;
        threshold: number;
    }>;
    activeCashiers: Array<{
        id: number;
        name: string;
        shiftStart: string;
        transactionsToday: number;
        salesToday: number;
        status: string;
    }>;
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring' as const,
            stiffness: 100,
            damping: 15
        }
    }
};

const ManagerDashboard: React.FC = () => {
    const dispatch = useAppDispatch();
    const { lowStockAlerts, lowStockLoading } = useAppSelector((state) => state.inventory);
    const { user } = useAppSelector((state) => state.auth);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('week');
    const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
    const [reportBusy, setReportBusy] = useState(false);

    useEffect(() => {
        if (user && !user.branchId) {
            dispatch(fetchMyProfile());
        }
    }, [dispatch, user]);

    useEffect(() => {
        fetchDashboardData();
    }, [dateRange, user?.branchId]);

    useEffect(() => {
        if (user?.branchId) {
            dispatch(fetchLowStockAlerts({ branchId: user.branchId }));
        } else {
            dispatch(fetchLowStockAlerts());
        }
    }, [dispatch, user?.branchId]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const daysMap: Record<string, number> = {
                today: 1,
                week: 7,
                month: 30,
                year: 365,
            };

            const days = daysMap[dateRange] || 1;
            console.log(`Fetching dashboard data for ${dateRange} (${days} days)`);
            const response = await getManagerDashboard(days);
            console.log('Dashboard response:', response);

            if (!response) {
                throw new Error('No response from server');
            }

            const dashboardData = response as ManagerDashboardApiResponse;

            const todaySummary = dashboardData?.todaySummary;

            const revenue = todaySummary?.todayRevenue;
            const transactions = todaySummary?.todayTransactions;
            const orders = todaySummary?.orders;
            const avgOrderValue = todaySummary?.averageOrderValue;

            const mappedStats: DashboardStats = {
                revenue: revenue ? Number(revenue) : 0,
                transactions: transactions ? Number(transactions) : 0,
                orders: typeof orders === 'number' ? Number(orders) : Number(transactions || 0),
                averageOrderValue: avgOrderValue ? Number(avgOrderValue) : 0,
                salesTrend: (dashboardData?.salesTrend || []).map((item) => ({
                    date: item.date,
                    revenue: Number(item.revenue || 0),
                    transactions: Number(item.transactions || 0),
                })),
                paymentDistribution: (dashboardData?.paymentDistribution || []).map((item) => ({
                    method: item.method,
                    amount: Number(item.amount || 0),
                    percentage: Number(item.percentage || 0),
                })),
                topProducts: (dashboardData?.topProducts || []).map((item, index) => ({
                    id: item.id ?? index + 1,
                    name: item.name,
                    sku: item.sku,
                    quantitySold: Number(item.quantitySold || 0),
                    revenue: Number(item.revenue || 0),
                })),
                topCashiers: (dashboardData?.topCashiers || []).map((item, index) => ({
                    id: Number(item.userId ?? index + 1),
                    name: item.employeeName || 'Unknown',
                    ordersProcessed: Number(item.ordersProcessed || 0),
                    totalRevenue: Number(item.totalRevenue || 0),
                    avgOrderValue: Number(item.avgOrderValue || 0),
                })),

                lowStockProducts: (dashboardData?.lowStockAlerts || []).map((item) => ({
                    id: item.id,
                    name: item.name,
                    sku: item.sku,
                    currentStock: Number(item.currentStock || 0),
                    threshold: Number(item.threshold || 0),
                })),
                activeCashiers: (dashboardData?.activeCashiers || []).map((item) => ({
                    id: item.id,
                    name: item.name,
                    shiftStart: item.shiftStart,
                    transactionsToday: Number(item.transactionsToday || 0),
                    salesToday: Number(item.salesToday || 0),
                    status: (item.status || 'OPEN').toUpperCase(),
                })),
            };

            setStats(mappedStats);
        } catch (error: any) {
            toast.error('Failed to load dashboard data: ' + (error.message || 'Unknown error'));
            setStats({
                revenue: 0,
                transactions: 0,
                orders: 0,
                averageOrderValue: 0,

                salesTrend: [],
                paymentDistribution: [],
                topProducts: [],
                topCashiers: [],

                lowStockProducts: [],
                activeCashiers: [],
            });
        } finally {
            setLoading(false);
        }
    };



    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

    const getRangeLabel = () => {
        switch (dateRange) {
            case 'today': return 'Today';
            case 'week': return 'This Week';
            case 'month': return 'This Month';
            case 'year': return 'This Year';
            default: return 'Today';
        }
    };

    const getDateRangeParams = () => {
        const today = new Date();
        const endDate = today.toISOString().split('T')[0];
        const start = new Date(today);
        if (dateRange === 'week') start.setDate(today.getDate() - 7);
        if (dateRange === 'month') start.setMonth(today.getMonth() - 1);
        if (dateRange === 'year') start.setFullYear(today.getFullYear() - 1);
        return {
            startDate: dateRange === 'today' ? endDate : start.toISOString().split('T')[0],
            endDate,
        };
    };

    const handleDashboardExport = async (format: 'csv' | 'pdf') => {
        const { startDate, endDate } = getDateRangeParams();
        try {
            setReportBusy(true);
            if (format === 'pdf') {
                await managerReportService.exportDashboardPdf(startDate, endDate);
            } else {
                await managerReportService.exportDashboardCsv(startDate, endDate);
            }
            const [sales, audit] = await Promise.all([
                managerReportService.getSalesReport(startDate, endDate),
                managerReportService.getPaymentAuditLog({ startDate, endDate }),
            ]);
            toast.success(`Branch report exported: ${sales.transactionCount} txns, ${audit.length} audit entries`);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || `Failed to export ${format.toUpperCase()} report`);
        } finally {
            setReportBusy(false);
        }
    };

    const topCashiers = stats?.topCashiers || [];
    const topPerformer = topCashiers[0];

    return (
        <div className="flex h-screen bg-white overflow-hidden font-sans">
            <Sidebar />

            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                <Header />

                <main className="flex-1 overflow-y-auto bg-white">
                    <motion.div
                        className="max-w-7xl mx-auto px-6 py-6 lg:px-10"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {/* Page Header */}
                        <motion.header className="mb-6" variants={itemVariants}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1 block">
                                        Branch Manager Portal
                                    </span>
                                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                        Dashboard Analytics
                                    </h1>
                                    <p className="text-slate-500 font-medium">
                                        Location-level oversight and operations management
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleDashboardExport('csv')}
                                        disabled={reportBusy}
                                        className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-60"
                                        title="Export Branch Sales CSV"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDashboardExport('pdf')}
                                        disabled={reportBusy}
                                        className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-60"
                                        title="Export Branch Sales PDF"
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

                        {loading ? (
                            <motion.div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6" variants={itemVariants}>
                                <LoadingSkeleton count={8} />
                            </motion.div>
                        ) : stats ? (
                            <>
                                {/* Summary Cards */}
                                <motion.div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6" variants={itemVariants}>
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                Revenue
                                            </span>
                                            <IndianRupee className="w-5 h-5 text-emerald-600" />
                                        </div>
                                        <div className="text-3xl font-black text-emerald-600">
                                            ₹{(stats.revenue || 0).toFixed(2)}
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                Transactions
                                            </span>
                                            <ShoppingCart className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div className="text-3xl font-black text-slate-900">
                                            {stats.transactions || 0}
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                Orders
                                            </span>
                                            <Package className="w-5 h-5 text-orange-600" />
                                        </div>
                                        <div className="text-3xl font-black text-slate-900">
                                            {stats.orders || 0}
                                        </div>
                                    </div>

                                    <Link
                                        to="/manager/orders"
                                        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-all group overflow-hidden relative"
                                    >
                                        <div className="flex items-center justify-between mb-3 relative z-10">
                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                Average Order
                                            </span>
                                            <div className="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                                                <TrendingUp className="w-5 h-5 text-purple-600" />
                                            </div>
                                        </div>
                                        <div className="relative z-10">
                                            <div className="text-3xl font-black text-slate-900 mb-0.5">
                                                ₹{(stats.averageOrderValue || 0).toFixed(2)}
                                            </div>
                                        </div>

                                        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-purple-50 rounded-full opacity-20 blur-2xl group-hover:scale-150 transition-transform duration-500" />
                                    </Link>
                                </motion.div>

                                {/* Manager Dashboard Charts - 3 Rows, 2 Columns */}
                                <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6" variants={itemVariants}>
                                    {/* 1. Sales Velocity (Waterfall Chart) */}
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-widest text-left">
                                                <TrendingUp size={18} className="text-emerald-600" /> Sales Velocity
                                            </h3>
                                            <span className="text-[10px] bg-slate-50 text-slate-400 px-2 py-1 rounded font-bold uppercase">{getRangeLabel()}</span>
                                        </div>
                                        <div className="h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    data={stats.salesTrend.map((d, i, arr) => {
                                                        const prevSum = arr.slice(0, i).reduce((sum, item) => sum + item.revenue, 0);
                                                        return { ...d, base: prevSum, displaySales: d.revenue };
                                                    })}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                                    <Tooltip
                                                        cursor={{ fill: '#f8fafc' }}
                                                        content={({ active, payload }) => {
                                                            if (active && payload && payload.length) {
                                                                const data = payload[0].payload;
                                                                return (
                                                                    <div className="bg-white p-3 rounded-xl shadow-xl border border-slate-100">
                                                                        <p className="text-xs font-bold text-slate-500 mb-1">{data.date}</p>
                                                                        <p className="text-sm font-black text-emerald-600">₹{(data.revenue || 0).toLocaleString()}</p>
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

                                    {/* 2. Revenue Trend Chart (Area) */}
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                                        <h2 className="text-lg font-bold text-slate-900 mb-4">
                                            Revenue Trend
                                        </h2>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <AreaChart data={stats.salesTrend}>
                                                <defs>
                                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    stroke="#64748b"
                                                    tick={{ fontSize: 12 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <YAxis
                                                    stroke="#64748b"
                                                    tick={{ fontSize: 12 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tickFormatter={(value) => `₹${value}`}
                                                />
                                                <Tooltip
                                                    formatter={(value: any) => [`₹${Number(value || 0).toLocaleString()}`, "Revenue"]}
                                                    contentStyle={{
                                                        backgroundColor: '#fff',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '12px',
                                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                                    }}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="revenue"
                                                    stroke="#10b981"
                                                    strokeWidth={3}
                                                    fillOpacity={1}
                                                    fill="url(#colorRevenue)"
                                                    name="Revenue"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* 3. Transaction Trend Chart (Line) */}
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                                        <h2 className="text-lg font-bold text-slate-900 mb-4">
                                            Transaction Trend
                                        </h2>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <LineChart data={stats.salesTrend}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    stroke="#64748b"
                                                    tick={{ fontSize: 12 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <YAxis
                                                    stroke="#64748b"
                                                    tick={{ fontSize: 12 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#fff',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '12px',
                                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                                    }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="transactions"
                                                    stroke="#8b5cf6"
                                                    strokeWidth={3}
                                                    dot={{ r: 4, fill: '#8b5cf6', stroke: '#fff' }}
                                                    name="Transactions"
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* 4. Order Volume Chart (Bar) */}
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                                        <h2 className="text-lg font-bold text-slate-900 mb-4">
                                            Order Volume
                                        </h2>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={stats.salesTrend}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    stroke="#64748b"
                                                    tick={{ fontSize: 12 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <YAxis
                                                    stroke="#64748b"
                                                    tick={{ fontSize: 12 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#fff',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '12px',
                                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                                    }}
                                                />
                                                <Bar
                                                    name="Orders"
                                                    dataKey="transactions"
                                                    fill="#3b82f6"
                                                    radius={[6, 6, 0, 0]}
                                                    barSize={40}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* 5. Payment Distribution (Pie) */}
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                                        <h2 className="text-lg font-bold text-slate-900 mb-4">
                                            Payment Method Distribution
                                        </h2>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={stats.paymentDistribution}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={(entry: any) => `${entry.method} ${entry.percentage}%`}
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    dataKey="amount"
                                                >
                                                    {stats.paymentDistribution.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, "Amount"]}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* 6. Top Products Performance (Horizontal Bar) */}
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                                        <h2 className="text-lg font-bold text-slate-900 mb-4">
                                            Top Products Performance
                                        </h2>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart layout="vertical" data={stats.topProducts} margin={{ left: 20, right: 30 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                                <YAxis
                                                    dataKey="name"
                                                    type="category"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                                                    width={100}
                                                />
                                                <Tooltip
                                                    cursor={{ fill: '#f8fafc' }}
                                                    contentStyle={{
                                                        borderRadius: '12px',
                                                        border: 'none',
                                                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                                                    }}
                                                />
                                                <Bar
                                                    name="Revenue (₹)"
                                                    dataKey="revenue"
                                                    fill="#10b981"
                                                    radius={[0, 10, 10, 0]}
                                                    barSize={20}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </motion.div>

                                {/* Grid container for Low Stock Alerts & Employee Performance */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                    {/* Low Stock Alerts */}
                                    {(() => {
                                        const fallback = stats?.lowStockProducts || [];
                                        const displayAlerts = lowStockAlerts.length > 0
                                            ? lowStockAlerts.map((item) => ({
                                                id: item.productId,
                                                name: item.productName,
                                                sku: item.sku,
                                                currentStock: item.currentStock,
                                                threshold: item.threshold,
                                            }))
                                            : fallback;

                                        if (displayAlerts.length === 0 && !lowStockLoading) return (
                                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-center items-center text-slate-500 h-[430px]">
                                                <AlertTriangle className="w-10 h-10 text-slate-300 mb-2" />
                                                <span className="font-medium">No Low Stock Alerts</span>
                                            </div>
                                        );

                                        return (
                                            <motion.div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6 flex flex-col h-full" variants={itemVariants}>
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <AlertTriangle className="w-6 h-6 text-red-600" />
                                                        <h2 className="text-lg font-bold text-slate-900">
                                                            Low Stock Alerts ({displayAlerts.length})
                                                        </h2>
                                                    </div>
                                                    <Link
                                                        to="/manager/inventory"
                                                        className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                                                    >
                                                        View All
                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                    </Link>
                                                </div>
                                                {lowStockLoading ? (
                                                    <div className="text-slate-500 py-6 text-center font-medium flex-1 flex items-center justify-center">
                                                        Loading low stock alerts...
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-4 overflow-y-auto max-h-[350px] pr-2 scrollbar-hide w-full">
                                                        {displayAlerts.slice(0, 4).map((product) => (
                                                            <div
                                                                key={product.id}
                                                                className="p-4 bg-red-50 border border-red-200 rounded-xl shrink-0"
                                                            >
                                                                <div className="flex items-start justify-between mb-2">
                                                                    <div>
                                                                        <div className="text-sm font-bold text-slate-900">
                                                                            {product.name}
                                                                        </div>
                                                                        <div className="text-xs text-slate-500">
                                                                            {product.sku}
                                                                        </div>
                                                                    </div>
                                                                    <Package className="w-5 h-5 text-red-600" />
                                                                </div>
                                                                <div className="flex items-center justify-between mt-3">
                                                                    <span className="text-xs font-medium text-slate-600">
                                                                        Current Stock:
                                                                    </span>
                                                                    <span className="text-sm font-black text-red-600">
                                                                        {product.currentStock} / {product.threshold}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })()}

                                    {/* 7. Employee Performance (Horizontal Bar) */}
                                    <motion.div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-full" variants={itemVariants}>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <Users className="w-6 h-6 text-blue-600" />
                                                <h2 className="text-lg font-bold text-slate-900">
                                                    Top Cashier Performance
                                                </h2>
                                            </div>
                                            <Link
                                                to="/manager/employees"
                                                className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                                            >
                                                View Employees
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </Link>
                                        </div>

                                        <div className="flex-1 min-h-[300px]">
                                            {false && (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    {(() => {
                                                        // Use all branch employees for the gauge instead of only active cashiers
                                                        const rawData: any[] = [];

                                                        // Calculate percentage based on top performing employee
                                                        const topSales = rawData.length > 0 ? Math.max(...rawData.map((d: any) => d.salesToday)) : 0;
                                                        const targetSales = 30000; // Mock target for gauge percentage
                                                        const percentage = topSales > 0 ? Math.min(Math.round((topSales / targetSales) * 100), 100) : 0;

                                                        // Gauge segments mapping to Very Bad (0-20), Bad (20-40), Normal (40-60), Good (60-80), Exceptional (80-100)
                                                        const data = [
                                                            { name: 'Very Bad', value: 20, color: '#9bc4f5' },
                                                            { name: 'Bad', value: 20, color: '#7ba7ff' },
                                                            { name: 'Normal', value: 20, color: '#5b85f5' },
                                                            { name: 'Good', value: 20, color: '#6859ff' },
                                                            { name: 'Exceptional', value: 20, color: '#38309a' },
                                                        ];

                                                        const cx = 150;
                                                        const cy = 200;
                                                        const iR = 60;
                                                        const oR = 120;

                                                        return (
                                                            <div className="w-full h-full flex flex-col items-center relative">
                                                                <div className="absolute top-4 text-center z-10 w-full">
                                                                    <h3 className="text-xl font-bold text-[#f59e0b] -mb-1">Employee Performance</h3>
                                                                    <h4 className="text-lg font-bold text-slate-800">for the Year {new Date().getFullYear()}</h4>
                                                                </div>

                                                                {/* The gauge percentage display */}
                                                                <div className="absolute top-[80px] text-center w-full z-10">
                                                                    <span className="text-2xl font-bold text-[#f59e0b] drop-shadow-sm">{percentage}%</span>
                                                                </div>

                                                                <ResponsiveContainer width="100%" height={300}>
                                                                    <PieChart>
                                                                        <Pie
                                                                            dataKey="value"
                                                                            startAngle={180}
                                                                            endAngle={0}
                                                                            data={data}
                                                                            cx="50%"
                                                                            cy="75%"
                                                                            innerRadius={iR}
                                                                            outerRadius={oR}
                                                                            stroke="none"
                                                                            labelLine={false}
                                                                        >
                                                                            {data.map((entry, index) => (
                                                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                                                            ))}
                                                                        </Pie>

                                                                        {/* Custom Needle Implementation */}
                                                                        {(() => {
                                                                            const value = percentage;
                                                                            const total = 100;
                                                                            const RADIAN = Math.PI / 180;
                                                                            // Use constants that match the pie chart's center
                                                                            const cx = 200; // Half of approx container width (400px default responsive)
                                                                            const cy = 200; // Matches cy="75%" on a 300px height container roughly 

                                                                            // Compute angle (180 to 0)
                                                                            const angle = 180 - (value / total) * 180;
                                                                            const length = (iR + 2 * oR) / 3;
                                                                            const sin = Math.sin(-RADIAN * angle);
                                                                            const cos = Math.cos(-RADIAN * angle);

                                                                            // Calculate tip and base coordinates for the vector
                                                                            const r = 5;
                                                                            // Estimate center for standard ResponsiveContainer width of ~400px-500px in the card
                                                                            // Recharts will position cx="50%" cy="75%" dynamically, but for a custom SVG overlay in the pie
                                                                            // we need explicit coordinates. A better approach for Recharts needles is returning the needle path directly:
                                                                            return null; // Will render needle separately to avoid coordinate mismatch
                                                                        })()}
                                                                    </PieChart>
                                                                </ResponsiveContainer>

                                                                {/* CSS-based Needle (more reliable than Recharts custom SVG overlay coordinate guessing without render props) */}
                                                                <div className="absolute top-[205px] left-1/2 w-4 h-4 rounded-full bg-[#f59e0b] -translate-x-1/2 -translate-y-1/2 z-20 shadow-md"></div>
                                                                <div
                                                                    className="absolute top-[205px] left-1/2 w-1 h-[100px] bg-[#f59e0b] origin-bottom -translate-x-1/2 -translate-y-full z-10 transition-transform duration-1000 ease-out"
                                                                    style={{ transform: `translateX(-50%) translateY(-100%) rotate(${-90 + (percentage / 100) * 180}deg)` }}
                                                                >
                                                                    {/* Needle tip pointer component */}
                                                                    <div className="absolute -top-2 -left-[6px] w-0 h-0 border-l-[8px] border-r-[8px] border-b-[12px] border-l-transparent border-r-transparent border-b-[#f59e0b]"></div>
                                                                </div>

                                                                {/* Legend */}
                                                                <div className="flex items-center justify-center gap-4 mt-[-40px] text-xs font-semibold text-slate-500 pb-2 w-full px-4 flex-wrap shrink-0">
                                                                    {data.map((entry, index) => (
                                                                        <div key={index} className="flex items-center gap-1.5 shrink-0">
                                                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                                                            <span>{entry.name}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* Individual Employee Data List */}
                                                                <div className="w-full flex-1 flex flex-col gap-2 mt-2 pb-2 overflow-y-auto pr-2 scrollbar-hide">
                                                                    {rawData.length === 0 ? (
                                                                        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                                                            <Users className="w-8 h-8 mb-2 opacity-20" />
                                                                            <p className="text-xs font-medium italic">No cashiers found for this branch</p>
                                                                        </div>
                                                                    ) : (
                                                                        rawData.map((emp: any, idx: number) => {
                                                                            const target = 30000;
                                                                            const empPercentage = (emp.salesToday || 0) > 0 ? Math.min(Math.round(((emp.salesToday || 0) / target) * 100), 100) : 0;
                                                                            return (
                                                                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors shrink-0">
                                                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                                                                            {(emp.name || 'U').split(' ').map((n: string) => n[0]).join('')}
                                                                                        </div>
                                                                                        <div className="min-w-0">
                                                                                            <p className="text-sm font-bold text-slate-800 truncate">{emp.name || 'Unknown'}</p>
                                                                                            <p className="text-xs text-slate-500 font-medium truncate">Sales: ₹{(emp.salesToday || 0).toFixed(2)}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                                                        <span className="text-xs font-bold text-slate-700">{empPercentage}%</span>
                                                                                        <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                                                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${empPercentage}%` }}></div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()
                                                    }
                                                </ResponsiveContainer>
                                            )}

                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                    {getRangeLabel()} • Top 5 cashiers
                                                </span>
                                                {topPerformer ? (
                                                    <span className="text-xs font-bold text-blue-600 truncate max-w-[60%] text-right">
                                                        Top: {topPerformer.name} ({topPerformer.ordersProcessed} orders)
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-bold text-slate-400">
                                                        No orders yet
                                                    </span>
                                                )}
                                            </div>

                                            {topCashiers.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center h-[260px] text-slate-400">
                                                    <Users className="w-8 h-8 mb-2 opacity-20" />
                                                    <p className="text-xs font-medium italic">No cashier orders found for this period</p>
                                                </div>
                                            ) : (
                                                <ResponsiveContainer width="100%" height={260}>
                                                    <BarChart
                                                        layout="vertical"
                                                        data={topCashiers.map((c) => ({ name: c.name, orders: c.ordersProcessed }))}
                                                        margin={{ left: 20, right: 30 }}
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                                        <YAxis
                                                            dataKey="name"
                                                            type="category"
                                                            axisLine={false}
                                                            tickLine={false}
                                                            tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                                                            width={110}
                                                        />
                                                        <Tooltip
                                                            cursor={{ fill: '#f8fafc' }}
                                                            formatter={(value: any) => [`${Number(value).toLocaleString()}`, 'Orders']}
                                                            contentStyle={{
                                                                borderRadius: '12px',
                                                                border: 'none',
                                                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                                                            }}
                                                        />
                                                        <Bar
                                                            name="Orders"
                                                            dataKey="orders"
                                                            fill="#3b82f6"
                                                            radius={[0, 10, 10, 0]}
                                                            barSize={20}
                                                        />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            )}
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Active Cashiers */}
                                <motion.div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" variants={itemVariants}>
                                    <div className="px-6 py-4 border-b border-slate-200 bg-white">
                                        <div className="flex items-center gap-3">
                                            <Users className="w-5 h-5 text-emerald-600" />
                                            <h2 className="text-lg font-bold text-slate-900">
                                                Cashier Shift Overview ({stats?.activeCashiers?.length || 0})
                                            </h2>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto scrollbar-hide">
                                        <table className="w-full">
                                            <thead className="bg-white">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                                                        Cashier
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                                                        Shift Start
                                                    </th>
                                                    <th className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                                                        Transactions
                                                    </th>
                                                    <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                                                        Sales Today
                                                    </th>
                                                    <th className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                                                        Status
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200">
                                                {stats.activeCashiers.map((cashier) => (
                                                    <tr key={cashier.id} className="hover:bg-white transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                                                                    <span className="text-sm font-bold text-emerald-600">
                                                                        {cashier.name.split(' ').map(n => n[0]).join('')}
                                                                    </span>
                                                                </div>
                                                                <span className="font-bold text-slate-900">
                                                                    {cashier.name}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2 text-sm text-slate-700">
                                                                <Clock className="w-4 h-4 text-slate-400" />
                                                                {new Date(cashier.shiftStart).toLocaleTimeString()}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="text-sm font-bold text-slate-900">
                                                                {cashier.transactionsToday}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className="text-sm font-bold text-emerald-600">
                                                                ₹{cashier.salesToday.toFixed(2)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cashier.status === 'OPEN'
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                : 'bg-rose-50 text-rose-700 border-rose-200'
                                                                }`}>
                                                                <CheckCircle className="w-3 h-3" />
                                                                {cashier.status === 'OPEN' ? 'OPEN' : 'CLOSED'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </motion.div>
                            </>
                        ) : null}
                    </motion.div>
                </main>
            </div>
        </div>
    );
};

export default ManagerDashboard;
