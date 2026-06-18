import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAppSelector } from '../../store/hooks';
import Sidebar from '../../components/layout/Sidebar';
import DashboardHeader from '../../components/layout/Header';
import OrderDetailModal from '../../features/orders/OrderDetailModal';
import DateRangePicker from '../../components/ui/DateRangePicker';
import {
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  IndianRupee,
  CheckCircle,
  RotateCcw,
  Download,
  FileText,
  ChevronDown,
  Calendar,
  Filter,
} from 'lucide-react';
import orderService from '../../services/orderService';
import { motion, AnimatePresence } from 'framer-motion';
import adminReportService from '../../services/adminReportService';
import toast from '../../utils/toast';
import branchService from '../../services/branchService';
import { Branch } from '../../types/branch';

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

const sortBranchesForDisplay = (branchList: Branch[]) =>
  [...branchList].sort((first, second) => {
    if (first.isMainBranch !== second.isMainBranch) {
      return first.isMainBranch ? -1 : 1;
    }

    return first.name.localeCompare(second.name);
  });

const getDefaultBranch = (branchList: Branch[]) =>
  branchList.find((branch) => branch.isMainBranch) ?? branchList[0] ?? null;

const getCompactBranchLabel = (branch: Branch | null) => {
  if (!branch) {
    return 'Select Branch';
  }

  const primaryName = branch.name.split(' - ')[0]?.trim() || branch.name.trim();
  return primaryName.replace(/\s+/g, '-');
};

const normalizeOrderDetails = (order: any) => ({
  ...order,
  items: order.items || order.lineItems || [],
  originalLineItems: order.originalLineItems || order.items || order.lineItems || [],
});

const formatDateForApi = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDateRange = (filter: string) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  if (filter === 'week') {
    const day = start.getDay();
    start.setDate(start.getDate() - day);
  } else if (filter === 'month') {
    start.setDate(1);
  } else if (filter === 'year') {
    start.setMonth(0, 1);
  }

  return {
    startDate: formatDateForApi(start),
    endDate: formatDateForApi(end),
  };
};

const getExportDateRange = (
  filter: string,
  range: { start: Date | null; end: Date | null }
) => {
  if (filter === 'custom') {
    return {
      startDate: range.start ? formatDateForApi(range.start) : undefined,
      endDate: range.end ? formatDateForApi(range.end) : undefined,
    };
  }

  return getDateRange(filter);
};

