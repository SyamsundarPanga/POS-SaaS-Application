import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Users,
  Package,
  DollarSign,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
} from 'lucide-react';
import api from '../../services/api';
import ConfirmModal from '../../components/ui/ConfirmModal';
import toast from '../../utils/toast';


interface Tenant {
  tenantId: string;
  tenantName: string;
  active: boolean;
  planType: string;
  subscriptionStatus: string;
  subscriptionStartDate: string;
  nextBillingDate: string;
  monthlyPrice: number;
  currentUsers: number;
  maxUsers: number;
  currentBranches: number;
  maxBranches: number;
  currentProducts: number;
  maxProducts: number;
  createdAt: string;
  totalOrders: number;
  totalRevenue: number;
}

type CachedPage = {
  content: Tenant[];
  totalPages: number;
  totalElements: number;
};

const TENANTS_CACHE_KEY = 'superadmin_tenants_cache_v1';

const readCache = (): Record<number, CachedPage> => {
  try {
    const raw = sessionStorage.getItem(TENANTS_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeCache = (cache: Record<number, CachedPage>) => {
  try {
    sessionStorage.setItem(TENANTS_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore storage failures
  }
};

const TenantsListPage: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPageFetching, setIsPageFetching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [filters, setFilters] = useState({
    planType: 'ALL',
    status: 'ALL',
  });
  const [isPlanDropdownOpen, setIsPlanDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const planFilterRef = useRef<HTMLDivElement>(null);
  const statusFilterRef = useRef<HTMLDivElement>(null);
  const pagesCacheRef = useRef<Map<number, CachedPage>>(new Map());

  const hydrateFromCache = (page: number) => {
    const storageCache = readCache();
    const storagePage = storageCache[page];
    if (storagePage) {
      pagesCacheRef.current.set(page, storagePage);
      setTenants(storagePage.content);
      setTotalPages(storagePage.totalPages);
      setTotalElements(storagePage.totalElements);
      setLoading(false);
      return true;
    }
    return false;
  };

  const fetchTenants = async (page: number) => {
    const hasInstantData = pagesCacheRef.current.has(page) || hydrateFromCache(page);
    const inMemoryPage = pagesCacheRef.current.get(page);
    if (inMemoryPage) {
      setTenants(inMemoryPage.content);
      setTotalPages(inMemoryPage.totalPages);
      setTotalElements(inMemoryPage.totalElements);
      setLoading(false);
    }

    try {
      if (hasInstantData) {
        setIsPageFetching(true);
      } else {
        setLoading(true);
      }

      const response = await api.get(`/superadmin/tenants?page=${page}&size=10`);
      const content: Tenant[] = response?.data?.content || [];
      const responseTotalPages: number = response?.data?.totalPages || 0;
      const responseTotalElements: number = response?.data?.totalElements || 0;
      const pageData: CachedPage = {
        content,
        totalPages: responseTotalPages,
        totalElements: responseTotalElements,
      };

      pagesCacheRef.current.set(page, pageData);
      writeCache({
        ...readCache(),
        [page]: pageData,
      });

      setTenants(content);
      setTotalPages(responseTotalPages);
      setTotalElements(responseTotalElements);
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    } finally {
      setLoading(false);
      setIsPageFetching(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedTenant) return;

    setIsTogglingStatus(true);
    try {
      await api.post(`/superadmin/tenants/${selectedTenant.tenantId}/toggle-status`);
      toast.success(`Tenant ${selectedTenant.active ? 'deactivated' : 'activated'} successfully`);

      // Update local state and cache
      const updatedTenants = tenants.map(t =>
        t.tenantId === selectedTenant.tenantId ? { ...t, active: !t.active } : t
      );
      setTenants(updatedTenants);

      // Update cache for current page
      const currentCache = pagesCacheRef.current.get(currentPage);
      if (currentCache) {
        const updatedCache = { ...currentCache, content: updatedTenants };
        pagesCacheRef.current.set(currentPage, updatedCache);
        const storageCache = readCache();
        writeCache({ ...storageCache, [currentPage]: updatedCache });
      }

      setIsConfirmModalOpen(false);
      setSelectedTenant(null);
    } catch (error) {
      console.error('Failed to toggle tenant status:', error);
      toast.error('Failed to update tenant status');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  useEffect(() => {
    fetchTenants(currentPage);
  }, [currentPage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (planFilterRef.current && !planFilterRef.current.contains(event.target as Node)) {
        setIsPlanDropdownOpen(false);
      }
      if (statusFilterRef.current && !statusFilterRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    };

    if (isPlanDropdownOpen || isStatusDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPlanDropdownOpen, isStatusDropdownOpen]);

  const filteredTenants = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return tenants.filter((tenant) => {
      const tenantName = (tenant.tenantName || '').toLowerCase();
      const matchesSearch = tenantName.includes(normalizedSearch);
      const matchesPlan = filters.planType === 'ALL' || tenant.planType === filters.planType;
      const matchesStatus = filters.status === 'ALL' || 
        (filters.status === 'INACTIVE' ? (!tenant.active || tenant.subscriptionStatus === 'INACTIVE') : tenant.subscriptionStatus === filters.status);
      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [tenants, searchQuery, filters]);

  const activeFilterCount = (filters.planType !== 'ALL' ? 1 : 0) + (filters.status !== 'ALL' ? 1 : 0);

  return (
    <div className="max-w-7xl mx-auto px-8 py-10 space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Platform Tenants</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Monitoring {tenants.length} active business entities</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none transition-all shadow-sm font-medium"
            />
          </div>

          {/* Plan Type Filter Dropdown */}
          <div className="relative w-44" ref={planFilterRef}>
            <button
              onClick={() => setIsPlanDropdownOpen(!isPlanDropdownOpen)}
              className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-left focus:border-emerald-500 outline-none transition-all flex items-center justify-between text-sm font-bold text-slate-700 shadow-sm"
            >
              <span className="truncate">
                {filters.planType === 'ALL' ? 'Plan Type' : `${filters.planType} Plan`}
              </span>
              <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform duration-200 ${isPlanDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isPlanDropdownOpen && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl py-2 animate-in fade-in zoom-in-95 duration-200">
                {['ALL', 'BASIC', 'PRO', 'ADVANCE'].map((plan) => (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => {
                      setFilters({ ...filters, planType: plan });
                      setIsPlanDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${filters.planType === plan
                      ? 'bg-emerald-50 text-emerald-700 font-bold'
                      : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                  >
                    {plan === 'ALL' ? 'All Plans' : plan}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Filter Dropdown */}
          <div className="relative w-40" ref={statusFilterRef}>
            <button
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-left focus:border-emerald-500 outline-none transition-all flex items-center justify-between text-sm font-bold text-slate-700 shadow-sm"
            >
              <span className="truncate">
                {filters.status === 'ALL' ? 'Status' : filters.status.replace('_', ' ')}
              </span>
              <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform duration-200 ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isStatusDropdownOpen && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl py-2 animate-in fade-in zoom-in-95 duration-200">
                {['ALL', 'ACTIVE', 'PAST_DUE', 'INACTIVE'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setFilters({ ...filters, status: status });
                      setIsStatusDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${filters.status === status
                      ? 'bg-emerald-50 text-emerald-700 font-bold'
                      : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                  >
                    {status === 'ALL' ? 'All Status' : status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => <TenantCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTenants.map((tenant) => (
            <TenantCard
              key={tenant.tenantId}
              tenant={tenant}
              onStatusClick={() => {
                setSelectedTenant(tenant);
                setIsConfirmModalOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setSelectedTenant(null);
        }}
        onConfirm={handleToggleStatus}
        title={selectedTenant?.active ? 'Deactivate Tenant' : 'Activate Tenant'}
        message={`Are you sure you want to ${selectedTenant?.active ? 'deactivate' : 'activate'} ${selectedTenant?.tenantName}? ${selectedTenant?.active ? 'Store admin and all users belonging to this tenant will no longer be able to log in or access the platform.' : ''}`}
        confirmText={selectedTenant?.active ? 'Deactivate' : 'Activate'}
        variant={selectedTenant?.active ? 'danger' : 'info'}
        loading={isTogglingStatus}
      />

      {isPageFetching && !loading && (
        <div className="flex justify-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading page...</p>
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-6">
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="px-6 py-3 text-xs font-bold uppercase tracking-widest bg-white border-2 border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-slate-200 transition-all shadow-sm"
          >
            Previous
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i;
              } else if (currentPage < 3) {
                pageNum = i;
              } else if (currentPage > totalPages - 4) {
                pageNum = totalPages - 5 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${currentPage === pageNum
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                    : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-emerald-500 hover:text-emerald-600'
                    }`}
                >
                  {pageNum + 1}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
            className="px-6 py-3 text-xs font-bold uppercase tracking-widest bg-white border-2 border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-slate-200 transition-all shadow-sm"
          >
            Next
          </button>
        </div>
      )}

      {!loading && (
        <div className="text-center">
          <p className="text-xs text-slate-500 font-medium">
            {totalElements > 0
              ? `Showing ${currentPage * 10 + 1} - ${Math.min((currentPage + 1) * 10, totalElements)} of ${totalElements} tenants`
              : 'No tenants found'}
          </p>
        </div>
      )}
    </div>
  );
};

const TenantCard: React.FC<{ tenant: Tenant; onStatusClick: () => void }> = ({ tenant, onStatusClick }) => {
  const formatSubscriptionDate = (value?: string) => {
    if (!value) return 'N/A';

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'N/A';

    return parsed.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusInfo = (status: string | null | undefined, active: boolean) => {
    if (!active || !status) {
      return { color: 'text-slate-500 bg-slate-50', icon: <XCircle className="w-3.5 h-3.5" />, label: 'Inactive' };
    }
    const normalizedStatus = status.toUpperCase();
    switch (normalizedStatus) {
      case 'ACTIVE':
        return { color: 'text-emerald-500 bg-emerald-50', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Active' };
      case 'PAST_DUE':
        return { color: 'text-rose-500 bg-rose-50', icon: <XCircle className="w-3.5 h-3.5" />, label: 'Past Due' };
      default:
        return { color: 'text-slate-500 bg-slate-50', icon: <Clock className="w-3.5 h-3.5" />, label: status.replace('_', ' ') || 'Unknown' };
    }
  };

  const status = getStatusInfo(tenant.subscriptionStatus, tenant.active);
  const planColor =
    tenant.planType === 'ADVANCE'
      ? 'text-emerald-700 bg-emerald-50 border border-emerald-100'
      : tenant.planType === 'PRO'
        ? 'text-teal-700 bg-teal-50 border border-teal-100'
        : 'text-slate-600 bg-slate-50 border border-slate-100';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-xl hover:border-emerald-200 hover:-translate-y-1 transition-all duration-200 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-bl-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>

      <div className="flex items-start justify-between relative z-10 mb-8">
        <div className="space-y-1">
          <h3 className="text-xl font-black text-slate-900 leading-tight group-hover:text-emerald-600 transition-colors uppercase tracking-tight">
            {tenant.tenantName}
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">ID: {tenant.tenantId}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${planColor}`}>
            {tenant.planType} Plan
          </span>
          <button
            onClick={onStatusClick}
            className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-transform active:scale-95 ${status.color} hover:opacity-80`}
          >
            {status.icon}
            {status.label}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <UtilizationBar
          label="Users"
          current={tenant.currentUsers}
          max={tenant.maxUsers}
          icon={<Users className="w-3.5 h-3.5" />}
          color="bg-emerald-500"
        />
        <UtilizationBar
          label="Branches"
          current={tenant.currentBranches}
          max={tenant.maxBranches}
          icon={<Building2 className="w-3.5 h-3.5" />}
          color="bg-slate-800"
        />
        <UtilizationBar
          label="Products"
          current={tenant.currentProducts}
          max={tenant.maxProducts}
          icon={<Package className="w-3.5 h-3.5" />}
          color="bg-teal-500"
        />
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-slate-100 relative z-10">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Monthly Cost</p>
            <div className="flex items-center gap-1.5 font-black text-slate-900 text-lg">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span>{tenant.monthlyPrice.toLocaleString()}</span>
            </div>
          </div>
          <div className="h-10 w-px bg-slate-100 hidden sm:block"></div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Subscription Start</p>
            <p className="text-base font-black text-slate-900">{formatSubscriptionDate(tenant.subscriptionStartDate)}</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mb-0.5">Subscription End</p>
          <p className="text-xl font-black text-slate-950">{formatSubscriptionDate(tenant.nextBillingDate)}</p>
        </div>
      </div>
    </div>
  );
};

const UtilizationBar: React.FC<{ label: string; current: number; max: number; icon: React.ReactNode; color: string }> = ({
  label, current, max, icon, color
}) => {
  const percentage = Math.min((current / (max || 1)) * 100, 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-400">
          {icon}
          <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </div>
        <span className="text-[10px] font-black text-slate-900">{current}/{max}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

const TenantCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-slate-100 to-slate-50 rounded-bl-full -mr-10 -mt-10"></div>

      <div className="flex items-start justify-between relative z-10 mb-8">
        <div className="space-y-2 flex-1">
          <div className="h-6 bg-slate-200 rounded-lg w-3/4 animate-pulse"></div>
          <div className="h-3 bg-slate-100 rounded w-1/2 animate-pulse"></div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="h-6 w-24 bg-slate-200 rounded-full animate-pulse"></div>
          <div className="h-6 w-20 bg-slate-100 rounded-full animate-pulse"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 bg-slate-100 rounded animate-pulse"></div>
              <div className="h-3 w-10 bg-slate-100 rounded animate-pulse"></div>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full animate-pulse"></div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-slate-100 relative z-10">
        <div className="flex items-center gap-6">
          <div className="space-y-2">
            <div className="h-2 w-20 bg-slate-100 rounded animate-pulse"></div>
            <div className="h-5 w-16 bg-slate-200 rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-px bg-slate-100 hidden sm:block"></div>
          <div className="space-y-2">
            <div className="h-2 w-20 bg-slate-100 rounded animate-pulse"></div>
            <div className="h-5 w-12 bg-slate-200 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="text-right space-y-2">
          <div className="h-2 w-20 bg-slate-100 rounded ml-auto animate-pulse"></div>
          <div className="h-6 w-24 bg-slate-200 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

export default TenantsListPage;
