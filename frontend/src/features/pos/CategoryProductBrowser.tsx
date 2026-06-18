import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchCategoryHierarchy } from '../../store/slices/categorySlice';
import { Product } from '../../store/slices/productSlice';
import productService from '../../services/productService';
import toast from '../../utils/toast';
import EnhancedModal from '../../components/ui/EnhancedModal';
import api from '../../services/api';

interface CategoryProductBrowserProps {
  onProductSelect: (product: Product) => void | Promise<void>;
  inventorySync?: {
    nonce: number;
    items: { productId: number; quantity: number }[];
  } | null;
  refreshKey?: number;
  branchId?: number;
  disabled?: boolean;
}

type CategoryFilter = 'ALL' | 'UNCATEGORIZED' | number;
const CASHIER_APPROVAL_THRESHOLD = 50;

const CategoryProductBrowser: React.FC<CategoryProductBrowserProps> = ({
  onProductSelect,
  inventorySync,
  refreshKey = 0,
  branchId,
  disabled = false,
}) => {
  const dispatch = useAppDispatch();

  const { categories, loading: categoriesLoading } = useAppSelector((state) => state.categories);

  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL');
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const productsCache = useRef<Record<string, Product[]>>({});
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);

  useEffect(() => {
    if (categories.length === 0) {
      dispatch(fetchCategoryHierarchy());
    }
  }, [categories.length, dispatch]);

  const loadProducts = useCallback(
    async (category: CategoryFilter, silent = false) => {
      const cacheKey = String(category);
      const hasCache = !!productsCache.current[cacheKey];

      // If we have cache and NOT silent, show cache immediately
      if (hasCache && !silent) {
        setProducts(productsCache.current[cacheKey]);
        return;
      }

      try {
        if (!silent) setProductsLoading(true);
        
        let content: Product[] = [];
        if (category === 'ALL') {
          const response = await productService.getProducts(0, 200, 'ACTIVE', branchId);
          content = response.data?.content || [];
        } else if (category === 'UNCATEGORIZED') {
          const response = await productService.getProducts(0, 200, 'ACTIVE', branchId);
          const allData = response.data?.content || [];
          content = allData.filter(
            (product: Product) => !product.categoryId && !product.categoryName,
          );
          productsCache.current['ALL'] = allData;
        } else {
          const response = await productService.getProductsByCategory(category, 0, 200, branchId);
          content = response.data?.content || [];
        }

        setProducts(content);
        productsCache.current[cacheKey] = content;
      } catch (error) {
        if (!silent) {
          toast.error('Failed to load products');
          console.error('POS category product load error:', error);
        }
      } finally {
        if (!silent) setProductsLoading(false);
      }
    },
    [branchId],
  );

  useEffect(() => {
    // Invalidate cache when branchId changes
    productsCache.current = {};
    void loadProducts(selectedCategory);
  }, [loadProducts, selectedCategory, branchId]);

  useEffect(() => {
    if (refreshKey > 0) {
      // Invalidate specific cache or all? 
      // For background refresh, we just re-fetch the current category silently.
      void loadProducts(selectedCategory, true);
    }
  }, [refreshKey, loadProducts, selectedCategory]);

  useEffect(() => {
    if (!inventorySync || inventorySync.items.length === 0) return;

    const applyDeductions = (list: Product[]) =>
      list.map((product) => {
        const matchedDeduction = inventorySync.items.find((item) => item.productId === product.id);
        if (!matchedDeduction) return product;

        const currentStock = getStockQty(product) ?? 0;
        const nextStock = Math.max(0, currentStock - matchedDeduction.quantity);

        return {
          ...product,
          currentStock: nextStock,
          quantity: nextStock,
          isLowStock:
            typeof product.minStockLevel === 'number'
              ? nextStock <= product.minStockLevel
              : nextStock > 0 && nextStock <= 5,
        };
      });

    setProducts((prev) => applyDeductions(prev));
    Object.keys(productsCache.current).forEach((key) => {
      productsCache.current[key] = applyDeductions(productsCache.current[key]);
    });
  }, [inventorySync]);

  const sortedCategories = useMemo(() => {
    const activeCategories = categories.filter((category) => category.status === 'ACTIVE');
    return [...activeCategories].sort((a, b) => {
      const orderA = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
  }, [categories]);

  const selectedCategoryName = useMemo(() => {
    if (typeof selectedCategory !== 'number') return null;
    return sortedCategories.find((cat) => cat.id === selectedCategory)?.name ?? null;
  }, [selectedCategory, sortedCategories]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'ALL') return products;
    if (selectedCategory === 'UNCATEGORIZED') return products;
    if (!selectedCategoryName) return products;
    return products;
  }, [products, selectedCategory, selectedCategoryName]);

  const getStockQty = (product: Product): number | null => {
    const value =
      product.currentStock ??
      (product as any).availableQuantity ??
      (product as any).quantity;
    return typeof value === 'number' ? value : null;
  };

  const resetAdjustmentForm = () => {
    setAdjustmentQuantity('');
    setAdjustmentReason('');
    setSelectedProductForAdjust(null);
    setIsAdjustModalOpen(false);
  };

  const handleAdjustClick = (event: React.MouseEvent, product: Product) => {
    event.stopPropagation();
    setSelectedProductForAdjust(product);
    setIsAdjustModalOpen(true);
  };

  const handleStockAdjustment = async () => {
    if (!selectedProductForAdjust || !adjustmentQuantity || !adjustmentReason.trim()) {
      toast.error('Please enter quantity and reason');
      return;
    }

    const quantity = parseInt(adjustmentQuantity, 10);
    if (Number.isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    setSubmittingAdjustment(true);
    try {
      const endpoint =
        quantity > CASHIER_APPROVAL_THRESHOLD
          ? '/inventory/request-adjustment'
          : '/inventory/adjust';

      await api.post(endpoint, {
        productId: selectedProductForAdjust.id,
        quantity,
        movementType: 'RESTOCK',
        notes: adjustmentReason.trim(),
        referenceType: 'RESTOCK',
      });

      if (quantity > CASHIER_APPROVAL_THRESHOLD) {
        toast.success('Adjustment request sent to manager for approval');
      } else {
        toast.success('Stock added successfully');
        setProducts((prev) =>
          prev.map((product) => {
            if (product.id !== selectedProductForAdjust.id) return product;
            const currentStock = getStockQty(product) ?? 0;
            const currentQuantity =
              typeof (product as any).quantity === 'number'
                ? (product as any).quantity
                : currentStock;

            return {
              ...product,
              currentStock: currentStock + quantity,
              quantity: currentQuantity + quantity,
            };
          }),
        );
      }

      resetAdjustmentForm();
    } catch (error: any) {
      console.error('POS stock adjustment error:', error);
      toast.error(error.response?.data?.message || 'Failed to process stock adjustment');
    } finally {
      setSubmittingAdjustment(false);
    }
  };

  return (
    <div className="">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Categories</h2>
          <p className="text-sm text-slate-500">Tap a category to view products</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (disabled) {
              toast.error('Open the shift to process and add products to cart');
              return;
            }
            setSelectedCategory('ALL');
          }}
          className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${selectedCategory === 'ALL'
            ? 'bg-emerald-600 text-white border-emerald-600'
            : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-500 hover:text-emerald-600'
            }`}
        >
          View All Items
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-5">
        {categoriesLoading ? (
          <div className="text-sm text-slate-400">Loading categories...</div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                if (disabled) {
                  toast.error('Open the shift to process and add products to cart');
                  return;
                }
                setSelectedCategory('ALL');
              }}
              className={`px-4 py-2 rounded-full text-sm font-semibold border whitespace-nowrap transition-colors ${selectedCategory === 'ALL'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-500 hover:text-emerald-600'
                }`}
            >
              All Categories
            </button>
            {sortedCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => {
                  if (disabled) {
                    toast.error('Open the shift to process and add products to cart');
                    return;
                  }
                  setSelectedCategory(category.id);
                }}
                className={`px-4 py-2 rounded-full text-sm font-semibold border whitespace-nowrap transition-colors ${selectedCategory === category.id
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-500 hover:text-emerald-600'
                  }`}
              >
                {category.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                if (disabled) {
                  toast.error('Open the shift to process and add products to cart');
                  return;
                }
                setSelectedCategory('UNCATEGORIZED');
              }}
              className={`px-4 py-2 rounded-full text-sm font-semibold border whitespace-nowrap transition-colors ${selectedCategory === 'UNCATEGORIZED'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-500 hover:text-emerald-600'
                }`}
            >
              Uncategorized
            </button>
          </>
        )}
      </div>

      <div className="min-h-[180px]">
        {productsLoading ? (
          <div className="text-sm text-slate-400">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-500">
            No products found for this category.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              (() => {
                const stockQty = getStockQty(product);
                const isOutOfStock = stockQty !== null && stockQty <= 0;
                const isLowStock = !isOutOfStock && (
                  product.isLowStock === true ||
                  (stockQty !== null && stockQty <= 5)
                );

                return (
                  <div
                    key={product.id}
                    onClick={() => {
                      if (disabled) {
                        toast.error('Open the shift to process and add products to cart');
                        return;
                      }
                      if (!isOutOfStock) {
                        onProductSelect(product);
                      }
                    }}
                    className={`text-left border rounded-2xl p-3 transition-colors h-full flex flex-col group ${isOutOfStock
                      ? 'bg-red-50 text-red-700 border-red-100 opacity-90'
                      : isLowStock
                        ? 'bg-orange-50 text-orange-700 border-orange-100'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:border-emerald-300 cursor-pointer'
                      }`}
                  >
                    <div className={`relative w-full h-28 rounded-xl overflow-hidden flex items-center justify-center mb-2 ${isOutOfStock ? 'bg-red-100/50' : isLowStock ? 'bg-orange-100/50' : 'bg-emerald-100/50'
                      }`}>
                      {isOutOfStock && (
                        <span className="absolute top-2 left-2 z-10 text-[9px] px-2 py-0.5 bg-red-600 text-white font-bold rounded-full">
                          OUT OF STOCK
                        </span>
                      )}
                      {isLowStock && (
                        <span className="absolute top-2 left-2 z-10 text-[9px] px-2 py-0.5 bg-orange-500 text-white font-bold rounded-full">
                          LOW STOCK
                        </span>
                      )}
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt=""
                          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 ${isOutOfStock ? 'grayscale opacity-50' : ''}`}
                        />
                      ) : (
                        <span className={`text-xs group-hover:scale-110 transition-transform duration-300 ${isOutOfStock ? 'text-red-400' : isLowStock ? 'text-orange-400' : 'text-emerald-400'}`}>No Image</span>
                      )}
                    </div>
                    <div className={`font-bold text-sm line-clamp-1 min-h-[1.25rem] ${isOutOfStock ? 'text-red-900' : isLowStock ? 'text-orange-900' : 'text-emerald-900'}`}>{product.name}</div>
                    <div className={`text-[10px] mt-0.5 ${isOutOfStock ? 'text-red-500/80' : isLowStock ? 'text-orange-500/80' : 'text-emerald-500/80'}`}>SKU: {product.sku}</div>
                    {stockQty !== null && (
                      <div className={`text-[10px] font-bold mt-0.5 ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : 'text-emerald-600'
                        }`}>
                        {isOutOfStock ? 'Out of stock' : isLowStock ? `Low stock (${stockQty})` : `Stock: ${stockQty}`}
                      </div>
                    )}
                    <div className="mt-auto pt-2 flex items-center justify-between">
                      <span className={`font-black text-base ${isOutOfStock ? 'text-red-700' : isLowStock ? 'text-orange-700' : 'text-emerald-700'}`}>Rs {product.price.toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (disabled) {
                            toast.error('Open the shift to process and add products to cart');
                            return;
                          }
                          if (!isOutOfStock) {
                            onProductSelect(product);
                          }
                        }}
                        disabled={isOutOfStock || disabled}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors ${isOutOfStock
                          ? 'bg-red-200 text-red-700 cursor-not-allowed'
                          : isLowStock
                            ? 'bg-orange-200 text-orange-700'
                            : 'bg-emerald-600 text-white'
                          }`}
                      >
                        {isOutOfStock ? 'Sold Out' : 'Add'}
                      </button>
                    </div>
                  </div>
                );
              })()
            ))}
          </div>
        )}
      </div>

      <EnhancedModal
        isOpen={isAdjustModalOpen}
        onClose={resetAdjustmentForm}
        title={`Add Stock - ${selectedProductForAdjust?.name ?? ''}`}
        size="small"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Current Stock</label>
            <div className="text-2xl font-black text-slate-900">
              {selectedProductForAdjust ? (getStockQty(selectedProductForAdjust) ?? 0) : 0} units
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Quantity to Add</label>
            <input
              type="number"
              min="1"
              value={adjustmentQuantity}
              onChange={(event) => setAdjustmentQuantity(event.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="Enter quantity"
              disabled={submittingAdjustment}
            />
            {parseInt(adjustmentQuantity, 10) > CASHIER_APPROVAL_THRESHOLD && (
              <p className="text-xs text-amber-600 mt-2 font-semibold">
                Quantity above {CASHIER_APPROVAL_THRESHOLD} requires manager approval.
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Reason</label>
            <textarea
              value={adjustmentReason}
              onChange={(event) => setAdjustmentReason(event.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="Enter reason for adjustment"
              disabled={submittingAdjustment}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={resetAdjustmentForm}
              disabled={submittingAdjustment}
              className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleStockAdjustment}
              disabled={submittingAdjustment || !adjustmentQuantity || !adjustmentReason.trim()}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {submittingAdjustment
                ? 'Processing...'
                : parseInt(adjustmentQuantity, 10) > CASHIER_APPROVAL_THRESHOLD
                  ? 'Request Approval'
                  : 'Add Stock'}
            </button>
          </div>
        </div>
      </EnhancedModal>
    </div>
  );
};

export default CategoryProductBrowser;
