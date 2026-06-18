import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  applyDiscount,
  removeDiscount,
  setTaxRate,
} from '../../store/slices/cartSlice';
import { loadCurrentShift, setCurrentShift, clearShift } from '../../store/slices/shiftSlice';
import { Product, deductStock } from '../../store/slices/productSlice';

import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import ProductSearch from '../../features/pos/POSProductSearch';
import { Cart } from '../../features/pos/Cart';
import { CheckoutModal, PaymentData } from '../../features/pos/CheckoutModal';
import { CustomerSelector } from '../../features/pos/CustomerSelector';
import SplitPaymentModal from '../../features/pos/SplitPaymentModal';
import RefundModal, { RefundData } from '../../features/pos/RefundModal';
import VoidTransactionModal, { VoidData } from '../../features/pos/VoidTransactionModal';
import KeyboardShortcutsHelp from '../../features/pos/KeyboardShortcutsHelp';
import CategoryProductBrowser from '../../features/pos/CategoryProductBrowser';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { printReceipt, generateReceiptHTML, emailReceipt, ReceiptData, CompanyInfo } from '../../utils/receiptGenerator';
import toast from '../../utils/toast';
import {
  Users,
  CreditCard,
  XCircle,
  HelpCircle,
  Mail,
  Clock,
  IndianRupee,
  LogIn,
  LogOut,
  CheckCircle,
  RefreshCw,
  Building,
} from 'lucide-react';
import api from '../../services/api';
import shiftService, { ShiftReportResponse, ShiftResponse } from '../../services/shiftService';
import PCard from '../../features/products/ProductCard'; // Rename to avoid potential conflict
import EnhancedModal from '../../components/ui/EnhancedModal';
import branchService from '../../services/branchService';
import { motion } from 'framer-motion';
import DiscountModal from '../../components/cashier/DiscountModal';
import customerService from '../../services/customerService';

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone: string;
  loyaltyPoints: number;
  loyaltyTier: string;
  totalPurchases?: number;
}

type LoyaltyTierByOrders = 'BRONZE' | 'SILVER' | 'GOLD';

const getLoyaltyTierByOrderPoints = (points: number): LoyaltyTierByOrders => {
  if (points >= 10) return 'GOLD';
  if (points >= 5) return 'SILVER';
  return 'BRONZE';
};

const getLoyaltyDiscountRateByTier = (tier: LoyaltyTierByOrders): number => {
  if (tier === 'GOLD') return 0.2;
  if (tier === 'SILVER') return 0.1;
  return 0;
};

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

