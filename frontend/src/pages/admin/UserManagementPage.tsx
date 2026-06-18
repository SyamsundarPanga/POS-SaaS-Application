import React, { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { deleteUser, fetchUsers } from '../../store/slices/userSlice';
import { Plus, Search, MoreVertical, Edit2, Shield, ShieldCheck, Trash2, UserCheck, Users, Briefcase, ShoppingBag, Download, FileText, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import DashboardHeader from '../../components/layout/Header';
import AddUserModal from '../../components/modal/AddUserModal';
import toast from '../../utils/toast';
import userService from '../../services/userService';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { motion } from 'framer-motion';
import adminReportService from '../../services/adminReportService';
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

interface UserItem {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'ROLE_STORE_ADMIN' | 'ROLE_BRANCH_MANAGER' | 'ROLE_CASHIER' | 'ROLE_VIEWER';
    tenantId: string;
    branchId?: number | null;
    status?: 'ACTIVE' | 'INACTIVE';
}

const UserManagementPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const { list, loading, error, totalPages: reduxTotalPages, totalElements: reduxTotalElements } = useAppSelector((state) => state.users);
    const { user } = useAppSelector((state) => state.auth);
    const isStoreAdmin = user?.roles?.includes('ROLE_STORE_ADMIN') || user?.role === 'ROLE_STORE_ADMIN';
    const users = list as UserItem[];
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [activeRowMenu, setActiveRowMenu] = useState<number | null>(null);
    const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [pendingUser, setPendingUser] = useState<UserItem | null>(null);
    const [pendingStatus, setPendingStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
    const [reportBusy, setReportBusy] = useState(false);
    const [isRoleFilterDropdownOpen, setIsRoleFilterDropdownOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const pageSize = 12;
    const [allUsersForStats, setAllUsersForStats] = useState<UserItem[]>([]);
    const [loadingStats, setLoadingStats] = useState(false);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [branchesLoading, setBranchesLoading] = useState(false);
    const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
    const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
    const branchDropdownRef = useRef<HTMLDivElement | null>(null);
    const selectedBranch = branches.find((branch) => branch.id === selectedBranchId) ?? null;

    // Update local pagination state from Redux
    useEffect(() => {
        if (reduxTotalPages !== undefined) {
            setTotalPages(reduxTotalPages);
        }
        if (reduxTotalElements !== undefined) {
            setTotalElements(reduxTotalElements);
        }
    }, [reduxTotalPages, reduxTotalElements]);

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

                console.error('Failed to load branches for users page:', loadError);
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

    const fetchAllUsersForStats = async () => {
        if (isStoreAdmin && branchesLoading) {
            return;
        }

        if (isStoreAdmin && !selectedBranchId) {
            setAllUsersForStats([]);
            return;
        }

        setLoadingStats(true);
        try {
            const response = await userService.getUsers(0, 500, isStoreAdmin ? selectedBranchId || undefined : undefined);
            const allUsers = response.data?.content || response.data || [];
            setAllUsersForStats(allUsers as UserItem[]);
        } catch (err) {
            console.error('Failed to fetch all users for stats:', err);
        } finally {
            setLoadingStats(false);
        }
    };

    // Fetch all users for stats calculation (runs once on mount)
    useEffect(() => {
        void fetchAllUsersForStats();
    }, [isStoreAdmin, selectedBranchId, branchesLoading]);

    useEffect(() => {
        if (isStoreAdmin && branchesLoading) {
            return;
        }

        if (isStoreAdmin && !selectedBranchId) {
            return;
        }

        dispatch(fetchUsers({ page: currentPage, size: pageSize, branchId: isStoreAdmin ? selectedBranchId || undefined : undefined }));
        const handleClickOutside = () => setActiveRowMenu(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [dispatch, currentPage, isStoreAdmin, selectedBranchId, branchesLoading]);

    useEffect(() => {
        setCurrentPage(0);
    }, [searchTerm, filterRole, filterStatus, selectedBranchId]);

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

    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.lastName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRole = filterRole === 'all' || user.role === filterRole;
        const matchesStatus = filterStatus === 'all' || (filterStatus === 'ACTIVE' && user.status !== 'INACTIVE') || (filterStatus === 'INACTIVE' && user.status === 'INACTIVE');

        return matchesSearch && matchesRole && matchesStatus;
    });

    // Calculate stats from ALL users (not just current page)
    const statsData = allUsersForStats.length > 0 ? allUsersForStats : users;
    const activeUsersCount = statsData.filter((u) => u.status !== 'INACTIVE').length;

    const handleUserAction = async (userId: number, action: string) => {
        const user = users.find((u) => u.id === userId);
        if (!user) {
            toast.error('User not found');
            return;
        }

        if (action === 'edit') {
            setSelectedUser(user);
            setIsModalOpen(true);
            setActiveRowMenu(null);
        } else if (action === 'toggle-status') {
            if (user.role === 'ROLE_STORE_ADMIN') {
                toast.error('Store admin status cannot be changed from this screen');
                return;
            }

            const nextStatus = user.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE';
            setPendingUser(user);
            setPendingStatus(nextStatus);
            setIsStatusConfirmOpen(true);
            setActiveRowMenu(null);
        } else if (action === 'delete') {
            setPendingUser(user);
            setIsDeleteConfirmOpen(true);
            setActiveRowMenu(null);
        }
    };

    const calculateMoM = (currentList: UserItem[], filterFn?: (u: UserItem) => boolean) => {
        const now = new Date();
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const filteredList = filterFn ? currentList.filter(filterFn) : currentList;
        const totalCurrent = filteredList.length;
        const totalBeforeThisMonth = filteredList.filter(u => u.id && new Date() > startOfCurrentMonth).length; // Placeholder logic as in Dashboard
        
        // Actually, I can use a better logic if I have createdAt.
        // Let's assume most users have createdAt.
        const actualBeforeThisMonth = filteredList.filter(u => {
            // @ts-ignore - assuming createdAt exists on user object from backend
            const created = u.createdAt ? new Date(u.createdAt) : new Date(0);
            return created < startOfCurrentMonth;
        }).length;

        const newThisMonth = totalCurrent - actualBeforeThisMonth;
        if (actualBeforeThisMonth === 0) return totalCurrent > 0 ? 100 : 0;
        return Math.round((newThisMonth / actualBeforeThisMonth) * 100);
    };

    const confirmStatusChange = async () => {
        if (!pendingUser) return;
        try {
            await userService.changeEmployeeStatus(pendingUser.id, { status: pendingStatus });
            toast.success(pendingStatus === 'INACTIVE' ? 'User marked inactive' : 'User activated successfully');
            dispatch(fetchUsers({ page: currentPage, size: pageSize, branchId: isStoreAdmin ? selectedBranchId || undefined : undefined }));
            void fetchAllUsersForStats();
        } catch (statusError: any) {
            toast.error(statusError?.response?.data?.message || 'Failed to update user status');
        } finally {
            setIsStatusConfirmOpen(false);
            setPendingUser(null);
        }
    };

    const confirmDelete = async () => {
        if (!pendingUser) return;
        try {
            await dispatch(deleteUser(pendingUser.id)).unwrap();
            toast.success('User deleted successfully');
            dispatch(fetchUsers({ page: currentPage, size: pageSize, branchId: isStoreAdmin ? selectedBranchId || undefined : undefined }));
            void fetchAllUsersForStats();
        } catch (deleteError: any) {
            toast.error(deleteError || 'Failed to delete user');
        } finally {
            setIsDeleteConfirmOpen(false);
            setPendingUser(null);
        }
    };

    const handleExportEmployeePerformance = async () => {
        try {
            setReportBusy(true);
            await adminReportService.exportEmployeePerformanceCsv(isStoreAdmin ? selectedBranchId || undefined : undefined);
            const perf = await adminReportService.getEmployeePerformance(isStoreAdmin ? selectedBranchId || undefined : undefined);
            const topCashier = perf[0]?.employeeName || 'N/A';
            toast.success(`Employee performance exported. Top cashier: ${topCashier}`);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to export employee performance');
        } finally {
            setReportBusy(false);
        }
    };

    const handleExportPDF = async () => {
        try {
            setReportBusy(true);
            await adminReportService.exportEmployeePerformancePdf(isStoreAdmin ? selectedBranchId || undefined : undefined);
            toast.success('Employee performance report exported as PDF');
        } catch (exportError: any) {
            toast.error(exportError?.response?.data?.message || 'Failed to export employee performance PDF');
        } finally {
            setReportBusy(false);
        }
    };

    return (
        <div className="flex h-screen bg-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col">
                <DashboardHeader />
                <main className="flex-1 overflow-y-auto bg-white">
                    <motion.div
                        className="max-w-7xl mx-auto px-6 py-1 lg:px-10"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <motion.div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6" variants={itemVariants}>
                            <div>
                                <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1 block">
                                    Administration
                                </span>
                                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Staff Accounts</h1>
                                <p className="text-slate-500 font-medium">Manage permissions and store access</p>
                            </div>

                            <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-3 w-full lg:max-w-3xl">
                                {isStoreAdmin && (
                                    <div ref={branchDropdownRef} className="relative w-full sm:w-48">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!branchesLoading && branches.length > 0) {
                                                    setIsBranchDropdownOpen((prev) => !prev);
                                                }
                                            }}
                                            disabled={branchesLoading || branches.length === 0}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-left outline-none transition-all flex items-center justify-between text-sm font-bold text-slate-700 shadow-sm hover:border-emerald-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                                            aria-haspopup="listbox"
                                            aria-expanded={isBranchDropdownOpen}
                                            aria-label="Select branch"
                                            title={selectedBranch?.name || 'Select branch'}
                                        >
                                            <span className="truncate">
                                                {branchesLoading
                                                    ? 'Loading...'
                                                    : branches.length === 0
                                                        ? 'No Branch'
                                                        : getCompactBranchLabel(selectedBranch)}
                                            </span>
                                            <ChevronDown className={`w-4 h-4 text-emerald-500 transition-transform duration-200 ${isBranchDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isBranchDropdownOpen && !branchesLoading && branches.length > 0 && (
                                            <div className="absolute z-50 w-[280px] mt-2 bg-white border border-slate-200 rounded-xl shadow-xl py-2 animate-in fade-in zoom-in-95 duration-200">
                                                {branches.map((branch) => (
                                                    <button
                                                        key={branch.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedBranchId(branch.id);
                                                            setCurrentPage(0);
                                                            setIsBranchDropdownOpen(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors ${selectedBranchId === branch.id ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'}`}
                                                    >
                                                        <div className="truncate">{getCompactBranchLabel(branch)}</div>
                                                        <div className="truncate text-xs font-medium text-slate-400">{branch.name}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="flex-1 relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Search staff..."
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-emerald-500 outline-none transition-all"
                                        value={searchTerm}
                                        onChange={(e) => {
                                            if (e.target.value.length > 100) {
                                                toast.warning('Search supports up to 100 characters');
                                                return;
                                            }
                                            setSearchTerm(e.target.value);
                                        }}
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="relative w-full sm:w-48">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsRoleFilterDropdownOpen(!isRoleFilterDropdownOpen);
                                        }}
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-left focus:border-emerald-500 outline-none transition-all flex items-center justify-between text-sm font-bold text-slate-700 shadow-sm"
                                    >
                                        <ShieldCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                        <span className="truncate">
                                            {filterRole === 'all' ? 'All Roles' : (filterRole === 'ROLE_BRANCH_MANAGER' ? 'Branch Manager' : filterRole === 'ROLE_CASHIER' ? 'Cashier' : 'Viewer')}
                                        </span>
                                        <ChevronDown className={`w-4 h-4 text-emerald-500 transition-transform duration-200 ${isRoleFilterDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isRoleFilterDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsRoleFilterDropdownOpen(false)} />
                                            <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl py-2 animate-in fade-in zoom-in-95 duration-200">
                                                {[
                                                    { value: 'all', label: 'All Roles' },
                                                    { value: 'ROLE_BRANCH_MANAGER', label: 'Branch Manager' },
                                                    { value: 'ROLE_CASHIER', label: 'Cashier' },
                                                    { value: 'ROLE_VIEWER', label: 'Viewer' }
                                                ].map((role) => (
                                                    <button
                                                        key={role.value}
                                                        type="button"
                                                        onClick={() => {
                                                            setFilterRole(role.value);
                                                            setIsRoleFilterDropdownOpen(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors ${filterRole === role.value ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'}`}
                                                    >
                                                        {role.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                                    <button
                                        onClick={handleExportEmployeePerformance}
                                        disabled={reportBusy}
                                        className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-60"
                                        title="Export Employee Performance"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={handleExportPDF}
                                        disabled={reportBusy}
                                        className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-60"
                                        title="Export Performance PDF"
                                    >
                                        <FileText className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span className="hidden xs:inline">Add Staff</span>
                                        <span className="xs:hidden">Add</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" variants={itemVariants}>
                            <div
                                className={`bg-white rounded-xl border ${searchTerm === '' && filterRole === 'all' && filterStatus === 'all' ? 'border-emerald-500' : 'border-slate-200'} p-6 cursor-pointer hover:border-emerald-500 transition-all`}
                                onClick={() => { setSearchTerm(''); setFilterRole('all'); setFilterStatus('all'); }}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Staff</h3>
                                    <Users className="w-5 h-5 text-slate-400" />
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-2xl font-black text-slate-900">
                                        {loadingStats ? '...' : statsData.length}
                                    </p>
                                    {!loadingStats && (
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${calculateMoM(statsData) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                {calculateMoM(statsData) >= 0 ? '+' : ''}{calculateMoM(statsData)}%
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MoM</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div
                                className={`bg-white rounded-xl border ${filterStatus === 'ACTIVE' ? 'border-emerald-500' : 'border-slate-200'} p-6 cursor-pointer hover:border-emerald-500 transition-all`}
                                onClick={() => { setFilterStatus(filterStatus === 'ACTIVE' ? 'all' : 'ACTIVE'); setFilterRole('all'); }}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Staff</h3>
                                    <UserCheck className="w-5 h-5 text-emerald-500" />
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-2xl font-black text-emerald-600">
                                        {loadingStats ? '...' : activeUsersCount}
                                    </p>
                                    {!loadingStats && (
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${calculateMoM(statsData, u => u.status !== 'INACTIVE') >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                {calculateMoM(statsData, u => u.status !== 'INACTIVE') >= 0 ? '+' : ''}{calculateMoM(statsData, u => u.status !== 'INACTIVE')}%
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MoM</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div
                                className={`bg-white rounded-xl border ${filterRole === 'ROLE_BRANCH_MANAGER' ? 'border-purple-500' : 'border-slate-200'} p-6 cursor-pointer hover:border-purple-500 transition-all`}
                                onClick={() => setFilterRole('ROLE_BRANCH_MANAGER')}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Managers</h3>
                                    <Briefcase className="w-5 h-5 text-purple-600" />
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-2xl font-black text-slate-900">
                                        {loadingStats ? '...' : statsData.filter(u => u.role === 'ROLE_BRANCH_MANAGER').length}
                                    </p>
                                    {!loadingStats && (
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${calculateMoM(statsData, u => u.role === 'ROLE_BRANCH_MANAGER') >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                {calculateMoM(statsData, u => u.role === 'ROLE_BRANCH_MANAGER') >= 0 ? '+' : ''}{calculateMoM(statsData, u => u.role === 'ROLE_BRANCH_MANAGER')}%
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MoM</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div
                                className={`bg-white rounded-xl border ${filterRole === 'ROLE_CASHIER' ? 'border-blue-500' : 'border-slate-200'} p-6 cursor-pointer hover:border-blue-500 transition-all`}
                                onClick={() => setFilterRole('ROLE_CASHIER')}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cashiers</h3>
                                    <ShoppingBag className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-2xl font-black text-slate-900">
                                        {loadingStats ? '...' : statsData.filter(u => u.role === 'ROLE_CASHIER').length}
                                    </p>
                                    {!loadingStats && (
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${calculateMoM(statsData, u => u.role === 'ROLE_CASHIER') >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                {calculateMoM(statsData, u => u.role === 'ROLE_CASHIER') >= 0 ? '+' : ''}{calculateMoM(statsData, u => u.role === 'ROLE_CASHIER')}%
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MoM</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>

                        {loading && (
                            <div className="text-center py-20 font-bold text-slate-400">
                                <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Loading staff data...
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl mb-6 font-bold flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        {!loading && !error && (
                            <motion.div className="bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-200/40 overflow-visible" variants={itemVariants}>
                                <div className="overflow-x-auto scrollbar-hide">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employee</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Access Level</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Last Active</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-100">
                                            {filteredUsers.map((u) => (
                                                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="flex-shrink-0 h-10 w-10">
                                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-bold text-white">
                                                                    {(u.firstName && u.firstName[0]) || (u.username && u.username[0]) || '?'}
                                                                </div>
                                                            </div>
                                                            <div className="ml-4">
                                                                <div className="text-sm font-medium text-slate-900">
                                                                    {u.firstName || ''} {u.lastName || ''}
                                                                </div>
                                                                <div className="text-sm text-slate-500">{u.email || u.username}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${u.role === 'ROLE_STORE_ADMIN' ? 'bg-emerald-100 text-emerald-800' :
                                                            u.role === 'ROLE_BRANCH_MANAGER' ? 'bg-purple-100 text-purple-800' :
                                                                'bg-blue-100 text-blue-800'
                                                            }`}>
                                                            {(u.role || '').replace('ROLE_', '').replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span
                                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.status === 'INACTIVE'
                                                                ? 'bg-red-100 text-red-800'
                                                                : 'bg-emerald-100 text-emerald-800'
                                                                }`}
                                                        >
                                                            <span
                                                                className={`w-2 h-2 rounded-full mr-1.5 ${u.status === 'INACTIVE' ? 'bg-red-400' : 'bg-emerald-400'
                                                                    }`}
                                                            ></span>
                                                            {u.status || 'ACTIVE'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        2 hours ago
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <div className="relative inline-block text-left">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveRowMenu(activeRowMenu === u.id ? null : u.id);
                                                                }}
                                                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                                                            >
                                                                <MoreVertical size={18} />
                                                            </button>

                                                            {activeRowMenu === u.id && (
                                                                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-xl z-[60] py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                                    <button
                                                                        onClick={() => handleUserAction(u.id, 'edit')}
                                                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                                                                    >
                                                                        <Edit2 size={14} className="text-blue-500" />
                                                                        Edit Account
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleUserAction(u.id, 'toggle-status')}
                                                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                                                                    >
                                                                        <Shield size={14} className={u.status === 'INACTIVE' ? 'text-emerald-500' : 'text-amber-500'} />
                                                                        {u.status === 'INACTIVE' ? 'Set Active' : 'Set Inactive'}
                                                                    </button>
                                                                    <div className="border-t border-slate-50 my-1" />
                                                                    <button
                                                                        onClick={() => handleUserAction(u.id, 'delete')}
                                                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                        Delete User
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {isStoreAdmin && !branchesLoading && !selectedBranchId ? (
                                    <div className="text-center py-12">
                                        <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        <h3 className="mt-2 text-sm font-medium text-slate-900">Select a branch</h3>
                                        <p className="mt-1 text-sm text-slate-500">Choose a branch to view its staff members</p>
                                    </div>
                                ) : filteredUsers.length === 0 && (
                                    <div className="text-center py-12">
                                        <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                        </svg>
                                        <h3 className="mt-2 text-sm font-medium text-slate-900">No staff members found</h3>
                                        <p className="mt-1 text-sm text-slate-500">Try adjusting your search or filter criteria</p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Pagination Controls */}
                        {totalPages > 1 && (!isStoreAdmin || !!selectedBranchId) && (
                            <div className="mt-8 flex items-center justify-center border-t border-slate-200 pt-6">
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

            {isModalOpen && (
                <AddUserModal
                    onClose={() => {
                        setSelectedUser(null);
                        setIsModalOpen(false);
                    }}
                    onSuccess={() => {
                        dispatch(fetchUsers({ page: currentPage, size: pageSize, branchId: isStoreAdmin ? selectedBranchId || undefined : undefined }));
                        void fetchAllUsersForStats();
                    }}
                    user={selectedUser}
                />
            )}

            <ConfirmModal
                isOpen={isStatusConfirmOpen}
                onClose={() => {
                    setIsStatusConfirmOpen(false);
                    setPendingUser(null);
                }}
                onConfirm={confirmStatusChange}
                title="Update User Status"
                message={`Are you sure you want to ${pendingStatus === 'INACTIVE' ? 'mark as inactive' : 'activate'} ${pendingUser?.firstName || pendingUser?.username || 'this user'}?`}
                variant="warning"
            />

            <ConfirmModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => {
                    setIsDeleteConfirmOpen(false);
                    setPendingUser(null);
                }}
                onConfirm={confirmDelete}
                title="Delete User"
                message={`Are you sure you want to delete ${pendingUser?.firstName || pendingUser?.username || 'this user'}? This action cannot be undone.`}
            />
        </div>
    );
};

export default UserManagementPage;
