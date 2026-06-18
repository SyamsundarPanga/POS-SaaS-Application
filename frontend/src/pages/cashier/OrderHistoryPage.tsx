import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppSelector } from '../../store/hooks';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import EnhancedModal from '../../components/ui/EnhancedModal';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import RefundModal, { RefundData } from '../../features/pos/RefundModal';
import VoidTransactionModal, { VoidData } from '../../features/pos/VoidTransactionModal';
import { printReceipt, CompanyInfo, ReceiptData } from '../../utils/receiptGenerator';
import toast from '../../utils/toast';
import {
  Receipt,
  Eye,
  Printer,
  Download,
  FileText,
  Mail,
  Search,
  Filter,
  IndianRupee,
  ShoppingBag,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RotateCcw,
  RefreshCw,
  Users,
  X,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import orderService from '../../services/orderService';

interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  discount: number;
  lineTotal: number;
}

interface Order {
  id: number;
  orderNumber: string;
  createdAt: string;
  customerId?: number;
  customerName?: string;
  customerEmail?: string;
  customer?: {
    id?: number;
    name?: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
  };
  items?: OrderItem[];
  lineItems?: OrderItem[]; // Backend returns lineItems
  originalLineItems?: OrderItem[];
  subtotal?: number;
  subtotalBeforeDiscount?: number;
  tax?: number;
  taxAmount?: number;
  discount?: number;
  discountAmount?: number;
  finalTotal?: number;
  taxableAmount?: number;
  total: number;
  paymentMethod: string;
  payments?: Array<{
    id: number;
    method: string;
    amount: number;
    status: string;
    transactionId?: string;
  }>;
  status:
    | 'COMPLETED'
    | 'PENDING'
    | 'CANCELLED'
    | 'PARTIAL_REFUND'
    | 'REFUNDED'
    | 'VOID_REQUESTED'
    | 'REFUND_REQUESTED';
  cashierName: string;
  itemCount?: number;
  shiftId?: number;
  shiftStatus?: string;
}

interface DisplayOrderItem extends OrderItem {
  originalQuantity: number;
  netQuantity: number;
  refundedQuantity: number;
  refundAmount: number;
  netLineTotal: number;
}

const normalizeOrderDetails = (order: any): Order => ({
  ...order,
  lineItems: order.lineItems || order.items || [],
  items: order.items || order.lineItems || [],
  originalLineItems: order.originalLineItems || order.lineItems || order.items || [],
});

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 15,
    },
  },
};

