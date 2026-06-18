import React, { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchTopProducts,
  selectTopProducts,
  selectTopProductsError,
  selectTopProductsLoading,
  selectSelectedBranchFilter,
  setSelectedBranchFilter,
  TopProduct,
} from '../../store/slices/dashboardSlice';
import branchService, { Branch } from '../../services/branchService';
import { ChevronDown, ChevronRight, BarChart3, Building2 } from 'lucide-react';

const LIMIT_OPTIONS = [5, 10, 15, 20];

const TopProductsReport: React.FC = () => {
  const dispatch = useAppDispatch();
  const topProducts = useAppSelector(selectTopProducts);
  const topProductsLoading = useAppSelector(selectTopProductsLoading);
  const topProductsError = useAppSelector(selectTopProductsError);
  const selectedBranchFilter = useAppSelector(selectSelectedBranchFilter);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [isLimitOpen, setIsLimitOpen] = useState(false);
  const [limit, setLimit] = useState(10);
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);

  useEffect(() => {
    const loadBranches = async () => {
      const data = await branchService.getBranches().catch(() => []);
      setBranches(Array.isArray(data) ? data : []);
    };
    loadBranches();
  }, []);

  useEffect(() => {
    dispatch(fetchTopProducts({ branchId: selectedBranchFilter, limit }));
  }, [dispatch, selectedBranchFilter, limit]);

  const normalizedProducts = useMemo(() => {
    return (topProducts || []).map((product: TopProduct, index) => {
      const productId = product.productId ?? product.id ?? index + 1;
      const productName = product.productName ?? product.name ?? 'Unknown';
      const totalUnitsSold = Number(product.totalUnitsSold ?? product.quantitySold ?? 0);
      const totalRevenue = Number(product.totalRevenue ?? product.revenue ?? 0);
      const rank = product.rank ?? index + 1;
      return {
        ...product,
        productId,
        productName,
        totalUnitsSold,
        totalRevenue,
        rank,
        sku: product.sku ?? 'N/A',
        categoryName: product.categoryName ?? 'Uncategorized',
        imageUrl: product.imageUrl ?? null,
        branchBreakdown: product.branchBreakdown ?? [],
      };
    });
  }, [topProducts]);

  const maxUnits = useMemo(() => {
    return Math.max(...normalizedProducts.map((p) => p.totalUnitsSold), 1);
  }, [normalizedProducts]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const toggleExpand = (productId: number) => {
    setExpandedProductId((prev) => (prev === productId ? null : productId));
  };

  const branchLabel = selectedBranchFilter
    ? branches.find((b) => b.id === selectedBranchFilter)?.name || 'Branch'
    : 'All Branches';

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Top Products</h3>
          <p className="text-sm text-slate-500">Ranked by units sold</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setIsBranchOpen((prev) => !prev)}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 flex items-center gap-2 hover:bg-slate-50 transition-all"
            >
              <Building2 className="w-4 h-4 text-slate-400" />
              <span className="truncate max-w-[140px]">{branchLabel}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isBranchOpen ? 'rotate-180' : ''}`} />
            </button>
            {isBranchOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsBranchOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      dispatch(setSelectedBranchFilter(null));
                      setIsBranchOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm ${selectedBranchFilter === null
                      ? 'bg-emerald-50 text-emerald-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                      }`}
                  >
                    All Branches
                  </button>
                  {branches.map((branch) => (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => {
                        dispatch(setSelectedBranchFilter(branch.id));
                        setIsBranchOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm ${selectedBranchFilter === branch.id
                        ? 'bg-emerald-50 text-emerald-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      {branch.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setIsLimitOpen((prev) => !prev)}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 flex items-center gap-2 hover:bg-slate-50 transition-all"
            >
              <span>Limit: {limit}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isLimitOpen ? 'rotate-180' : ''}`} />
            </button>
            {isLimitOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsLimitOpen(false)} />
                <div className="absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden">
                  {LIMIT_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setLimit(option);
                        setIsLimitOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm ${limit === option
                        ? 'bg-emerald-50 text-emerald-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {topProductsError && (
        <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold">{topProductsError}</span>
          <button
            onClick={() => dispatch(fetchTopProducts({ branchId: selectedBranchFilter, limit }))}
            className="px-3 py-1.5 text-xs font-bold bg-white border border-red-200 rounded-lg hover:bg-red-50"
          >
            Retry
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="min-w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Rank</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Product</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Units Sold</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Revenue</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Branches</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {topProductsLoading && (
              [...Array(5)].map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="px-6 py-4"><div className="h-4 w-10 bg-slate-200 rounded" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-36 bg-slate-200 rounded" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-200 rounded" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-10 bg-slate-200 rounded ml-auto" /></td>
                </tr>
              ))
            )}

            {!topProductsLoading && normalizedProducts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-14">
                  <div className="flex flex-col items-center text-center">
                    <BarChart3 className="w-10 h-10 text-slate-200" />
                    <h4 className="mt-3 text-sm font-semibold text-slate-700">No sales data available</h4>
                    <p className="text-xs text-slate-500">Products will appear here once orders are placed.</p>
                  </div>
                </td>
              </tr>
            )}

            {!topProductsLoading && normalizedProducts.map((product) => {
              const badgeStyle =
                product.rank === 1
                  ? 'bg-yellow-100 text-yellow-700'
                  : product.rank === 2
                    ? 'bg-slate-100 text-slate-600'
                    : product.rank === 3
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-white text-slate-500 border border-slate-200';

              const shareWidth = Math.min((product.totalUnitsSold / maxUnits) * 100, 100);
              const branchCount = product.branchBreakdown.length;

              return (
                <React.Fragment key={product.productId}>
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold ${badgeStyle}`}>
                        #{product.rank}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.productName}
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold">
                            {product.productName?.[0]?.toUpperCase() || 'P'}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{product.productName}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">SKU: {product.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600">
                        {product.categoryName}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-lg font-bold text-slate-900">{product.totalUnitsSold}</div>
                      <div className="text-[10px] text-slate-400">units</div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${shareWidth}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-emerald-600">
                        {formatCurrency(product.totalRevenue)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-700">
                        {branchCount} {branchCount === 1 ? 'branch' : 'branches'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleExpand(product.productId)}
                        className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-xs font-bold"
                      >
                        View Details
                        <ChevronRight className={`w-4 h-4 transition-transform ${expandedProductId === product.productId ? 'rotate-90' : ''}`} />
                      </button>
                    </td>
                  </tr>

                  {expandedProductId === product.productId && (
                    <tr>
                      <td colSpan={7} className="px-6 pb-6">
                        <div className="bg-slate-50 rounded-xl border border-slate-100 p-5">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-semibold text-slate-900">
                              Branch Breakdown for "{product.productName}"
                            </h4>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                              {product.totalUnitsSold} units total
                            </span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left">
                              <thead>
                                <tr>
                                  <th className="pb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Branch Name</th>
                                  <th className="pb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Units Sold</th>
                                  <th className="pb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Revenue</th>
                                  <th className="pb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Share</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {product.branchBreakdown.map((branch) => {
                                  const share = product.totalUnitsSold > 0
                                    ? (branch.unitsSold / product.totalUnitsSold) * 100
                                    : 0;
                                  return (
                                    <tr key={branch.branchId}>
                                      <td className="py-3 text-sm font-semibold text-slate-800">{branch.branchName}</td>
                                      <td className="py-3 text-sm text-slate-700">{branch.unitsSold} units</td>
                                      <td className="py-3 text-sm font-semibold text-emerald-600">
                                        {formatCurrency(branch.revenue)}
                                      </td>
                                      <td className="py-3">
                                        <div className="flex items-center gap-3">
                                          <div className="w-32 bg-white rounded-full h-1.5 border border-slate-200">
                                            <div
                                              className="bg-emerald-500 h-1.5 rounded-full"
                                              style={{ width: `${Math.min(share, 100)}%` }}
                                            />
                                          </div>
                                          <span className="text-xs font-semibold text-slate-600">
                                            {share.toFixed(0)}%
                                          </span>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default TopProductsReport;
