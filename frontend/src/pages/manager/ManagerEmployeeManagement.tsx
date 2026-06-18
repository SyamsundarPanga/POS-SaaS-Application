import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAppSelector } from '../../store/hooks';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import DataTable, { Column } from '../../components/ui/DataTable';
import EnhancedModal from '../../components/ui/EnhancedModal';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import AddUserModal from '../../components/modal/AddUserModal';
import toast from '../../utils/toast';
import {
    Users,
    Search,
    Plus,
    Edit,
    UserX,
    UserCheck,
    Trash2,
    CheckCircle,
    XCircle,
    Filter,
    X,
    ChevronDown,
    MoreVertical,
    Download,
    FileText,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import userService, { CreateUserRequest } from '../../services/userService';
import managerReportService from '../../services/managerReportService';
import ConfirmModal from '../../components/ui/ConfirmModal';

interface UserDto {
    id: number;
    username?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    role: string;
    status: 'ACTIVE' | 'INACTIVE';
    branchId?: number | null;
    totalSales?: number;
    todaySales?: number;
    shiftCount?: number;
}

interface Employee {
    id: number;
    name: string;
    email: string;
    role: string;
    status: 'ACTIVE' | 'INACTIVE';
    branchId?: number | null;
    hireDate: string;
    totalSales: number;
    todaySales: number;
    shiftCount: number;
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

const ManagerEmployeeManagement: React.FC = () => {
    const { user } = useAppSelector((state) => state.auth);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const pageSize = 12;
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);
    const [actionMenuPosition, setActionMenuPosition] = useState<{ top: number; left: number } | null>(null);
    const actionMenuRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        role: 'ROLE_CASHIER',
        password: '',
    });
    const [formErrors, setFormErrors] = useState<{
        username?: string;
        email?: string;
        role?: string;
        password?: string;
    }>({});
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        action: 'status' | 'delete' | null;
        employee: Employee | null;
        nextStatus?: 'ACTIVE' | 'INACTIVE';
    }>({
        isOpen: false,
        action: null,
        employee: null,
    });
    const [reportBusy, setReportBusy] = useState(false);

    const [showFormCloseConfirm, setShowFormCloseConfirm] = useState(false);

    const handleFormCloseAttempt = () => {
        const isDirty = formData.username !== '' || formData.email !== '' || (formData.password !== '' && !isEditMode);
        if (isDirty) {
            setShowFormCloseConfirm(true);
        } else {
            setIsFormModalOpen(false);
            setFormErrors({});
        }
    };

    const hasRole = (role: string) => {
        const roleList: string[] = Array.isArray(user?.roles) ? user.roles : [];
        return roleList.includes(role) || user?.role === role;
    };

    const formatRole = (role: string) => role.replace('ROLE_', '').replace('_', ' ');

    const resolveBranchId = async (): Promise<number | null> => {
        if (typeof user?.branchId === 'number') {
            return user.branchId;
        }

        try {
            const response = await userService.getProfile();
            return response.data?.branchId ?? null;
        } catch {
            return null;
        }
    };

    const mapUsersToEmployees = (users: UserDto[]): Employee[] =>
        users.map((u) => {
            const firstName = (u.firstName || '').trim();
            const lastName = (u.lastName || '').trim();
            const fullName = `${firstName} ${lastName}`.trim() || u.username || 'Unknown';

            return {
                id: u.id,
                name: fullName,
                email: u.email,
                role: u.role,
                status: u.status,
                branchId: u.branchId ?? null,
                hireDate: new Date().toISOString(),
                totalSales: u.totalSales || 0,
                todaySales: u.todaySales || 0,
                shiftCount: u.shiftCount || 0,
            };
        });

    useEffect(() => {
        fetchEmployees();
    }, [currentPage]);

    useEffect(() => {
        setCurrentPage(0);
    }, [searchTerm, statusFilter]);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            let users: UserDto[] = [];
            const branchId = await resolveBranchId();

            if (branchId !== null) {
                const response = await userService.getEmployeesByBranch(branchId, currentPage, pageSize);
                users = Array.isArray(response.data?.content) ? response.data.content : Array.isArray(response.data) ? response.data : [];
                setTotalPages(response.data?.totalPages || 0);
                setTotalElements(response.data?.totalElements || users.length);
            } else if (hasRole('ROLE_STORE_ADMIN')) {
                const response = await userService.getUsers(currentPage, pageSize);
                users = Array.isArray(response.data?.content)
                    ? response.data.content
                    : Array.isArray(response.data)
                        ? response.data
                        : [];
                setTotalPages(response.data?.totalPages || 0);
                setTotalElements(response.data?.totalElements || users.length);
            }

            const mappedEmployees = mapUsersToEmployees(users);
            setEmployees(mappedEmployees);
            setFilteredEmployees(mappedEmployees);
        } catch (error) {
            console.error('Error fetching employees:', error);
            toast.error('Failed to load employees');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let filtered = [...employees];

        if (searchTerm) {
            filtered = filtered.filter(e =>
                e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (statusFilter !== 'ALL') {
            filtered = filtered.filter(e => e.status === statusFilter);
        }

        setFilteredEmployees(filtered);
    }, [searchTerm, statusFilter, employees]);

    useEffect(() => {
        const closeActionMenu = () => {
            setOpenActionMenuId(null);
            setActionMenuPosition(null);
        };

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const isTrigger = target.closest('.action-menu-trigger');

            if (actionMenuRef.current && !actionMenuRef.current.contains(target) && !isTrigger) {
                closeActionMenu();
            }
        };

        window.addEventListener('resize', closeActionMenu);
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('resize', closeActionMenu);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleAddEmployee = () => {
        setIsEditMode(false);
        setSelectedEmployee(null);
        setFormData({ username: '', email: '', role: 'ROLE_CASHIER', password: '' });
        setFormErrors({});
        setIsFormModalOpen(true);
    };

    const handleEditEmployee = (employee: Employee) => {
        setIsEditMode(true);
        setSelectedEmployee(employee);
        setFormData({
            username: employee.name,
            email: employee.email,
            role: employee.role,
            password: '',
        });
        setFormErrors({});
        setIsFormModalOpen(true);
    };

    const validateForm = () => {
        const errors: {
            username?: string;
            email?: string;
            role?: string;
            password?: string;
        } = {};

        if (!formData.username.trim()) {
            errors.username = 'Username is required';
        }

        if (!formData.email.trim()) {
            errors.email = 'Email is required';
        } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
            errors.email = 'Enter a valid email address';
        }

        if (!formData.role) {
            errors.role = 'Role is required';
        }

        if (!isEditMode && !formData.password.trim()) {
            errors.password = 'Password is required';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        try {
            if (isEditMode && selectedEmployee) {
                await userService.updateEmployee(selectedEmployee.id, {
                    username: formData.username.trim(),
                    firstName: formData.username.trim(),
                    lastName: '-',
                    email: formData.email,
                    branchId: selectedEmployee.branchId ?? undefined,
                });
                toast.success('Employee updated successfully');
            } else {
                const branchId = await resolveBranchId();
                if (branchId === null) {
                    toast.error('Branch not found for current user');
                    return;
                }

                const payload: CreateUserRequest = {
                    username: formData.username.trim(),
                    email: formData.email,
                    password: formData.password,
                    role: hasRole('ROLE_BRANCH_MANAGER')
                        ? 'ROLE_CASHIER'
                        : (formData.role as CreateUserRequest['role']),
                    branchId,
                    firstName: formData.username.trim(),
                    lastName: '-',
                };

                await userService.createUser(payload);
                toast.success('Employee added successfully');
            }
            setIsFormModalOpen(false);
            await fetchEmployees();
        } catch (error) {
            console.error('Error saving employee:', error);
            const anyErr = error as any;
            const backendMessage =
                anyErr?.response?.data?.message ||
                anyErr?.response?.data?.error ||
                (typeof anyErr?.response?.data === 'string' ? anyErr.response.data : null) ||
                anyErr?.message;

            toast.error(backendMessage || 'Failed to save employee');
        }
    };

    const handleStatusChange = (employee: Employee) => {
        const nextStatus = employee.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        setConfirmModal({
            isOpen: true,
            action: 'status',
            employee,
            nextStatus,
        });
    };

    const handleDeleteEmployee = (employee: Employee) => {
        setConfirmModal({
            isOpen: true,
            action: 'delete',
            employee,
        });
    };

    const handleConfirmAction = async () => {
        if (!confirmModal.employee || !confirmModal.action) return;

        try {
            if (confirmModal.action === 'status' && confirmModal.nextStatus) {
                await userService.changeEmployeeStatus(confirmModal.employee.id, {
                    status: confirmModal.nextStatus,
                });
                toast.success(
                    confirmModal.nextStatus === 'INACTIVE'
                        ? 'Employee marked as inactive'
                        : 'Employee activated successfully'
                );
            } else if (confirmModal.action === 'delete') {
                await userService.deactivateEmployee(confirmModal.employee.id);
                toast.success('Employee deleted successfully');
            }

            setConfirmModal({
                isOpen: false,
                action: null,
                employee: null,
            });
            await fetchEmployees();
        } catch (error) {
            console.error('Error performing employee action:', error);
            toast.error(
                confirmModal.action === 'delete'
                    ? 'Failed to delete employee'
                    : 'Failed to update employee status'
            );
        }
    };

    const handleExportEmployees = async () => {
        try {
            setReportBusy(true);
            await managerReportService.exportEmployeePerformanceCsv();
            toast.success('Branch employee performance exported');
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to export employee performance');
        } finally {
            setReportBusy(false);
        }
    };

    const handleExportEmployeesPdf = async () => {
        try {
            setReportBusy(true);
            await managerReportService.exportEmployeePerformancePdf();
            toast.success('Branch employee performance PDF exported');
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to export employee performance PDF');
        } finally {
            setReportBusy(false);
        }
    };

    const columns: Column<Employee>[] = [
        {
            key: 'name',
            header: 'Employee',
            render: (_value, employee) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-emerald-600">
                            {employee.name.split(' ').map(n => n[0]).join('')}
                        </span>
                    </div>
                    <div className="min-w-0 overflow-hidden">
                        <div className="font-bold text-slate-900 truncate">{employee.name}</div>
                        <div className="text-xs text-slate-500 truncate">{employee.email}</div>
                    </div>
                </div>
            ),
        },
        {
            key: 'role',
            header: 'Role',
            render: (_value, employee) => (
                <span className="text-xs font-medium text-slate-600 bg-white px-2 py-1 rounded">
                    {formatRole(employee.role)}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (_value, employee) => (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${employee.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                    {employee.status === 'ACTIVE' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {employee.status}
                </span>
            ),
        },
        {
            key: 'totalSales',
            header: 'Total Sales',
            render: (_value, employee) => (
                <span className="text-sm font-bold text-emerald-600">
                    ₹{employee.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
            ),
        },
        {
            key: 'todaySales',
            header: 'Today',
            render: (_value, employee) => (
                <span className="text-sm font-medium text-slate-700">
                    ₹{employee.todaySales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
            ),
        },
        {
            key: 'shiftCount',
            header: 'Shifts',
            render: (_value, employee) => (
                <span className="text-sm font-medium text-slate-700">
                    {employee.shiftCount}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (_value, employee) => (
                <div className="flex justify-center pr-4">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (openActionMenuId === employee.id) {
                                setOpenActionMenuId(null);
                                setActionMenuPosition(null);
                                return;
                            }

                            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                            const containerRect = containerRef.current?.getBoundingClientRect() || { top: 0, left: 0 };

                            setOpenActionMenuId(employee.id);
                            setActionMenuPosition({
                                top: rect.bottom - containerRect.top + 8,
                                left: rect.right - containerRect.left - 176,
                            });
                        }}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600 action-menu-trigger"
                    >
                        <MoreVertical className="w-5 h-5" />
                    </button>
                </div>
            ),
        },
    ];

    const activeCount = employees.filter(e => e.status === 'ACTIVE').length;
    const inactiveCount = employees.filter(e => e.status === 'INACTIVE').length;

    return (
        <>
            <div className="flex h-screen bg-white overflow-hidden font-sans">
                <Sidebar />

                <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                    <Header />

                    <main className="flex-1 overflow-y-auto bg-white">
                        <motion.div
                            ref={containerRef}
                            className="max-w-7xl mx-auto px-6 py-6 lg:px-10 relative"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            <motion.header className="mb-8" variants={itemVariants}>
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                    <div className="flex-1">
                                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1 block">
                                            Branch Manager Portal
                                        </span>
                                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                            Employee Management
                                        </h1>
                                        <p className="text-slate-500 font-medium">
                                            Manage employees, roles, and performance
                                        </p>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                        {/* Header Search */}
                                        <div className="relative min-w-[240px]">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                placeholder="Search employees..."
                                                className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-500 outline-none transition-all text-sm font-medium"
                                            />
                                            {searchTerm && (
                                                <button
                                                    onClick={() => setSearchTerm('')}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-200 rounded-full transition-colors"
                                                >
                                                    <X className="w-3.5 h-3.5 text-slate-400" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Header Filter (Styled as per OrderHistoryPage) */}
                                        <div className="relative w-40">
                                            <button
                                                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-left focus:border-emerald-500 outline-none transition-all flex items-center justify-between text-sm font-bold text-slate-700"
                                            >
                                                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <span className="truncate">
                                                    {statusFilter === 'ALL' ? 'All Status' : statusFilter === 'ACTIVE' ? 'Active' : 'Inactive'}
                                                </span>
                                                <div className={`w-4 h-4 transition-transform duration-200 ${isStatusDropdownOpen ? 'rotate-180' : ''}`}>
                                                    <ChevronDown className="w-4 h-4" />
                                                </div>
                                            </button>

                                            {isStatusDropdownOpen && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-30"
                                                        onClick={() => setIsStatusDropdownOpen(false)}
                                                    />
                                                    <div className="absolute z-40 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl py-2 animate-in fade-in zoom-in-95 duration-200">
                                                        {['ALL', 'ACTIVE', 'INACTIVE'].map((status) => (
                                                            <button
                                                                key={status}
                                                                type="button"
                                                                onClick={() => {
                                                                    setStatusFilter(status);
                                                                    setIsStatusDropdownOpen(false);
                                                                }}
                                                                className={`w-full text-left px-4 py-2 text-sm transition-colors ${statusFilter === status
                                                                    ? 'bg-emerald-50 text-emerald-700 font-bold'
                                                                    : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                                                                    }`}
                                                            >
                                                                {status === 'ALL' ? 'All Status' : status === 'ACTIVE' ? 'Active' : 'Inactive'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <button
                                            onClick={handleExportEmployees}
                                            disabled={reportBusy}
                                            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-60"
                                            title="Export Employee Performance CSV"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={handleExportEmployeesPdf}
                                            disabled={reportBusy}
                                            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-60"
                                            title="Export Employee Performance PDF"
                                        >
                                            <FileText className="w-4 h-4" />
                                        </button>

                                        <button
                                            onClick={handleAddEmployee}
                                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-sm active:scale-95 whitespace-nowrap min-w-[140px]"
                                        >
                                            <Plus className="w-5 h-5" />
                                            Add Employee
                                        </button>
                                    </div>
                                </div>
                            </motion.header>

                            {/* Statistics */}
                            <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8" variants={itemVariants}>
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                            Total Employees
                                        </span>
                                        <Users className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div className="text-2xl font-black text-slate-900">{employees.length}</div>
                                </div>
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                            Active
                                        </span>
                                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div className="text-2xl font-black text-emerald-600">{activeCount}</div>
                                </div>
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                            Inactive
                                        </span>
                                        <XCircle className="w-5 h-5 text-red-500" />
                                    </div>
                                    <div className="text-2xl font-black text-red-600">{inactiveCount}</div>
                                </div>
                            </motion.div>

                            {/* Employees Table */}
                            <motion.div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" variants={itemVariants}>
                                {loading ? (
                                    <div className="p-6">
                                        <LoadingSkeleton count={5} />
                                    </div>
                                ) : filteredEmployees.length === 0 ? (
                                    <EmptyState
                                        icon={Users}
                                        title="No employees found"
                                        description="No employees match your current filters."
                                    />
                                ) : (
                                    <DataTable
                                        data={filteredEmployees}
                                        columns={columns}
                                        filterable={false}
                                        paginated={true}
                                        pageSize={10}
                                    />
                                )}
                            </motion.div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
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

                            {/* Persistent Action Menu */}
                            {openActionMenuId !== null && actionMenuPosition && (
                                <div
                                    ref={actionMenuRef}
                                    className="absolute w-44 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-[40]"
                                    style={{
                                        top: `${actionMenuPosition.top}px`,
                                        left: `${Math.max(12, actionMenuPosition.left)}px`,
                                    }}
                                >
                                    {(() => {
                                        const menuEmployee = employees.find((e) => e.id === openActionMenuId);
                                        if (!menuEmployee) return null;

                                        return (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        handleEditEmployee(menuEmployee);
                                                        setOpenActionMenuId(null);
                                                        setActionMenuPosition(null);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                                                >
                                                    <Edit className="w-4 h-4 text-blue-500" />
                                                    Edit Profile
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        handleStatusChange(menuEmployee);
                                                        setOpenActionMenuId(null);
                                                        setActionMenuPosition(null);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                                                >
                                                    {menuEmployee.status === 'ACTIVE' ? (
                                                        <>
                                                            <UserX className="w-4 h-4 text-amber-500" />
                                                            Deactivate
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UserCheck className="w-4 h-4 text-emerald-500" />
                                                            Activate
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        handleDeleteEmployee(menuEmployee);
                                                        setOpenActionMenuId(null);
                                                        setActionMenuPosition(null);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors border-t border-slate-50 mt-1 pt-2"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Delete Employee
                                                </button>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </motion.div>
                    </main>
                </div>
            </div>

            {isFormModalOpen && (
                <AddUserModal
                    onClose={() => {
                        setFormErrors({});
                        setIsFormModalOpen(false);
                        setSelectedEmployee(null);
                    }}
                    onSuccess={() => {
                        void fetchEmployees();
                    }}
                    user={selectedEmployee
                        ? {
                            id: selectedEmployee.id,
                            username: selectedEmployee.name,
                            email: selectedEmployee.email,
                            firstName: selectedEmployee.name,
                            lastName: '-',
                            role: selectedEmployee.role as 'ROLE_STORE_ADMIN' | 'ROLE_BRANCH_MANAGER' | 'ROLE_CASHIER' | 'ROLE_VIEWER',
                            branchId: selectedEmployee.branchId ?? null,
                        }
                        : null}
                    allowedRoles={['ROLE_CASHIER']}
                    fixedBranchId={user?.branchId ?? null}
                />
            )}

            <EnhancedModal
                isOpen={confirmModal.isOpen}
                onClose={() =>
                    setConfirmModal({
                        isOpen: false,
                        action: null,
                        employee: null,
                    })
                }
                title="Warning"
                size="small"
            >
                <div className="space-y-5">
                    <p className="text-sm text-slate-700">
                        {confirmModal.action === 'status' && confirmModal.employee
                            ? `Are you sure you want to ${confirmModal.nextStatus === 'INACTIVE' ? 'mark as inactive' : 'activate'
                            } ${confirmModal.employee.name}?`
                            : confirmModal.action === 'delete' && confirmModal.employee
                                ? `Are you sure you want to delete ${confirmModal.employee.name}`
                                : 'Are you sure you want to continue?'}
                    </p>
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() =>
                                setConfirmModal({
                                    isOpen: false,
                                    action: null,
                                    employee: null,
                                })
                            }
                            className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmAction}
                            className={`flex-1 py-3 text-white rounded-xl font-bold transition-colors ${confirmModal.action === 'delete'
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-amber-600 hover:bg-amber-700'
                                }`}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </EnhancedModal>
        </>
    );
};

export default ManagerEmployeeManagement;
