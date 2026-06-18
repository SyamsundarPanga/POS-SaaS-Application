import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import DataTable, { Column } from '../../components/ui/DataTable';
import EnhancedModal from '../../components/ui/EnhancedModal';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import StockTransferHistorySection from '../../components/inventory/StockTransferHistorySection';
import toast from '../../utils/toast';
import inventoryService from '../../services/inventoryService';
import { Package, Search, AlertTriangle, Plus, Minus, ArrowRightLeft, TrendingUp, TrendingDown, X, ChevronDown, Filter, MoreVertical, Download, FileText, Skull, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import api from '../../services/api';
import branchService from '../../services/branchService';
import managerReportService from '../../services/managerReportService';
import { updateThreshold } from '../../store/slices/inventorySlice';
import ConfirmModal from '../../components/ui/ConfirmModal';

interface Product {
  id: number;
  productId: number;
  productName: string;
  sku: string;
  productBarcode?: string;
  categoryName?: string;
  quantity: number;
  lowStockThreshold: number;
  price: number;
  branchId: number;
  branchName: string;
  lastRestockDate?: string;
  isLowStock: boolean;
  availableQuantity: number;
  reservedQuantity: number;
}

interface BranchOption {
  id: number;
  name: string;
}

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

const ManagerInventoryManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  // Dead Stock State
  const [deadStockDays, setDeadStockDays] = useState<number>(90);
  const [deadStockLoading, setDeadStockLoading] = useState<boolean>(false);
  const [deadStockError, setDeadStockError] = useState<string | null>(null);
  const [deadStock, setDeadStock] = useState<any[]>([]);
  const [showDeadStock, setShowDeadStock] = useState(false);

  const { user } = useAppSelector((state) => state.auth);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [allProductsForStats, setAllProductsForStats] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 12;
  const [isStockDropdownOpen, setIsStockDropdownOpen] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [destinationBranchId, setDestinationBranchId] = useState<number | null>(null);
  const [transferQuantity, setTransferQuantity] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferSuccessCount, setTransferSuccessCount] = useState(0);
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);
  const [thresholdValue, setThresholdValue] = useState('');
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [thresholdSubmitting, setThresholdSubmitting] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [showTransferHistory, setShowTransferHistory] = useState(false);
  const [branchLowStockThreshold, setBranchLowStockThreshold] = useState<number>(10);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [showAdjustCloseConfirm, setShowAdjustCloseConfirm] = useState(false);
  const [showTransferCloseConfirm, setShowTransferCloseConfirm] = useState(false);
  const [showThresholdCloseConfirm, setShowThresholdCloseConfirm] = useState(false);

  const handleAdjustCloseAttempt = () => {
    if (adjustmentQuantity !== '' || adjustmentReason !== '') {
      setShowAdjustCloseConfirm(true);
    } else {
      setIsAdjustModalOpen(false);
    }
  };

  const handleTransferCloseAttempt = () => {
    if (destinationBranchId !== null || transferQuantity !== '' || transferReason !== '') {
      setShowTransferCloseConfirm(true);
    } else {
      closeTransferModal();
    }
  };

  const handleThresholdCloseAttempt = () => {
    if (thresholdValue !== String(selectedProduct?.lowStockThreshold ?? 0)) {
      setShowThresholdCloseConfirm(true);
    } else {
      setIsThresholdModalOpen(false);
    }
  };

  useEffect(() => {
    const fetchDeadStock = async () => {
      setDeadStockLoading(true);
      setDeadStockError(null);
      try {
        const branchId = user?.branchId;
        let url = `/inventory/dead-stock?days=${deadStockDays}`;
        if (branchId) {
          url += `&branchId=${branchId}`;
        }
        const response = await api.get(url);
        setDeadStock(Array.isArray(response.data) ? response.data : response.data.content || []);
      } catch (err: any) {
        setDeadStockError(err?.response?.data?.message || 'Failed to fetch dead stock');
        setDeadStock([]);
      } finally {
        setDeadStockLoading(false);
      }
    };
    fetchDeadStock();
  }, [deadStockDays, user?.branchId]);

  const fetchBranchSettings = async () => {
    try {
      const settings = await branchService.getBranchSettings();
      const threshold = Number(settings?.lowStockThreshold);
      if (Number.isFinite(threshold) && threshold >= 0) {
        setBranchLowStockThreshold(threshold);
      }
    } catch (error: any) {
      console.error('Error fetching branch settings:', error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/inventory', {
        params: {
          page: currentPage,
          size: pageSize,
          sort: 'id,desc',
        },
      });

      const inventoryData = response.data.content || response.data;
      setTotalPages(response.data.totalPages || 0);
      setTotalElements(response.data.totalElements || inventoryData.length);
      const mappedProducts: Product[] = inventoryData.map((item: any) => {
        const itemThreshold = Number.isFinite(Number(item.lowStockThreshold))
          ? Number(item.lowStockThreshold)
          : null;
        const effectiveThreshold =
          itemThreshold !== null
            ? itemThreshold
            : Number.isFinite(branchLowStockThreshold) && branchLowStockThreshold >= 0
              ? branchLowStockThreshold
              : 10;

        return {
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          productBarcode: item.productBarcode,
          categoryName: item.categoryName || 'Uncategorized',
          quantity: item.quantity,
          lowStockThreshold: effectiveThreshold,
          price: item.price,
          branchId: item.branchId,
          branchName: item.branchName,
          lastRestockDate: item.lastRestockDate,
          isLowStock: item.quantity > 0 && item.quantity <= effectiveThreshold,
          availableQuantity: item.availableQuantity,
          reservedQuantity: item.reservedQuantity,
        };
      });

      setProducts(mappedProducts);
      setFilteredProducts(mappedProducts);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProductsForStats = async () => {
    setLoadingStats(true);
    try {
      let allFetchedProducts: Product[] = [];
      let page = 0;
      let totalPages = 1;

      while (page < totalPages) {
        const response = await api.get('/inventory', {
          params: {
            page,
            size: 100,
            sort: 'id,desc',
          },
        });

        const inventoryData = response.data.content || response.data;
        const mappedProducts: Product[] = inventoryData.map((item: any) => {
          const itemThreshold = Number.isFinite(Number(item.lowStockThreshold))
            ? Number(item.lowStockThreshold)
            : null;
          const effectiveThreshold =
            itemThreshold !== null
              ? itemThreshold
              : Number.isFinite(branchLowStockThreshold) && branchLowStockThreshold >= 0
                ? branchLowStockThreshold
                : 10;

          return {
            id: item.id,
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            productBarcode: item.productBarcode,
            categoryName: item.categoryName || 'Uncategorized',
            quantity: item.quantity,
            lowStockThreshold: effectiveThreshold,
            price: item.price,
            branchId: item.branchId,
            branchName: item.branchName,
            lastRestockDate: item.lastRestockDate,
            isLowStock: item.quantity > 0 && item.quantity <= effectiveThreshold,
            availableQuantity: item.availableQuantity,
            reservedQuantity: item.reservedQuantity,
          };
        });

        allFetchedProducts = [...allFetchedProducts, ...mappedProducts];
        totalPages = response.data.totalPages || 1;
        page++;
      }

      setAllProductsForStats(allFetchedProducts);
    } catch (error: any) {
      console.error('Error fetching all products for stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchBranchSettings();
    fetchProducts();
  }, [currentPage, transferSuccessCount]);

  useEffect(() => {
    fetchAllProductsForStats(); 
  }, [branchLowStockThreshold, transferSuccessCount]);

  useEffect(() => {
    const handleFocus = () => {
      fetchBranchSettings();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

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

  const normalizeBranches = (payload: any): BranchOption[] => {
    const list = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.content)
        ? payload.content
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.data?.content)
            ? payload.data.content
            : [];

    return list
      .map((branch: any) => ({
        id: Number(branch?.id),
        name: String(branch?.name || '').trim(),
      }))
      .filter(
        (branch: BranchOption) =>
          Number.isFinite(branch.id) && branch.id > 0 && branch.name.length > 0,
      );
  };

  const fetchTenantBranches = async () => {
    setLoadingBranches(true);
    try {
      let collected: BranchOption[] = [];

      try {
        const transferBranchResponse = await inventoryService.getTransferBranches();
        collected = normalizeBranches(transferBranchResponse?.data ?? transferBranchResponse);
      } catch (transferError) {
        console.warn('Transfer branch endpoint unavailable, falling back to branch APIs');
      }

      if (collected.length === 0) {
        const firstPage = await branchService.getAllBranches(0, 100);
        collected = normalizeBranches(firstPage);

        const totalPages =
          Number(firstPage?.totalPages) || Number(firstPage?.data?.totalPages) || 1;

        if (totalPages > 1) {
          const pageRequests: Promise<any>[] = [];
          for (let page = 1; page < totalPages; page += 1) {
            pageRequests.push(branchService.getAllBranches(page, 100));
          }

          const pageResponses = await Promise.all(pageRequests);
          pageResponses.forEach((pageData) => {
            collected = [...collected, ...normalizeBranches(pageData)];
          });
        }
      }

      if (collected.length === 0) {
        const activeBranches = await branchService.getBranches();
        collected = normalizeBranches(activeBranches);
      }

      if (collected.length === 0 && selectedProduct?.branchId && selectedProduct?.branchName) {
        collected = [
          {
            id: selectedProduct.branchId,
            name: selectedProduct.branchName,
          },
        ];
      }

      const unique = Array.from(new Map(collected.map((branch) => [branch.id, branch])).values());
      setBranches(unique);
    } catch (error: any) {
      console.error('Error fetching branches:', error);
      toast.error(error.response?.data?.message || 'Failed to load branches');
      setBranches([]);
    } finally {
      setLoadingBranches(false);
    }
  };

  useEffect(() => {
    let filtered = [...products];

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.productBarcode && p.productBarcode.toLowerCase().includes(searchTerm.toLowerCase())),
      );
    }

    if (stockFilter === 'LOW') {
      filtered = filtered.filter((p) => p.isLowStock && p.quantity > 0);
    } else if (stockFilter === 'OUT') {
      filtered = filtered.filter((p) => p.quantity === 0);
    }

    setFilteredProducts(filtered);
  }, [searchTerm, stockFilter, products]);

  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, stockFilter]);

  const handleStockAdjustment = async () => {
    if (!selectedProduct || !adjustmentQuantity || !adjustmentReason) {
      toast.error('Please fill all fields');
      return;
    }

    const quantity = parseInt(adjustmentQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/inventory/adjust', {
        productId: selectedProduct.productId,
        branchId: selectedProduct.branchId,
        quantity: quantity,
        movementType: adjustmentType === 'add' ? 'RESTOCK' : 'ADJUSTMENT',
        notes: adjustmentReason,
        referenceType: adjustmentType === 'add' ? 'RESTOCK' : 'ADJUSTMENT',
      });

      toast.success(`Stock ${adjustmentType === 'add' ? 'added' : 'removed'} successfully`);
      setIsAdjustModalOpen(false);
      setAdjustmentQuantity('');
      setAdjustmentReason('');
      fetchProducts();
    } catch (error: any) {
      console.error('Error adjusting stock:', error);
      toast.error(error.response?.data?.message || 'Failed to adjust stock');
    } finally {
      setSubmitting(false);
    }
  };

  const resetTransferForm = () => {
    setDestinationBranchId(null);
    setTransferQuantity('');
    setTransferReason('');
  };

  const closeTransferModal = () => {
    setIsTransferModalOpen(false);
    resetTransferForm();
  };

  const handleStockTransfer = async () => {
    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }

    if (!destinationBranchId) {
      toast.error('Please select destination branch');
      return;
    }

    if (destinationBranchId === selectedProduct.branchId) {
      toast.error('Destination branch must be different from current branch');
      return;
    }

    const quantity = parseInt(transferQuantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    const maxTransferableQty = selectedProduct.availableQuantity ?? selectedProduct.quantity;
    if (quantity > maxTransferableQty) {
      toast.error(`Only ${maxTransferableQty} units are available for transfer`);
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/inventory/transfer', {
        productId: selectedProduct.productId,
        fromBranchId: selectedProduct.branchId,
    toBranchId: destinationBranchId,
        quantity,
        notes: transferReason,
      });

      toast.success('Stock transfer initiated successfully');
      closeTransferModal();
      setTransferSuccessCount(prev => prev + 1);
      fetchProducts();
    } catch (error: any) {
      console.error('Error transferring stock:', error);
      toast.error(error.response?.data?.message || 'Failed to transfer stock');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportInventory = async () => {
    try {
      setReportBusy(true);
      await managerReportService.exportInventoryCsv();
      toast.success('Branch inventory turnover exported');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to export branch inventory');
    } finally {
      setReportBusy(false);
    }
  };

  const handleExportInventoryPdf = async () => {
    try {
      setReportBusy(true);
      await managerReportService.exportInventoryPdf();
      toast.success('Branch inventory turnover PDF exported');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to export branch inventory PDF');
    } finally {
      setReportBusy(false);
    }
  };

  const openThresholdModal = (product: Product) => {
    setSelectedProduct(product);
    setThresholdValue(String(product.lowStockThreshold ?? 0));
    setIsThresholdModalOpen(true);
  };

  const handleThresholdUpdate = async () => {
    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }

    const nextThreshold = Number.parseInt(thresholdValue, 10);
    if (!Number.isFinite(nextThreshold) || nextThreshold < 0) {
      toast.error('Threshold must be 0 or greater');
      return;
    }

    setThresholdSubmitting(true);
    try {
      const updated = await dispatch(
        updateThreshold({
          productId: selectedProduct.productId,
          branchId: selectedProduct.branchId,
          lowStockThreshold: nextThreshold,
        }),
      ).unwrap();

      setProducts((prev) =>
        prev.map((product) =>
          product.productId === updated.productId && product.branchId === updated.branchId
            ? {
                ...product,
                lowStockThreshold: updated.lowStockThreshold,
                quantity: updated.quantity,
                isLowStock: updated.isLowStock,
              }
            : product,
        ),
      );
      setAllProductsForStats((prev) =>
        prev.map((product) =>
          product.productId === updated.productId && product.branchId === updated.branchId
            ? {
                ...product,
                lowStockThreshold: updated.lowStockThreshold,
                quantity: updated.quantity,
                isLowStock: updated.isLowStock,
              }
            : product,
        ),
      );

      setIsThresholdModalOpen(false);
      setThresholdValue('');

      if (updated.quantity <= updated.lowStockThreshold) {
        toast.warning('Current stock is already below this threshold');
      } else {
        toast.success(`Threshold updated to ${updated.lowStockThreshold} units`);
      }
    } catch (error: any) {
      toast.error(error?.message || error?.response?.data?.message || 'Failed to update threshold');
    } finally {
      setThresholdSubmitting(false);
    }
  };

  useEffect(() => {
    if (isTransferModalOpen) {
      fetchTenantBranches();
    }
  }, [isTransferModalOpen]);

  const getStockStatus = (product: Product) => {
    if (product.quantity === 0) {
      return {
        text: 'OUT OF STOCK',
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
      };
    } else if (product.isLowStock) {
      return {
        text: 'LOW STOCK',
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
      };
    }
    return {
      text: 'IN STOCK',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
    };
  };

  const columns: Column<Product>[] = [
    {
      key: 'sku',
      header: 'SKU',
      render: (_value, product) => (
        <div>
          <span className="font-bold text-slate-900">{product.sku}</span>
          {product.productBarcode && (
            <div className="text-xs text-slate-500">{product.productBarcode}</div>
          )}
        </div>
      ),
    },
    {
      key: 'productName',
      header: 'Product Name',
      render: (_value, product) => (
        <div className="flex flex-col">
          <div className="font-bold text-slate-900">{product.productName}</div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-0.5">
            {product.categoryName || 'Uncategorized'}
          </div>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Stock',
      render: (_value, product) => {
        const status = getStockStatus(product);
        return (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-black text-slate-900">{product.quantity}</span>
              <span
                className={`text-xs font-bold px-2 py-1 rounded ${status.bg} ${status.color} ${status.border} border`}
              >
                {status.text}
              </span>
            </div>
            {product.reservedQuantity > 0 && (
              <div className="text-xs text-slate-500">
                Reserved: {product.reservedQuantity} | Available: {product.availableQuantity}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'lowStockThreshold',
      header: 'Threshold',
      render: (_value, product) => (
        <span className="text-sm font-bold text-slate-700">{product.lowStockThreshold}</span>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      render: (_value, product) => (
        <span className="text-sm font-bold text-emerald-600">
          ₹{product.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'lastRestockDate',
      header: 'Last Restocked',
      render: (_value, product) => (
        <span className="text-sm text-slate-600">
          {product.lastRestockDate ? new Date(product.lastRestockDate).toLocaleDateString() : 'N/A'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value, product) => (
        <div className="flex justify-center pr-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (openActionMenuId === product.id) {
                setOpenActionMenuId(null);
                setActionMenuPosition(null);
                return;
              }

              const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
              const containerRect = containerRef.current?.getBoundingClientRect() || {
                top: 0,
                left: 0,
              };

              setOpenActionMenuId(product.id);
              setActionMenuPosition({
                top: rect.bottom - containerRect.top + 8,
                left: rect.right - containerRect.left - 192,
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

  const statsData = allProductsForStats.length > 0 ? allProductsForStats : products;
  const lowStockCount = statsData.filter((p) => p.isLowStock && p.quantity > 0).length;
  const outOfStockCount = statsData.filter((p) => p.quantity === 0).length;
  const totalValue = statsData.reduce((sum, p) => sum + p.quantity * p.price, 0);

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
              <motion.header className="mb-6" variants={itemVariants}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1 block">
                      Branch Manager Portal
                    </span>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                      Inventory Management
                    </h1>
                    <p className="text-slate-500 font-medium">
                      Manage stock levels, adjustments, and transfers
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative min-w-[240px]">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search inventory..."
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

                    <div className="relative w-36">
                      <button
                        onClick={() => setIsStockDropdownOpen(!isStockDropdownOpen)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-left focus:border-emerald-500 outline-none transition-all flex items-center justify-between text-sm font-bold text-slate-700"
                      >
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <span className="truncate">
                          {stockFilter === 'ALL'
                            ? 'All Stock'
                            : stockFilter === 'LOW'
                              ? 'Low Stock'
                              : 'Out of Stock'}
                        </span>
                        <div
                          className={`w-4 h-4 transition-transform duration-200 ${isStockDropdownOpen ? 'rotate-180' : ''}`}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </button>

                      {isStockDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-30"
                            onClick={() => setIsStockDropdownOpen(false)}
                          />
                          <div className="absolute z-40 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl py-2 animate-in fade-in zoom-in-95 duration-200">
                            {['ALL', 'LOW', 'OUT'].map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => {
                                  setStockFilter(status);
                                  setIsStockDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-sm transition-colors ${stockFilter === status
                                  ? 'bg-emerald-50 text-emerald-700 font-bold'
                                  : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                                  }`}
                              >
                                {status === 'ALL'
                                  ? 'All Stock'
                                  : status === 'LOW'
                                    ? 'Low Stock'
                                    : 'Out of Stock'}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => setShowTransferHistory((prev) => !prev)}
                      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-bold transition-all ${
                        showTransferHistory
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                      title={showTransferHistory ? 'Hide Stock Transfers' : 'Show Stock Transfers'}
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      {showTransferHistory ? 'Hide Transfers' : 'View Transfers'}
                    </button>

                    <button
                      onClick={handleExportInventory}
                      disabled={reportBusy}
                      className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-60"
                      title="Export Branch Inventory CSV"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleExportInventoryPdf}
                      disabled={reportBusy}
                      className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-60"
                      title="Export Branch Inventory PDF"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowDeadStock(!showDeadStock)}
                      className={`p-2.5 border rounded-xl transition-all ${showDeadStock
                        ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      title={showDeadStock ? "Hide Dead Stock" : "Show Dead Stock"}
                    >
                      <Skull className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.header>

              <motion.div
                className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
                variants={itemVariants}
              >
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Total Products
                    </span>
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{statsData.length}</div>
                  {loadingStats && <div className="text-xs text-slate-400 mt-1">Calculating...</div>}
                </div>
                <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Low Stock
                    </span>
                    <TrendingDown className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="text-2xl font-black text-orange-600">{lowStockCount}</div>
                </div>
                <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Out of Stock
                    </span>
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="text-2xl font-black text-red-600">{outOfStockCount}</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Total Value
                    </span>
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-600">
                    ₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </motion.div>

              <StockTransferHistorySection
                isOpen={showTransferHistory}
                title="Branch Stock Transfer History"
                accentColor="emerald"
                refreshTrigger={transferSuccessCount}
                branchId={user?.branchId ? Number(user.branchId) : null}
                branchName={user?.branchId ? branches.find(b => b.id === Number(user.branchId))?.name || 'Current Branch' : 'Current Branch'}
              />

              <AnimatePresence>
                {showDeadStock && (
                  <motion.div
                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6 overflow-hidden"
                    initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                    animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
                    exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        Dead Stock (No Sales in Last {deadStockDays} Days)
                      </span>
                      <input
                        type="number"
                        min={1}
                        value={deadStockDays}
                        onChange={(e) => setDeadStockDays(Number(e.target.value) || 1)}
                        className="w-24 px-2 py-1 border border-slate-200 rounded text-sm outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                    {deadStockLoading ? (
                      <div className="text-slate-500 py-10 text-center font-medium">Loading dead stock report...</div>
                    ) : deadStockError ? (
                      <div className="text-red-500 p-4 bg-red-50 rounded-lg text-center font-medium">{deadStockError}</div>
                    ) : deadStock.length === 0 ? (
                      <div className="text-slate-500 py-10 text-center font-medium">No dead stock found for the selected period.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">
                                SKU
                              </th>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">
                                Product Name
                              </th>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">
                                Branch
                              </th>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">
                                Stock
                              </th>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">
                                Last Sale
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {deadStock.map((item: any) => (
                              <tr key={item.id || item.productId} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 font-mono text-xs font-bold text-slate-600">
                                  {item.sku}
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-slate-900">
                                  {item.productName}
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-500">{item.branchName}</td>
                                <td className="px-6 py-4 text-sm font-black text-slate-900">
                                  {item.quantity}
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-500">
                                  {item.lastSaleDate
                                    ? new Date(item.lastSaleDate).toLocaleDateString()
                                    : 'Never'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden"
                variants={itemVariants}
              >
                {loading ? (
                  <div className="p-6">
                    <LoadingSkeleton count={5} />
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="No products found"
                    description="No products match your current filters."
                  />
                ) : (
                  <DataTable
                    data={filteredProducts}
                    columns={columns}
                    filterable={false}
                    paginated={false}
                  />
                )}
              </motion.div>

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

              {openActionMenuId !== null && actionMenuPosition && (
                <div
                  ref={actionMenuRef}
                  className="absolute w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-[40]"
                  style={{
                    top: `${actionMenuPosition.top}px`,
                    left: `${Math.max(12, actionMenuPosition.left)}px`,
                  }}
                >
                  {(() => {
                    const menuProduct = filteredProducts.find((p) => p.id === openActionMenuId);
                    if (!menuProduct) return null;

                    return (
                      <>
                        <button
                          onClick={() => {
                            setSelectedProduct(menuProduct);
                            setAdjustmentType('add');
                            setIsAdjustModalOpen(true);
                            setOpenActionMenuId(null);
                            setActionMenuPosition(null);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Plus className="w-4 h-4 text-emerald-500" />
                          Add Stock
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProduct(menuProduct);
                            setAdjustmentType('remove');
                            setIsAdjustModalOpen(true);
                            setOpenActionMenuId(null);
                            setActionMenuPosition(null);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Minus className="w-4 h-4 text-red-500" />
                          Remove Stock
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProduct(menuProduct);
                            resetTransferForm();
                            setIsTransferModalOpen(true);
                            setOpenActionMenuId(null);
                            setActionMenuPosition(null);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                          Stock Transfer
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProduct(menuProduct);
                            openThresholdModal(menuProduct);
                            setOpenActionMenuId(null);
                            setActionMenuPosition(null);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Pencil className="w-4 h-4 text-emerald-500" />
                          Threshold
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

      {selectedProduct && (
        <EnhancedModal
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
          onCloseIconClick={handleAdjustCloseAttempt}
          title={`${adjustmentType === 'add' ? 'Add' : 'Remove'} Stock - ${selectedProduct.productName}`}
          size="small"
        >
          <div className="space-y-4">
            <ConfirmModal
              isOpen={showAdjustCloseConfirm}
              onClose={() => setShowAdjustCloseConfirm(false)}
              onConfirm={() => {
                setShowAdjustCloseConfirm(false);
                setIsAdjustModalOpen(false);
                setAdjustmentQuantity('');
                setAdjustmentReason('');
              }}
              title="Confirm Close"
              message="You have unsaved changes. Are you sure you want to close this form?"
              confirmText="Yes, Close"
              cancelText="No, Keep Editing"
            />
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Current Stock</label>
              <div className="text-2xl font-black text-slate-900">
                {selectedProduct.quantity} units
              </div>
              {selectedProduct.reservedQuantity > 0 && (
                <div className="text-sm text-slate-600 mt-1">
                  Available: {selectedProduct.availableQuantity} units (
                  {selectedProduct.reservedQuantity} reserved)
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Quantity to {adjustmentType === 'add' ? 'Add' : 'Remove'}
              </label>
              <input
                type="number"
                min="1"
                value={adjustmentQuantity}
                onChange={(e) => setAdjustmentQuantity(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter quantity"
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Reason</label>
              <textarea
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter reason for adjustment"
                disabled={submitting}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleAdjustCloseAttempt}
                disabled={submitting}
                className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStockAdjustment}
                disabled={submitting}
                className={`flex-1 py-3 text-white rounded-xl font-bold transition-colors disabled:opacity-50 ${adjustmentType === 'add'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-red-600 hover:bg-red-700'
                  }`}
              >
                {submitting
                  ? 'Processing...'
                  : adjustmentType === 'add'
                    ? 'Add Stock'
                    : 'Remove Stock'}
              </button>
            </div>
          </div>
        </EnhancedModal>
      )}

      {selectedProduct && (
        <EnhancedModal
          isOpen={isTransferModalOpen}
          onClose={closeTransferModal}
          onCloseIconClick={handleTransferCloseAttempt}
          title={`Stock Transfer - ${selectedProduct.productName}`}
          size="small"
        >
          <div className="space-y-4">
            <ConfirmModal
              isOpen={showTransferCloseConfirm}
              onClose={() => setShowTransferCloseConfirm(false)}
              onConfirm={() => {
                setShowTransferCloseConfirm(false);
                closeTransferModal();
              }}
              title="Confirm Close"
              message="You have unsaved changes. Are you sure you want to close this form?"
              confirmText="Yes, Close"
              cancelText="No, Keep Editing"
            />
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Current Branch</label>
              <div className="px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-semibold">
                {selectedProduct.branchName}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Destination Branch
              </label>
              <select
                value={destinationBranchId ?? ''}
                onChange={(e) =>
                  setDestinationBranchId(e.target.value ? Number(e.target.value) : null)
                }
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                disabled={submitting || loadingBranches}
              >
                <option value="">Select destination branch</option>
                {branches.map((branch) => (
                  <option
                    key={branch.id}
                    value={branch.id}
                    disabled={branch.id === selectedProduct.branchId}
                  >
                    {branch.name}
                    {branch.id === selectedProduct.branchId ? ' (Current Branch)' : ''}
                  </option>
                ))}
              </select>
              {loadingBranches && (
                <p className="text-xs text-slate-500 mt-2">Loading branches...</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Quantity to Transfer
              </label>
              <input
                type="number"
                min="1"
                value={transferQuantity}
                onChange={(e) => setTransferQuantity(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter quantity"
                disabled={submitting}
              />
              <p className="text-xs text-slate-500 mt-2">
                Available for transfer:{' '}
                {selectedProduct.availableQuantity ?? selectedProduct.quantity}
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter transfer notes"
                disabled={submitting}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleTransferCloseAttempt}
                disabled={submitting}
                className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStockTransfer}
                disabled={submitting || loadingBranches}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Transfer Stock'}
              </button>
            </div>
          </div>
        </EnhancedModal>
      )}

      {selectedProduct && (
        <EnhancedModal
          isOpen={isThresholdModalOpen}
          onClose={() => setIsThresholdModalOpen(false)}
          onCloseIconClick={handleThresholdCloseAttempt}
          title={`Edit Threshold - ${selectedProduct.productName}`}
          size="small"
        >
          <div className="space-y-4">
            <ConfirmModal
              isOpen={showThresholdCloseConfirm}
              onClose={() => setShowThresholdCloseConfirm(false)}
              onConfirm={() => {
                setShowThresholdCloseConfirm(false);
                setIsThresholdModalOpen(false);
                setThresholdValue('');
              }}
              title="Confirm Close"
              message="You have unsaved changes. Are you sure you want to close this form?"
              confirmText="Yes, Close"
              cancelText="No, Keep Editing"
            />
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Current Stock</label>
              <div className="text-2xl font-black text-slate-900">
                {selectedProduct.quantity} units
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Low Stock Threshold
              </label>
              <input
                type="number"
                min="0"
                value={thresholdValue}
                onChange={(e) => setThresholdValue(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter threshold"
                disabled={thresholdSubmitting}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleThresholdCloseAttempt}
                disabled={thresholdSubmitting}
                className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleThresholdUpdate}
                disabled={thresholdSubmitting}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                {thresholdSubmitting ? 'Saving...' : 'Save Threshold'}
              </button>
            </div>
          </div>
        </EnhancedModal>
      )}
    </>
  );
};

export default ManagerInventoryManagement;
