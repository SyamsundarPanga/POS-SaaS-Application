import React, { useRef, useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchProducts, deleteProduct } from '../../store/slices/productSlice';
import { fetchCategoryHierarchy } from '../../store/slices/categorySlice';
import Sidebar from '../../components/layout/Sidebar';
import DashboardHeader from '../../components/layout/Header';
import ProductList from '../../features/products/ProductList';
import ProductGrid from '../../features/products/ProductGrid';
import CreateProductModal from '../../features/products/CreateProductModal';
import EditProductModal from '../../features/products/EditProductModal';
import CategoryModal from '../../components/modal/CategoryModal';
import { Product } from '../../store/slices/productSlice';
import { Plus, Package, Search, Image as ImageIcon, LayoutGrid, List, Download, Upload, FileText, ChevronLeft, ChevronRight, ChevronDown, Edit } from 'lucide-react';
import { motion } from 'framer-motion';
import ConfirmModal from '../../components/ui/ConfirmModal';
import EnhancedModal from '../../components/ui/EnhancedModal';
import toast from '../../utils/toast';
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

const ProductManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const { products, loading: productsLoading, error: productsError } = useAppSelector((state) => state.products);
  const { hierarchy } = useAppSelector((state) => state.categories);
  const { user } = useAppSelector((state) => state.auth);
  const isStoreAdmin = user?.roles?.includes('ROLE_STORE_ADMIN');

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 12;

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<any>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<number | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [firstRowData, setFirstRowData] = useState<Record<string, string>>({});
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const branchDropdownRef = useRef<HTMLDivElement|null>(null);
  const selectedBranch = branches.find((branch) => branch.id === selectedBranchId) ?? null;

  const [showMappingCloseConfirm, setShowMappingCloseConfirm] = useState(false);

  const handleMappingCloseAttempt = () => {
    if (pendingImportFile) {
      setShowMappingCloseConfirm(true);
    } else {
      setIsMappingOpen(false);
    }
  };


  useEffect(() => {
    dispatch(fetchCategoryHierarchy());
  }, [dispatch]);

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

        console.error('Failed to load branches for products page:', error);
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
    if (isStoreAdmin) {
      if (branchesLoading) {
        return;
      }

      if (!selectedBranchId) {
        return;
      }
    }

    const delayDebounceFn = setTimeout(() => {
      dispatch(fetchProducts({
        page,
        size: pageSize,
        search: searchTerm,
        categoryId: selectedCategoryId || undefined,
        branchId: isStoreAdmin ? selectedBranchId || undefined : undefined,
        sort: 'name,asc',
      }));
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [dispatch, page, searchTerm, selectedCategoryId, isStoreAdmin, selectedBranchId, branchesLoading]);

  useEffect(() => {
    setPage(0);
  }, [searchTerm, selectedCategoryId]);

  useEffect(() => {
    if (products?.totalPages !== undefined) {
      setTotalPages(products.totalPages);
      setTotalElements(products.totalElements || 0);
    }
  }, [products]);

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

  const handleDelete = (id: number) => {
    setProductToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (productToDelete) {
      try {
        await dispatch(deleteProduct(productToDelete)).unwrap();
        toast.success('Product deleted successfully');
        new BroadcastChannel('paypoint_sync').postMessage('PRODUCT_UPDATED');
        setIsDeleteConfirmOpen(false);
        setProductToDelete(null);
      } catch (error: any) {
        toast.error(error?.message || 'Failed to delete product');
      }
    }
  };

  const handleEditClick = (product: Product) => {
    setSelectedProduct(product);
    setIsEditOpen(true);
  };

  const handleExportProducts = async (format: 'csv' | 'pdf') => {
    try {
      setReportBusy(true);
      await adminReportService.exportProducts(format);
      toast.success(`Products ${format.toUpperCase()} exported`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to export products');
    } finally {
      setReportBusy(false);
    }
  };

  const handleDownloadSample = () => {
    const headers = [
      'name', 'sku', 'price', 'costPrice', 'description',
      'categoryId', 'branchId', 'status', 'barcode', 'unit',
      'minStockLevel', 'maxStockLevel', 'reorderPoint',
      'taxRate', 'isTaxable', 'allowDecimalQuantity', 'tags', 'imageUrl'
    ];
    const sampleRow = [
      'Sample Product', 'PROD-001', '99.99', '50.00', 'Full description here',
      '1', '1', 'ACTIVE', '1234567890', 'PCS',
      '10', '100', '20',
      '18.00', 'true', 'false', 'electronics,gadget', 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
    ];
    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'product_import_sample.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const openMappingForFile = async (file?: File) => {
    if (!file) return;
    try {
      const text = await file.text();

      // Binary detection: check for null characters or high percentage of non-ASCII
      if (text.includes('\0') || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text.slice(0, 1000))) {
        toast.error('The selected file appears to be binary (e.g., an image) and not a valid CSV.');
        return;
      }

      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 1) {
        toast.error('CSV file is empty');
        return;
      }

      const splitCsv = (line: string) => {
        const result: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
          } else cur += char;
        }
        result.push(cur.trim());
        return result.map(s => s.replace(/^"|"$/g, ''));
      };

      const headers = splitCsv(lines[0]).filter(Boolean);
      if (headers.length === 0) {
        toast.error('CSV header row not found or invalid');
        return;
      }

      // Preview first data row
      const firstRow: Record<string, string> = {};
      if (lines.length > 1) {
        const values = splitCsv(lines[1]);
        headers.forEach((h, i) => {
          firstRow[h] = values[i] || '';
        });
      }

      setCsvHeaders(headers);
      setFirstRowData(firstRow);

      // Auto-mapping
      const initialMapping: Record<string, string> = {};
      const fields = [
        'name', 'sku', 'price', 'costPrice', 'description',
        'categoryId', 'branchId', 'status', 'barcode', 'unit',
        'minStockLevel', 'maxStockLevel', 'reorderPoint',
        'taxRate', 'isTaxable', 'allowDecimalQuantity', 'tags', 'imageUrl'
      ];

      fields.forEach(field => {
        const match = headers.find(h => h.toLowerCase() === field.toLowerCase());
        initialMapping[field] = match || headers[0];
      });

      setColumnMapping(initialMapping);
      setPendingImportFile(file);
      setIsMappingOpen(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to read CSV file');
    }
  };

  const confirmImportProducts = async () => {
    if (!pendingImportFile) return;
    try {
      setReportBusy(true);
      const result = await adminReportService.importProductsCsv(pendingImportFile, columnMapping);
      toast.success(`Imported ${result.importedRows}/${result.totalRows} products`);
      new BroadcastChannel('paypoint_sync').postMessage('PRODUCT_UPDATED');
      if (result.failedRows > 0 && result.errors.length > 0) {
        toast.warning(result.errors.slice(0, 2).join(' | '));
      }
      setIsMappingOpen(false);
      setPendingImportFile(null);
      dispatch(fetchProducts({
        page,
        size: pageSize,
        search: searchTerm,
        categoryId: selectedCategoryId || undefined,
        branchId: isStoreAdmin ? selectedBranchId || undefined : undefined,
        sort: 'name,asc',
      }));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to import products');
    } finally {
      setReportBusy(false);
    }
  };

  const productList = isStoreAdmin && !selectedBranchId ? [] : products?.content || [];
  const hasNoBranches = isStoreAdmin && !branchesLoading && branches.length === 0;

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto bg-white">
          <motion.div
            className="p-8 max-w-7xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Page Header */}
            <motion.header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-6" variants={itemVariants}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-1 block">Catalog</span>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase mb-1">Management</h1>
              </div>

              <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 w-full lg:w-auto">
                {/* Search Bar beside Add Product */}
                <div className="relative group flex-1 sm:w-80">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search size={18} className="text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search product..."
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:border-emerald-500 transition-all outline-none"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(0);
                    }}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 xl:flex-nowrap">
                  {isStoreAdmin && (
                    <div ref={branchDropdownRef} className="relative min-w-[160px] sm:min-w-[185px]">
                      <button
                        type="button"
                        onClick={() => {
                          if (!branchesLoading && !hasNoBranches) {
                            setIsBranchDropdownOpen((prev) => !prev);
                          }
                        }}
                        disabled={branchesLoading || hasNoBranches}
                        className="flex w-full items-center justify-between gap-2 rounded-[8px] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-emerald-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                        aria-haspopup="listbox"
                        aria-expanded={isBranchDropdownOpen}
                        aria-label="Select branch"
                        title={selectedBranch?.name || 'Select branch'}
                      >
                        <span className="truncate">
                          {branchesLoading
                            ? 'Loading...'
                            : hasNoBranches
                              ? 'No Branch'
                              : getCompactBranchLabel(selectedBranch)}
                        </span>
                        <ChevronDown
                          size={18}
                          className={`shrink-0 text-slate-500 transition-transform ${isBranchDropdownOpen ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {isBranchDropdownOpen && !branchesLoading && !hasNoBranches && (
                        <div className="absolute left-0 top-[calc(100%+10px)] z-30 w-[280px] overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
                          <div className="py-2">
                            {branches.map((branch) => {
                              const isSelected = branch.id === selectedBranchId;

                              return (
                                <button
                                  key={branch.id}
                                  type="button"
                                  onClick={() => {
                                    setPage(0);
                                    setSelectedBranchId(branch.id);
                                    setIsBranchDropdownOpen(false);
                                  }}
                                  className={`flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors ${
                                    isSelected ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-bold">{getCompactBranchLabel(branch)}</p>
                                    <p className="truncate text-xs font-medium text-slate-400">{branch.name}</p>
                                  </div>
                                  {branch.isMainBranch && (
                                    <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                                      Head
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* View Toggle */}
                  <div className="flex p-1 bg-white rounded-lg border border-slate-200">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-md transition-all ${viewMode === 'grid'
                        ? 'bg-slate-100 text-slate-900 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                      <LayoutGrid size={18} />
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`p-2 rounded-md transition-all ${viewMode === 'table'
                        ? 'bg-slate-100 text-slate-900 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                      <List size={18} />
                    </button>
                  </div>
                  <button
                    onClick={() => handleExportProducts('csv')}
                    disabled={reportBusy}
                    className="p-3 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-60"
                    title="Export CSV"
                  >
                    <Download size={18} />
                  </button>
                  <button
                    onClick={() => handleExportProducts('pdf')}
                    disabled={reportBusy}
                    className="p-3 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-60"
                    title="Export PDF"
                  >
                    <FileText size={18} />
                  </button>
                  <button
                    onClick={() => importInputRef.current?.click()}
                    disabled={reportBusy}
                    className="p-3 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-60"
                    title="Import CSV"
                  >
                    <Upload size={18} />
                  </button>
                  <button
                    onClick={handleDownloadSample}
                    className="p-3 bg-white border border-slate-200 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all border-emerald-100"
                    title="Download Sample CSV Template"
                  >
                    <FileText size={18} />
                  </button>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      void openMappingForFile(file);
                      e.currentTarget.value = '';
                    }}
                  />

                  <button
                    onClick={() => setIsProductModalOpen(true)}
                    className="bg-emerald-600 text-white px-4 py-3 rounded-lg font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2 active:scale-95 whitespace-nowrap"
                  >
                    <Plus size={18} /> Product
                  </button>
                </div>
              </div>
            </motion.header>

            {/* Horizontal Category Picker */}
            <motion.section className="mt-3 mb-6" variants={itemVariants}>
              <div className="flex items-center justify-between">
              </div>

              <div className="flex items-start gap-10 overflow-x-auto pb-4 scrollbar-hide">
                {/* "All" Category */}
                <button
                  onClick={() => setSelectedCategoryId(null)}
                  className="flex flex-col items-center gap-4 shrink-0 group perspective"
                >
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 border-4 ${selectedCategoryId === null
                    ? 'bg-emerald-500 border-emerald-100 scale-110 -rotate-6'
                    : 'bg-white border-slate-100 group-hover:border-emerald-200'
                    }`}>
                    <Package size={36} className={selectedCategoryId === null ? 'text-white' : 'text-slate-300 group-hover:text-emerald-500'} />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${selectedCategoryId === null ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-500'
                    }`}>All Units</span>
                </button>

                {hierarchy.map((cat) => (
                  <div key={cat.id} className="relative group shrink-0">
                    <button
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className="flex flex-col items-center gap-4 group perspective w-full"
                    >
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center overflow-hidden transition-all duration-500 border-4 ${selectedCategoryId === cat.id
                        ? 'border-emerald-500 scale-110 rotate-6'
                        : 'border-white bg-white group-hover:border-emerald-50'
                        }`}>
                        {cat.imageUrl ? (
                          <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                            <ImageIcon size={32} className="text-slate-200" />
                          </div>
                        )}
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${selectedCategoryId === cat.id ? 'text-emerald-600' : 'text-slate-500'
                        }`}>{cat.name}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCategoryToEdit(cat);
                        setIsCatModalOpen(true);
                      }}
                      className="absolute top-0 right-0 p-2 bg-white rounded-full shadow-lg border border-slate-100 text-emerald-600 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 z-10"
                      title="Edit Category"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {/* Add Category Button */}
                <button
                  onClick={() => {
                    setCategoryToEdit(null);
                    setIsCatModalOpen(true);
                  }}
                  className="flex flex-col items-center gap-4 shrink-0 group"
                >
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center bg-transparent group-hover:border-emerald-400 group-hover:bg-emerald-50 group-hover:rotate-90 transition-all duration-700">
                    <Plus size={36} className="text-slate-200 group-hover:text-emerald-500" strokeWidth={1} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 group-hover:text-emerald-500 text-center">New Unit</span>
                </button>
              </div>
            </motion.section>

            {/* Catalog Area */}
            <motion.div className="min-h-[600px] mb-20" variants={itemVariants}>
              {hasNoBranches ? (
                <div className="p-20 text-center">
                  <p className="text-slate-500 font-bold">No branches are available for this store yet.</p>
                </div>
              ) : productsLoading ? (
                <div className="p-40 text-center flex flex-col items-center gap-8">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-emerald-500/20 rounded-full" />
                    <div className="absolute top-0 w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <span className="text-slate-300 font-black uppercase tracking-[0.5em] text-[10px]">Updating Catalog</span>
                </div>
              ) : isStoreAdmin && !selectedBranchId ? (
                <div className="p-20 text-center">
                  <p className="text-slate-500 font-bold">Select a branch to view its products.</p>
                </div>
              ) : productsError ? (
                <div className="p-20 text-red-500 text-center font-black uppercase tracking-widest bg-red-50/50">{productsError}</div>
              ) : viewMode === 'table' ? (
                <ProductList
                  products={productList}
                  onDelete={handleDelete}
                  onEdit={handleEditClick}
                />
              ) : (
                <ProductGrid
                  products={productList}
                  onDelete={handleDelete}
                  onEdit={handleEditClick}
                />
              )}
            </motion.div>

            {/* Pagination Controls */}
            {totalPages > 1 && !hasNoBranches && (!isStoreAdmin || !!selectedBranchId) && (
              <div className="mt-8 flex items-center justify-center border-t border-slate-200 pt-6 mb-20">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setPage(prev => Math.max(0, prev - 1))}
                    disabled={page === 0}
                    className="p-2 text-emerald-600 hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <div className="flex items-center gap-1">
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i)}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${page === i
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                          : 'text-slate-600 hover:bg-slate-50'
                          }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))}
                    disabled={page === totalPages - 1}
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

      {/* MODALS */}
      <CreateProductModal
        open={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        preferredBranchId={isStoreAdmin ? selectedBranchId : null}
      />
      <EditProductModal open={isEditOpen} onClose={() => setIsEditOpen(false)} product={selectedProduct} />
      <CategoryModal 
        open={isCatModalOpen} 
        onClose={() => {
          setIsCatModalOpen(false);
          setCategoryToEdit(null);
        }} 
        categoryToEdit={categoryToEdit}
      />

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
      />

      <EnhancedModal
        isOpen={isMappingOpen}
        onClose={() => {
          setIsMappingOpen(false);
          setPendingImportFile(null);
        }}
        onCloseIconClick={handleMappingCloseAttempt}
        title="Map CSV Columns"
        size="small"
        hideScrollbar={true}
        hideHeaderBorder={true}
      >
        <ConfirmModal
          isOpen={showMappingCloseConfirm}
          onClose={() => setShowMappingCloseConfirm(false)}
          onConfirm={() => {
            setShowMappingCloseConfirm(false);
            setIsMappingOpen(false);
            setPendingImportFile(null);
          }}
          title="Confirm Close"
          message="You have unsaved mapping changes. Are you sure you want to close this form?"
          confirmText="Yes, Close"
          cancelText="No, Keep Editing"
        />
        <p className="text-sm text-slate-600 mb-4">Review CSV to product column mapping before confirming import.</p>
        <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto px-1 scrollbar-hide">
          {[
            'name', 'sku', 'price', 'costPrice', 'description',
            'categoryId', 'branchId', 'status', 'barcode', 'unit',
            'minStockLevel', 'maxStockLevel', 'reorderPoint',
            'taxRate', 'isTaxable', 'allowDecimalQuantity', 'tags', 'imageUrl'
          ].map((field) => (
            <div key={field} className="flex flex-col gap-1 border-b border-slate-50 pb-2">
              <div className="flex items-center gap-3">
                <label className="w-36 text-sm font-bold text-slate-700 capitalize">
                  {field.replace(/([A-Z])/g, ' $1')}
                </label>
                <select
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-emerald-500 outline-none transition-all"
                  value={columnMapping[field] || ''}
                  onChange={(e) => setColumnMapping((prev) => ({ ...prev, [field]: e.target.value }))}
                >
                  <option value="">-- No Mapping --</option>
                  {csvHeaders.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
              {columnMapping[field] && (
                <div className="ml-36 flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preview:</span>
                  <span className="text-[10px] font-bold text-emerald-600 truncate max-w-xs">
                    {firstRowData[columnMapping[field]] || '(Empty)'}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 mt-6">
          <button
            onClick={handleMappingCloseAttempt}
            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 w-full"
          >
            Cancel
          </button>
          <button
            onClick={confirmImportProducts}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 w-full"
          >
            Confirm Import
          </button>
        </div>
      </EnhancedModal>
    </div>
  );
};

export default ProductManagement;