const OrderManagement: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const isStoreAdmin = user?.roles?.includes('ROLE_STORE_ADMIN') || user?.role === 'ROLE_STORE_ADMIN';
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('today');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [isFilterCardOpen, setIsFilterCardOpen] = useState(false);
  const branchDropdownRef = useRef<HTMLDivElement | null>(null);
  const selectedBranch = branches.find((branch) => branch.id === selectedBranchId) ?? null;

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 12;

  // Stats state
  const [stats, setStats] = useState({
    total: 0,
    revenue: 0,
    completed: 0,
    refunds: 0
  });

  const loadFullOrder = useCallback(async (orderId: number) => {
    const response = await orderService.getById(orderId);
    return normalizeOrderDetails(response.data);
  }, []);

  const fetchOrderData = useCallback(async () => {
    if (isStoreAdmin && branchesLoading) {
      return;
    }

    if (isStoreAdmin && !selectedBranchId) {
      setOrders([]);
      setTotalPages(0);
      setTotalElements(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await orderService.getAll(
        currentPage,
        pageSize,
        statusFilter !== 'ALL' ? statusFilter : undefined,
        isStoreAdmin ? selectedBranchId || undefined : undefined
      );
      const data = response.data;

      if (data.content) {
        setOrders([...data.content].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
      } else {
        setOrders((Array.isArray(data) ? data : []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setTotalPages(1);
        setTotalElements(Array.isArray(data) ? data.length : 0);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, isStoreAdmin, selectedBranchId, branchesLoading, statusFilter]);

  useEffect(() => {
    if (!isStoreAdmin) {
      setBranches([]);
      setSelectedBranchId(null);
      setBranchesLoading(false);
      return;
    }

    let isActive = true;

    const loadBranches = async () => {
      setBranchesLoading(true);

      try {
        const branchList = sortBranchesForDisplay(await branchService.getAllBranchesList());

        if (!isActive) {
          return;
        }

        setBranches(branchList);
        setSelectedBranchId((currentBranchId) => {
          if (currentBranchId && branchList.some((branch) => branch.id === currentBranchId)) {
            return currentBranchId;
          }

          return getDefaultBranch(branchList)?.id ?? null;
        });
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        console.error('Failed to load branches for orders page:', loadError);
        setBranches([]);
        setSelectedBranchId(null);
        toast.error('Failed to load branches');
      } finally {
        if (isActive) {
          setBranchesLoading(false);
        }
      }
    };

    void loadBranches();

    return () => {
      isActive = false;
    };
  }, [isStoreAdmin]);

  useEffect(() => {
    fetchOrderData();
  }, [fetchOrderData]);

  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, selectedBranchId, statusFilter, dateFilter, dateRange]);

  useEffect(() => {
    if (!isBranchDropdownOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!branchDropdownRef.current?.contains(event.target as Node)) {
        setIsBranchDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isBranchDropdownOpen]);

  // Fetch stats separately if needed, or calculate from total
  useEffect(() => {
    const fetchStats = async () => {
      if (isStoreAdmin && branchesLoading) {
        return;
      }

      if (isStoreAdmin && !selectedBranchId) {
        setStats({
          total: 0,
          revenue: 0,
          completed: 0,
          refunds: 0,
        });
        return;
      }

      try {
        const response = await orderService.getAll(
          0,
          1000,
          statusFilter !== 'ALL' ? statusFilter : undefined,
          isStoreAdmin ? selectedBranchId || undefined : undefined
        );
        const allOrders = response.data.content || response.data;
        if (Array.isArray(allOrders)) {
          const searchedOrders = allOrders.filter((order) =>
            order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
          );
          const dateFilteredOrders = searchedOrders.filter((order) => {
            const createdAt = new Date(order.createdAt);
            const createdAtTime = createdAt.getTime();

            if (Number.isNaN(createdAtTime)) {
              return true;
            }

            if (dateFilter === 'custom') {
              const startTime = dateRange.start ? new Date(dateRange.start).setHours(0, 0, 0, 0) : null;
              const endTime = dateRange.end ? new Date(dateRange.end).setHours(23, 59, 59, 999) : null;

              if (startTime !== null && createdAtTime < startTime) return false;
              if (endTime !== null && createdAtTime > endTime) return false;
              return true;
            }

            const { startDate, endDate } = getDateRange(dateFilter);
            const startTime = new Date(startDate).getTime();
            const endTime = new Date(endDate).setHours(23, 59, 59, 999);

            return createdAtTime >= startTime && createdAtTime <= endTime;
          });

          const revenue = dateFilteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
          const completed = dateFilteredOrders.filter(o => o.status === 'COMPLETED').length;
          const refunds = dateFilteredOrders.filter(o => ['REFUNDED', 'PARTIAL_REFUND'].includes(o.status)).length;
          setStats({
            total: dateFilteredOrders.length,
            revenue,
            completed,
            refunds
          });
        }
      } catch (err) {
        console.error('Failed to fetch global stats', err);
      }
    };
    void fetchStats();
  }, [isStoreAdmin, selectedBranchId, branchesLoading, statusFilter, searchTerm, dateFilter, dateRange]);

  const handleExportOrdersCsv = async () => {
    try {
      setReportBusy(true);
      const { startDate, endDate } = getExportDateRange(dateFilter, dateRange);
      await adminReportService.exportOrdersCsv(
        startDate,
        endDate,
        isStoreAdmin ? selectedBranchId || undefined : undefined
      );
      toast.success('Orders exported as CSV');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to export orders CSV');
    } finally {
      setReportBusy(false);
    }
  };

  const handleExportOrdersPdf = async () => {
    try {
      setReportBusy(true);
      const { startDate, endDate } = getExportDateRange(dateFilter, dateRange);
      await adminReportService.exportOrdersPdf(
        startDate,
        endDate,
        isStoreAdmin ? selectedBranchId || undefined : undefined
      );
      toast.success('Orders exported as PDF');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to export orders PDF');
    } finally {
      setReportBusy(false);
    }
  };

  const [reportBusy, setReportBusy] = useState(false);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) {
      return false;
    }

    const createdAt = new Date(order.createdAt);
    const createdAtTime = createdAt.getTime();

    if (Number.isNaN(createdAtTime)) {
      return true;
    }

    if (dateFilter === 'custom') {
      const startTime = dateRange.start ? new Date(dateRange.start).setHours(0, 0, 0, 0) : null;
      const endTime = dateRange.end ? new Date(dateRange.end).setHours(23, 59, 59, 999) : null;

      if (startTime !== null && createdAtTime < startTime) return false;
      if (endTime !== null && createdAtTime > endTime) return false;
      return true;
    }

    const { startDate, endDate } = getDateRange(dateFilter);
    const startTime = new Date(startDate).getTime();
    const endTime = new Date(endDate).setHours(23, 59, 59, 999);

    return createdAtTime >= startTime && createdAtTime <= endTime;
  });

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader />

        <main className="flex-1 overflow-y-auto bg-white">
          <motion.div
            className="max-w-7xl mx-auto px-6 py-2 lg:px-10"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Header Area */}
            <motion.div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8" variants={itemVariants}>
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 block mb-1">
                  Order Management
                </span>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Sales Overview</h1>
                <p className="text-slate-500 font-medium">Monitor sales transactions across all branches</p>
              </div>

              <div className="flex flex-1 flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[300px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by order number or customer..."
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-emerald-500 shadow-sm outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <button
                  onClick={() => setIsFilterCardOpen(!isFilterCardOpen)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm border ${
                    isFilterCardOpen
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-200'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-500'
                  }`}
                >
                  <Filter className={`w-4 h-4 ${isFilterCardOpen ? 'text-white' : 'text-slate-400'}`} />
                  Filters
                </button>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={handleExportOrdersCsv}
                    disabled={reportBusy}
                    className="p-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-60"
                    title="Export Orders CSV"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleExportOrdersPdf}
                    disabled={reportBusy}
                    className="p-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-60"
                    title="Export Orders PDF"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>

            <AnimatePresence>
              {isFilterCardOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                  animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
                  exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                      {isStoreAdmin && (
                        <div ref={branchDropdownRef} className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Branch</label>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                if (!branchesLoading && branches.length > 0) {
                                  setIsBranchDropdownOpen((prev) => !prev);
                                }
                              }}
                              disabled={branchesLoading || branches.length === 0}
                              className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-emerald-500 disabled:cursor-not-allowed"
                            >
                              <span className="truncate">
                                {branchesLoading
                                  ? 'Loading...'
                                  : branches.length === 0
                                    ? 'No Branch'
                                    : getCompactBranchLabel(selectedBranch)}
                              </span>
                              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isBranchDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isBranchDropdownOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mt-2 overflow-hidden rounded-xl border border-slate-100 bg-slate-50"
                              >
                                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                  {branches.map((branch) => (
                                    <button
                                      key={branch.id}
                                      type="button"
                                      onClick={() => {
                                        setCurrentPage(0);
                                        setSelectedBranchId(branch.id);
                                        setIsBranchDropdownOpen(false);
                                      }}
                                      className={`flex w-full items-center justify-between px-4 py-3 text-sm font-bold ${
                                        branch.id === selectedBranchId ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-white'
                                      }`}
                                    >
                                      {getCompactBranchLabel(branch)}
                                      {branch.isMainBranch && <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-black">HEAD</span>}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Status</label>
                        <div className="relative">
                          <button
                            onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
                            className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 text-sm hover:border-emerald-500 transition-all shadow-sm"
                          >
                            <span className="truncate">{statusFilter === 'ALL' ? 'All Status' : statusFilter}</span>
                            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isStatusFilterOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {isStatusFilterOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-2 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden py-1"
                            >
                              {['ALL', 'COMPLETED', 'PENDING', 'PARTIAL_REFUND', 'REFUNDED', 'CANCELLED'].map((status) => (
                                <button
                                  key={status}
                                  onClick={() => {
                                    setStatusFilter(status);
                                    setIsStatusFilterOpen(false);
                                  }}
                                  className={`w-full text-left px-4 py-2.5 text-sm font-bold ${statusFilter === status ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-white'}`}
                                >
                                  {status === 'ALL' ? 'All Status' : status}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Date Range</label>
                        <div className="relative">
                          <button
                            onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
                            className="w-full flex items-center justify-between px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 text-sm hover:border-emerald-500 transition-all shadow-sm"
                          >
                            <span className="truncate capitalize">{dateFilter}</span>
                            <Calendar className="w-4 h-4 text-slate-400" />
                          </button>
                          {isDateFilterOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-2 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden py-1"
                            >
                              {['today', 'week', 'month', 'year', 'custom'].map((filter) => (
                                <button
                                  key={filter}
                                  onClick={() => {
                                    setDateFilter(filter);
                                    setIsDateFilterOpen(false);
                                  }}
                                  className={`w-full text-left px-4 py-2.5 text-sm font-bold capitalize ${dateFilter === filter ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-white'}`}
                                >
                                  {filter}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 flex flex-col items-start h-full">
                        <label className="text-[10px] h-[15px] block"></label>
                        <div className="flex gap-2 w-full h-[42px]">
                          <button
                            onClick={() => {
                              setStatusFilter('ALL');
                              setDateFilter('today');
                              setDateRange({ start: null, end: null });
                              setSearchTerm('');
                              setIsFilterCardOpen(false);
                            }}
                            className="flex-1 h-full bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                          >
                            <RotateCcw size={14} />
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>

                    {dateFilter === 'custom' && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 pt-6 border-t border-slate-200">
                        <DateRangePicker
                          startDate={dateRange.start}
                          endDate={dateRange.end}
                          onChange={(range) => setDateRange({ start: range.startDate, end: range.endDate })}
                        />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stats Gallery */}
            <motion.div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8" variants={itemVariants}>
              {[
                { label: 'TOTAL ORDERS', value: stats.total, icon: ShoppingBag, color: 'blue' },
                { label: 'TOTAL REVENUE', value: `₹${stats.revenue.toLocaleString()}`, icon: IndianRupee, color: 'emerald' },
                { label: 'COMPLETED', value: stats.completed, icon: CheckCircle, color: 'emerald' },
                { label: 'REFUNDS', value: stats.refunds, icon: RotateCcw, color: 'red' },
              ].map((stat, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</span>
                    <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                  </div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</div>
                </div>
              ))}
            </motion.div>

            {/* Error Feedback */}
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl mb-6 flex items-center gap-3">
                <RotateCcw className="w-5 h-5 flex-shrink-0" />
                <div className="text-xs font-bold uppercase tracking-wider">{error}</div>
              </div>
            )}

            {/* Main Content Area */}
            {!loading && !error ? (
              <motion.div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden mb-8" variants={itemVariants}>
                {isStoreAdmin && !branchesLoading && !selectedBranchId ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                      <ShoppingBag className="w-10 h-10 text-slate-200" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 lowercase tracking-tighter italic">select a branch</h3>
                    <p className="text-sm text-slate-500 max-w-xs mt-2 font-medium">Choose a branch to view its orders.</p>
                  </div>
                ) : (
                <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Number</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Info</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cashier</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Amount</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="text-sm font-black text-slate-900">#{order.orderNumber}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-bold text-slate-900">{order.customerName || 'Walk-in Customer'}</div>
                            {order.customerEmail && <div className="text-[10px] font-bold text-slate-400">{order.customerEmail?.toLowerCase()}</div>}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-bold text-slate-900">{order.cashierName || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="text-sm font-black text-emerald-600">₹{(order.total || 0).toFixed(2)}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${order.status === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                : order.status === 'PENDING'
                                  ? 'bg-amber-50 text-amber-600 border-amber-100'
                                  : 'bg-red-50 text-red-600 border-red-100'
                                }`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={async () => {
                                try {
                                  const fullOrder = await loadFullOrder(order.id);
                                  setSelectedOrder(fullOrder);
                                } catch (loadError) {
                                  console.error('Failed to load order details:', loadError);
                                  toast.error('Failed to load order details');
                                }
                              }}
                              className="p-2 hover:bg-slate-100 rounded-lg transition-colors group"
                              title="View Details"
                            >
                              <Eye className="w-5 h-5 text-slate-400 group-hover:text-emerald-600" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredOrders.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                      <ShoppingBag className="w-10 h-10 text-slate-200" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 lowercase tracking-tighter italic">no orders found</h3>
                    <p className="text-sm text-slate-500 max-w-xs mt-2 font-medium">Try adjusting your search terms to find what you're looking for.</p>
                  </div>
                )}
                </>
                )}
              </motion.div>
            ) : loading && (
              <div className="flex flex-col items-center justify-center py-32">
                <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-sm font-black text-slate-400 uppercase tracking-widest">Accessing Order Data...</p>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                    disabled={currentPage === 0}
                    className="p-2 text-emerald-600 hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <div className="flex items-center gap-1">
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${currentPage === i
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                          : 'text-slate-600 hover:bg-slate-50'
                          }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                    disabled={currentPage === totalPages - 1}
                    className="p-2 text-emerald-600 hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Next Page"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </main>
      </div>

      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
};

export default OrderManagement;
