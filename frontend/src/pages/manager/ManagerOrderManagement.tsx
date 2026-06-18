import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';

import EnhancedModal from '../../components/ui/EnhancedModal';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import DateRangePicker from '../../components/ui/DateRangePicker';
import RefundModal, { RefundData } from '../../features/pos/RefundModal';
import toast from '../../utils/toast';
import orderService, { Order as OrderType, OrderLineItem } from '../../services/orderService';
import userService from '../../services/userService';
import {
    FileText,
    Printer,
    Mail,
    IndianRupee,
    ShoppingBag,
    Users,
    ChevronLeft,
    ChevronRight,
    Calendar,
    MoreVertical,
    X,
    CheckCircle,
    Clock,
    XCircle,
    AlertCircle,
    Eye,
    RotateCcw,
    Download,
    RefreshCw,
    Search,
    Filter
} from 'lucide-react';

interface Order extends Omit<OrderType, 'items'> {
    orderNumber: string;
    customerEmail?: string;
    subtotal: number;
    tax: number;
    subtotalBeforeDiscount?: number;
    taxAmount?: number;
    discountAmount?: number;
    finalTotal?: number;
    payments?: Array<{
        id?: number;
        method: string;
        amount: number;
        status?: string;
        transactionId?: string;
    }>;
    customer?: {
        id?: number;
        name?: string;
        fullName?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        role?: string;
    };
    originalLineItems?: Array<{
        id: number;
        productId: number;
        productName: string;
        sku?: string;
        quantity: number;
        price: number;
        unitPrice: number;
        discount?: number;
        subtotal: number;
    }>;
    items: Array<{
        id: number;
        productId: number;
        productName: string;
        sku?: string;
        quantity: number;
        price: number;
        unitPrice: number;
        discount?: number;
        subtotal: number;
    }>;
}

type ManagerOrderItem = Order['items'][number];

interface DisplayOrderItem extends ManagerOrderItem {
    originalQuantity: number;
    netQuantity: number;
    refundedQuantity: number;
    refundAmount: number;
    netSubtotal: number;
}

interface CashierOption {
    id: number;
    name: string;
}

const transformOrderForView = (order: any): Order => ({
    ...order,
    orderDate: order.createdAt,
    customerName: order.customerName || 'Walk-in Customer',
    originalLineItems: (order.originalLineItems || order.lineItems || order.items || []).map((item: any) => ({
        id: item.id || item.productId,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku || `SKU-${item.productId}`,
        quantity: item.quantity,
        price: item.price ?? item.unitPrice ?? 0,
        unitPrice: item.price ?? item.unitPrice ?? 0,
        discount: item.discount || 0,
        subtotal: item.lineTotal ?? item.subtotal ?? 0
    })),
    items: (order.lineItems || order.items || []).map((item: any) => ({
        id: item.id || item.productId,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku || `SKU-${item.productId}`,
        quantity: item.quantity,
        price: item.price ?? item.unitPrice ?? 0,
        unitPrice: item.price ?? item.unitPrice ?? 0,
        discount: item.discount || 0,
        subtotal: item.lineTotal ?? item.subtotal ?? 0
    })),
    subtotalBeforeDiscount: order.subtotalBeforeDiscount ?? order.subtotal,
    taxAmount: order.taxAmount ?? order.tax,
    discountAmount: order.discountAmount ?? order.discount,
    finalTotal: order.finalTotal ?? order.total,
    payments: Array.isArray(order.payments) ? order.payments : []
});

const getDisplayItemsForModal = (order: Order): DisplayOrderItem[] => {
    const originalItems = order.originalLineItems || order.items || [];
    const currentByProduct = new Map((order.items || []).map((item) => [item.productId, item]));

    return originalItems.map((original, index) => {
        const current = currentByProduct.get(original.productId);
        const originalQty = Number(original.quantity || 0);
        const currentQty = Number(current?.quantity ?? originalQty);
        const refundedQty = Math.max(0, originalQty - currentQty);
        const unitPrice = Number(original.price ?? original.unitPrice ?? 0);
        const netSubtotal = Number((unitPrice * currentQty).toFixed(2));
        const refundAmount = Number((unitPrice * refundedQty).toFixed(2));

        return {
            ...(current || original),
            id: (current || original).id ?? original.id ?? index,
            originalQuantity: originalQty,
            netQuantity: currentQty,
            refundedQuantity: refundedQty,
            refundAmount,
            netSubtotal,
        };
    });
};

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