const OrderHistoryPage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const roles = user?.roles || [];
  const canDirectVoid =
    roles.includes('ROLE_BRANCH_MANAGER') || roles.includes('ROLE_STORE_ADMIN');
  const requiresManagerApprovalForVoid = !canDirectVoid && roles.includes('ROLE_CASHIER');
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [processingOrderId, setProcessingOrderId] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(12);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [summaryStats, setSummaryStats] = useState({
    completed: 0,
    cancelled: 0,
    revenue: 0,
    
  });

  const [dateFilter, setDateFilter] = useState('today');
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);

  // Helper function to get items from order (handles both items and lineItems)
  const getOrderItems = (order: Order): OrderItem[] => {
    return order.lineItems || order.items || [];
  };

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
      return order.total || 0;
    }

    return order.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  };

  const toSafeAmount = (value: unknown): number => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  };

  const roundCurrency = (value: number): number => Number(value.toFixed(2));

  const getOrderFinancials = (order: Order) => {
    const subtotalBase = toSafeAmount(order.subtotalBeforeDiscount ?? order.subtotal);
    let subtotal = subtotalBase > 0 ? subtotalBase : 0;
    let tax = toSafeAmount(order.taxAmount ?? order.tax);
    let discount = toSafeAmount(order.discountAmount ?? order.discount);
    const paidAmount = roundCurrency(getNetPaidAmount(order));
    const declaredTotal = toSafeAmount(order.finalTotal ?? order.total);
    let total = declaredTotal > 0 ? declaredTotal : paidAmount;

    // Fallback for older payloads where one amount field may be missing from the detail response.
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
        getDisplayItems(order).reduce((sum, item) => sum + toSafeAmount(item.lineTotal), 0),
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

  const getDisplayItems = (order: Order) => {
    const originalItems = order.originalLineItems || getOrderItems(order);
    const currentItems = getOrderItems(order);
    const currentByProduct = new Map(currentItems.map((item) => [item.productId, item]));

    return originalItems.map((original, index) => {
      const current = currentByProduct.get(original.productId);
      const currentQty = current?.quantity ?? 0;
      const originalQty = original.quantity ?? 0;
      const refundedQty = Math.max(0, originalQty - currentQty);
      const unitPrice = Number(original.price || 0);

      if (refundedQty > 0 && order.status !== 'COMPLETED' && order.status !== 'CANCELLED') {
        return {
          ...original,
          id: original.id ?? index,
          quantity: -refundedQty,
          lineTotal: Number((unitPrice * refundedQty * -1).toFixed(2)),
        };
      }

      return {
        ...(current || original),
        id: (current || original).id ?? index,
        quantity: current?.quantity ?? original.quantity,
        lineTotal:
          current?.lineTotal ??
          Number((unitPrice * Number(current?.quantity ?? original.quantity ?? 0)).toFixed(2)),
      };
    });
  };

  const getDisplayItemsForModal = (order: Order): DisplayOrderItem[] => {
    const originalItems = order.originalLineItems || getOrderItems(order);
    const currentItems = getOrderItems(order);
    const currentByProduct = new Map(currentItems.map((item) => [item.productId, item]));

    return originalItems.map((original, index) => {
      const current = currentByProduct.get(original.productId);
      const originalQty = Number(original.quantity || 0);
      const currentQty = Number(current?.quantity ?? originalQty);
      const refundedQty = Math.max(0, originalQty - currentQty);
      const unitPrice = Number(original.price || 0);
      const netLineTotal = Number((unitPrice * currentQty).toFixed(2));
      const refundAmount = Number((unitPrice * refundedQty).toFixed(2));

      return {
        ...(current || original),
        id: (current || original).id ?? original.id ?? index,
        originalQuantity: originalQty,
        netQuantity: currentQty,
        refundedQuantity: refundedQty,
        refundAmount,
        netLineTotal,
      };
    });
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
      [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(' '),
    );
    const nestedEmail = trimOrUndefined(order.customer?.email);
    const legacyName = trimOrUndefined(
      anyOrder.customerFullName ||
      [anyOrder.customerFirstName, anyOrder.customerLastName].filter(Boolean).join(' '),
    );
    const legacyEmail = trimOrUndefined(anyOrder.customerMail || anyOrder.customer_email);

    // Prefer explicit customer fields from order summary/detail.
    if (
      explicitName &&
      explicitName.toLowerCase() !== 'guest' &&
      explicitName !== order.cashierName
    ) {
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

  // Company info for receipts
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  useEffect(() => {
    async function loadCompanyInfo() {
      try {
        const settings = await require('../../services/branchService').default.getBranchSettings();
        setCompanyInfo({
          name: settings.branchName || 'Store',
          storeName: settings.storeName || 'Store',
          displayStoreName: user?.isSuperAdmin ? 'PayPoint' : user?.storeName || 'PayPoint Retail',
          address: settings.address || '',
          phone: settings.phone || '',
          email: settings.email || '',
          taxId: settings.taxId || '',
          logo: settings.logo || '',
        });
      } catch (e) {
        setCompanyInfo({
          name: 'Store',
          storeName: 'Store',
          displayStoreName: user?.isSuperAdmin ? 'PayPoint' : user?.storeName || 'PayPoint Retail',
          address: '',
          phone: '',
          email: '',
          taxId: '',
          logo: '',
        });
      }
    }
    loadCompanyInfo();
  }, [user?.isSuperAdmin, user?.storeName]);

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

    const toLocalDateTimeString = (date: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };

    return {
      startDate: toLocalDateTimeString(start),
      endDate: toLocalDateTimeString(end),
    };
  };

  const fetchOrders = useCallback(
    async (page = currentPage) => {
      setLoading(true);
      try {
        const { startDate, endDate } = getDateRange(dateFilter);
        const data = await orderService.getMyOrders(page, pageSize, startDate, endDate);
        // Backend returns Page<OrderSummaryDto>
        const ordersList = data.content || [];
        setOrders(ordersList);
        setFilteredOrders(ordersList);
        setTotalPages(data.totalPages || 0);
        setTotalElements(data.totalElements || 0);
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast.error('Failed to load order history');
      } finally {
        setLoading(false);
      }
    },
    [currentPage, pageSize, dateFilter],
  );

  const fetchSummaryStats = useCallback(async () => {
    try {
      const { startDate, endDate } = getDateRange(dateFilter);
      const summaryPageSize = 200;
      let page = 0;
      let pages = 1;
      let allOrders: Order[] = [];

      while (page < pages) {
        const data = await orderService.getMyOrders(page, summaryPageSize, startDate, endDate);
        const pageOrders = (data.content || []) as Order[];
        allOrders = allOrders.concat(pageOrders);

        pages = data.totalPages || 0;
        if (pages === 0) break;
        page += 1;
      }

      const completedOrders = allOrders.filter((o) => 
        ['COMPLETED', 'PARTIAL_REFUND', 'REFUND_REQUESTED', 'VOID_REQUESTED'].includes(o.status)
      );
      const completedCount = completedOrders.length;
      const cancelledCount = allOrders.filter((o) => o.status === 'CANCELLED').length;
      const totalRevenue = completedOrders.reduce((sum, o) => sum + getNetPaidAmount(o), 0);

      setSummaryStats({
        completed: completedCount,
        cancelled: cancelledCount,
        revenue: totalRevenue,
        
      });
    } catch (error) {
      console.error('Error fetching order summary stats:', error);
      setSummaryStats({ completed: 0, cancelled: 0, revenue: 0 });
    }
  }, [dateFilter]);

  // Fetch orders when page or filter changes
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders, currentPage]);

  // Fetch summary cards data across all pages for selected date range
  useEffect(() => {
    fetchSummaryStats();
  }, [fetchSummaryStats]);

  // Reset to page 0 when filter changes
  useEffect(() => {
    setCurrentPage(0);
  }, [dateFilter, statusFilter]);

  // Filter orders
  useEffect(() => {
    let filtered = [...orders];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((order) => {
        const customer = getCustomerDisplay(order);
        return (
          order.id?.toString().includes(searchTerm) ||
          order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  }, [searchTerm, statusFilter, orders]);

  const loadFullOrder = async (order: Order): Promise<Order> => {
    const response = await orderService.getById(order.id);
    return normalizeOrderDetails(response.data);
  };

  const handleViewDetails = async (order: Order) => {
    try {
      setProcessingOrderId(order.id);
      const fullOrder = await loadFullOrder(order);
      setSelectedOrder(fullOrder);
      setIsDetailModalOpen(true);
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error('Failed to load order details');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handlePrintReceipt = (order: Order) => {
    const items = getOrderItems(order);
    const financials = getOrderFinancials(order);
    const receiptData: ReceiptData = {
      orderId: order.orderNumber || order.id,
      orderDate: new Date(order.createdAt),
      cashierName: order.cashierName,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      items: items.map((item) => ({
        id: item?.id?.toString() || '',
        productId: item?.productId || 0,
        name: item?.productName || '',
        sku: item?.sku || '',
        price: item?.price || 0,
        quantity: item?.quantity || 0,
        discount: item?.discount || 0,
        subtotal: item?.lineTotal || 0,
      })),
      subtotal: financials.subtotal,
      tax: financials.tax,
      discount: financials.discount,
      total: financials.total,
      paymentMethod: order.paymentMethod,
      payments: order.payments,
      amountPaid: financials.total,
      change: 0,
    };

    if (companyInfo) {
      printReceipt(receiptData, companyInfo);
    } else {
      toast.error('Store info not loaded');
    }
    toast.success('Receipt sent to printer');
  };

  const handleInitiateRefund = async (order: Order) => {
    if (order.status === 'REFUNDED') {
      toast.error('This order has already been refunded');
      return;
    }
    if (order.status === 'CANCELLED') {
      toast.error('Cannot refund a cancelled order');
      return;
    }
    try {
      setProcessingOrderId(order.id);
      const fullOrder = await loadFullOrder(order);
      if (!getOrderItems(fullOrder).length) {
        toast.error('No refundable items found for this order');
        return;
      }
      setSelectedOrder(fullOrder);
      setIsRefundModalOpen(true);
    } catch (error) {
      console.error('Error fetching refund order details:', error);
      toast.error('Failed to load refund details');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleInitiateVoidRequest = (order: Order) => {
    if (order.status !== 'COMPLETED') {
      toast.error('Only completed orders can be voided');
      return;
    }
    setSelectedOrder(order);
    setIsVoidModalOpen(true);
  };

  const handleRequestVoidApproval = async (voidData: VoidData) => {
    try {
      setProcessingOrderId(voidData.orderId);
      await orderService.requestVoidApproval({
        orderId: voidData.orderId,
        reason: voidData.reason,
      });

      const updatedMapper = (o: Order) =>
        o.id === voidData.orderId ? { ...o, status: 'VOID_REQUESTED' as const } : o;

      setOrders((prev) => prev.map(updatedMapper));
      setFilteredOrders((prev) => prev.map(updatedMapper));

      if (selectedOrder?.id === voidData.orderId) {
        setSelectedOrder({ ...selectedOrder, status: 'VOID_REQUESTED' });
      }

      toast.success('Void request sent to manager for approval');
      setIsVoidModalOpen(false);

      // Refresh data and stats to ensure UI is in sync
      fetchOrders();
      fetchSummaryStats();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to submit void request';
      toast.error(message);
      throw error;
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleDirectVoid = async (voidData: VoidData) => {
    try {
      setProcessingOrderId(voidData.orderId);
      await orderService.voidOrder({
        orderId: voidData.orderId,
        reason: voidData.reason,
      });

      const updatedMapper = (o: Order) =>
        o.id === voidData.orderId ? { ...o, status: 'CANCELLED' as const } : o;

      setOrders((prev) => prev.map(updatedMapper));
      setFilteredOrders((prev) => prev.map(updatedMapper));

      if (selectedOrder?.id === voidData.orderId) {
        setSelectedOrder({ ...selectedOrder, status: 'CANCELLED' });
      }

      toast.success('Order voided successfully');
      setIsVoidModalOpen(false);
      fetchOrders();
      fetchSummaryStats();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to void order';
      toast.error(message);
      throw error;
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleProcessRefund = async (refundData: RefundData) => {
    try {
      setProcessingOrderId(refundData.orderId);
      if (roles.includes('ROLE_CASHIER')) {
        await orderService.requestRefundApproval(refundData);

        const updatedMapper = (o: Order) =>
          o.id === refundData.orderId ? { ...o, status: 'REFUND_REQUESTED' as const } : o;

        setOrders((prev) => prev.map(updatedMapper));
        setFilteredOrders((prev) => prev.map(updatedMapper));

        if (selectedOrder?.id === refundData.orderId) {
          setSelectedOrder({ ...selectedOrder, status: 'REFUND_REQUESTED' });
        }

        toast.success('Refund request sent to manager for approval');
        setIsRefundModalOpen(false);
        setIsDetailModalOpen(false);
        fetchOrders();
        fetchSummaryStats();
        return;
      }

      await orderService.processRefund(refundData);

      const selected = new Map<number, number>();
      refundData.items.forEach((item) => {
        selected.set(item.productId, (selected.get(item.productId) || 0) + item.quantity);
      });

      const isFullRefund = getOrderItems(selectedOrder as Order).every((orderItem) => {
        return (selected.get(orderItem.productId) || 0) >= orderItem.quantity;
      });
      const nextStatus: Order['status'] = isFullRefund ? 'REFUNDED' : 'PARTIAL_REFUND';

      // Keep cashier behavior aligned with manager flow when backend still marks full refund.
      try {
        await orderService.updateStatus(refundData.orderId, nextStatus);
      } catch (statusError) {
        console.warn('Cashier refund status update failed:', statusError);
      }

      // Update order status + remaining quantities in local state
      setOrders((prevOrders) =>
        prevOrders.map((o) => {
          if (o.id !== refundData.orderId) return o;

          const refundByProduct = new Map<number, number>();
          refundData.items.forEach((item) => {
            refundByProduct.set(
              item.productId,
              (refundByProduct.get(item.productId) || 0) + item.quantity,
            );
          });

          const updatedLineItems = getOrderItems(o)
            .map((line) => {
              const refundedQty = refundByProduct.get(line.productId) || 0;
              if (refundedQty <= 0) return line;

              const newQty = Math.max(0, line.quantity - refundedQty);
              const unitLineTotal = line.quantity > 0 ? (line.lineTotal || 0) / line.quantity : 0;
              return {
                ...line,
                quantity: newQty,
                lineTotal: Number((unitLineTotal * newQty).toFixed(2)),
              };
            })
            .filter((line) => line.quantity > 0);

          return {
            ...o,
            status: nextStatus,
            lineItems: updatedLineItems,
          };
        }),
      );

      toast.success('Refund processed successfully');
      setIsRefundModalOpen(false);
      setIsDetailModalOpen(false);

      // Refresh data and stats to ensure UI is in sync
      fetchOrders();
      fetchSummaryStats();

      if (selectedOrder && selectedOrder.id === refundData.orderId) {
        const refundByProduct = new Map<number, number>();
        refundData.items.forEach((item) => {
          refundByProduct.set(
            item.productId,
            (refundByProduct.get(item.productId) || 0) + item.quantity,
          );
        });
        const updatedSelectedItems = getOrderItems(selectedOrder)
          .map((line) => {
            const refundedQty = refundByProduct.get(line.productId) || 0;
            if (refundedQty <= 0) return line;
            const newQty = Math.max(0, line.quantity - refundedQty);
            const unitLineTotal = line.quantity > 0 ? (line.lineTotal || 0) / line.quantity : 0;
            return {
              ...line,
              quantity: newQty,
              lineTotal: Number((unitLineTotal * newQty).toFixed(2)),
            };
          })
          .filter((line) => line.quantity > 0);
        setSelectedOrder({
          ...selectedOrder,
          status: nextStatus,
          lineItems: updatedSelectedItems,
        });
      }
    } catch (error: any) {
      console.error('Refund error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to process refund';
      toast.error(errorMessage);
      throw error;
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const { startDate, endDate } = getDateRange(dateFilter);
      await orderService.exportMyOrders(format, {
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        startDate: startDate.split('T')[0],
        endDate: endDate.split('T')[0],
      });
      toast.success(`Orders exported to ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export ${format.toUpperCase()}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      COMPLETED: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        icon: CheckCircle,
      },
      PENDING: {
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        border: 'border-yellow-200',
        icon: Clock,
      },
      CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle },
      PARTIAL_REFUND: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        icon: AlertCircle,
      },
      REFUNDED: {
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        border: 'border-orange-200',
        icon: AlertCircle,
      },
      VOID_REQUESTED: {
        bg: 'bg-violet-50',
        text: 'text-violet-700',
        border: 'border-violet-200',
        icon: Clock,
      },
      REFUND_REQUESTED: {
        bg: 'bg-sky-50',
        text: 'text-sky-700',
        border: 'border-sky-200',
        icon: Clock,
      },
    };

    const badge = badges[status as keyof typeof badges] || badges.PENDING;
    const Icon = badge.icon;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
      >
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ')}
      </span>
    );
  };

  // Calculate statistics
  const hasLocalFilters = searchTerm.trim().length > 0 || statusFilter !== 'ALL';
  const totalOrderCount = hasLocalFilters ? filteredOrders.length : totalElements;

  const totalRevenueWithRefunds = filteredOrders.reduce((sum, o) => {
    if (['COMPLETED', 'PARTIAL_REFUND', 'REFUND_REQUESTED', 'VOID_REQUESTED'].includes(o.status)) {
      return sum + getNetPaidAmount(o);
    }
    return sum;
  }, 0);

  const stats = {
    total: totalOrderCount,
    completed: hasLocalFilters 
      ? filteredOrders.filter((o) => ['COMPLETED', 'PARTIAL_REFUND', 'REFUND_REQUESTED', 'VOID_REQUESTED'].includes(o.status)).length 
      : summaryStats.completed,
      cancelled: hasLocalFilters 
      ? filteredOrders.filter((o) => o.status === 'CANCELLED').length 
      : summaryStats.cancelled,
    revenue: hasLocalFilters ? totalRevenueWithRefunds : summaryStats.revenue,

    
  };

  const selectedCustomerDisplay = selectedOrder ? getCustomerDisplay(selectedOrder) : null;
  const selectedOrderFinancials = selectedOrder ? getOrderFinancials(selectedOrder) : null;
  const selectedOrderDisplayItems = selectedOrder ? getDisplayItemsForModal(selectedOrder) : [];
  const selectedOrderPositivePayments = selectedOrder ? getPositivePayments(selectedOrder) : [];
  const selectedOrderRefundPayments = selectedOrder ? getRefundPayments(selectedOrder) : [];
  const selectedOrderGrossPaid = selectedOrder ? getGrossPaidAmount(selectedOrder) : 0;
  const selectedOrderRefunded = selectedOrder ? getRefundedAmount(selectedOrder) : 0;
  const getRefundAllocations = (items: DisplayOrderItem[], refundedAmount: number) => {
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
          allocated = Number((refundedAmount - allocatedSoFar).toFixed(2));
        } else {
          allocated = Number(((refundedAmount * item.refundAmount) / totalRefundBase).toFixed(2));
          allocatedSoFar += allocated;
        }
      } else if (selectedOrderFinancials && selectedOrderFinancials.subtotal > 0) {
        const ratio = item.refundAmount / selectedOrderFinancials.subtotal;
        const proportionalTax = selectedOrderFinancials.tax * ratio;
        const proportionalDiscount = selectedOrderFinancials.discount * ratio;
        allocated = Number((item.refundAmount + proportionalTax - proportionalDiscount).toFixed(2));
      }

      allocations.set(item.productId, Math.max(0, allocated));
    });

    return allocations;
  };
  const selectedRefundAllocations = getRefundAllocations(selectedOrderDisplayItems, selectedOrderRefunded);
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
    return Number((item.refundAmount + proportionalTax - proportionalDiscount).toFixed(2));
  };
  const selectedOrderRefundBase = selectedOrderDisplayItems.reduce(
    (sum, item) => sum + (item.refundAmount || 0),
    0,
  );
  const selectedOrderRefundTax =
    selectedOrderFinancials && selectedOrderFinancials.subtotal > 0
      ? Number(
        (
          (selectedOrderRefundBase / selectedOrderFinancials.subtotal) *
          selectedOrderFinancials.tax
        ).toFixed(2),
      )
      : 0;
  const selectedOrderRefundDiscount =
    selectedOrderFinancials && selectedOrderFinancials.subtotal > 0
      ? Number(
        (
          (selectedOrderRefundBase / selectedOrderFinancials.subtotal) *
          selectedOrderFinancials.discount
        ).toFixed(2),
      )
      : 0;
  const selectedOrderCompletedSubtotal = Number(
    ((selectedOrderFinancials?.subtotal || 0) + selectedOrderRefundBase).toFixed(2),
  );
  const selectedOrderCompletedTax = Number(
    ((selectedOrderFinancials?.tax || 0) + selectedOrderRefundTax).toFixed(2),
  );
  const selectedOrderCompletedDiscount = Number(
    ((selectedOrderFinancials?.discount || 0) + selectedOrderRefundDiscount).toFixed(2),
  );
  const selectedOrderCompletedTotal = Number(
    (
      selectedOrderCompletedSubtotal +
      selectedOrderCompletedTax -
      selectedOrderCompletedDiscount
    ).toFixed(2),
  );

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
              {/* Page Header */}
              <motion.header className="mb-6" variants={itemVariants}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1 block">
                      Transaction Management
                    </span>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                      Order History
                    </h1>
                    <p className="text-slate-500 font-medium">
                      Complete order history with search, filters, refunds and more.
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

                    {/* Status Filter Dropdown */}
                    <div className="relative w-44">
                      <button
                        onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-left focus:border-emerald-500 outline-none transition-all flex items-center justify-between text-sm font-bold text-slate-700"
                      >
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <span className="truncate">
                          {statusFilter === 'ALL' ? 'All Status' : statusFilter}
                        </span>
                        <div
                          className={`w-4 h-4 transition-transform duration-200 ${isStatusDropdownOpen ? 'rotate-180' : ''}`}
                        >
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </button>

                      {isStatusDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-30"
                            onClick={() => setIsStatusDropdownOpen(false)}
                          />
                          <div className="absolute z-40 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl py-2 animate-in fade-in zoom-in-95 duration-200">
                            {['ALL', 'COMPLETED', 'VOID_REQUESTED', 'REFUNDED', 'CANCELLED', 'PARTIAL_REFUND'].map((status) => (
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
                                {status === 'ALL' ? 'All Status' : status.replace('_', ' ')}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Date Filter Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:border-emerald-500 hover:text-emerald-600 transition-all shadow-sm"
                      >
                        <Calendar className="w-4 h-4" />
                        <span className="capitalize">
                          {dateFilter === 'today' ? 'Today' : dateFilter}
                        </span>
                      </button>

                      {isDateDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsDateDropdownOpen(false)}
                          />
                          <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-20 overflow-hidden">
                            {['today', 'week', 'month', 'year'].map((filter) => (
                              <button
                                key={filter}
                                onClick={() => {
                                  setDateFilter(filter);
                                  setIsDateDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm font-bold capitalize transition-colors ${dateFilter === filter
                                  ? 'bg-emerald-50 text-emerald-700 font-bold'
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
                    <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                      <button
                        onClick={() => handleExport('csv')}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-emerald-600 hover:border-emerald-500 transition-all shadow-sm"
                        title="Export CSV"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleExport('pdf')}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 hover:border-blue-500 transition-all shadow-sm"
                        title="Export PDF"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.header>

              {/* Statistics Cards */}
              <motion.div
                className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
                variants={itemVariants}
              >
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

                 <button
                  onClick={() => setStatusFilter('CANCELLED')}
                  className={`bg-white rounded-2xl border p-6 text-left transition-all hover:shadow-md active:scale-[0.98] ${
                    statusFilter === 'CANCELLED' ? 'border-red-500 shadow-md ring-1 ring-red-500' : 'border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Cancelled Orders
                    </span>
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {stats.cancelled}
                  </div>
                </button>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Total Revenue
                    </span>
                    <IndianRupee className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-600">
                    ₹{stats.revenue.toFixed(2)}
                  </div>
                </div>
              </motion.div>

              <motion.div className="bg-transparent" variants={itemVariants}>
                {loading ? (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <LoadingSkeleton count={5} />
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <EmptyState
                      icon={Receipt}
                      title="No orders found"
                      description="No orders match your current filters. Try adjusting your search criteria."
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredOrders.map((order) => {
                      const customerDisplay = getCustomerDisplay(order);
                      return (
                        <div
                          key={order.id}
                          className="group bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-xl hover:border-emerald-200 transition-all duration-300 flex flex-col h-full relative overflow-visible"
                        >
                          {/* Status Strip */}
                          <div
                            className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${order.status === 'COMPLETED'
                              ? 'bg-emerald-500'
                              : order.status === 'REFUNDED'
                                ? 'bg-orange-500'
                                : order.status === 'VOID_REQUESTED'
                                  ? 'bg-violet-500'
                                  : order.status === 'CANCELLED'
                                    ? 'bg-red-500'
                                    : order.status === 'PARTIAL_REFUND'
                                      ? 'bg-amber-500'
                                      : 'bg-yellow-500'
                              }`}
                          />

                          <div className="flex justify-between items-center mb-1">
                            <div className="flex-1 min-w-0">
                              <h3
                                className="text-base font-black text-slate-900 tracking-tight truncate whitespace-nowrap"
                                title={order.orderNumber || `#${order.id}`}
                              >
                                {order.orderNumber || `#${order.id}`}
                              </h3>
                            </div>
                             <div className="relative flex items-center gap-1">
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setOpenMenuId(openMenuId === order.id ? null : order.id);
                                 }}
                                 className="p-1 hover:bg-slate-100 rounded-lg transition-all duration-200 text-slate-900"
                               >
                                 <MoreVertical className="w-5 h-5" />
                               </button>
                              {openMenuId === order.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setOpenMenuId(null)}
                                  />
                                  <div className="absolute top-full right-0 mt-2 w-36 bg-white rounded-xl shadow-2xl border border-slate-100 py-2 z-20 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 origin-top-right">
                                    <button
                                      onClick={() => {
                                        handleViewDetails(order);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                    >
                                      <Eye className="w-4 h-4 text-blue-500" />
                                      View Details
                                    </button>
                                    {['COMPLETED', 'PARTIAL_REFUND'].includes(order.status) && (
                                      <>
                                        <div className="h-px bg-slate-100 my-1 mx-2" />
                                        <button
                                          onClick={() => {
                                            handleInitiateRefund(order);
                                            setOpenMenuId(null);
                                          }}
                                          className="w-full text-left px-4 py-2 text-sm font-bold text-orange-600 hover:bg-orange-50 flex items-center gap-2 transition-colors"
                                          disabled={processingOrderId === order.id}
                                        >
                                          <RotateCcw className="w-4 h-4" />
                                          Refund
                                        </button>
                                      </>
                                    )}
                                    {order.status === 'COMPLETED' && order.shiftStatus === 'OPEN' && (
                                      <button
                                        onClick={() => {
                                          handleInitiateVoidRequest(order);
                                          setOpenMenuId(null);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                        disabled={processingOrderId === order.id}
                                      >
                                        <XCircle className="w-4 h-4" />
                                        {requiresManagerApprovalForVoid ? 'Void Request' : 'Void'}
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {getStatusBadge(order.status)}
                          </div>

                          <div className="space-y-4 flex-1">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="flex items-center gap-2 mb-1">
                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                  Customer
                                </span>
                              </div>
                              <p className="text-sm font-bold text-slate-800 truncate">
                                {customerDisplay.name}
                              </p>
                              {customerDisplay.email && (
                                <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5 truncate">
                                  <Mail className="w-2.5 h-2.5" />
                                  {customerDisplay.email?.toLowerCase()}
                                </div>
                              )}
                            </div>

                            {/* Items Preview */}
                            <div className="px-1">
                              <div className="flex items-center gap-2 mb-2">
                                <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                  Items
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                {getDisplayItems(order)
                                  .slice(0, 2)
                                  .map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="flex justify-between items-center text-xs"
                                    >
                                      <span className="text-slate-600 font-medium truncate pr-2 flex-1">
                                        {item.productName}
                                      </span>
                                      <span className={`font-bold shrink-0 ${Number(item.quantity) < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                                        {Number(item.quantity) < 0 ? item.quantity : `x${item.quantity}`}
                                      </span>
                                    </div>
                                  ))}
                                {getDisplayItems(order).length > 2 && (
                                  <p className="text-[10px] text-slate-400 font-bold italic pt-0.5">
                                    + {getDisplayItems(order).length - 2} more items...
                                  </p>
                                )}
                                {getDisplayItems(order).length === 0 && (
                                  <p className="text-xs text-slate-400 italic">No items found</p>
                                )}
                              </div>
                            </div>

                          </div>

                          <div className="mt-auto pt-2">
                            <div className="flex justify-between items-center px-1">
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">
                                  Total Amount
                                </span>
                                <div className="text-2xl font-black text-emerald-600 flex items-center gap-0.5">
                                  <IndianRupee className="w-5 h-5" />
                                  {getNetPaidAmount(order).toFixed(2)}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">
                                  Method
                                </span>
                                {getPositivePayments(order).length > 1 ? (
                                  <div className="flex flex-row items-center justify-end gap-1">
                                    {getPositivePayments(order).map((payment, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center px-2 py-0.5 rounded bg-slate-900 text-white text-[9px] font-black tracking-wider uppercase"
                                      >
                                        {payment.method}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-black tracking-wider uppercase">
                                    {order.paymentMethod}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center border-t border-slate-200 pt-6">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
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
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
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
            </motion.div>
          </main>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && selectedOrderFinancials && (
        <EnhancedModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Order #${selectedOrder.orderNumber || selectedOrder.id}`}
          size="small"
          className="max-h-[550px] h-[550px]"
          hideScrollbar={true}
        >
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
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-1 rounded bg-slate-900 text-white text-xs font-bold uppercase">
                            {payment.method}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-slate-900">
                          ₹{payment.amount.toFixed(2)}
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
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center px-2 py-1 rounded bg-amber-600 text-white text-xs font-bold uppercase">
                                {payment.method}
                              </span>
                            </div>
                            <span className="text-sm font-bold text-amber-700">
                              -₹{Math.abs(payment.amount || 0).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-slate-900 mt-1">
                    {selectedOrder.paymentMethod}
                  </p>
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
                      const soldSubtotal = Number(
                        ((item.price || 0) * (item.originalQuantity || 0)).toFixed(2),
                      );

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
        </EnhancedModal>
      )}

      {/* Refund Modal */}
      {selectedOrder && isRefundModalOpen && (
        <RefundModal
          isOpen={isRefundModalOpen}
          onClose={() => setIsRefundModalOpen(false)}
          orderId={selectedOrder.id}
          orderNumber={selectedOrder.orderNumber}
          items={getOrderItems(selectedOrder).filter(item => item.quantity > 0).map((item, index) => ({
            id: item.id?.toString() || `refund-${item.productId}-${index}`,
            productId: item.productId,
            name: item.productName,
            sku: item.sku,
            price: item.price,
            quantity: item.quantity,
            discount: item.discount || 0,
            subtotal: item.lineTotal,
          }))}
          totalAmount={selectedOrder.total}
          subtotalAmount={selectedOrderFinancials?.subtotal}
          taxAmount={selectedOrderFinancials?.tax}
          discountAmount={selectedOrderFinancials?.discount}
          onRefund={handleProcessRefund}
        />
      )}

      {/* Void Modal */}
      {selectedOrder && isVoidModalOpen && (
        <VoidTransactionModal
          isOpen={isVoidModalOpen}
          onClose={() => setIsVoidModalOpen(false)}
          orderId={selectedOrder.id}
          items={getOrderItems(selectedOrder).map((item, index) => ({
            id: item?.id?.toString() || `${item?.productId || 'product'}-${index}`,
            productId: item?.productId || 0,
            name: item?.productName || '',
            sku: item?.sku || '',
            price: item?.price || 0,
            quantity: item?.quantity || 0,
            discount: item?.discount || 0,
            subtotal: item?.lineTotal || 0,
          }))}
          totalAmount={selectedOrder.total || 0}
          requireManagerPin={false}
          actionLabel={requiresManagerApprovalForVoid ? 'Void Request' : 'Void Order'}
          onVoid={requiresManagerApprovalForVoid ? handleRequestVoidApproval : handleDirectVoid}
        />
      )}
    </>
  );
};

export default OrderHistoryPage;
