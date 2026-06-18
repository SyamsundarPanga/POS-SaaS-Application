import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import EnhancedModal from '../../components/ui/EnhancedModal';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import shiftService, { ShiftReportResponse, ShiftResponse } from '../../services/shiftService';
import toast from '../../utils/toast';
import {
  Activity,
  Download,
  Eye,
  Filter,
  IndianRupee,
  Printer,
  Search,
  Store,
  Users,
  X,
} from 'lucide-react';

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

type DateFilter = 'today' | 'week' | 'month' | 'year';

const ManagerShiftManagementPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [shiftHistory, setShiftHistory] = useState<ShiftResponse[]>([]);
  const [reportsByShiftId, setReportsByShiftId] = useState<Record<number, ShiftReportResponse>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [isViewShiftModalOpen, setIsViewShiftModalOpen] = useState(false);
  const [selectedShiftReport, setSelectedShiftReport] = useState<ShiftReportResponse | null>(null);
  const [loadingShiftReport, setLoadingShiftReport] = useState(false);

  useEffect(() => {
    void fetchShiftHistory();

    const syncChannel = new BroadcastChannel('paypoint_sync');
    syncChannel.onmessage = (event) => {
      if (event.data === 'SHIFT_UPDATED') {
        void fetchShiftHistory();
      }
    };

    const handleFocus = () => {
      void fetchShiftHistory();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      syncChannel.close();
      window.removeEventListener('focus', handleFocus);
    };
  }, [searchTerm, dateFilter]);

  const formatDateForApi = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDateRange = (filter: DateFilter) => {
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

  const fetchShiftHistory = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(dateFilter);
      const response = await shiftService.getShiftHistory({
        page: 0,
        size: 50,
        search: searchTerm.trim() || undefined,
        startDate,
        endDate,
      });
      setShiftHistory(response.content);

      const reports = await Promise.all(
        response.content.map(async (shift) => {
          try {
            const report = await shiftService.getShiftReport(shift.id);
            return [shift.id, report] as const;
          } catch {
            return null;
          }
        }),
      );

      setReportsByShiftId(
        reports.reduce<Record<number, ShiftReportResponse>>((acc, entry) => {
          if (entry) {
            acc[entry[0]] = entry[1];
          }
          return acc;
        }, {}),
      );
    } catch (error) {
      console.error('Error fetching shift history:', error);
      toast.error('Failed to load branch shift history');
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const reports = Object.values(reportsByShiftId);
    const activeCashiers = new Set(
      shiftHistory.filter((shift) => shift.status === 'OPEN').map((shift) => shift.employeeId),
    ).size;
    const totalTransactions = reports.reduce((sum, report) => sum + report.totalTransactions, 0);
    const totalSales = reports.reduce((sum, report) => sum + report.totalSales, 0);
    const totalCashVariance = reports.reduce((sum, report) => sum + (report.variance || 0), 0);

    return {
      activeCashiers,
      totalTransactions,
      totalSales,
      totalCashVariance,
    };
  }, [reportsByShiftId, shiftHistory]);

  const handleExport = () => {
    if (shiftHistory.length === 0) {
      toast.error('No shift data available to export');
      return;
    }

    const rows = shiftHistory.map((shift) => {
      const report = reportsByShiftId[shift.id];
      return {
        shiftId: shift.id,
        cashier: shift.employeeName,
        date: shiftService.formatDate(shift.shiftStart),
        startTime: shiftService.formatTime(shift.shiftStart),
        endTime: shift.shiftEnd ? shiftService.formatTime(shift.shiftEnd) : 'Active',
        sales: report?.totalSales ?? 0,
        transactions: report?.totalTransactions ?? 0,
        status: shift.status,
      };
    });

    const csv = [
      ['Shift ID', 'Cashier', 'Date', 'Start Time', 'End Time', 'Transactions', 'Sales', 'Status'],
      ...rows.map((row) => [
        String(row.shiftId),
        row.cashier,
        row.date,
        row.startTime,
        row.endTime,
        String(row.transactions),
        String(row.sales),
        row.status,
      ]),
    ]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `manager-shift-history-${dateFilter}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Shift history exported');
  };

  const handleViewShiftReport = async (shift: ShiftResponse) => {
    try {
      setLoadingShiftReport(true);
      const cachedReport = reportsByShiftId[shift.id];
      const report = cachedReport || (await shiftService.getShiftReport(shift.id));
      setReportsByShiftId((prev) => ({ ...prev, [shift.id]: report }));
      setSelectedShiftReport(report);
      setIsViewShiftModalOpen(true);
    } catch (error) {
      toast.error('Failed to load shift report');
    } finally {
      setLoadingShiftReport(false);
    }
  };

  const handlePrintShiftReport = async (shift: ShiftResponse) => {
    try {
      const report = reportsByShiftId[shift.id] || (await shiftService.getShiftReport(shift.id));
      const reportWindow = window.open('', '_blank');
      if (!reportWindow) {
        toast.error('Please allow popups to print report');
        return;
      }

      const duration = shiftService.calculateShiftDuration(report.shift);
      const varianceStatus = shiftService.getVarianceStatus(report.variance);

      reportWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Shift Report #${report.shift.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #10b981; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .variance { color: ${report.variance >= 0 ? '#10b981' : '#ef4444'}; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Shift Report #${report.shift.id}</h1>
          <p><strong>Employee:</strong> ${report.shift.employeeName}</p>
          <p><strong>Branch:</strong> ${report.shift.branchName || 'Branch'}</p>
          <p><strong>Duration:</strong> ${shiftService.formatDuration(duration)}</p>
          <h2>Cash Summary</h2>
          <table>
            <tr><th>Starting Cash</th><td>${shiftService.formatCurrency(report.shift.startingCash)}</td></tr>
            <tr><th>Final Cash</th><td>${report.shift.finalCash ? shiftService.formatCurrency(report.shift.finalCash) : 'N/A'}</td></tr>
            <tr><th>Expected Cash</th><td>${shiftService.formatCurrency(report.expectedCash)}</td></tr>
            <tr><th>Variance</th><td class="variance">${shiftService.formatCurrency(Math.abs(report.variance))} (${varianceStatus})</td></tr>
          </table>
          <h2>Sales Summary</h2>
          <table>
            <tr><th>Total Sales</th><td>${shiftService.formatCurrency(report.totalSales)}</td></tr>
            <tr><th>Transactions</th><td>${report.totalTransactions}</td></tr>
          </table>
        </body>
        </html>
      `);
      reportWindow.document.close();
      reportWindow.print();
      toast.success('Shift report sent to printer');
    } catch (error) {
      toast.error('Failed to print shift report');
    }
  };

  return (
    <>
      <div className="flex h-screen bg-white overflow-hidden font-sans">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-white">
            <motion.div
              className="max-w-7xl mx-auto px-6 py-6 lg:px-10"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.header className="mb-6" variants={itemVariants}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1 block">
                      Branch Manager Portal
                    </span>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                      Shift Management
                    </h1>
                    <p className="text-slate-500 font-medium">
                      Monitor all cashier shifts and review branch shift reports
                    </p>
                  </div>

                  <div className="flex w-full max-w-2xl items-center justify-end gap-3">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search cashier name..."
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm font-medium text-slate-700 outline-none transition-all focus:border-emerald-500"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 transition-colors hover:bg-slate-100"
                        >
                          <X className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                      )}
                    </div>

                    <button
                      onClick={handleExport}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-emerald-200 hover:text-emerald-600"
                      title="Export shift history"
                    >
                      <Download className="h-4 w-4" />
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setIsDateFilterOpen((prev) => !prev)}
                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold capitalize text-slate-700 shadow-sm transition-colors hover:border-emerald-200 hover:text-emerald-600"
                      >
                        <Filter className="h-4 w-4" />
                        {dateFilter}
                      </button>
                      {isDateFilterOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setIsDateFilterOpen(false)} />
                          <div className="absolute right-0 top-14 z-20 w-40 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                            {(['today', 'week', 'month', 'year'] as DateFilter[]).map((filter) => (
                              <button
                                key={filter}
                                onClick={() => {
                                  setDateFilter(filter);
                                  setIsDateFilterOpen(false);
                                }}
                                className={`w-full rounded-xl px-4 py-2 text-left text-sm font-bold capitalize transition-colors ${
                                  dateFilter === filter
                                    ? 'bg-emerald-50 text-emerald-700'
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
                  <LoadingSkeleton count={6} />
                </motion.div>
              ) : (
                <>
                  <motion.div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6" variants={itemVariants}>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Active Cashiers
                        </span>
                        <Activity className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-black text-slate-900">{summary.activeCashiers}</div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Cash Variance
                        </span>
                        <Users className={`w-5 h-5 ${summary.totalCashVariance >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                      </div>
                      <div className={`text-2xl font-black ${summary.totalCashVariance >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                        {shiftService.formatCurrency(summary.totalCashVariance)}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Total Transactions
                        </span>
                        <Store className="w-5 h-5 text-slate-900" />
                      </div>
                      <div className="text-2xl font-black text-slate-900">{summary.totalTransactions}</div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Total Sales
                        </span>
                        <IndianRupee className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-black text-slate-900">
                        {shiftService.formatCurrency(summary.totalSales)}
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                    variants={itemVariants}
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Shift</th>
                            <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Cashier</th>
                            <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Schedule</th>
                            <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Sales</th>
                            <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Variance</th>
                            <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Transactions</th>
                            <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                            <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {shiftHistory.length > 0 ? (
                            shiftHistory.map((shift) => {
                              const report = reportsByShiftId[shift.id];
                              const duration = shift.shiftEnd
                                ? shiftService.calculateShiftDuration(shift)
                                : shiftService.calculateShiftDuration(shift);
                              return (
                                <tr key={shift.id} className="hover:bg-white transition-colors">
                                  <td className="px-6 py-4">
                                    <span className="font-bold text-slate-900">#{shift.id}</span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="font-bold text-slate-900">
                                      {shift.employeeName || `Cashier #${shift.employeeId}`}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-sm font-semibold text-slate-900">
                                      {shiftService.formatDate(shift.shiftStart)}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                      {shiftService.formatTime(shift.shiftStart)} - {shift.shiftEnd ? shiftService.formatTime(shift.shiftEnd) : 'Active'} · {shiftService.formatDuration(duration)}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-sm font-bold text-slate-900">
                                    {report ? shiftService.formatCurrency(report.totalSales) : 'Loading...'}
                                  </td>
                                  <td className={`px-6 py-4 text-sm font-bold ${!report ? 'text-slate-400' : report.variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {report ? shiftService.formatCurrency(report.variance) : 'Loading...'}
                                  </td>
                                  <td className="px-6 py-4 text-sm font-bold text-slate-900">
                                    {report ? report.totalTransactions : 'Loading...'}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span
                                      className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                                        shift.status === 'OPEN'
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : 'bg-slate-100 text-slate-700'
                                      }`}
                                    >
                                      {shift.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center">
                                      <button
                                        onClick={() => void handleViewShiftReport(shift)}
                                        className="text-slate-600 hover:text-slate-900 transition-colors"
                                        title="View Report"
                                      >
                                        <Eye className="w-5 h-5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium">
                                No shift data found for this branch.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                </>
              )}
            </motion.div>
          </main>
        </div>
      </div>

      <EnhancedModal
        isOpen={isViewShiftModalOpen}
        onClose={() => {
          setIsViewShiftModalOpen(false);
          setSelectedShiftReport(null);
        }}
        title={selectedShiftReport ? `Shift Report #${selectedShiftReport.shift.id}` : 'Shift Report'}
        size="small"
        className="max-h-[550px] h-[550px]"
        contentClassName="px-6 pt-2 pb-4"
        hideHeaderBorder={true}
        hideScrollbar={true}
      >
        {loadingShiftReport ? (
          <div className="p-4">
            <LoadingSkeleton count={4} />
          </div>
        ) : selectedShiftReport ? (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <span className="text-sm font-bold text-slate-500">Employee</span>
                <span className="text-sm font-bold text-slate-900">{selectedShiftReport.shift.employeeName}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <span className="text-sm font-bold text-slate-500">Duration</span>
                <span className="text-sm font-bold text-slate-900">
                  {shiftService.formatDuration(shiftService.calculateShiftDuration(selectedShiftReport.shift))}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <span className="text-sm font-bold text-slate-500">Total Sales</span>
                <span className="text-lg font-black text-emerald-600">
                  {shiftService.formatCurrency(selectedShiftReport.totalSales)}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <span className="text-sm font-bold text-slate-500">Total Transactions</span>
                <span className="text-lg font-black text-slate-900">{selectedShiftReport.totalTransactions}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <span className="text-sm font-bold text-slate-500">Expected Cash</span>
                <span className="text-sm font-bold text-slate-900">
                  {shiftService.formatCurrency(selectedShiftReport.expectedCash)}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <span className="text-sm font-bold text-slate-500">Actual Cash</span>
                <span className="text-sm font-bold text-slate-900">
                  {shiftService.formatCurrency(selectedShiftReport.actualCash)}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Payment Breakdown</div>
              <div className="space-y-2">
                {Object.keys(selectedShiftReport.paymentBreakdown || {}).length > 0 ? (
                  Object.entries(selectedShiftReport.paymentBreakdown).map(([method, amount]) => (
                    <div key={method} className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-sm font-medium text-slate-700">{method}</span>
                      <span className="text-sm font-bold text-slate-900">{shiftService.formatCurrency(amount)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-500">No payment breakdown data available.</div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setIsViewShiftModalOpen(false);
                  setSelectedShiftReport(null);
                }}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => void handlePrintShiftReport(selectedShiftReport.shift)}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                Print Report
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-500 p-8 text-center italic">No shift report data available.</div>
        )}
      </EnhancedModal>
    </>
  );
};

export default ManagerShiftManagementPage;