const ManagerOrderManagement: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [cashierFilter, setCashierFilter] = useState<number | 'ALL'>('ALL');
    const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
        start: null,
        end: null,
    });
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [cashiers, setCashiers] = useState<CashierOption[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
    const [isCashierFilterOpen, setIsCashierFilterOpen] = useState(false);
    const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
    const [dateFilter, setDateFilter] = useState('today');
    const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);
    const actionMenuRef = useRef<HTMLDivElement | null>(null);

    const pageSize = 12;
    const [filteredRevenue, setFilteredRevenue] = useState(0);
    const [filteredCompletedCount, setFilteredCompletedCount] = useState(0);
    const [filteredRefundCount, setFilteredRefundCount] = useState(0);

    useEffect(() => {
        fetchOrders();
    }, [currentPage, searchTerm, statusFilter, cashierFilter, dateFilter, dateRange]);

    useEffect(() => {
        fetchRevenueForActiveFilters();
    }, [searchTerm, statusFilter, cashierFilter, dateFilter, dateRange]);

    useEffect(() => {
        fetchCashiers();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const isTrigger = target.closest('.action-menu-trigger');

            if (actionMenuRef.current && !actionMenuRef.current.contains(target) && !isTrigger) {
                setOpenActionMenuId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatDateForApi = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const buildOrderFilters = (page?: number, size?: number) => {
        const filters: any = {};

        if (page !== undefined) filters.page = page;
        if (size !== undefined) filters.size = size;
        if (searchTerm) filters.search = searchTerm;
        if (cashierFilter !== 'ALL') filters.cashierId = cashierFilter;
        if (statusFilter !== 'ALL') filters.status = statusFilter;

        if (dateFilter !== 'custom') {
            const { startDate, endDate } = getDateRange(dateFilter);
            filters.startDate = startDate;
            filters.endDate = endDate;
        } else {
            if (dateRange.start) filters.startDate = formatDateForApi(dateRange.start);
            if (dateRange.end) filters.endDate = formatDateForApi(dateRange.end);
        }

        filters.sort = 'createdAt,desc';

        return filters;
    };

    const getCurrentBranchId = async (): Promise<number | null> => {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (userData?.branchId) {
            return Number(userData.branchId);
        }

        try {
            const profileResponse = await userService.getProfile();
            return profileResponse?.data?.branchId ? Number(profileResponse.data.branchId) : null;
        } catch {
            return null;
        }
    };

    const fetchCashiers = async () => {
        try {
            const branchId = await getCurrentBranchId();
            if (branchId) {
                const response = await userService.getEmployeesByBranch(Number(branchId));
                const cashierOptions = (response.data || [])
                    .filter((emp: any) => String(emp?.role || '').toUpperCase().includes('CASHIER'))
                    .map((emp: any) => ({
                        id: emp.id,
                        name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.username || `Cashier #${emp.id}`
                    }))
                    .sort((a: CashierOption, b: CashierOption) => a.name.localeCompare(b.name));
                setCashiers(cashierOptions);
            }
        } catch (error) {
            console.error('Error fetching cashiers:', error);
        }
    };

    const getDateRange = (filter: string) => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setHours(23, 59, 59, 999);

        if (filter === 'week') {
            const day = start.getDay();
            start.setDate(start.getDate() - day); // Start of current week (Sunday)
        } else if (filter === 'month') {
            start.setDate(1); // Start of month
        } else if (filter === 'year') {
            start.setMonth(0, 1); // Start of year
        }

        return {
            startDate: formatDateForApi(start),
            endDate: formatDateForApi(end)
        };
    };

    const fetchRevenueForActiveFilters = async () => {
        try {
            const revenuePageSize = 200;
            let page = 0;
            let pages = 1;
            let totalRevenue = 0;
            let completedCount = 0;
            let refundCount = 0;

            while (page < pages) {
                const response = await orderService.manager.getOrders(buildOrderFilters(page, revenuePageSize));
                const pageOrders = response?.content || [];

                totalRevenue += pageOrders.reduce((sum: number, order: any) => {
                    if (order?.status === 'COMPLETED') {
                        return sum + Number(order?.total || 0);
                    }
                    return sum;
                }, 0);
                completedCount += pageOrders.filter((order: any) => order?.status === 'COMPLETED').length;
                refundCount += pageOrders.filter((order: any) => ['REFUNDED', 'PARTIAL_REFUND'].includes(order?.status)).length;

                pages = response?.totalPages || 0;
                if (pages === 0) break;
                page += 1;
            }

            setFilteredRevenue(totalRevenue);
            setFilteredCompletedCount(completedCount);
            setFilteredRefundCount(refundCount);
        } catch (error) {
            console.error('Error fetching revenue for filters:', error);
            setFilteredRevenue(0);
            setFilteredCompletedCount(0);
            setFilteredRefundCount(0);
        }
    };

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const response = await orderService.manager.getOrders(buildOrderFilters(currentPage, pageSize));

            const transformedOrders = response.content
                .map(transformOrderForView)
                .sort((a: Order, b: Order) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setOrders(transformedOrders);
            setTotalPages(response.totalPages);
            setTotalElements(response.totalElements);
        } catch (error) {
            console.error('Error fetching orders:', error);
            toast.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    // Helper function to get items from order
    const getOrderItems = (order: Order): any[] => {
        return order.items || [];
    };

    const getCustomerDisplay = (order: Order): { name: string; email?: string } => {
        const anyOrder = order as any;
        const trimOrUndefined = (value?: string | null): string | undefined => {
            const v = typeof value === 'string' ? value.trim() : '';
            return v.length > 0 ? v : undefined;
        };

        const isStaffRole = (role?: string): boolean => {
            const r = (role || '').toUpperCase();
            return r.includes('CASHIER') || r.includes('MANAGER') || r.includes('ADMIN');
        };

        const explicitName = trimOrUndefined(order.customerName);
        const explicitEmail = trimOrUndefined(order.customerEmail);

        const nestedRole = trimOrUndefined(order.customer?.role);
        const nestedName = trimOrUndefined(
            order.customer?.name ||
            order.customer?.fullName ||
            [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(' ')
        );
        const nestedEmail = trimOrUndefined(order.customer?.email);
        const legacyName = trimOrUndefined(
            anyOrder.customerFullName ||
            [anyOrder.customerFirstName, anyOrder.customerLastName].filter(Boolean).join(' ')
        );
        const legacyEmail = trimOrUndefined(anyOrder.customerMail || anyOrder.customer_email);

        // Prefer explicit customer fields from order summary/detail.
        if (explicitName && explicitName.toLowerCase() !== 'guest' && explicitName !== order.cashierName) {
            return { name: explicitName, email: explicitEmail };
        }

        // Fallback to nested customer object only if it does not look like staff.
        if (!isStaffRole(nestedRole) && nestedName && nestedName !== order.cashierName) {
            return { name: nestedName, email: nestedEmail || explicitEmail };
        }

        if (legacyName && legacyName !== order.cashierName) {
            return { name: legacyName, email: legacyEmail || explicitEmail };
        }

        return { name: 'Walk-in Customer', email: explicitEmail || nestedEmail || legacyEmail };
    };

    const loadFullOrder = async (order: Order): Promise<Order> => {
        const response = await orderService.getById(order.id);
        return transformOrderForView(response.data);
    };

    const handleViewDetails = async (order: Order) => {
        try {
            const fullOrder = await loadFullOrder(order);
            setSelectedOrder(fullOrder);
            setIsDetailModalOpen(true);
        } catch (error) {
            console.error('Error loading order details:', error);
            toast.error('Failed to load order details');
        }
    };

    const toSafeAmount = (value: unknown): number => {
        const numericValue = Number(value);
        return Number.isFinite(numericValue) ? numericValue : 0;
    };

    const roundCurrency = (value: number): number => Number(value.toFixed(2));

    const getPositivePayments = (order: Order) =>
        (order.payments || []).filter((payment) => Number(payment.amount || 0) > 0);

    const getRefundPayments = (order: Order) =>
        (order.payments || []).filter((payment) => Number(payment.amount || 0) < 0);

    const getGrossPaidAmount = (order: Order) =>
        getPositivePayments(order).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const getRefundedAmount = (order: Order) =>
        Math.abs(getRefundPayments(order).reduce((sum, payment) => sum + Number(payment.amount || 0), 0));

    const getNetPaidAmount = (order: Order) => {
        if (!order.payments || order.payments.length === 0) {
            return toSafeAmount(order.finalTotal ?? order.total);
        }

        return order.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    };

    const getOrderFinancials = (order: Order) => {
        const subtotalBase = toSafeAmount(order.subtotalBeforeDiscount ?? order.subtotal);
        let subtotal = subtotalBase > 0 ? subtotalBase : 0;
        let tax = toSafeAmount(order.taxAmount ?? order.tax);
        let discount = toSafeAmount(order.discountAmount ?? order.discount);
        const paidAmount = roundCurrency(getNetPaidAmount(order));
        const declaredTotal = toSafeAmount(order.finalTotal ?? order.total);
        let total = declaredTotal > 0 ? declaredTotal : paidAmount;

        if (subtotal > 0 && tax >= 0 && discount <= 0 && total > 0) {
            const inferredDiscount = roundCurrency(subtotal + tax - total);
            if (inferredDiscount > 0 && inferredDiscount <= subtotal) {
                discount = inferredDiscount;
            }
        }

        if (subtotal > 0 && tax <= 0 && discount >= 0 && total > 0) {
            const inferredTax = roundCurrency(total + discount - subtotal);
            if (inferredTax > 0) {
                tax = inferredTax;
            }
        }

        if (subtotal <= 0) {
            const lineSubtotal = roundCurrency(
                (order.items || []).reduce((sum, item) => sum + toSafeAmount(item.subtotal), 0),
            );
            subtotal = lineSubtotal > 0 ? lineSubtotal : 0;
        }

        if (total <= 0) {
            total = paidAmount > 0 ? paidAmount : roundCurrency(subtotal + tax - discount);
        }

        return {
            subtotal: roundCurrency(subtotal),
            tax: roundCurrency(Math.max(0, tax)),
            discount: roundCurrency(Math.max(0, discount)),
            total: roundCurrency(total),
        };
    };

    const getRefundAllocations = (
        items: DisplayOrderItem[],
        refundedAmount: number,
        financials?: { subtotal: number; tax: number; discount: number } | null,
    ) => {
        const allocations = new Map<number, number>();
        const refundableItems = items.filter((item) => item.refundedQuantity > 0 && item.refundAmount > 0);

        if (refundableItems.length === 0) {
            return allocations;
        }

        const totalRefundBase = refundableItems.reduce((sum, item) => sum + item.refundAmount, 0);
        const shouldAllocateFromPayments = refundedAmount > 0 && totalRefundBase > 0;
        let allocatedSoFar = 0;

        refundableItems.forEach((item, index) => {
            let allocated = item.refundAmount;
            if (shouldAllocateFromPayments) {
                if (index === refundableItems.length - 1) {
                    allocated = roundCurrency(refundedAmount - allocatedSoFar);
                } else {
                    allocated = roundCurrency((refundedAmount * item.refundAmount) / totalRefundBase);
                    allocatedSoFar += allocated;
                }
            } else if (financials && financials.subtotal > 0) {
                const ratio = item.refundAmount / financials.subtotal;
                const proportionalTax = financials.tax * ratio;
                const proportionalDiscount = financials.discount * ratio;
                allocated = roundCurrency(item.refundAmount + proportionalTax - proportionalDiscount);
            }
            allocations.set(item.productId, Math.max(0, allocated));
        });

        return allocations;
    };

    const getPaymentMethods = (paymentMethod?: string): string[] => {
        if (!paymentMethod) return [];
        return paymentMethod
            .split('+')
            .map((method) => method.trim())
            .filter(Boolean);
    };

    const handleRefund = async (order: Order) => {
        try {
            const fullOrder = await loadFullOrder(order);
            if (!fullOrder.items || fullOrder.items.length === 0) {
                toast.error('No refundable items found for this order');
                return;
            }
            setSelectedOrder(fullOrder);
            setIsRefundModalOpen(true);
        } catch (error) {
            console.error('Error loading order for refund:', error);
            toast.error('Failed to load refund details');
        }
    };

    const handleProcessRefund = async (refundData: RefundData) => {
        if (!selectedOrder) return;

        const refundRequest = {
            orderId: selectedOrder.id,
            reason: refundData.reason,
            customReason: refundData.customReason,
            refundAmount: refundData.refundAmount,
            managerPin: refundData.managerPin,
            items: refundData.items.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
            })),
        };

        try {
            await orderService.manager.processRefund(selectedOrder.id, refundRequest);

            const refundByProduct = new Map<number, number>();
            refundData.items.forEach((item) => {
                refundByProduct.set(item.productId, (refundByProduct.get(item.productId) || 0) + item.quantity);
            });
            const isFullRefund = selectedOrder.items.every((orderItem) => {
                return (refundByProduct.get(orderItem.productId) || 0) >= orderItem.quantity;
            });
            const nextStatus: Order['status'] = isFullRefund ? 'REFUNDED' : 'PARTIAL_REFUND';

            const applyLocalRefund = (order: Order): Order => {
                const updatedItems = (order.items || [])
                    .map((item) => {
                        const refundedQty = refundByProduct.get(item.productId) || 0;
                        if (refundedQty <= 0) return item;

                        const newQty = Math.max(0, item.quantity - refundedQty);
                        const unitSubtotal = item.quantity > 0 ? (item.subtotal || 0) / item.quantity : 0;
                        return {
                            ...item,
                            quantity: newQty,
                            subtotal: Number((unitSubtotal * newQty).toFixed(2))
                        };
                    })
                    .filter((item) => item.quantity > 0);

                return {
                    ...order,
                    status: nextStatus,
                    items: updatedItems
                };
            };

            setOrders((prev) => prev.map((order) => (
                order.id === selectedOrder.id ? applyLocalRefund(order) : order
            )));
            setSelectedOrder((prev) => (prev && prev.id === selectedOrder.id ? applyLocalRefund(prev) : prev));

            toast.success('Refund processed successfully');
            setIsRefundModalOpen(false);
            setIsDetailModalOpen(false);
        } catch (error: any) {
            console.error('Refund error:', error);
            const message = String(error?.response?.data?.message || error?.message || '');
            const isRazorpayRouteError =
                message.includes('Razorpay refund failed') &&
                (message.includes('Status Code: 404') || message.includes('no Route matched with those values'));
            const isCompletedOnlyError = message.includes('Only completed orders can be refunded');
            const isUnexpectedServerError =
                message.toLowerCase().includes('an unexpected error occurred') ||
                Number(error?.response?.status) >= 500;

            const shouldTryFallback =
                Boolean(selectedOrder) &&
                (isRazorpayRouteError || isCompletedOnlyError || isUnexpectedServerError);

            if (!shouldTryFallback) {
                toast.error(error.response?.data?.message || 'Failed to process refund');
                throw error;
            }

            try {
                // Fallback for stale backend builds where manager refund still tries Razorpay with null transaction.
                await orderService.processRefund(refundRequest);

                const requestedQtyByProduct = new Map<number, number>();
                refundData.items.forEach((item) => {
                    requestedQtyByProduct.set(
                        item.productId,
                        (requestedQtyByProduct.get(item.productId) || 0) + item.quantity
                    );
                });

                const isFullRefund = selectedOrder.items.every((orderItem) => {
                    return (requestedQtyByProduct.get(orderItem.productId) || 0) >= orderItem.quantity;
                });

                try {
                    await orderService.updateStatus(selectedOrder.id, isFullRefund ? 'REFUNDED' : 'PARTIAL_REFUND');
                } catch (statusError) {
                    console.warn('Fallback refund status update failed:', statusError);
                }

                const nextStatus: Order['status'] = isFullRefund ? 'REFUNDED' : 'PARTIAL_REFUND';
                const applyLocalRefund = (order: Order): Order => {
                    const updatedItems = (order.items || [])
                        .map((item) => {
                            const refundedQty = requestedQtyByProduct.get(item.productId) || 0;
                            if (refundedQty <= 0) return item;
                            const newQty = Math.max(0, item.quantity - refundedQty);
                            const unitSubtotal = item.quantity > 0 ? (item.subtotal || 0) / item.quantity : 0;
                            return {
                                ...item,
                                quantity: newQty,
                                subtotal: Number((unitSubtotal * newQty).toFixed(2))
                            };
                        })
                        .filter((item) => item.quantity > 0);

                    return {
                        ...order,
                        status: nextStatus,
                        items: updatedItems
                    };
                };
                setOrders((prev) => prev.map((order) => (
                    order.id === selectedOrder.id ? applyLocalRefund(order) : order
                )));
                setSelectedOrder((prev) => (prev && prev.id === selectedOrder.id ? applyLocalRefund(prev) : prev));

                toast.success('Refund processed successfully');
                setIsRefundModalOpen(false);
                setIsDetailModalOpen(false);
                return;
            } catch (fallbackError: any) {
                console.error('Fallback refund error:', fallbackError);
                toast.error(fallbackError.response?.data?.message || 'Failed to process refund');
                throw fallbackError;
            }
        }
    };

    const handleExportToCSV = async () => {
        try {
            await orderService.manager.exportOrders('csv', buildOrderFilters());
            toast.success('Orders exported to CSV');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export orders');
        }
    };

    const handleExportToPDF = async () => {
        try {
            await orderService.manager.exportOrders('pdf', buildOrderFilters());
            toast.success('Orders exported to PDF');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export PDF');
        }
    };

    const getStatusBadge = (status: string) => {
        const badges = {
            COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle },
            PENDING: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: Clock },
            CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle },
            PARTIAL_REFUND: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: AlertCircle },
            REFUNDED: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: AlertCircle },
        };

        const badge = badges[status as keyof typeof badges] || badges.PENDING;
        const Icon = badge.icon || Clock;

        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                <Icon className="w-3 h-3" />
                {status}
            </span>
        );
    };



    const stats = {
        total: totalElements,
        completed: filteredCompletedCount,
        revenue: filteredRevenue,
        refundOrders: filteredRefundCount,
    };

    const selectedCustomerDisplay = selectedOrder ? getCustomerDisplay(selectedOrder) : null;
    const selectedOrderFinancials = selectedOrder ? getOrderFinancials(selectedOrder) : null;
    const selectedOrderDisplayItems = selectedOrder ? getDisplayItemsForModal(selectedOrder) : [];
    const selectedOrderPositivePayments = selectedOrder ? getPositivePayments(selectedOrder) : [];
    const selectedOrderRefundPayments = selectedOrder ? getRefundPayments(selectedOrder) : [];
    const selectedOrderGrossPaid = selectedOrder ? getGrossPaidAmount(selectedOrder) : 0;
    const selectedOrderRefunded = selectedOrder ? getRefundedAmount(selectedOrder) : 0;
    const selectedRefundAllocations = getRefundAllocations(
        selectedOrderDisplayItems,
        selectedOrderRefunded,
        selectedOrderFinancials,
    );
    const getAdjustedRefundLineAmount = (item: DisplayOrderItem) => {
        if (item.refundedQuantity <= 0) return 0;

        const allocated = selectedRefundAllocations.get(item.productId);
        if (typeof allocated === 'number' && allocated > 0) {
            return allocated;
        }

        if (!selectedOrderFinancials || selectedOrderFinancials.subtotal <= 0) {
            return item.refundAmount;
        }

        const ratio = item.refundAmount / selectedOrderFinancials.subtotal;
        const proportionalTax = selectedOrderFinancials.tax * ratio;
        const proportionalDiscount = selectedOrderFinancials.discount * ratio;
        return roundCurrency(item.refundAmount + proportionalTax - proportionalDiscount);
    };
    const selectedOrderRefundBase = selectedOrderDisplayItems.reduce(
        (sum, item) => sum + (item.refundAmount || 0),
        0,
    );
    const selectedOrderRefundTax =
        selectedOrderFinancials && selectedOrderFinancials.subtotal > 0
            ? roundCurrency((selectedOrderRefundBase / selectedOrderFinancials.subtotal) * selectedOrderFinancials.tax)
            : 0;
    const selectedOrderRefundDiscount =
        selectedOrderFinancials && selectedOrderFinancials.subtotal > 0
            ? roundCurrency((selectedOrderRefundBase / selectedOrderFinancials.subtotal) * selectedOrderFinancials.discount)
            : 0;
    const selectedOrderCompletedSubtotal = roundCurrency(
        (selectedOrderFinancials?.subtotal || 0) + selectedOrderRefundBase,
    );
    const selectedOrderCompletedTax = roundCurrency(
        (selectedOrderFinancials?.tax || 0) + selectedOrderRefundTax,
    );
    const selectedOrderCompletedDiscount = roundCurrency(
        (selectedOrderFinancials?.discount || 0) + selectedOrderRefundDiscount,
    );
    const selectedOrderCompletedTotal = roundCurrency(
        selectedOrderCompletedSubtotal + selectedOrderCompletedTax - selectedOrderCompletedDiscount,
    );

    return (
        <div className="flex h-screen bg-white overflow-hidden font-sans">
            <Sidebar />

            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                <Header />

                <main className="flex-1 overflow-y-auto pb-20">
                    <motion.div
                        className="max-w-[1600px] mx-auto px-6 py-8 lg:px-10"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {/* Page Header */}
                        <motion.header className="mb-6" variants={itemVariants}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1 block">
                                        Branch Management
                                    </span>
                                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                        Order Management
                                    </h1>
                                    <p className="text-slate-500 font-medium">
                                        Track, monitor and manage all branch transactions.
                                    </p>
                                </div>
                                <div className="flex-1 max-w-4xl ml-8 flex items-center gap-4">
                                    {/* Search Input */}
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search Order ID, customer..."
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

                                    {/* Horizontal Filters Toggle */}
                                    <button
                                        onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm border ${isFilterDropdownOpen
                                            ? 'bg-emerald-600 text-white border-emerald-600'
                                            : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-500 hover:text-emerald-600'
                                            }`}
                                    >
                                        <Filter className="w-4 h-4" />
                                        <span>{isFilterDropdownOpen ? 'Hide Filters' : 'Show Filters'}</span>
                                    </button>

                                    <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                                        <button
                                            onClick={handleExportToCSV}
                                            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-emerald-600 hover:border-emerald-500 transition-all shadow-sm"
                                            title="Export CSV"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={handleExportToPDF}
                                            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 hover:border-blue-500 transition-all shadow-sm"
                                            title="Export PDF"
                                        >
                                            <FileText className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Horizontal Push-Down Filter Bar */}
                            <AnimatePresence>
                                {isFilterDropdownOpen && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                        animate={{ height: 'auto', opacity: 1, marginTop: 24 }}
                                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        className="bg-white border border-slate-200 rounded-2xl shadow-sm relative overflow-visible"
                                    >
                                        <div className="p-6 relative overflow-visible">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative overflow-visible">
                                                {/* Status Filter */}
                                                <div className="relative">
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5">Order Status</label>
                                                    <button
                                                        onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
                                                        className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 text-sm hover:border-emerald-500 transition-all shadow-sm"
                                                    >
                                                        <span className="truncate">{statusFilter === 'ALL' ? 'All Status' : statusFilter}</span>
                                                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                                                    </button>
                                                    <AnimatePresence>
                                                        {isStatusFilterOpen && (
                                                            <>
                                                                <div className="fixed inset-0 z-10" onClick={() => setIsStatusFilterOpen(false)} />
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                                    transition={{ duration: 0.2 }}
                                                                    className="absolute left-0 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-20 overflow-hidden"
                                                                >
                                                                    {['ALL', 'COMPLETED', 'PARTIAL_REFUND', 'REFUNDED'].map((status) => (
                                                                        <button
                                                                            key={status}
                                                                            onClick={() => {
                                                                                setStatusFilter(status);
                                                                                setIsStatusFilterOpen(false);
                                                                            }}
                                                                            className={`w-full text-left px-4 py-2 text-sm font-bold transition-colors ${statusFilter === status ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'}`}
                                                                        >
                                                                            {status === 'ALL' ? 'All Status' : status}
                                                                        </button>
                                                                    ))}
                                                                </motion.div>
                                                            </>
                                                        )}
                                                    </AnimatePresence>
                                                </div>

                                                {/* Cashier Filter */}
                                                <div className="relative">
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5">Served By</label>
                                                    <button
                                                        onClick={() => setIsCashierFilterOpen(!isCashierFilterOpen)}
                                                        className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 text-sm hover:border-emerald-500 transition-all shadow-sm"
                                                    >
                                                        <span className="truncate">
                                                            {cashierFilter === 'ALL'
                                                                ? 'All Cashiers'
                                                                : (cashiers.find((cashier) => cashier.id === cashierFilter)?.name || 'Unknown Cashier')}
                                                        </span>
                                                        <Users className="w-3.5 h-3.5 text-slate-400" />
                                                    </button>
                                                    <AnimatePresence>
                                                        {isCashierFilterOpen && (
                                                            <>
                                                                <div className="fixed inset-0 z-10" onClick={() => setIsCashierFilterOpen(false)} />
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                                    transition={{ duration: 0.2 }}
                                                                    className="absolute left-0 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-20 max-h-60 overflow-y-auto"
                                                                >
                                                                    <button
                                                                        onClick={() => {
                                                                            setCashierFilter('ALL');
                                                                            setIsCashierFilterOpen(false);
                                                                        }}
                                                                        className={`w-full text-left px-4 py-2 text-sm font-bold transition-colors ${cashierFilter === 'ALL' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'}`}
                                                                    >
                                                                        All Cashiers
                                                                    </button>
                                                                    {cashiers.map(cashier => (
                                                                        <button
                                                                            key={cashier.id}
                                                                            onClick={() => {
                                                                                setCashierFilter(cashier.id);
                                                                                setIsCashierFilterOpen(false);
                                                                            }}
                                                                            className={`w-full text-left px-4 py-2 text-sm font-bold transition-colors ${cashierFilter === cashier.id ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'}`}
                                                                        >
                                                                            {cashier.name}
                                                                        </button>
                                                                    ))}
                                                                </motion.div>
                                                            </>
                                                        )}
                                                    </AnimatePresence>
                                                </div>

                                                {/* Time Period Filter */}
                                                <div className="relative">
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5">Time Period</label>
                                                    <button
                                                        onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
                                                        className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 text-sm hover:border-emerald-500 transition-all shadow-sm"
                                                    >
                                                        <span className="truncate capitalize">{dateFilter}</span>
                                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                    </button>
                                                    <AnimatePresence>
                                                        {isDateFilterOpen && (
                                                            <>
                                                                <div className="fixed inset-0 z-10" onClick={() => setIsDateFilterOpen(false)} />
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                                    transition={{ duration: 0.2 }}
                                                                    className="absolute left-0 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-20 overflow-hidden"
                                                                >
                                                                    {['today', 'week', 'month', 'year'].map((filter) => (
                                                                        <button
                                                                            key={filter}
                                                                            onClick={() => {
                                                                                setDateFilter(filter);
                                                                                setIsDateFilterOpen(false);
                                                                            }}
                                                                            className={`w-full text-left px-4 py-2 text-sm font-bold capitalize transition-colors ${dateFilter === filter ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'}`}
                                                                        >
                                                                            {filter}
                                                                        </button>
                                                                    ))}
                                                                </motion.div>
                                                            </>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                                                <div className="text-[10px] font-bold text-slate-400">
                                                    {dateFilter !== 'custom' && (
                                                        <span className="flex items-center gap-1.5 capitalize">
                                                            <Calendar className="w-3 h-3" />
                                                            Range: {dateFilter}
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setStatusFilter('ALL');
                                                        setCashierFilter('ALL');
                                                        setDateFilter('today');
                                                        setDateRange({ start: null, end: null });
                                                        setSearchTerm('');
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <RefreshCw className="w-3 h-3" />
                                                    Reset All Filters
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.header>

                        {/* Statistics Cards */}
                        <motion.div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6" variants={itemVariants}>
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Total Orders
                                    </span>
                                    <ShoppingBag className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="text-2xl font-black text-slate-900">{stats.total}</div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Completed
                                    </span>
                                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div className="text-2xl font-black text-slate-900">{stats.completed}</div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Total Revenue
                                    </span>
                                    <IndianRupee className="w-5 h-5 text-purple-600" />
                                </div>
                                <div className="text-2xl font-black text-emerald-600">
                                    ₹{Number(stats.revenue || 0).toLocaleString('en-IN')}
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Refund Orders
                                    </span>
                                    <RotateCcw className="w-5 h-5 text-orange-600" />
                                </div>
                                <div className="text-2xl font-black text-slate-900">
                                    {stats.refundOrders}
                                </div>
                            </div>
                        </motion.div>

                        <motion.div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden mb-8" variants={itemVariants}>
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-32">
                                    <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                                    <p className="mt-4 text-sm font-black text-slate-400 uppercase tracking-widest">Accessing Order Data...</p>
                                </div>
                            ) : orders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 text-center">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                        <ShoppingBag className="w-10 h-10 text-slate-200" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 lowercase tracking-tighter italic">no orders found</h3>
                                    <p className="text-sm text-slate-500 max-w-xs mt-2 font-medium">Try adjusting your search terms to find what you're looking for.</p>
                                </div>
                            ) : (
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
                                            {orders.map((order) => (
                                                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm font-black text-slate-900">#{order.orderNumber || order.id}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-bold text-slate-900">{order.customerName || 'Walk-in Customer'}</div>
                                                        {order.customerEmail && <div className="text-[10px] font-bold text-slate-400">{order.customerEmail.toLowerCase()}</div>}
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
                                                                    : order.status === 'CANCELLED'
                                                                        ? 'bg-red-50 text-red-600 border-red-100'
                                                                        : 'bg-orange-50 text-orange-600 border-orange-100'
                                                                }`}
                                                        >
                                                            {order.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="relative inline-block text-left">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenActionMenuId((prev) => (prev === order.id ? null : order.id));
                                                                }}
                                                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all action-menu-trigger"
                                                                title="Actions"
                                                            >
                                                                <MoreVertical className="w-5 h-5" />
                                                            </button>

                                                            {openActionMenuId === order.id && (
                                                                <div
                                                                    ref={actionMenuRef}
                                                                    className="absolute right-0 top-full mt-2 w-44 bg-white border border-slate-100 rounded-xl shadow-xl z-[60] py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                                                                >
                                                                    <button
                                                                        onClick={() => {
                                                                            setOpenActionMenuId(null);
                                                                            handleViewDetails(order);
                                                                        }}
                                                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                                                                    >
                                                                        <Eye size={14} className="text-emerald-600" />
                                                                        View Details
                                                                    </button>
                                                                    {['COMPLETED', 'PARTIAL_REFUND'].includes(order.status) && (
                                                                        <button
                                                                            onClick={() => {
                                                                                setOpenActionMenuId(null);
                                                                                handleRefund(order);
                                                                            }}
                                                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                                                                        >
                                                                            <RotateCcw size={14} className="text-orange-500" />
                                                                            Process Refund
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </motion.div>

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

            {/* Order Details Modal */}
            < EnhancedModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title={`Order #${selectedOrder?.orderNumber || selectedOrder?.id}`}
                size="small"
                className="max-h-[550px] h-[550px]"
                hideScrollbar={true}
            >
                {selectedOrder && selectedOrderFinancials && (
                    <div className="space-y-6">
                        {/* Order Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Date & Time
                                </label>
                                <p className="text-sm font-medium text-slate-900 mt-1">
                                    {new Date(selectedOrder.createdAt).toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Status
                                </label>
                                <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Customer
                                </label>
                                <p className="text-sm font-medium text-slate-900 mt-1">
                                    {selectedCustomerDisplay?.name || 'Walk-in Customer'}
                                </p>
                                {selectedCustomerDisplay?.email && (
                                    <p className="text-xs text-slate-500">{selectedCustomerDisplay.email?.toLowerCase()}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Cashier
                                </label>
                                <p className="text-sm font-medium text-slate-900 mt-1">
                                    {selectedOrder.cashierName || 'N/A'}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Payment Method
                                    {selectedOrder.payments && selectedOrder.payments.length > 1 ? 's' : ''}
                                </label>
                                {selectedOrder.payments && selectedOrder.payments.length > 0 ? (
                                    <div className="mt-2 space-y-2">
                                        {selectedOrderPositivePayments.map((payment, index) => (
                                            <div
                                                key={payment.id || index}
                                                className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg"
                                            >
                                                <span className="inline-flex items-center px-2 py-1 rounded bg-slate-900 text-white text-xs font-bold uppercase">
                                                    {payment.method}
                                                </span>
                                                <span className="text-sm font-bold text-slate-900">
                                                    ₹{Number(payment.amount || 0).toFixed(2)}
                                                </span>
                                            </div>
                                        ))}
                                        {selectedOrderRefundPayments.length > 0 && (
                                            <div className="pt-2 border-t border-slate-200 space-y-2">
                                                <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600">
                                                    Refunded Amounts
                                                </p>
                                                {selectedOrderRefundPayments.map((payment, index) => (
                                                    <div
                                                        key={`refund-${payment.id || index}`}
                                                        className="flex items-center justify-between bg-amber-50 px-3 py-2 rounded-lg"
                                                    >
                                                        <span className="inline-flex items-center px-2 py-1 rounded bg-amber-600 text-white text-xs font-bold uppercase">
                                                            {payment.method}
                                                        </span>
                                                        <span className="text-sm font-bold text-amber-700">
                                                            -₹{Math.abs(Number(payment.amount || 0)).toFixed(2)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    getPaymentMethods(selectedOrder.paymentMethod).length > 1 ? (
                                        <div className="mt-2 flex flex-wrap items-center gap-1">
                                            {getPaymentMethods(selectedOrder.paymentMethod).map((method, index) => (
                                                <span key={`${method}-${index}`} className="inline-flex items-center px-2 py-1 rounded bg-slate-900 text-white text-xs font-bold uppercase">
                                                    {method}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm font-medium text-slate-900 mt-1">
                                            {selectedOrder.paymentMethod}
                                        </p>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Items */}
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
                                Order Items
                            </h3>
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-white">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                                                Product
                                            </th>
                                            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                                                Qty
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                                                Price
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                                                Subtotal
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {selectedOrderDisplayItems.flatMap((item) => {
                                            const soldSubtotal = roundCurrency((item.price || 0) * (item.originalQuantity || 0));

                                            const soldRow = (
                                                <tr key={`${item.id}-sold`}>
                                                    <td className="px-4 py-3">
                                                        <div className="text-sm font-medium text-slate-900">
                                                            {item.productName}
                                                        </div>
                                                        <div className="text-xs text-slate-500">{item.sku}</div>
                                                        <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                                                            Sold
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-sm font-medium text-slate-700">
                                                        {item.originalQuantity}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">
                                                        ₹{(item.price || 0).toFixed(2)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">
                                                        ₹{soldSubtotal.toFixed(2)}
                                                    </td>
                                                </tr>
                                            );

                                            if (item.refundedQuantity <= 0) {
                                                return [soldRow];
                                            }

                                            const refundRow = (
                                                <tr key={`${item.id}-refund`} className="bg-amber-50/40">
                                                    <td className="px-4 py-3">
                                                        <div className="text-sm font-medium text-amber-700">
                                                            {item.productName}
                                                        </div>
                                                        <div className="text-xs text-slate-500">{item.sku}</div>
                                                        <div className="text-[11px] font-semibold text-amber-600 mt-0.5">
                                                            Refund
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-sm font-medium text-amber-700">
                                                        {item.refundedQuantity}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-sm font-medium text-amber-700">
                                                        ₹{(item.price || 0).toFixed(2)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-sm font-bold text-amber-700">
                                                        -₹{getAdjustedRefundLineAmount(item).toFixed(2)}
                                                    </td>
                                                </tr>
                                            );

                                            return [soldRow, refundRow];
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Totals */}
                        <div className="border-t-2 border-slate-200 pt-4 space-y-2">
                            {selectedOrderRefunded > 0 && (
                                <>
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 pt-1">
                                        Completed (Before Refund)
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-slate-700">Subtotal:</span>
                                        <span className="font-bold text-slate-900">
                                            ₹{selectedOrderCompletedSubtotal.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-slate-700">Tax:</span>
                                        <span className="font-bold text-slate-900">
                                            ₹{selectedOrderCompletedTax.toFixed(2)}
                                        </span>
                                    </div>
                                    {selectedOrderCompletedDiscount > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium text-emerald-600">Discount:</span>
                                            <span className="font-bold text-emerald-600">
                                                -₹{selectedOrderCompletedDiscount.toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-slate-700">Completed Total:</span>
                                        <span className="font-bold text-slate-900">
                                            ₹{(selectedOrderGrossPaid || selectedOrderCompletedTotal).toFixed(2)}
                                        </span>
                                    </div>

                                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 pt-2">
                                        Refunded Portion
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-slate-700">Refunded Base:</span>
                                        <span className="font-bold text-slate-900">
                                            ₹{selectedOrderRefundBase.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-slate-700">Refunded Tax:</span>
                                        <span className="font-bold text-slate-900">
                                            ₹{selectedOrderRefundTax.toFixed(2)}
                                        </span>
                                    </div>
                                    {selectedOrderRefundDiscount > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium text-emerald-600">Refunded Discount:</span>
                                            <span className="font-bold text-emerald-600">
                                                -₹{selectedOrderRefundDiscount.toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-amber-600">Refunded Total:</span>
                                        <span className="font-bold text-amber-600">
                                            -₹{selectedOrderRefunded.toFixed(2)}
                                        </span>
                                    </div>

                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 pt-2">
                                        Current (After Refund)
                                    </div>
                                </>
                            )}
                            <div className="flex justify-between text-sm">
                                <span className="font-medium text-slate-700">Subtotal:</span>
                                <span className="font-bold text-slate-900">
                                    ₹{selectedOrderFinancials.subtotal.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="font-medium text-slate-700">Tax:</span>
                                <span className="font-bold text-slate-900">
                                    ₹{selectedOrderFinancials.tax.toFixed(2)}
                                </span>
                            </div>
                            {selectedOrderFinancials.discount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-emerald-600">Discount:</span>
                                    <span className="font-bold text-emerald-600">
                                        -₹{selectedOrderFinancials.discount.toFixed(2)}
                                    </span>
                                </div>
                            )}
                            {selectedOrderRefunded > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-amber-600">Refunded:</span>
                                    <span className="font-bold text-amber-600">
                                        -₹{selectedOrderRefunded.toFixed(2)}
                                    </span>
                                </div>
                            )}
                            {selectedOrderRefunded > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-slate-700">Gross Paid:</span>
                                    <span className="font-bold text-slate-900">
                                        ₹{selectedOrderGrossPaid.toFixed(2)}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg border-t-2 border-slate-200 pt-3">
                                <span className="font-black text-slate-900">
                                    {selectedOrderRefunded > 0 ? 'NET TOTAL:' : 'TOTAL:'}
                                </span>
                                <span className="font-black text-emerald-600">
                                    ₹{selectedOrderFinancials.total.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </EnhancedModal >

            {/* Refund Modal */}
            {
                selectedOrder && (
                    <RefundModal
                        isOpen={isRefundModalOpen}
                        onClose={() => setIsRefundModalOpen(false)}
                        orderId={selectedOrder.id}
                        items={selectedOrder.items.map(item => ({
                            id: item.id.toString(),
                            productId: item.productId,
                            name: item.productName,
                            sku: item.sku || `SKU-${item.productId}`,
                            price: item.price,
                            quantity: item.quantity,
                            discount: item.discount || 0,
                            subtotal: item.subtotal,
                        }))}
                        totalAmount={selectedOrder.total}
                        subtotalAmount={selectedOrderFinancials?.subtotal}
                        taxAmount={selectedOrderFinancials?.tax}
                        discountAmount={selectedOrderFinancials?.discount}
                        requireManagerApproval={false}
                        onRefund={handleProcessRefund}
                    />
                )
            }
        </div >
    );
};

export default ManagerOrderManagement;