const EnhancedPOSTerminal: React.FC = () => {
  const dispatch = useAppDispatch();
  const cart = useAppSelector((state) => state.cart);
  const { items: cartItems } = cart;
  const { user } = useAppSelector((state) => state.auth);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSplitPaymentOpen, setIsSplitPaymentOpen] = useState(false);
  const [isCustomerSelectorOpen, setIsCustomerSelectorOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptHtml, setReceiptHtml] = useState<string>('');
  const [scannedProduct, setScannedProduct] = useState<any | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isShiftRequiredModalOpen, setIsShiftRequiredModalOpen] = useState(false);
  const [isClearCartConfirmOpen, setIsClearCartConfirmOpen] = useState(false);
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const { currentShift } = useAppSelector((state) => state.shift);
  const [currentShiftReport, setCurrentShiftReport] = useState<ShiftReportResponse | null>(null);
  const [startingCash, setStartingCash] = useState('');
  const [finalCash, setFinalCash] = useState('');
  const [shiftNotes, setShiftNotes] = useState('');
  const [processingShiftAction, setProcessingShiftAction] = useState(false);
  const [inventorySync, setInventorySync] = useState<{
    nonce: number;
    items: { productId: number; quantity: number }[];
  } | null>(null);
  const [productRefreshKey, setProductRefreshKey] = useState(0);

  const [emailInput, setEmailInput] = useState('');
  const [branchId, setBranchId] = useState<number | undefined>(undefined);
  const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(undefined);
  const [availableBranches, setAvailableBranches] = useState<any[]>([]);
  const [maxDiscountPercent, setMaxDiscountPercent] = useState<number>(100);
  const [discountEnabled, setDiscountEnabled] = useState<boolean>(true);

  const isAdminRole = user?.roles?.includes('ROLE_STORE_ADMIN') || user?.role === 'ROLE_STORE_ADMIN';
  const isBranchManagerRole = user?.roles?.includes('ROLE_BRANCH_MANAGER') || user?.role === 'ROLE_BRANCH_MANAGER';
  const requiresActiveShift = !isAdminRole && !isBranchManagerRole;
  const isShiftOpenForSales = !requiresActiveShift || !!currentShift;

  const loadAvailableBranches = async () => {
    if (!isAdminRole) return;
    try {
      const branches = await branchService.getBranches();
      setAvailableBranches(branches);
      if (branches.length > 0 && !selectedBranchId) {
        setSelectedBranchId(branches[0].id);
        loadBranchTaxRate(branches[0].id);
      }
    } catch (error) {
      console.error('Failed to load branches:', error);
    }
  };

  const loadBranchTaxRate = async (bId?: number) => {
    try {
      const targetId = bId || selectedBranchId;
      // For Branch Manager, if no branch selected, settings service will use their assigned branch
      const settings = await branchService.getBranchSettings(
        typeof targetId === 'number' && targetId > 0 ? targetId : undefined
      );
      const resolvedTaxRate = Number(settings?.taxRate);

      if (Number.isFinite(resolvedTaxRate) && resolvedTaxRate >= 0) {
        dispatch(setTaxRate(resolvedTaxRate));
      }
      setBranchId(settings?.branchId ? Number(settings.branchId) : undefined);
      if (!selectedBranchId && settings?.branchId) {
        setSelectedBranchId(Number(settings.branchId));
      }
      setMaxDiscountPercent(Number(settings?.maxDiscountPercent ?? 100));
      setDiscountEnabled(settings?.discountEnabled !== false);
    } catch (error) {
      console.error('Failed to load branch tax rate:', error);
    }
  };

  useEffect(() => {
    loadAvailableBranches();
    loadBranchTaxRate();
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      loadBranchTaxRate();
      void fetchCurrentShift();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  useEffect(() => {
    void fetchCurrentShift();
  }, []);

  useEffect(() => {
    if (!currentShift) return;

    const refreshCurrentShiftReport = async () => {
      try {
        const report = await shiftService.getShiftReport(currentShift.id);
        setCurrentShiftReport(report);
      } catch {
        console.warn('Could not refresh current shift report');
      }
    };

    void refreshCurrentShiftReport();
    const intervalId = window.setInterval(() => {
      void refreshCurrentShiftReport();
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [currentShift]);

  useEffect(() => {
    const syncChannel = new BroadcastChannel('paypoint_sync');
    syncChannel.onmessage = (event) => {
      if (event.data === 'PRODUCT_UPDATED') {
        setProductRefreshKey((prev) => prev + 1);
      }
    };

    const handleFocus = () => {
      loadBranchTaxRate();
      void fetchCurrentShift();
      setProductRefreshKey((prev) => prev + 1);
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      syncChannel.close();
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const formattedTaxRate = Number.isInteger(cart.taxRate)
    ? `${cart.taxRate}`
    : cart.taxRate.toFixed(2).replace(/\.?0+$/, '');

  const subtotal = cart.subtotalBeforeDiscount;
  const discountAmount = cart.discountAmount;
  const orderPoints = selectedCustomer?.totalPurchases || 0;
  const loyaltyTierByOrders = getLoyaltyTierByOrderPoints(orderPoints);
  const loyaltyDiscountRate = selectedCustomer
    ? getLoyaltyDiscountRateByTier(loyaltyTierByOrders)
    : 0;
  const loyaltyDiscount = Number((subtotal * loyaltyDiscountRate).toFixed(2));
  const combinedDiscount = Math.min(subtotal, Number((discountAmount + loyaltyDiscount).toFixed(2)));
  const taxableAmount = Math.max(0, Number((subtotal - combinedDiscount).toFixed(2)));
  const taxAmount = Number(((taxableAmount * cart.taxRate) / 100).toFixed(2));
  const finalTotal = Number((taxableAmount + taxAmount).toFixed(2));
  const checkoutCustomer = selectedCustomer
    ? {
      ...selectedCustomer,
      loyaltyPoints: orderPoints,
      loyaltyTier: loyaltyTierByOrders,
    }
    : null;

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
  }, []);

  const roleValue = user?.role || (Array.isArray(user?.roles) ? user.roles[0] : '');
  const isCashierRole =
    roleValue === 'ROLE_CASHIER' ||
    roleValue === 'CASHIER' ||
    (Array.isArray(user?.roles) && user.roles.includes('ROLE_CASHIER'));
  const hasDiscountPermission =
    isCashierRole ||
    roleValue === 'ROLE_BRANCH_MANAGER' ||
    roleValue === 'ROLE_STORE_ADMIN' ||
    roleValue === 'BRANCH_MANAGER' ||
    roleValue === 'STORE_ADMIN' ||
    (Array.isArray(user?.roles) &&
      (user.roles.includes('ROLE_BRANCH_MANAGER') ||
        user.roles.includes('ROLE_STORE_ADMIN')));
  const effectiveMaxDiscountPercent = isCashierRole
    ? Math.min(Number(maxDiscountPercent || 0), 20)
    : maxDiscountPercent;

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'F1',
      callback: () => {
        document.getElementById('product-search')?.focus();
      },
      description: 'Focus product search',
    },
    {
      key: 'F2',
      callback: () => {
        setIsCustomerSelectorOpen(true);
      },
      description: 'Add/Select customer',
    },
    {
      key: 'F3',
      callback: () => {
        if (cartItems.length > 0) {
          void (async () => {
            if (await ensureActiveShift()) {
              setIsCheckoutOpen(true);
            }
          })();
        }
      },
      description: 'Open checkout',
    },
    {
      key: 'Escape',
      callback: () => {
        if (cartItems.length > 0) {
          setIsClearCartConfirmOpen(true);
        }
      },
      description: 'Clear cart',
    },
    {
      key: '?',
      ctrl: true,
      callback: () => {
        setIsShortcutsHelpOpen(true);
      },
      description: 'Show keyboard shortcuts',
    },
    {
      key: 'p',
      ctrl: true,
      callback: () => {
        if (lastReceipt && companyInfo) {
          printReceipt(lastReceipt, companyInfo);
        } else {
          toast.error('Store info not loaded');
        }
      },
      description: 'Print last receipt',
    },
    {
      key: 'r',
      ctrl: true,
      callback: () => {
        if (lastReceipt) {
          setIsRefundModalOpen(true);
        }
      },
      description: 'Process refund',
    },
    {
      key: 'v',
      ctrl: true,
      callback: () => {
        if (lastReceipt) {
          setIsVoidModalOpen(true);
        }
      },
      description: 'Void transaction',
    },
  ]);

  const fetchCurrentShift = async () => {
    try {
      const shift = await shiftService.getCurrentShift();
      dispatch(setCurrentShift(shift));

      if (shift) {
        try {
          const report = await shiftService.getShiftReport(shift.id);
          setCurrentShiftReport(report);
        } catch {
          setCurrentShiftReport(null);
        }
      } else {
        setCurrentShiftReport(null);
      }
    } catch (error) {
      console.error('Error fetching current shift:', error);
      dispatch(clearShift());
      setCurrentShiftReport(null);
    }
  };

  const handleProductSelect = async (product: Product) => {
    if (!isShiftOpenForSales) {
      setIsShiftRequiredModalOpen(true);
      toast.error('Open the shift to process and add products to cart');
      setIsProductModalOpen(false);
      setScannedProduct(null);
      return;
    }

    if (!(await ensureActiveShift())) {
      toast.error('Open the shift to process and add products to cart');
      setIsProductModalOpen(false);
      setScannedProduct(null);
      return;
    }

    const stockQty =
      product.currentStock ?? (product as any).availableQuantity ?? (product as any).quantity;

    if (typeof stockQty === 'number' && stockQty <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }

    const existingItem = cartItems.find((item) => item.productId === product.id);
    if (typeof stockQty === 'number' && existingItem && existingItem.quantity >= stockQty) {
      toast.error(`Only ${stockQty} unit(s) available for ${product.name}`);
      return;
    }

    dispatch(
      addToCart({
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        maxQuantity: typeof stockQty === 'number' && stockQty > 0 ? stockQty : undefined,
      }),
    );
    toast.success(`${product.name} added to cart`);
    setIsProductModalOpen(false);
    setScannedProduct(null);
  };

  async function ensureActiveShift(): Promise<boolean> {
    // Only ROLE_CASHIER is strictly required to have an active shift for reconciliation.
    // Managers and Admins can bypass this to perform administrative or quick sales.
    if (isAdminRole || isBranchManagerRole) {
      return true;
    }

    try {
      const shift = await shiftService.getCurrentShift();
      const hasActiveShift = shift !== null;
      dispatch(setCurrentShift(shift));

      if (shift) {
        try {
          const report = await shiftService.getShiftReport(shift.id);
          setCurrentShiftReport(report);
        } catch {
          setCurrentShiftReport(null);
        }
      }

      if (!hasActiveShift) {
        setIsShiftRequiredModalOpen(true);
        return false;
      }
      return true;
    } catch {
      toast.error('Shift synchronization error. Please check your connection or contact support if the issue persists.');
      return false;
    }
  }

  const handleOpenShift = async () => {
    const amount = parseFloat(startingCash);
    const validation = shiftService.validateStartingCash(amount);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid starting cash amount');
      return;
    }

    try {
      setProcessingShiftAction(true);
      const shift = await shiftService.openShift(amount, shiftNotes, isAdminRole ? selectedBranchId : undefined);
      dispatch(setCurrentShift(shift));
      setIsOpenShiftModalOpen(false);
      setIsShiftRequiredModalOpen(false);
      setStartingCash('');
      setShiftNotes('');
      toast.success(`Shift opened with ${shiftService.formatCurrency(amount)}`);
      new BroadcastChannel('paypoint_sync').postMessage('SHIFT_UPDATED');
      await fetchCurrentShift();
    } catch (error: any) {
      toast.error(error.message || 'Failed to open shift');
    } finally {
      setProcessingShiftAction(false);
    }
  };

  const handleCloseShift = async () => {
    if (!currentShift || !currentShiftReport) return;

    const amount = parseFloat(finalCash);
    const validation = shiftService.validateFinalCash(amount, currentShift.startingCash);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid final cash amount');
      return;
    }

    try {
      setProcessingShiftAction(true);
      const report = await shiftService.closeShift(amount, shiftNotes);
      dispatch(clearShift());
      setCurrentShiftReport(null);
      setIsCloseShiftModalOpen(false);
      setFinalCash('');
      setShiftNotes('');

      const varianceStatus = shiftService.getVarianceStatus(report.variance);
      const varianceMsg = `Shift closed. Variance: ${shiftService.formatCurrency(Math.abs(report.variance))} (${varianceStatus})`;

      if (shiftService.isVarianceAcceptable(report.variance)) {
        toast.success(varianceMsg);
      } else {
        toast.warning(varianceMsg);
      }
      new BroadcastChannel('paypoint_sync').postMessage('SHIFT_UPDATED');
    } catch (error: any) {
      toast.error(error.message || 'Failed to close shift');
    } finally {
      setProcessingShiftAction(false);
    }
  };

  const handleBarcodeScanned = async (barcode: string) => {
    try {
      const response = await api.get(`/products/barcode/${barcode}`);
      const product = response.data;
      setScannedProduct(product);
      setIsProductModalOpen(true);
    } catch (error) {
      toast.error('Product not found');
      setScannedProduct(null);
      setIsProductModalOpen(false);
      console.error('Barcode scan error:', error);
    }
  };

  const handleCheckoutComplete = async (paymentData: PaymentData) => {
    try {
      if (!paymentData.orderId) {
        throw new Error('Missing order ID from checkout response');
      }

      const receiptPaymentMethod =
        paymentData.payments && paymentData.payments.length > 0
          ? paymentData.payments
              .map((payment) => `${payment.method} (INR ${Number(payment.amount || 0).toFixed(2)})`)
              .join(' + ')
          : paymentData.paymentMethod;

      // Generate receipt data
      const receiptData: ReceiptData = {
        orderId: paymentData.orderNumber || paymentData.orderId,
        transactionOrderId: paymentData.orderId,
        orderDate: new Date(),
        cashierName: user?.username || 'Unknown',
        customerName: selectedCustomer?.name,
        customerEmail: selectedCustomer?.email,
        items: cartItems,
        subtotal,
        tax: taxAmount,
        discount: combinedDiscount,
        total: finalTotal,
        paymentMethod: receiptPaymentMethod,
        payments: paymentData.payments,
        amountPaid: paymentData.amountPaid,
        change: paymentData.change,
        loyaltyPointsEarned: paymentData.pointsEarned,
        loyaltyPointsRedeemed: paymentData.pointsRedeemed,
      };

      setLastReceipt(receiptData);
      setIsCheckoutOpen(false);

      const deductions = cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));
      dispatch(deductStock(deductions));
      setInventorySync({ nonce: Date.now(), items: deductions });

      dispatch(clearCart());
      setSelectedCustomer(null);

      window.setTimeout(() => {
        if (companyInfo) {
          const html = generateReceiptHTML(receiptData, companyInfo);
          setReceiptHtml(html);
          setShowReceiptModal(true);
        } else {
          toast.error('Store info not loaded');
        }
        toast.success('Order completed successfully!');
        console.log('POS: Broadcasting CUSTOMER_UPDATED after order');
        new BroadcastChannel('paypoint_sync').postMessage('CUSTOMER_UPDATED');
      }, 150);
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to complete order');
    }
  };

  const handleSplitPaymentComplete = async (paymentData: PaymentData) => {
    try {
      const receiptPaymentMethod =
        paymentData.payments && paymentData.payments.length > 0
          ? paymentData.payments
              .map((payment) => `${payment.method} (INR ${Number(payment.amount || 0).toFixed(2)})`)
              .join(' + ')
          : paymentData.paymentMethod;

      const receiptData: ReceiptData = {
        orderId: paymentData.orderNumber || paymentData.orderId,
        transactionOrderId: paymentData.orderId,
        orderDate: new Date(),
        cashierName: user?.username || 'Unknown',
        customerName: selectedCustomer?.name,
        customerEmail: selectedCustomer?.email,
        items: cartItems,
        subtotal,
        tax: taxAmount,
        discount: combinedDiscount,
        total: finalTotal,
        paymentMethod: receiptPaymentMethod,
        payments: paymentData.payments,
        amountPaid: paymentData.amountPaid,
        change: paymentData.change,
        loyaltyPointsEarned: paymentData.pointsEarned,
        loyaltyPointsRedeemed: paymentData.pointsRedeemed,
      };

      setLastReceipt(receiptData);
      setIsSplitPaymentOpen(false);

      if (selectedCustomer?.id) {
        try {
          const response = await customerService.getById(selectedCustomer.id);
          setSelectedCustomer(response.data);
        } catch (err) {
          console.warn('Failed to refresh customer after split payment', err);
        }
      }

      const deductions = cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));
      dispatch(deductStock(deductions));
      setInventorySync({ nonce: Date.now(), items: deductions });

      dispatch(clearCart());
      setSelectedCustomer(null);

      window.setTimeout(() => {
        if (companyInfo) {
          const html = generateReceiptHTML(receiptData, companyInfo);
          setReceiptHtml(html);
          setShowReceiptModal(true);
        } else {
          toast.error('Store info not loaded');
        }
        toast.success('Split payment completed successfully!');
        console.log('POS: Broadcasting CUSTOMER_UPDATED after split payment');
        new BroadcastChannel('paypoint_sync').postMessage('CUSTOMER_UPDATED');
      }, 150);
    } catch (error) {
      console.error('Split payment completion error:', error);
      toast.error('Failed to finalize split payment');
    }
  };

  const handleRefund = async (refundData: RefundData) => {
    try {
      await api.post('/orders/refund', refundData);
      toast.success('Refund processed successfully');
      console.log('POS: Broadcasting CUSTOMER_UPDATED after refund');
      new BroadcastChannel('paypoint_sync').postMessage('CUSTOMER_UPDATED');
      setIsRefundModalOpen(false);
    } catch (error) {
      console.error('Refund error:', error);
      toast.error('Failed to process refund');
      throw error;
    }
  };

  const handleVoid = async (voidData: VoidData) => {
    try {
      await api.post('/orders/void', voidData);
      toast.success('Transaction voided successfully');
      console.log('POS: Broadcasting CUSTOMER_UPDATED after void');
      new BroadcastChannel('paypoint_sync').postMessage('CUSTOMER_UPDATED');
      setIsVoidModalOpen(false);
    } catch (error) {
      console.error('Void error:', error);
      toast.error('Failed to void transaction');
      throw error;
    }
  };

  const handleClearCart = () => {
    dispatch(clearCart());
    setSelectedCustomer(null);
    setIsClearCartConfirmOpen(false);
    toast.info('Cart cleared');
  };

  const submitEmailReceipt = async () => {
    if (!lastReceipt || !emailInput) return;

    try {
      if (companyInfo) {
        await emailReceipt(lastReceipt, companyInfo, emailInput);
        toast.success('Receipt sent successfully');
        setIsEmailModalOpen(false);
      } else {
        toast.error('Store info not loaded');
      }
    } catch (error) {
      console.error('Email error:', error);
      toast.error('Failed to send receipt');
    }
  };

  return (
    <>
      <EnhancedModal
        isOpen={isProductModalOpen && !!scannedProduct}
        onClose={() => {
          setIsProductModalOpen(false);
          setScannedProduct(null);
        }}
        title={scannedProduct ? 'Scanned Product' : 'Product Details'}
        size="small"
        className="max-h-[550px] h-[550px]"
        hideScrollbar={true}
      >
        {scannedProduct && (
          <div className="flex flex-col items-center space-y-4">
            <PCard product={scannedProduct} />
            <button
              className={`px-6 py-2 text-white rounded-xl font-bold mt-2 ${((scannedProduct as any).currentStock ??
                (scannedProduct as any).availableQuantity ??
                (scannedProduct as any).quantity ??
                1) <= 0
                ? 'bg-red-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              disabled={
                ((scannedProduct as any).currentStock ??
                  (scannedProduct as any).availableQuantity ??
                  (scannedProduct as any).quantity ??
                  1) <= 0 || !isShiftOpenForSales
              }
              onClick={() => handleProductSelect(scannedProduct)}
            >
              {((scannedProduct as any).currentStock ??
                (scannedProduct as any).availableQuantity ??
                (scannedProduct as any).quantity ??
                1) <= 0
                ? 'Out of Stock'
                : !isShiftOpenForSales
                ? 'Open Shift First'
                : 'Add to Cart'}
            </button>
          </div>
        )}
      </EnhancedModal>
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
                      Cashier Terminal
                    </span>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                      Point of Sale
                    </h1>
                    <p className="text-slate-500 font-medium">
                      Process transactions and manage customer orders
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Show Shift Controls ONLY for Cashier */}
                    {!isAdminRole && !isBranchManagerRole && (
                      <button
                        onClick={() =>
                          currentShift ? setIsCloseShiftModalOpen(true) : setIsOpenShiftModalOpen(true)
                        }
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all border font-bold ${currentShift
                          ? 'bg-slate-900 text-white border-slate-900 hover:bg-black'
                          : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                          }`}
                      >
                        {currentShift ? <LogOut className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                        <span className="text-sm">{currentShift ? 'Close Shift' : 'Open Shift'}</span>
                      </button>
                    )}

                    {/* Show Branch Selector in Header for Store Admin */}
                    {isAdminRole && availableBranches.length > 0 && (
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm hover:shadow-md transition-all">
                        <Building className="w-4 h-4 text-emerald-600" />
                        <select
                          value={selectedBranchId || 0}
                          onChange={(e) => {
                            const bId = Number(e.target.value);
                            const bName = bId === 0 ? 'All Branches' : availableBranches.find(b => b.id === bId)?.name || 'Branch';
                            setSelectedBranchId(bId || undefined);
                            loadBranchTaxRate(bId || undefined);
                            toast.success(`Switched to ${bName}`);
                          }}
                          className="bg-transparent border-none outline-none text-sm font-bold text-slate-900 focus:ring-0 cursor-pointer"
                        >
                          <option value={0}>All Branches</option>
                          {availableBranches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button
                      onClick={() => setIsShortcutsHelpOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-white hover:shadow-sm rounded-xl transition-all border border-slate-200"
                    >
                      <HelpCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Shortcuts (Ctrl+?)</span>
                    </button>
                  </div>
                </div>
              </motion.header>

              <motion.div className="mb-6" variants={itemVariants}>
                <div
                  className={`rounded-2xl border shadow-sm p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between ${currentShift
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-slate-50 border-slate-200'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${currentShift ? 'bg-white text-emerald-600' : 'bg-white text-slate-500'
                        }`}
                    >
                      <Clock className="w-4 h-4" />
                    </div>
                    <h2 className="text-base font-black text-slate-900">
                      {currentShift 
                        ? 'Shift In Progress' 
                        : (isAdminRole || isBranchManagerRole) 
                          ? `${isAdminRole ? 'Store Admin' : 'Branch Manager'} POS Mode` 
                          : 'No Active Shift'}
                    </h2>
                  </div>

                  <div className="text-sm font-semibold text-slate-600">
                    {currentShift
                      ? `Started at ${shiftService.formatTime(currentShift.shiftStart)}`
                      : (isAdminRole || isBranchManagerRole)
                        ? 'You are acting with administrative privileges. Shift not required.'
                        : 'Open your shift to start billing and taking payments.'}
                  </div>
                </div>
              </motion.div>

              {/* Main Content Grid */}
              <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-6" variants={itemVariants}>
                {/* Left Panel - Products & Search */}
                <motion.div className="lg:col-span-2 space-y-6" variants={itemVariants}>
                  {/* Product Search - Now inside grid to reduce width */}
                  <motion.div
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
                    variants={itemVariants}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-slate-900">Product Search (F1)</h2>
                      <button
                        onClick={() => setProductRefreshKey((prev) => prev + 1)}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        title="Refresh Products & Stock"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                    {requiresActiveShift && !currentShift && (
                      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                        Open the shift to process and add products to cart.
                      </div>
                    )}
                    <ProductSearch 
                      onProductSelect={handleProductSelect} 
                      branchId={selectedBranchId || user?.branch?.id}
                      disabled={!isShiftOpenForSales}
                    />
                  </motion.div>

                  {/* Category Browser */}
                  <motion.div variants={itemVariants}>
                    <CategoryProductBrowser
                      onProductSelect={handleProductSelect}
                      inventorySync={inventorySync}
                      refreshKey={productRefreshKey}
                      branchId={selectedBranchId || user?.branch?.id}
                      disabled={!isShiftOpenForSales}
                    />
                  </motion.div>
                </motion.div>

                {/* Right Panel - Cart */}
                <motion.div
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow h-fit self-start"
                  variants={itemVariants}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-900">Shopping Cart</h2>
                    {/* Branch Feedback Badge */}
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 shadow-sm">
                      <Building className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-wider">
                        {selectedBranchId 
                          ? availableBranches.find(b => b.id === selectedBranchId)?.name 
                          : user?.branch?.name || 'All Branches'}
                      </span>
                    </div>
                  </div>

                  {/* Customer Section */}
                  {selectedCustomer ? (
                    <div className="mb-4 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-emerald-600" />
                            <span className="font-bold text-emerald-900">
                              {selectedCustomer.name}
                            </span>
                          </div>
                          <div className="text-sm text-emerald-700 mt-1">
                            {orderPoints} points • {loyaltyTierByOrders}
                          </div>
                          <div className="text-xs text-emerald-800 mt-1">
                            {loyaltyTierByOrders === 'GOLD'
                              ? 'Gold unlocked: 10% loyalty discount active'
                              : loyaltyTierByOrders === 'SILVER'
                                ? `${Math.max(0, 10 - orderPoints)} more orders to unlock GOLD (10% OFF)`
                                : `${Math.max(0, 5 - orderPoints)} more orders to unlock SILVER (5% OFF)`}
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedCustomer(null)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsCustomerSelectorOpen(true)}
                      className="w-full mb-4 py-3 border-2 border-dashed border-slate-300 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2 text-slate-600 hover:text-emerald-600"
                    >
                      <Users className="w-5 h-5" />
                      <span className="font-medium">Add Customer (F2)</span>
                    </button>
                  )}

                  {/* Cart Items */}
                  <div className="mb-4">
                    <Cart
                      items={cartItems}
                      onUpdateQuantity={(itemId, quantity) => {
                        const item = cartItems.find((i) => i.id === itemId.toString());
                        if (!item) return;

                        if (typeof item.maxQuantity === 'number' && quantity > item.maxQuantity) {
                          toast.error(`Cannot add more than available stock (${item.maxQuantity})`);
                          return;
                        }

                        dispatch(
                          updateQuantity({
                            id: item.id,
                            quantity,
                            maxQuantity: item.maxQuantity,
                          }),
                        );
                      }}
                      onRemoveItem={(itemId) => {
                        const item = cartItems.find((i) => i.id === itemId.toString());
                        if (item) dispatch(removeFromCart(item.id));
                      }}
                      onClearCart={() => {
                        handleClearCart();
                      }}
                    />
                  </div>

                  {/* Totals */}
                  <div className="border-t-2 border-slate-100 pt-4 space-y-2 mb-4">
                    {hasDiscountPermission && discountEnabled && (
                      <button
                        onClick={() => setIsDiscountModalOpen(true)}
                        className="w-full rounded-lg border border-emerald-200 bg-emerald-50 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        Apply Discount
                      </button>
                    )}
                    {discountAmount > 0 && (
                      <div className="flex items-center justify-between rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700">
                        <span>{cart.discountPercent.toFixed(2)}% OFF applied</span>
                        <button
                          onClick={() => dispatch(removeDiscount())}
                          className="rounded px-2 py-0.5 font-bold hover:bg-orange-100"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    {loyaltyDiscount > 0 && (
                      <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
                        <span>Loyalty ({Math.round(loyaltyDiscountRate * 100)}%) active</span>
                        <span className="font-bold">-₹{loyaltyDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-700">
                      <span className="font-medium">Subtotal:</span>
                      <span className="font-bold">INR {subtotal.toFixed(2)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-orange-600">
                        <span className="font-medium">
                          Discount ({cart.discountPercent.toFixed(2)}%):
                        </span>
                        <span className="font-bold">-INR {discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-700">
                      <span className="font-medium">Taxable Amount:</span>
                      <span className="font-bold">INR {taxableAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span className="font-medium">Tax ({formattedTaxRate}%):</span>
                      <span className="font-bold">INR {taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-2xl font-black text-slate-900 border-t-2 border-slate-200 pt-3 mt-3">
                      <span>TOTAL:</span>
                      <span className="text-emerald-600">INR {finalTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={async () => {
                        if (await ensureActiveShift()) {
                          setIsCheckoutOpen(true);
                        }
                      }}
                      disabled={cartItems.length === 0}
                      className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-5 h-5" />
                      <span>Checkout (F3)</span>
                    </button>

                    <button
                      onClick={async () => {
                        if (await ensureActiveShift()) {
                          setIsSplitPaymentOpen(true);
                        }
                      }}
                      disabled={cartItems.length === 0 || !selectedCustomer}
                      className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-5 h-5" />
                      <span>Split Payment</span>
                    </button>
                    {!selectedCustomer && cartItems.length > 0 && (
                      <p className="text-xs text-slate-500 text-center">
                        Add a customer to enable split payment
                      </p>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </main>
        </div>
      </div>

      {/* Modals */}
      {isCheckoutOpen && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          items={cartItems.map((item) => ({
            id: parseInt(item.id),
            productId: item.productId,
            name: item.name,
            sku: item.sku,
            price: item.price,
            quantity: item.quantity,
            discount: item.discount,
            subtotal: item.subtotal,
          }))}
          customer={checkoutCustomer}
          total={finalTotal}
          discountType={cart.discountType}
          discountPercent={cart.discountPercent}
          discountAmount={cart.discountAmount}
          taxableAmount={taxableAmount}
          taxAmount={taxAmount}
          cartFinalTotal={finalTotal}
          branchId={branchId}
          onClose={() => setIsCheckoutOpen(false)}
          onComplete={handleCheckoutComplete}
        />
      )}

      {isSplitPaymentOpen && (
        <SplitPaymentModal
          isOpen={isSplitPaymentOpen}
          onClose={() => setIsSplitPaymentOpen(false)}
          items={cartItems.map((item) => ({
            id: parseInt(item.id),
            productId: item.productId,
            name: item.name,
            sku: item.sku,
            price: item.price,
            quantity: item.quantity,
            discount: item.discount,
            subtotal: item.subtotal,
          }))}
          customer={selectedCustomer}
          total={finalTotal}
          discountType={cart.discountType}
          discountPercent={cart.discountPercent}
          discountAmount={cart.discountAmount}
          branchId={branchId}
          ensureActiveShift={ensureActiveShift}
          onComplete={handleSplitPaymentComplete}
        />
      )}

      {isDiscountModalOpen && (branchId ?? 0) > 0 && (
        <DiscountModal
          isOpen={isDiscountModalOpen}
          onClose={() => setIsDiscountModalOpen(false)}
          branchId={branchId ?? 0}
          maxDiscountPercent={effectiveMaxDiscountPercent}
          taxRate={cart.taxRate}
          subtotal={cart.subtotalBeforeDiscount}
          initialType={cart.discountType}
          initialValue={
            cart.discountType === 'PERCENTAGE' ? cart.discountPercent : cart.discountAmount
          }
          onLimitExceeded={(message) => {
            toast.error(message);
          }}
          onApply={(payload) => {
            dispatch(applyDiscount(payload));
            toast.success('Discount applied');
          }}
        />
      )}

      {isCustomerSelectorOpen && (
        <CustomerSelector
          selectedCustomer={checkoutCustomer}
          isOpen={isCustomerSelectorOpen}
          onClose={() => setIsCustomerSelectorOpen(false)}
          onSelectCustomer={(customer) => {
            setSelectedCustomer(customer);
            setIsCustomerSelectorOpen(false);
          }}
          onCreateCustomer={() => setIsCustomerSelectorOpen(false)}
        />
      )}

      {isRefundModalOpen && lastReceipt && (
        <RefundModal
          isOpen={isRefundModalOpen}
          onClose={() => setIsRefundModalOpen(false)}
          orderId={lastReceipt.transactionOrderId ?? Number(lastReceipt.orderId)}
          items={lastReceipt.items}
          totalAmount={lastReceipt.total}
          onRefund={handleRefund}
        />
      )}

      {isVoidModalOpen && lastReceipt && (
        <VoidTransactionModal
          isOpen={isVoidModalOpen}
          onClose={() => setIsVoidModalOpen(false)}
          orderId={lastReceipt.transactionOrderId ?? Number(lastReceipt.orderId)}
          items={lastReceipt.items}
          totalAmount={lastReceipt.total}
          onVoid={handleVoid}
        />
      )}

      <KeyboardShortcutsHelp
        isOpen={isShortcutsHelpOpen}
        onClose={() => setIsShortcutsHelpOpen(false)}
      />
      {/* Clear Cart Confirmation Modal */}
      <EnhancedModal
        isOpen={isClearCartConfirmOpen}
        onClose={() => setIsClearCartConfirmOpen(false)}
        title="Clear Cart"
        size="small"
        className="max-h-[300px] h-auto"
        hideHeaderBorder={true}
      >
        <div className="space-y-6 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Are you sure?</h3>
            <p className="text-slate-500">This will remove all items from the current cart.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsClearCartConfirmOpen(false)}
              className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleClearCart}
              className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-sm"
            >
              Yes, Clear It
            </button>
          </div>
        </div>
      </EnhancedModal>

      {/* Shift Required Modal */}
      <EnhancedModal
        isOpen={isShiftRequiredModalOpen}
        onClose={() => setIsShiftRequiredModalOpen(false)}
        title="Shift Required"
        size="small"
        className="max-h-[300px] h-auto"
        hideHeaderBorder={true}
      >
        <div className="space-y-6 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Open Shift Needed</h3>
            <p className="text-slate-500">You must open your shift before processing orders.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsShiftRequiredModalOpen(false)}
              className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200"
            >
              Back
            </button>
            <button
              onClick={() => {
                setIsShiftRequiredModalOpen(false);
                setIsOpenShiftModalOpen(true);
              }}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-sm"
            >
              Open Shift
            </button>
          </div>

          {isAdminRole && availableBranches.length > 0 && !currentShift && (
            <div className="pt-4 border-t border-slate-100 text-left">
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Building className="w-4 h-4 text-slate-400" />
                Acting Branch Selection
              </label>
              <select
                value={selectedBranchId || 0}
                onChange={(e) => {
                  const bId = Number(e.target.value);
                  setSelectedBranchId(bId || undefined);
                  loadBranchTaxRate(bId || undefined);
                }}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium"
              >
                <option value={0}>Select a Branch...</option>
                {availableBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.isMainBranch ? '(Main)' : ''}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-[10px] text-slate-400">
                Logged in as Admin. You can select any branch to perform cashier tasks.
              </p>
            </div>
          )}
        </div>
      </EnhancedModal>

      <EnhancedModal
        isOpen={isOpenShiftModalOpen}
        onClose={() => setIsOpenShiftModalOpen(false)}
        title="Open Shift"
        size="small"
        className="max-h-[550px] h-[550px]"
        hideHeaderBorder={true}
        hideScrollbar={true}
      >
        <div className="space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-sm text-emerald-800 font-medium">
              Before starting your shift, count the drawer money and enter the amount below.
            </p>
          </div>

          {isAdminRole && availableBranches.length > 0 && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Building className="w-4 h-4 text-slate-400" />
                Select Branch for this Shift
              </label>
              <select
                value={selectedBranchId || 0}
                onChange={(e) => {
                  const bId = Number(e.target.value);
                  setSelectedBranchId(bId || undefined);
                  loadBranchTaxRate(bId || undefined);
                }}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
              >
                <option value={0}>Select a Branch...</option>
                {availableBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Starting Cash Amount</label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={startingCash}
                onChange={(e) => setStartingCash(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-lg font-bold no-spinner"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Notes (Optional)</label>
            <textarea
              value={shiftNotes}
              onChange={(e) => setShiftNotes(e.target.value)}
              placeholder="Any notes about this shift..."
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => setIsOpenShiftModalOpen(false)}
              className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              disabled={processingShiftAction}
            >
              Cancel
            </button>
            <button
              onClick={() => void handleOpenShift()}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
              disabled={processingShiftAction || !startingCash}
            >
              {processingShiftAction ? 'Opening...' : 'Open Shift'}
            </button>
          </div>
        </div>
      </EnhancedModal>

      {currentShift && currentShiftReport && (
        <EnhancedModal
          isOpen={isCloseShiftModalOpen}
          onClose={() => setIsCloseShiftModalOpen(false)}
          title="Close Shift"
          size="small"
          className="max-h-[550px] h-[550px]"
          contentClassName="px-6 pt-2 pb-4"
          hideHeaderBorder={true}
          hideScrollbar={true}
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-xl">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Starting Cash
                </div>
                <div className="text-xl font-black text-slate-900">
                  {shiftService.formatCurrency(currentShift.startingCash)}
                </div>
              </div>

              <div className="p-4 bg-white rounded-xl">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Cash Sales
                </div>
                <div className="text-xl font-black text-emerald-600">
                  {shiftService.formatCurrency(currentShiftReport.paymentBreakdown?.CASH || 0)}
                </div>
              </div>

              <div className="p-4 bg-white rounded-xl">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Expected Cash
                </div>
                <div className="text-xl font-black text-slate-900">
                  {shiftService.formatCurrency(currentShiftReport.expectedCash)}
                </div>
              </div>

              <div className="p-4 bg-white rounded-xl">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Total Sales
                </div>
                <div className="text-xl font-black text-slate-900">
                  {shiftService.formatCurrency(currentShiftReport.totalSales)}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Final Cash Amount</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={finalCash}
                  onChange={(e) => setFinalCash(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-lg font-bold no-spinner"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Notes (Optional)</label>
              <textarea
                value={shiftNotes}
                onChange={(e) => setShiftNotes(e.target.value)}
                placeholder="Any notes about closing..."
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                rows={3}
              />
            </div>

            {finalCash && !isNaN(parseFloat(finalCash)) && (
              (() => {
                const variance = parseFloat(finalCash) - currentShiftReport.expectedCash;
                return (
                  <div
                    className={`p-4 rounded-xl border-2 ${variance >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Cash Variance
                        </div>
                        <div className={`text-2xl font-black ${variance >= 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                          {variance >= 0 ? '+' : ''}
                          {shiftService.formatCurrency(Math.abs(variance))}
                        </div>
                      </div>
                      <CheckCircle className={`w-8 h-8 ${variance >= 0 ? 'text-emerald-600' : 'text-slate-900'}`} />
                    </div>
                  </div>
                );
              })()
            )}

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setIsCloseShiftModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                disabled={processingShiftAction}
              >
                Cancel
              </button>
              <button
                onClick={() => void handleCloseShift()}
                className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50"
                disabled={processingShiftAction || !finalCash}
              >
                {processingShiftAction ? 'Closing...' : 'Close Shift'}
              </button>
            </div>
          </div>
        </EnhancedModal>
      )}

      {/* Email Receipt Modal */}
      <EnhancedModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        title="Email Receipt"
        size="small"
        className="max-h-[350px] h-auto"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Customer Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="customer@example.com"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                autoFocus
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => setIsEmailModalOpen(false)}
              className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold"
            >
              Cancel
            </button>
            <button
              onClick={submitEmailReceipt}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-sm"
            >
              Send Email
            </button>
          </div>
        </div>
      </EnhancedModal>

      {/* Receipt Modal - shown after every successful payment */}
      <EnhancedModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        title="Receipt"
        size="small"
        className="max-w-lg"
        hideScrollbar={true}
      >
        <div className="flex flex-col gap-4">
          {companyInfo?.name && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span className="font-semibold text-slate-900">Branch:</span> {companyInfo.name}
            </div>
          )}
          <iframe
            srcDoc={receiptHtml}
            title="Receipt"
            className="w-full border rounded-lg"
            style={{ height: '520px' }}
            scrolling="no"
          />
          <div className="flex gap-3">
            <button
              onClick={() => setShowReceiptModal(false)}
              className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
            {lastReceipt && companyInfo && (
              <button
                onClick={() => {
                  printReceipt(lastReceipt, companyInfo);
                }}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm"
              >
                🖨️ Print Receipt
              </button>
            )}
          </div>
        </div>
      </EnhancedModal>
    </>
  );
}


export default EnhancedPOSTerminal;
