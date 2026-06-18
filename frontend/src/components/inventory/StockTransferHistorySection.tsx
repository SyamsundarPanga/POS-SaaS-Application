import React, { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRightLeft, ChevronDown, Filter, RefreshCw } from 'lucide-react';
import inventoryService from '../../services/inventoryService';
import toast from '../../utils/toast';

interface StockTransferHistoryItem {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  sourceBranchId: number | null;
  sourceBranchName: string | null;
  destinationBranchId: number | null;
  destinationBranchName: string | null;
  quantity: number;
  status: string;
  initiatedBy: string;
  createdAt: string;
  notes?: string;
}

interface StockTransferHistorySectionProps {
  isOpen: boolean;
  title?: string;
  accentColor?: 'emerald' | 'blue';
  refreshTrigger?: number;
  branchId?: number | null;
  branchName?: string | null;
}

type TransferDateFilter = 'today' | 'week' | 'month' | 'year';

const accentStyles = {
  emerald: {
    button:
      'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    panel: 'border-emerald-100',
    iconWrap: 'bg-emerald-100 text-emerald-700',
    badge: 'bg-emerald-50 text-emerald-700',
    spinner: 'text-emerald-500',
  },
  blue: {
    button: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
    panel: 'border-blue-100',
    iconWrap: 'bg-blue-100 text-blue-700',
    badge: 'bg-blue-50 text-blue-700',
    spinner: 'text-blue-500',
  },
} as const;

const formatDate = (value?: string | null) => {
  if (!value) return 'N/A';

  return new Date(value).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const isWithinSelectedRange = (value: string, filter: TransferDateFilter) => {
  const transferDate = new Date(value);
  const now = new Date();

  if (Number.isNaN(transferDate.getTime())) {
    return false;
  }

  if (filter === 'today') {
    return transferDate.toDateString() === now.toDateString();
  }

  if (filter === 'week') {
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - day);
    return transferDate >= startOfWeek && transferDate <= now;
  }

  if (filter === 'month') {
    return (
      transferDate.getFullYear() === now.getFullYear() &&
      transferDate.getMonth() === now.getMonth()
    );
  }

  return transferDate.getFullYear() === now.getFullYear();
};

const StockTransferHistorySection: React.FC<StockTransferHistorySectionProps> = ({
  isOpen,
  title = 'Stock Transfer History',
  accentColor = 'emerald',
  refreshTrigger,
  branchId,
  branchName,
}) => {
  const [transfers, setTransfers] = useState<StockTransferHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<TransferDateFilter>('today');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  const accents = accentStyles[accentColor];
  const filterOptions: TransferDateFilter[] = ['today', 'week', 'month', 'year'];

  const fetchTransfers = async () => {
    setLoading(true);
    setError(null);

    try {
      let page = 0;
      let totalPages = 1;
      const allRows: StockTransferHistoryItem[] = [];

      while (page < totalPages) {
        const response = await inventoryService.getTransferHistory(page, 100, branchId || undefined);
        const pageData = response?.data;
        const rows = Array.isArray(pageData) ? pageData : pageData?.content || [];
        allRows.push(...rows);
        totalPages = Array.isArray(pageData) ? 1 : Number(pageData?.totalPages) || 1;
        page += 1;
      }

      setTransfers(allRows);
      setLoaded(true);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to load stock transfer history';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const lastTriggerRef = useRef<number | undefined>(refreshTrigger);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!isOpen) return;

    // Determine if we need to fetch:
    // 1. Never loaded
    // 2. refreshTrigger changed since last fetch
    const triggerChanged = refreshTrigger !== lastTriggerRef.current;
    const shouldFetch = !loaded || triggerChanged;

    if (shouldFetch && !loading) {
      lastTriggerRef.current = refreshTrigger;
      fetchTransfers();
    }
    
    if (isFirstRender.current) {
        isFirstRender.current = false;
    }
  }, [isOpen, loaded, loading, refreshTrigger]);

  const filteredTransfers = transfers.filter(
    (transfer) => transfer.createdAt && isWithinSelectedRange(transfer.createdAt, dateFilter),
  );

  const selectedFilterLabel =
    dateFilter === 'today'
      ? 'today'
      : dateFilter === 'week'
        ? 'this week'
        : dateFilter === 'month'
          ? 'this month'
          : 'this year';

  const selectedFilterButtonLabel =
    dateFilter === 'today'
      ? 'Today'
      : dateFilter === 'week'
        ? 'Week'
        : dateFilter === 'month'
          ? 'Month'
          : 'Year';

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className={`bg-white rounded-xl border shadow-sm ${accents.panel}`}>
            <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accents.iconWrap}`}>
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{title}</h3>
                  <p className="text-xs font-medium text-slate-500">
                    {branchName ? `Viewing stock movements for ${branchName}` : 'View all branch-to-branch stock movement records'}
                  </p>
                </div>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsFilterMenuOpen((prev) => !prev)}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-all ${accents.button}`}
                >
                  <Filter className="h-4 w-4" />
                  {selectedFilterButtonLabel}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${isFilterMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isFilterMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsFilterMenuOpen(false)}
                    />
                    <div className="absolute right-0 z-40 mt-2 min-w-[160px] rounded-xl border border-slate-200 bg-white py-2 shadow-xl">
                      {filterOptions.map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => {
                            setDateFilter(filter);
                            setIsFilterMenuOpen(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm font-bold transition-colors ${
                            dateFilter === filter
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                        >
                          {filter === 'today'
                            ? 'Today'
                            : filter === 'week'
                              ? 'Week'
                              : filter === 'month'
                                ? 'Month'
                                : 'Year'}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-3 px-6 py-12 text-sm font-semibold text-slate-500">
                <RefreshCw className={`h-5 w-5 animate-spin ${accents.spinner}`} />
                Loading transfer history...
              </div>
            ) : error ? (
              <div className="px-6 py-10 text-center text-sm font-semibold text-red-600">
                {error}
              </div>
            ) : filteredTransfers.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <div className="text-sm font-semibold text-slate-500">
                  {transfers.length > 0
                    ? `No records found for the selected filter (${selectedFilterLabel}).`
                    : branchName 
                      ? `No stock transfer records found for ${branchName}.`
                      : 'No stock transfer records found.'}
                </div>
                {transfers.length > 0 && (
                  <div className="mt-3 text-xs font-medium text-slate-400">
                    {transfers.length} total transfer record{transfers.length === 1 ? '' : 's'} loaded.
                    Try `Week`, `Month`, or `Year`.
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-700">
                        SKU
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-700">
                        Product Name
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-700">
                        From Branch
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-700">
                        To Branch
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-700 text-center">
                        Stock Transferred
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-700">
                        Date of Transfer
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredTransfers.map((transfer) => (
                      <tr key={transfer.id} className="transition-colors hover:bg-slate-50/70">
                        <td className="px-6 py-4 font-mono text-xs font-bold text-slate-600">
                          {transfer.productSku || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-slate-900">
                            {transfer.productName || 'Unknown Product'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-600">
                          {transfer.sourceBranchName || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-600">
                          {transfer.destinationBranchName || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex rounded-lg px-3 py-1 text-xs font-black ${accents.badge}`}>
                            {transfer.quantity ?? 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-600">
                          {formatDate(transfer.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StockTransferHistorySection;
