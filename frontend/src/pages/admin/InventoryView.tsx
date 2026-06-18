import React, { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchInventory } from '../../store/slices/inventorySlice';
import { fetchCategoryHierarchy } from '../../store/slices/categorySlice';
import Sidebar from '../../components/layout/Sidebar';
import DashboardHeader from '../../components/layout/Header';
import StockTransferHistorySection from '../../components/inventory/StockTransferHistorySection';
import ManageStockModal from '../../features/inventory/AdjustStockModal';
import StockTransferModal from '../../features/inventory/StockTransferModal';
import {
  Package,
  AlertTriangle,
  TrendingDown,
  IndianRupee,
  RefreshCw,
  Search,
  Filter,
  Settings2,
  ChevronDown,
  Download,
  FileText,
  Ghost,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowRightLeft,
  Eraser,
  MoreVertical,
} from 'lucide-react';
import api from '../../services/api';
import toast from '../../utils/toast';
import { motion, AnimatePresence } from 'framer-motion';
import adminReportService from '../../services/adminReportService';
import branchService from '../../services/branchService';
import { Branch } from '../../types/branch';

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



const InventoryView: React.FC = () => {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((state) => state.inventory);
  const { categories } = useAppSelector((state) => state.categories);
  const { user } = useAppSelector((state) => state.auth);
  const safeItems = Array.isArray(items) ? items : [];

  // Dead Stock State
  const [deadStockDays, setDeadStockDays] = useState<number>(90);
  const [deadStockLoading, setDeadStockLoading] = useState<boolean>(false);
  const [deadStockError, setDeadStockError] = useState<string | null>(null);
  const [deadStock, setDeadStock] = useState<any[]>([]);
  const [showDeadStock, setShowDeadStock] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedManageItem, setSelectedManageItem] = useState<any>(null);
  const [selectedTransferItem, setSelectedTransferItem] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'out'>('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 12;
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [allProductsForStats, setAllProductsForStats] = useState<any[]>([]);
  const [allInventoryItems, setAllInventoryItems] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [isStockDropdownOpen, setIsStockDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [inventoryTurnover, setInventoryTurnover] = useState<number | null>(null);
  const [showTransferHistory, setShowTransferHistory] = useState(false);
  const [transferSuccessCount, setTransferSuccessCount] = useState(0);
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);
  const isStoreAdmin = user?.roles?.includes('ROLE_STORE_ADMIN') || user?.role === 'ROLE_STORE_ADMIN';
  const isAdmin = isStoreAdmin || user?.role === 'ROLE_SUPER_ADMIN';
  const [filterCategoryId, setFilterCategoryId] = useState<number | ''>('');

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const branchDropdownRef = useRef<HTMLDivElement | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const filterDrawerRef = useRef<HTMLDivElement | null>(null);
  const selectedBranchLabel = branches.find((branch) => branch.id === selectedBranchId)?.name ?? 'All Branches';

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
      } catch (error) {
        if (!isActive) {
          return;
        }

        console.error('Failed to load branches for inventory page:', error);
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

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (isBranchDropdownOpen && !branchDropdownRef.current?.contains(event.target as Node)) {
        setIsBranchDropdownOpen(false);
      }
      if (isFilterDrawerOpen && !filterDrawerRef.current?.contains(event.target as Node)) {
         // Check if clicking on other dropdowns that might be outside the drawer or overlays
         // For now simpler logic:
         // setIsFilterDrawerOpen(false);
      }

      const actionMenuTarget = event.target as HTMLElement | null;
      if (openActionMenuId !== null && !actionMenuTarget?.closest('[data-admin-inventory-action-menu]')) {
        setOpenActionMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isBranchDropdownOpen, isFilterDrawerOpen, openActionMenuId]);

  useEffect(() => {
    if (categories.length === 0) {
      dispatch(fetchCategoryHierarchy());
    }
  }, [dispatch, categories.length]);

  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, filterStatus, filterCategoryId, selectedBranchId]);

  // Fetch inventory
  useEffect(() => {
    if (isStoreAdmin) {
      if (branchesLoading || !selectedBranchId) {
        return;
      }
    }
    dispatch(fetchInventory({ 
      page: currentPage, 
      size: pageSize,
      branchId: isStoreAdmin ? selectedBranchId || undefined : undefined
    }));
  }, [dispatch, currentPage, pageSize, isStoreAdmin, selectedBranchId, branchesLoading, transferSuccessCount]);

  useEffect(() => {
    const fetchAllInventoryRows = async () => {
      try {
        let page = 0;
        let totalPages = 1;
        const collected: any[] = [];

        while (page < totalPages) {
          const response = await api.get('/inventory', {
            params: {
              page,
              size: 100,
              branchId: isStoreAdmin ? selectedBranchId || undefined : undefined,
            },
          });

          const payload = response.data;
          const rows = Array.isArray(payload) ? payload : payload?.content || [];
          collected.push(...rows);
          totalPages = Array.isArray(payload) ? 1 : payload?.totalPages || 1;
          page += 1;
        }

        setAllInventoryItems(collected);
      } catch (fetchError) {
        console.error('Failed to fetch all inventory rows:', fetchError);
        setAllInventoryItems([]);
      }
    };

    if (isStoreAdmin && !selectedBranchId && !branchesLoading) {
      setAllInventoryItems([]);
      return;
    }

    fetchAllInventoryRows();
  }, [isStoreAdmin, selectedBranchId, branchesLoading, transferSuccessCount]);

  // Fetch all products for stats calculation
  useEffect(() => {
    const fetchAllProductsForStats = async () => {
      setLoadingStats(true);
      try {
        let allFetchedProducts: any[] = [];
        let page = 0;
        let totalPages = 1;

        while (page < totalPages) {
          const response = await api.get('/products', {
            params: {
              page,
              size: 100,
              branchId: isStoreAdmin ? selectedBranchId || undefined : undefined,
              sort: 'name,asc',
            }
          });
          const products = response.data.content || response.data;
          allFetchedProducts = [...allFetchedProducts, ...products];
          totalPages = response.data.totalPages || 1;
          page++;
        }

        setAllProductsForStats(allFetchedProducts);
      } catch (err) {
        console.error('Failed to fetch all products for stats:', err);
      } finally {
        setLoadingStats(false);
      }
    };

    if (isStoreAdmin && !selectedBranchId && !branchesLoading) {
        setAllProductsForStats([]);
        return;
    }
    fetchAllProductsForStats();
  }, [isStoreAdmin, selectedBranchId, branchesLoading, transferSuccessCount]);

  // Fetch current page products for display
  useEffect(() => {
    const fetchAllProducts = async () => {
      setLoadingProducts(true);
      try {
        const response = await api.get('/products', {
          params: {
            page: currentPage,
            size: pageSize,
            branchId: isStoreAdmin ? selectedBranchId || undefined : undefined,
            sort: 'name,asc',
          }
        });
        const products = response.data.content || response.data;
        setAllProducts(products);
        setTotalPages(response.data.totalPages || 0);
        setTotalElements(response.data.totalElements || products.length);
      } catch (err) {
        console.error('Failed to fetch products:', err);
      } finally {
        setLoadingProducts(false);
      }
    };

    if (isStoreAdmin && !selectedBranchId && !branchesLoading) {
      setAllProducts([]);
      return;
    }
    fetchAllProducts();
  }, [currentPage, pageSize, isStoreAdmin, selectedBranchId, branchesLoading, transferSuccessCount]);

  useEffect(() => {
    const fetchDeadStockLocal = async () => {
      setDeadStockLoading(true);
      setDeadStockError(null);
      try {
        const response = await api.get(`/inventory/dead-stock`, {
          params: {
            days: deadStockDays,
            branchId: isStoreAdmin ? selectedBranchId || undefined : undefined
          }
        });
        setDeadStock(Array.isArray(response.data) ? response.data : response.data.content || []);
      } catch (err: any) {
        setDeadStockError(err?.response?.data?.message || 'Failed to fetch dead stock');
        setDeadStock([]);
      } finally {
        setDeadStockLoading(false);
      }
    };
    if (showDeadStock) {
      if (isStoreAdmin && !selectedBranchId && !branchesLoading) {
        setDeadStock([]);
        return;
      }
      fetchDeadStockLocal();
    }
  }, [deadStockDays, showDeadStock, isStoreAdmin, selectedBranchId, branchesLoading, transferSuccessCount]);

  // Merge products with inventory data for current page display
  const inventoryByProductId = React.useMemo(() => {
    const map = new Map<number, any>();

    allInventoryItems.forEach((inventoryItem) => {
      if (inventoryItem?.productId != null) {
        map.set(inventoryItem.productId, inventoryItem);
      }
    });

    safeItems.forEach((inventoryItem) => {
      if (inventoryItem?.productId != null) {
        map.set(inventoryItem.productId, inventoryItem);
      }
    });

    return map;
  }, [allInventoryItems, safeItems]);

  const mergedItems = allProducts.map((product) => {
    const inventoryItem = inventoryByProductId.get(product.id);

    if (inventoryItem) {
      return { ...inventoryItem, categoryId: product.categoryId ?? product.category?.id ?? null, hasInventory: true };
    }

    return {
      id: null,
      tenantId: product.tenantId,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      productBarcode: product.barcode,
      price: product.price,
      productStatus: product.status,
      categoryId: product.categoryId ?? product.category?.id ?? null,
      branchId: null,
      branchName: null,
      quantity: 0,
      lowStockThreshold: product.minStockLevel || 10,
      reservedQuantity: 0,
      availableQuantity: 0,
      isLowStock: true,
      lastRestockDate: null,
      lastSaleDate: null,
      isDeleted: false,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      hasInventory: false,
    };
  });

  // Merge ALL products with inventory data for stats calculation
  const allMergedItemsForStats = allProductsForStats.map((product) => {
    const inventoryItem = inventoryByProductId.get(product.id);

    if (inventoryItem) {
      return { ...inventoryItem, categoryId: product.categoryId ?? product.category?.id ?? null, hasInventory: true };
    }

    return {
      id: null,
      tenantId: product.tenantId,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      productBarcode: product.barcode,
      price: product.price,
      productStatus: product.status,
      categoryId: product.categoryId ?? product.category?.id ?? null,
      branchId: null,
      branchName: null,
      quantity: 0,
      lowStockThreshold: product.minStockLevel || 10,
      reservedQuantity: 0,
      availableQuantity: 0,
      isLowStock: true,
      lastRestockDate: null,
      lastSaleDate: null,
      isDeleted: false,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      hasInventory: false,
    };
  });

  const handleExportInventory = async () => {
    try {
      setReportBusy(true);
      await adminReportService.exportInventoryCsv();
      const turnoverRows = await adminReportService.getInventoryTurnover();
      const high = turnoverRows.filter((r) => r.turnoverFlag === 'HIGH').length;
      const low = turnoverRows.filter((r) => r.turnoverFlag === 'LOW').length;
      toast.success(`Inventory turnover exported. High: ${high}, Low: ${low}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to export inventory turnover');
    } finally {
      setReportBusy(false);
    }
  };

  const handleExportInventoryPdf = async () => {
    try {
      setReportBusy(true);
      await adminReportService.exportInventoryPdf();
      toast.success('Inventory turnover report exported as PDF');
    } catch (exportError: any) {
      toast.error(exportError?.response?.data?.message || 'Failed to export inventory PDF');
    } finally {
      setReportBusy(false);
    }
  };

  // Build a category lookup map from flattened categories
  const categoryMap = React.useMemo(() => {
    const map = new Map<number, string>();
    const flatten = (cats: any[]) => {
      cats.forEach((cat) => {
        map.set(cat.id, cat.name);
        if (cat.children) flatten(cat.children);
      });
    };
    flatten(categories);
    return map;
  }, [categories]);

  const shouldUseClientFiltering =
    filterStatus !== 'all' || filterCategoryId !== '' || searchTerm.trim() !== '';

  const filterItems = (itemsToFilter: any[]) => itemsToFilter.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.productBarcode && item.productBarcode.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'low' && item.isLowStock && item.quantity > 0) ||
      (filterStatus === 'out' && item.quantity === 0);

    const matchesCategory =
      !filterCategoryId || item.categoryId === filterCategoryId;

    return matchesSearch && matchesFilter && matchesCategory;
  });

  const filteredItemsAll = shouldUseClientFiltering
    ? filterItems(allMergedItemsForStats)
    : filterItems(mergedItems);

  const filteredItems = shouldUseClientFiltering
    ? filteredItemsAll.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
    : filteredItemsAll;

  const displayTotalPages = shouldUseClientFiltering
    ? Math.max(1, Math.ceil(filteredItemsAll.length / pageSize))
    : totalPages;

  useEffect(() => {
    if (currentPage > displayTotalPages - 1) {
      setCurrentPage(0);
    }
  }, [currentPage, displayTotalPages]);

  useEffect(() => {
    let isActive = true;

    const loadInventoryTurnover = async () => {
      try {
        const rows = await adminReportService.getInventoryTurnover();
        if (!isActive) {
          return;
        }

        const totals = rows.reduce(
          (sum, row) => {
            const averageInventory = (Number(row.beginningInventory || 0) + Number(row.endingInventory || 0)) / 2;
            return {
              quantitySold: sum.quantitySold + Number(row.quantitySold || 0),
              averageInventory: sum.averageInventory + averageInventory,
            };
          },
          { quantitySold: 0, averageInventory: 0 },
        );

        const turnover =
          totals.averageInventory > 0 ? totals.quantitySold / totals.averageInventory : 0;

        setInventoryTurnover(Number(turnover.toFixed(2)));
      } catch (error) {
        if (isActive) {
          setInventoryTurnover(null);
        }
      }
    };

    void loadInventoryTurnover();

    return () => {
      isActive = false;
    };
  }, []);

  // Calculate stats from ALL products (not just current page)
  const statsData = allProductsForStats.length > 0 ? allMergedItemsForStats : mergedItems;
  const totalValue = statsData.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const lowStockCount = statsData.filter((item) => item.isLowStock && item.quantity > 0).length;
  const noInventoryCount = statsData.filter((item) => item.quantity === 0).length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const hasActiveFilters = filterStatus !== 'all' || filterCategoryId !== '' || searchTerm.trim() !== '';

  const getStockStatusBadge = (item: any) => {
    if (item.quantity === 0 || item.hasInventory === false) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-600 border border-red-100">
          Out of Stock
        </span>
      );
    }
    if (item.isLowStock) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100">
          Low Stock
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
        In Stock
      </span>
    );
  };

  const filterOptions = [
    { label: 'All Inventory', value: 'all' },
    { label: `Out of Stock (${noInventoryCount})`, value: 'out' },
    { label: `Low Stock (${lowStockCount})`, value: 'low' },
  ];

  const flatCategories = React.useMemo(() => {
    const result: { id: number; name: string }[] = [];
    const flatten = (cats: any[]) => {
      cats.forEach((cat) => {
        result.push({ id: cat.id, name: cat.name });
        if (cat.children) flatten(cat.children);
      });
    };
    flatten(categories);
    return result;
  }, [categories]);

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterCategoryId('');
    // Branch filter is usually sticky, but for "clear all" we could potentially reset to main branch
    // setSelectedBranchId(getDefaultBranch(branches)?.id ?? null);
  };

  const handleInventoryMutationSuccess = () => {
    setOpenActionMenuId(null);
    setTransferSuccessCount((current) => current + 1);
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader />

        <main className="flex-1 overflow-y-auto bg-white">
          <motion.div
            className="max-w-7xl mx-auto px-6 py-2 lg:px-10"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Header Area */}
            <motion.div
              className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8"
              variants={itemVariants}
            >
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 block mb-1">
                  Inventory System
                </span>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  Stock Overview
                </h1>
                <p className="text-slate-500 font-medium">
                  Monitor and manage product inventory levels
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
                  className={`
                    flex items-center gap-2 px-5 py-2.5 rounded-xl border font-bold text-sm transition-all relative
                    ${isFilterDrawerOpen || hasActiveFilters
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md shadow-emerald-50'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }
                  `}
                >
                  <Filter className={`w-4 h-4 ${hasActiveFilters ? 'fill-emerald-700' : ''}`} />
                  Filters
                  {hasActiveFilters && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-600 text-white text-[8px] flex items-center justify-center rounded-full animate-bounce">
                      !
                    </span>
                  )}
                </button>

                <div className="h-8 w-px bg-slate-100 mx-1 hidden md:block" />

                <button
                  onClick={() => setShowTransferHistory((prev) => !prev)}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all ${showTransferHistory
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-black'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span className="hidden lg:inline">{showTransferHistory ? 'Hide Transfers' : 'View Transfers'}</span>
                </button>

                <button
                  onClick={handleExportInventory}
                  disabled={reportBusy}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-60"
                  title="Export CSV"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={handleExportInventoryPdf}
                  disabled={reportBusy}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-60"
                  title="Export PDF"
                >
                  <FileText className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setShowDeadStock(!showDeadStock)}
                  className={`p-2.5 rounded-xl border transition-all ${showDeadStock
                    ? 'bg-purple-50 border-purple-200 text-purple-600 shadow-inner'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  title="Dead Stock Report"
                >
                  <Ghost className={`w-4 h-4 ${showDeadStock ? 'animate-pulse' : ''}`} />
                </button>
              </div>
            </motion.div>

            {/* Filter Drawer / Card */}
            <AnimatePresence>
              {isFilterDrawerOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                  className="overflow-hidden"
                  ref={filterDrawerRef}
                >
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 relative">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                          <Filter className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-900 tracking-tight">Advanced Filtering</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global scope control</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={clearAllFilters}
                          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Eraser className="w-3.5 h-3.5" />
                          RESET FILTERS
                        </button>
                        <button
                          onClick={() => setIsFilterDrawerOpen(false)}
                          className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      {/* Search */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Search Products</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Product name, SKU, barcode..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:border-emerald-500 transition-all outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Branch Filter (Store Admin only) */}
                      {isStoreAdmin && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location / Branch</label>
                          <div className="relative" ref={branchDropdownRef}>
                            <button
                              onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                              className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 hover:border-emerald-200 transition-all outline-none"
                            >
                              <span className="truncate">{selectedBranchLabel}</span>
                              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isBranchDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            <AnimatePresence>
                              {isBranchDropdownOpen && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-2 bg-white border border-slate-100 rounded-xl overflow-hidden"
                                >
                                  <div className="py-2 max-h-48 overflow-y-auto">
                                    {branches.map((branch) => (
                                      <button
                                        key={branch.id}
                                        onClick={() => {
                                          setSelectedBranchId(branch.id);
                                          setIsBranchDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm font-bold transition-colors ${selectedBranchId === branch.id ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                      >
                                        {branch.name}
                                      </button>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      )}

                      {/* Stock Status */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Inventory Status</label>
                        <div className="relative">
                          <button
                            onClick={() => setIsStockDropdownOpen(!isStockDropdownOpen)}
                            className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 hover:border-emerald-200 transition-all outline-none"
                          >
                            <span className="truncate">
                              {filterStatus === 'all' ? 'All Stock Levels' : filterStatus === 'low' ? 'Low Stock' : 'Out of Stock'}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStockDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                          
                          <AnimatePresence>
                            {isStockDropdownOpen && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-2 bg-white border border-slate-100 rounded-xl overflow-hidden"
                              >
                                <div className="py-2">
                                  {filterOptions.map((opt) => (
                                    <button
                                      key={opt.value}
                                      onClick={() => {
                                        setFilterStatus(opt.value as any);
                                        setIsStockDropdownOpen(false);
                                      }}
                                      className={`w-full text-left px-4 py-2 text-sm font-bold transition-colors ${filterStatus === opt.value ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Category */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Category</label>
                        <div className="relative">
                          <button
                            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                            className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 hover:border-emerald-200 transition-all outline-none"
                          >
                            <span className="truncate">
                              {!filterCategoryId ? 'All Categories' : categoryMap.get(filterCategoryId) || 'Category'}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                          
                          <AnimatePresence>
                            {isCategoryDropdownOpen && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-2 bg-white border border-slate-100 rounded-xl overflow-hidden"
                              >
                                <div className="py-2 max-h-48 overflow-y-auto">
                                  <button
                                    onClick={() => {
                                      setFilterCategoryId('');
                                      setIsCategoryDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-2 text-sm font-bold transition-colors ${!filterCategoryId ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                  >
                                    All Categories
                                  </button>
                                  {flatCategories.map((cat) => (
                                    <button
                                      key={cat.id}
                                      onClick={() => {
                                        setFilterCategoryId(cat.id);
                                        setIsCategoryDropdownOpen(false);
                                      }}
                                      className={`w-full text-left px-4 py-2 text-sm font-bold transition-colors ${filterCategoryId === cat.id ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                    >
                                      {cat.name}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stats Gallery */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
              variants={itemVariants}
            >
              {[
                {
                  label: 'TOTAL PRODUCTS',
                  value: allProductsForStats.length || allProducts.length,
                  icon: Package,
                  color: 'blue',
                },
                { label: 'LOW STOCK', value: lowStockCount, icon: AlertTriangle, color: 'orange' },
                {
                  label: 'OUT OF STOCK',
                  value: noInventoryCount,
                  icon: TrendingDown,
                  color: 'red',
                },
                {
                  label: 'TOTAL VALUE',
                  value: formatCurrency(totalValue),
                  icon: IndianRupee,
                  color: 'emerald',
                  meta:
                    inventoryTurnover !== null
                      ? `Inventory Turnover ${inventoryTurnover.toFixed(2)}x`
                      : 'Inventory Turnover --',
                },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {stat.label}
                    </span>
                    <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                  </div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight">
                    {stat.value}
                  </div>
                  {'meta' in stat && stat.meta ? (
                    <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                      {stat.meta}
                    </div>
                  ) : null}
                </div>
              ))}
            </motion.div>

            <StockTransferHistorySection
              isOpen={showTransferHistory}
              title="Stock Transfer History"
              accentColor="emerald"
              refreshTrigger={transferSuccessCount}
              branchId={isStoreAdmin ? selectedBranchId : null}
              branchName={isStoreAdmin ? selectedBranchLabel : null}
            />

            {/* Dead Stock Section */}
            <AnimatePresence>
              {showDeadStock && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                  className="overflow-hidden"
                >
                  <div className="bg-white rounded-xl border-2 border-purple-100 shadow-xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                      <Ghost size={120} className="text-purple-900" />
                    </div>

                    <div className="flex items-center justify-between mb-6 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                          <Ghost className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-900">
                            Stale & Dead Stock
                          </h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Products with no sales activity
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Inactive Days:
                        </span>
                        <input
                          type="number"
                          min={1}
                          value={deadStockDays}
                          onChange={(e) => setDeadStockDays(Number(e.target.value) || 1)}
                          className="w-16 bg-transparent text-sm font-black text-purple-600 outline-none focus:ring-0"
                        />
                      </div>
                    </div>

                    {deadStockLoading ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-4">
                        <RefreshCw className="w-8 h-8 text-purple-200 animate-spin" />
                        <span className="text-xs font-black text-purple-300 uppercase tracking-widest">Analyzing Inventory...</span>
                      </div>
                    ) : deadStockError ? (
                      <div className="text-red-500 text-sm font-bold text-center py-12 bg-red-50 rounded-xl border border-red-100">
                        {deadStockError}
                      </div>
                    ) : deadStock.length === 0 ? (
                      <div className="text-slate-400 text-sm font-bold text-center py-16 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        No stale items found for the selected {deadStockDays} day period.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full text-left">
                           <thead className="bg-slate-50">
                            <tr>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">SKU</th>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Product</th>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Branch</th>
                              <th className="px-6 py-4 text-[10px] font-black text-center text-slate-500 uppercase tracking-widest border-b border-slate-100">In Stock</th>
                              <th className="px-6 py-4 text-[10px] font-black text-right text-slate-500 uppercase tracking-widest border-b border-slate-100">Last Movement</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {deadStock.map((item) => (
                              <tr key={item.id || item.productId} className="hover:bg-purple-50/50 transition-colors group">
                                <td className="px-6 py-4 font-mono text-[11px] font-bold text-slate-400 group-hover:text-purple-600 transition-colors">{item.sku}</td>
                                <td className="px-6 py-4">
                                  <div className="text-sm font-bold text-slate-900">{item.productName}</div>
                                  <div className="text-[9px] font-bold text-slate-400 uppercase">{item.sku}</div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-black uppercase tracking-wider">
                                    {item.branchName || 'N/A'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className="inline-flex items-center px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-black">
                                    {item.quantity}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="text-xs font-black text-slate-900 italic">
                                    {item.lastSaleDate ? new Date(item.lastSaleDate).toLocaleDateString() : 'Never Sold'}
                                  </div>
                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                    {item.lastSaleDate ? 'Last transaction' : 'Inactive since setup'}
                                  </div>
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

            {/* Error Feedback */}
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl mb-6 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div className="text-xs font-bold uppercase tracking-wider">{error}</div>
              </div>
            )}

            {/* Main Content Area */}
            {!loading && !loadingProducts && !error ? (
              <motion.div
                className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden"
                variants={itemVariants}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">
                          Product Info
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">
                          Identifiers
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">
                          Current Stock
                        </th>

                        <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">
                          Price Value
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">
                          Condition
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredItems.map((item) => (
                        <tr
                          key={item.id || item.productId}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                <Package className="w-4 h-4 text-slate-400" />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-slate-900">
                                  {item.productName}
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">
                                  {item.productStatus}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs font-bold text-slate-600">
                            {item.sku}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div
                              className={`text-sm font-black ${item.quantity === 0 ? 'text-red-600' : item.isLowStock ? 'text-amber-600' : 'text-slate-900'}`}
                            >
                              {item.quantity}
                            </div>
                            <div className="text-[9px] font-black text-slate-400 uppercase">
                              Min: {item.lowStockThreshold}
                            </div>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="text-sm font-black text-slate-900">
                              {formatCurrency(item.price)}
                            </div>
                            <div className="text-[9px] font-black text-emerald-600">
                              VAL: {formatCurrency(item.price * item.quantity)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">{getStockStatusBadge(item)}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="relative inline-flex" data-admin-inventory-action-menu>
                              <button
                                onClick={() =>
                                  setOpenActionMenuId((current) =>
                                    current === item.productId ? null : item.productId,
                                  )
                                }
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors group"
                                title="Inventory actions"
                              >
                                <MoreVertical className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                              </button>

                              {openActionMenuId === item.productId && (
                                <div className="absolute right-0 top-full z-20 mt-2 min-w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white py-2 shadow-xl">
                                  <button
                                    onClick={() => {
                                      setSelectedManageItem(item);
                                      setOpenActionMenuId(null);
                                    }}
                                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 hover:text-emerald-700"
                                  >
                                    <Settings2 className="h-4 w-4" />
                                    Manage Stock
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedTransferItem(item);
                                      setOpenActionMenuId(null);
                                    }}
                                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 hover:text-emerald-700"
                                  >
                                    <ArrowRightLeft className="h-4 w-4" />
                                    Transfer Stock
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

                {filteredItems.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                      <Package className="w-10 h-10 text-slate-200" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 lowercase tracking-tighter italic">
                      no matches found
                    </h3>
                    <p className="text-sm text-slate-500 max-w-xs mt-2 font-medium">
                      Try adjusting your filters or search terms to find what you're looking for.
                    </p>
                  </div>
                )}

                {/* Pagination */}
                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Showing {Math.min(filteredItems.length, pageSize)} of {totalElements} items
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                      disabled={currentPage === 0}
                      className="p-2 text-emerald-600 hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <span className="text-sm font-black text-slate-900 mx-2">
                      {currentPage + 1} <span className="text-slate-300 mx-1">/</span> {displayTotalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(displayTotalPages - 1, prev + 1))}
                      disabled={currentPage === displayTotalPages - 1}
                      className="p-2 text-emerald-600 hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="Next Page"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
                (loading || loadingProducts) && (
                <div className="flex flex-col items-center justify-center py-32">
                    <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Syncing Inventory Data...</span>
                </div>
                )
            )}


          </motion.div>
        </main>
      </div>

      {selectedManageItem && (
        <ManageStockModal
          item={selectedManageItem}
          onClose={() => setSelectedManageItem(null)}
          onSuccess={handleInventoryMutationSuccess}
        />
      )}

      {selectedTransferItem && (
        <StockTransferModal
          item={selectedTransferItem}
          onClose={() => setSelectedTransferItem(null)}
          onSuccess={handleInventoryMutationSuccess}
        />
      )}
    </div>
  );
};

export default InventoryView;
