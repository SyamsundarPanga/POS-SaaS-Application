
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchCustomers, exportCustomersCsv } from '../../store/slices/customerSlice';
import customerService, { Customer } from '../../services/customerService';
import branchService, { Branch } from '../../services/branchService';
import Sidebar from '../../components/layout/Sidebar';
import DashboardHeader from '../../components/layout/Header';
import toast from '../../utils/toast';
import { Search, Award, TrendingUp, Users, Phone, Mail, Download, Star, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const CustomerManagementPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const { customers, exportLoading } = useAppSelector((state) => state.customers);
    const { user } = useAppSelector((state) => state.auth);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
    const [statsLoaded, setStatsLoaded] = useState(false);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
    const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year'>('month');
    const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
    const branchFilterRef = useRef<HTMLDivElement | null>(null);
    const dateFilterRef = useRef<HTMLDivElement | null>(null);

    const pageSize = 10;
    const isBranchManager =
        user?.role === 'ROLE_BRANCH_MANAGER' ||
        user?.roles?.includes('ROLE_BRANCH_MANAGER');
    const branchFilterValue = isBranchManager ? (user?.branchId ?? null) : selectedBranchId;

    useEffect(() => {
        if (isBranchManager && user?.branchId) {
            setSelectedBranchId(user.branchId);
        }
    }, [isBranchManager, user?.branchId]);

    useEffect(() => {
        dispatch(fetchCustomers({ page: currentPage, size: pageSize, branchId: branchFilterValue }));
    }, [dispatch, currentPage, branchFilterValue]);

    const fetchAllCustomersForStats = useCallback(async () => {
        setStatsLoaded(false);
        try {
            let page = 0;
            let pages = 1;
            let collected: Customer[] = [];
            while (page < pages) {
                const response = await customerService.getAll(page, 200, { branchId: branchFilterValue });
                const payload = response.data;
                const pageCustomers: Customer[] = payload?.content || payload || [];
                collected = collected.concat(pageCustomers);
                pages = payload?.totalPages ?? 1;
                page += 1;
            }
            setAllCustomers(collected);
        } catch {
            setAllCustomers([]);
        } finally {
            setStatsLoaded(true);
        }
    }, [branchFilterValue]);

    useEffect(() => {
        if (isBranchManager) return;

        const loadBranches = async () => {
            try {
                const branchList = await branchService.getAllBranchesList();
                setBranches(Array.isArray(branchList) ? branchList : []);
            } catch (error) {
                console.error('Failed to load branches for customer filter:', error);
                setBranches([]);
            }
        };

        loadBranches();
    }, [isBranchManager]);

    useEffect(() => {
        fetchAllCustomersForStats();
    }, [fetchAllCustomersForStats]);

    useEffect(() => {
        const syncChannel = new BroadcastChannel('paypoint_sync');
        syncChannel.onmessage = (event) => {
            console.log('Admin: Received sync message:', event.data);
            if (event.data === 'CUSTOMER_UPDATED') {
                console.log('Admin: Refreshing customer data...');
                dispatch(fetchCustomers({ page: currentPage, size: pageSize, branchId: branchFilterValue }));
                fetchAllCustomersForStats();
            }
        };
        return () => syncChannel.close();
    }, [dispatch, currentPage, fetchAllCustomersForStats, branchFilterValue]);

    useEffect(() => {
        setCurrentPage(0);
    }, [branchFilterValue, dateRange, searchTerm]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (branchFilterRef.current && !branchFilterRef.current.contains(event.target as Node)) {
                setIsBranchDropdownOpen(false);
            }
            if (dateFilterRef.current && !dateFilterRef.current.contains(event.target as Node)) {
                setIsDateDropdownOpen(false);
            }
        };

        if (isBranchDropdownOpen || isDateDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isBranchDropdownOpen, isDateDropdownOpen]);

    const handleExport = async () => {
        try {
            await dispatch(exportCustomersCsv()).unwrap();
            toast.success('Customers exported successfully');
        } catch (error: any) {
            toast.error(error || 'Export failed. Please try again.');
        }
    };



    const isWithinDateRange = useCallback((date?: string) => {
        if (!date) return false;

        const customerDate = new Date(date);
        if (Number.isNaN(customerDate.getTime())) return false;

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (dateRange === 'today') {
            return customerDate >= startOfToday;
        }

        if (dateRange === 'week') {
            const weekAgo = new Date(startOfToday);
            weekAgo.setDate(weekAgo.getDate() - 6);
            return customerDate >= weekAgo;
        }

        if (dateRange === 'month') {
            const monthAgo = new Date(startOfToday);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return customerDate >= monthAgo;
        }

        const yearAgo = new Date(startOfToday);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        return customerDate >= yearAgo;
    }, [dateRange]);

    const dateFilteredCustomers = useMemo(() => {
        const source = statsLoaded ? allCustomers : customers;
        return source.filter((customer: Customer) => isWithinDateRange(customer.createdAt));
    }, [allCustomers, customers, isWithinDateRange, statsLoaded]);

    const filteredCustomers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return dateFilteredCustomers.filter((customer: Customer) => {
            const matchesSearch =
                !term ||
                customer.firstName?.toLowerCase().includes(term) ||
                customer.lastName?.toLowerCase().includes(term) ||
                customer.name?.toLowerCase().includes(term) ||
                customer.email?.toLowerCase().includes(term) ||
                customer.phone?.toLowerCase().includes(term);

            return matchesSearch;
        });
    }, [dateFilteredCustomers, searchTerm]);

    const paginatedCustomers = useMemo(() => {
        const startIndex = currentPage * pageSize;
        return filteredCustomers.slice(startIndex, startIndex + pageSize);
    }, [currentPage, filteredCustomers]);

    const filteredTotalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));

    const formatMemberSince = (date?: string) => {
        if (!date) return 'Member since -';
        const parsed = new Date(date);
        if (Number.isNaN(parsed.getTime())) return 'Member since -';
        return `Member since ${parsed.toLocaleDateString()}`;
    };

    const statsSource = dateFilteredCustomers;
    const totalCustomers = statsSource.length;
    const activeCustomers = statsSource.filter((c: Customer) => c.status === 'ACTIVE').length;
    const totalPoints = statsSource.reduce((sum: number, c: Customer) => sum + (c.loyaltyPoints || 0), 0);
    const activeRate = totalCustomers > 0 ? Math.round((activeCustomers / totalCustomers) * 100) : 0;
    const newCustomersInRange = statsSource.length;

    const canExport =
        user?.role === 'ROLE_STORE_ADMIN' ||
        user?.role === 'ROLE_BRANCH_MANAGER' ||
        user?.roles?.includes('ROLE_STORE_ADMIN') ||
        user?.roles?.includes('ROLE_BRANCH_MANAGER');

    const getTierColor = (tier: string) => {
        const colors: Record<string, string> = {
            BRONZE: 'bg-orange-100 text-orange-700',
            SILVER: 'bg-gray-200 text-gray-700',
            GOLD: 'bg-yellow-100 text-yellow-700',
            PLATINUM: 'bg-purple-100 text-purple-700',
            DIAMOND: 'bg-blue-100 text-blue-700',
        };
        return colors[tier] || 'bg-gray-100 text-gray-700';
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2,
        }).format(amount);
    };

    return (
        <div className="flex h-screen bg-white overflow-hidden font-sans">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <DashboardHeader />
                <main className="flex-1 overflow-y-auto bg-white">
                    <div className="max-w-7xl mx-auto px-6 py-6 lg:px-10">
                        {/* Page Header */}
                        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600 block mb-2">
                                    Customer CRM
                                </span>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                                    Customer Overview
                                </h1>
                                <p className="text-slate-500 font-medium">
                                    Track loyalty, engagement, and lifetime value across your customer base
                                </p>
                            </div>

                            <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 lg:gap-3">
                                <div className="relative w-full sm:w-64 lg:w-72 flex-shrink-0">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search by name, email..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:border-emerald-500 outline-none transition-all bg-white shadow-sm"
                                    />
                                </div>
                                {!isBranchManager && (
                                    <div className="relative w-full sm:w-40 lg:w-44 flex-shrink-0" ref={branchFilterRef}>
                                        <button
                                            type="button"
                                            onClick={() => setIsBranchDropdownOpen((prev) => !prev)}
                                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-left text-sm font-bold text-slate-700 shadow-sm"
                                        >
                                            <span className="truncate block">
                                                {selectedBranchId === null
                                                    ? 'All Branches'
                                                    : branches.find((branch) => branch.id === selectedBranchId)?.name || 'Select Branch'}
                                            </span>
                                            <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform ${isBranchDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isBranchDropdownOpen && (
                                            <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white py-2 shadow-xl">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedBranchId(null);
                                                        setIsBranchDropdownOpen(false);
                                                    }}
                                                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${selectedBranchId === null
                                                        ? 'bg-emerald-50 text-emerald-700 font-bold'
                                                        : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'}`}
                                                >
                                                    All Branches
                                                </button>
                                                {branches.map((branch) => (
                                                    <button
                                                        key={branch.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedBranchId(branch.id);
                                                            setIsBranchDropdownOpen(false);
                                                        }}
                                                        className={`w-full px-4 py-2 text-left text-sm transition-colors ${selectedBranchId === branch.id
                                                            ? 'bg-emerald-50 text-emerald-700 font-bold'
                                                            : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'}`}
                                                    >
                                                        {branch.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="relative w-full sm:w-36 lg:w-40 flex-shrink-0" ref={dateFilterRef}>
                                    <button
                                        type="button"
                                        onClick={() => setIsDateDropdownOpen((prev) => !prev)}
                                        className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-left text-sm font-bold text-slate-700 shadow-sm"
                                    >
                                        <span className="truncate block">
                                            {dateRange.charAt(0).toUpperCase() + dateRange.slice(1)}
                                        </span>
                                        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform ${isDateDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isDateDropdownOpen && (
                                        <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white py-2 shadow-xl">
                                            {[
                                                { value: 'today', label: 'Today' },
                                                { value: 'week', label: 'Week' },
                                                { value: 'month', label: 'Month' },
                                                { value: 'year', label: 'Year' },
                                            ].map((option) => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => {
                                                        setDateRange(option.value as 'today' | 'week' | 'month' | 'year');
                                                        setIsDateDropdownOpen(false);
                                                    }}
                                                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${dateRange === option.value
                                                        ? 'bg-emerald-50 text-emerald-700 font-bold'
                                                        : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'}`}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    {canExport && (
                                        <button
                                            onClick={handleExport}
                                            disabled={exportLoading}
                                            className="inline-flex items-center justify-center w-11 h-11 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50/40 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            title="Export Customers CSV"
                                            aria-label="Export Customers CSV"
                                        >
                                            {exportLoading ? (
                                                <svg className="w-4 h-4 animate-spin text-slate-500" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                                </svg>
                                            ) : (
                                                <Download className="w-4 h-4" />
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                            <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Total Customers
                                    </span>
                                    <Users className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="text-2xl font-black text-slate-900 tracking-tight">
                                    {totalCustomers}
                                </div>
                                {statsLoaded && (
                                    <div className="flex items-center gap-1 mt-1">
                                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${(() => {
                                            const now = new Date();
                                            const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                                            const totalBeforeThisMonth = statsSource.filter(c => c.createdAt && new Date(c.createdAt) < startOfCurrentMonth).length;
                                            const growth = totalBeforeThisMonth === 0 ? (totalCustomers > 0 ? 100 : 0) : Math.round(((totalCustomers - totalBeforeThisMonth) / totalBeforeThisMonth) * 100);
                                            return growth >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600';
                                        })()}`}>
                                            {(() => {
                                                const now = new Date();
                                                const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                                                const totalBeforeThisMonth = statsSource.filter(c => c.createdAt && new Date(c.createdAt) < startOfCurrentMonth).length;
                                                const growth = totalBeforeThisMonth === 0 ? (totalCustomers > 0 ? 100 : 0) : Math.round(((totalCustomers - totalBeforeThisMonth) / totalBeforeThisMonth) * 100);
                                                return `${growth >= 0 ? '+' : ''}${growth}%`;
                                            })()}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MoM</span>
                                    </div>
                                )}
                            </div>
                            <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Active Rate
                                    </span>
                                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div className="text-2xl font-black text-slate-900 tracking-tight">
                                    {activeRate}%
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {activeCustomers} active
                                </div>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Loyalty Points
                                    </span>
                                    <Award className="w-5 h-5 text-purple-600" />
                                </div>
                                <div className="text-2xl font-black text-slate-900 tracking-tight">
                                    {totalPoints.toLocaleString()}
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Total accrued
                                </div>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        New in {dateRange}
                                    </span>
                                    <TrendingUp className="w-5 h-5 text-orange-500" />
                                </div>
                                <div className="text-2xl font-black text-slate-900 tracking-tight">
                                    {newCustomersInRange}
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Filtered by {dateRange}
                                </div>
                            </div>
                        </div>

                        {/* Customer Table Card */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            {!statsLoaded ? (
                                <div className="text-center py-16">
                                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
                                    <p className="mt-4 text-slate-600 font-medium">Loading customers...</p>
                                </div>
                            ) : filteredCustomers.length === 0 ? (
                                <div className="text-center py-16">
                                    <Users className="mx-auto h-12 w-12 text-slate-200" />
                                    <p className="mt-3 text-slate-500 font-medium">No customers found</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left">
                                        <thead className="bg-white border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Customer</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Contact</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Loyalty</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Orders</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tier</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {paginatedCustomers.map((customer: Customer) => {
                                                const displayName = customer.name || `${customer.firstName} ${customer.lastName}`;
                                                const initials = (displayName || '?').trim()[0]?.toUpperCase() || '?';
                                                const orderCount = customer.totalPurchases || 0;
                                                const loyaltyPoints = customer.loyaltyPoints || 0;
                                                const tier = (customer.loyaltyTier || 'STANDARD').toUpperCase();
                                                const spent = customer.totalSpent || 0;

                                                return (
                                                    <tr key={customer.id} className="hover:bg-slate-50/60 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white text-emerald-600 font-semibold border border-emerald-200 shadow-sm">
                                                                    {initials}
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-bold text-slate-900">{displayName}</div>
                                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                                        {formatMemberSince(customer.createdAt)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-slate-600 flex items-center gap-1">
                                                                <Mail size={14} />
                                                                {customer.email || 'No email'}
                                                            </div>
                                                            <div className="text-sm text-slate-500 flex items-center gap-1">
                                                                <Phone size={14} />
                                                                {customer.phone || 'No phone'}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-2 text-purple-600 font-semibold">
                                                                <Star size={14} />
                                                                <span>{loyaltyPoints.toLocaleString()}</span>
                                                                <span className="text-[10px] text-slate-400 font-normal uppercase">pts</span>
                                                            </div>
                                                            <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                                                                Spent {formatCurrency(spent)}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-black text-slate-900">{orderCount}</div>
                                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">orders</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${getTierColor(tier)}`}>
                                                                {tier}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {filteredCustomers.length > pageSize && (
                            <div className="mt-6 flex items-center justify-center">
                                <div className="flex items-center gap-4 px-2 py-1">
                                    <button
                                        onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                                        disabled={currentPage === 0}
                                        className="p-2 text-emerald-600 hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        title="Previous Page"
                                    >
                                        <ChevronLeft className="w-6 h-6" />
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {[...Array(filteredTotalPages)].map((_, i) => (
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
                                        onClick={() => setCurrentPage((prev) => Math.min(filteredTotalPages - 1, prev + 1))}
                                        disabled={currentPage === filteredTotalPages - 1}
                                        className="p-2 text-emerald-600 hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        title="Next Page"
                                    >
                                        <ChevronRight className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

        </div>
    );
};

export default CustomerManagementPage;
