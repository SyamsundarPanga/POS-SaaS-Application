import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchProducts, Product } from '../../store/slices/productSlice';
import debounce from 'lodash/debounce';
import { Camera, Search, Package, Plus, Minus, X } from 'lucide-react';
import BarcodeScanner, { BarcodeScannerHandle } from '../../components/barcode/BarcodeScanner';
import api from '../../services/api';
import toast from '../../utils/toast';
import EnhancedModal from '../../components/ui/EnhancedModal';

interface ProductSearchProps {
  onProductSelect: (product: Product) => void | Promise<void>;
  branchId?: number;
  disabled?: boolean;
}

const ProductSearch: React.FC<ProductSearchProps> = ({ onProductSelect, branchId, disabled = false }) => {
  const dispatch = useAppDispatch();
  const { products: productData, loading } = useAppSelector((state) => state.products);
  const products = productData?.content || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scannerRef = useRef<BarcodeScannerHandle>(null);

  // Stock Adjustment State
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getStockQty = (product: Product | null): number | null => {
    if (!product) return null;
    const value =
      product.currentStock ??
      (product as any).availableQuantity ??
      (product as any).quantity;
    return typeof value === 'number' ? value : null;
  };

  const debouncedFetch = useCallback(
    debounce((query: string) => {
      if (query.trim().length > 1) {
        dispatch(fetchProducts({ page: 0, size: 8, search: query, branchId }));
      }
    }, 300),
    [dispatch, branchId],
  );

  useEffect(() => {
    debouncedFetch(searchTerm);
    return () => debouncedFetch.cancel();
  }, [searchTerm, debouncedFetch]);

  const handleSelectProduct = (product: Product) => {
    if (disabled) {
      toast.error('Open the shift to process and add products to cart');
      setShowResults(false);
      return;
    }

    const stockQty = getStockQty(product);
    if (stockQty !== null && stockQty <= 0) {
      return;
    }

    onProductSelect(product);
    setSearchTerm('');
    setShowResults(false);
    setSelectedIndex(0);
  };

  const handleAdjustClick = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setSelectedProductForAdjust(product);
    setIsAdjustModalOpen(true);
  };

  const handleStockAdjustment = async () => {
    if (!selectedProductForAdjust || !adjustmentQuantity || !adjustmentReason) {
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
      const endpoint = quantity > 50 ? '/inventory/request-adjustment' : '/inventory/adjust';
      
      await api.post(endpoint, {
        productId: selectedProductForAdjust.id,
        quantity: quantity,
        movementType: adjustmentType === 'add' ? 'RESTOCK' : 'ADJUSTMENT',
        notes: adjustmentReason,
        referenceType: adjustmentType === 'add' ? 'RESTOCK' : 'ADJUSTMENT',
      });

      if (quantity > 50) {
        toast.success('Adjustment request sent to manager for approval');
      } else {
        toast.success(`Stock ${adjustmentType === 'add' ? 'added' : 'removed'} successfully`);
        // Force refresh products after direct adjustment
        if (searchTerm.trim().length > 1) {
           dispatch(fetchProducts({ page: 0, size: 8, search: searchTerm }));
        }
      }
      
      setIsAdjustModalOpen(false);
      setAdjustmentQuantity('');
      setAdjustmentReason('');
    } catch (error: any) {
      console.error('Error adjusting stock:', error);
      toast.error(error.response?.data?.message || 'Failed to adjust stock');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || products.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < products.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (products[selectedIndex]) {
        handleSelectProduct(products[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  const handleBarcodeScanned = async (barcode: string) => {
    try {
      // Try to fetch the specific product by barcode to get its name
      const response = await api.get(`/products/barcode/${barcode}`);
      const product = response.data;
      
      if (product && product.name) {
        setSearchTerm(product.name);
        setShowResults(true);
        // Also trigger the search dispatch to show results immediately
        dispatch(fetchProducts({ page: 0, size: 8, search: product.name }));
      } else {
        // Fallback if product logic fails or name is missing
        setSearchTerm(barcode);
        setShowResults(true);
        dispatch(fetchProducts({ page: 0, size: 8, search: barcode }));
      }
    } catch (error) {
      // Fallback to barcode search if API call fails
      setSearchTerm(barcode);
      setShowResults(true);
      dispatch(fetchProducts({ page: 0, size: 8, search: barcode, branchId }));
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative group">
        <input
          id="product-search"
          type="text"
          placeholder="Search products (F1)..."
          className="w-full px-4 py-3 pl-12 pr-12 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-lg shadow-sm transition-all"
          value={searchTerm}
          onChange={(e) => {
            if (disabled) {
              toast.error('Open the shift to process and add products to cart');
              return;
            }
            setSearchTerm(e.target.value);
            setShowResults(true);
            setSelectedIndex(0);
          }}
          onFocus={() => {
            if (disabled) {
              toast.error('Open the shift to process and add products to cart');
              return;
            }
            setShowResults(true);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          readOnly={disabled}
        />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
          <Search className="w-5 h-5" />
        </div>

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {loading && (
            <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
          )}
          <button
            type="button"
            onClick={() => {
              if (disabled) {
                toast.error('Open the shift to process and add products to cart');
                return;
              }
              scannerRef.current?.startScanner();
            }}
            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
            title="Scan Barcode"
          >
            <Camera className="w-5 h-5" />
          </button>
        </div>
      </div>

      <BarcodeScanner
        ref={scannerRef}
        onScan={handleBarcodeScanned}
        showButton={false}
      />

      {showResults && !disabled && searchTerm.trim().length > 0 && (
        <div className="absolute gap-1 z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-96 overflow-hidden flex flex-col">
          {products.length > 0 ? (
            <div className="p-2 space-y-1 overflow-y-auto">
              {products.map((product: Product, index: number) => {
                const stockQty = getStockQty(product);
                const isOutOfStock = stockQty !== null && stockQty <= 0;
                const isLowStock =
                  !isOutOfStock &&
                  (product.isLowStock === true || (stockQty !== null && stockQty <= 5));

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelectProduct(product)}
                    disabled={isOutOfStock}
                    className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all border-2 ${index === selectedIndex
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/10'
                      : 'hover:bg-slate-50 border-transparent'
                      } ${isOutOfStock ? 'bg-red-50 border-red-300 opacity-75 cursor-not-allowed' : ''}`}
                  >
                    <div
                      className={`relative w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center ${isOutOfStock ? 'bg-red-100' : 'bg-slate-100'
                        }`}
                    >
                      {isOutOfStock && (
                        <span className="absolute top-0 left-0 text-[9px] px-1.5 py-0.5 bg-red-600 text-white font-bold rounded-br-md">
                          OUT
                        </span>
                      )}
                      {isLowStock && (
                        <span className="absolute top-0 left-0 text-[9px] px-1.5 py-0.5 bg-amber-500 text-white font-bold rounded-br-md">
                          LOW
                        </span>
                      )}
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt=""
                          className={`w-full h-full object-cover ${isOutOfStock ? 'grayscale' : ''}`}
                        />
                      ) : (
                        <span className="text-xl">Box</span>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-slate-800 line-clamp-1">{product.name}</div>
                        <button
                          onClick={(e) => handleAdjustClick(e, product)}
                          className="p-1 hover:bg-emerald-100 rounded text-emerald-600 transition-colors"
                          title="Adjust Stock"
                        >
                          <Package className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-xs text-slate-500">SKU: {product.sku}</div>
                      {stockQty !== null && (
                        <div
                          className={`text-[11px] font-semibold mt-0.5 ${isOutOfStock
                            ? 'text-red-600'
                            : isLowStock
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                            }`}
                        >
                          {isOutOfStock
                            ? 'Out of stock'
                            : isLowStock
                              ? `Low stock (${stockQty})`
                              : `Stock: ${stockQty}`}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className={`font-black ${isOutOfStock ? 'text-red-600' : 'text-emerald-600'}`}>
                        Rs {product.price}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 mt-1">
                        {product.status}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            !loading && (
              <div className="p-8 text-center">
                <p className="text-slate-500 font-medium">No products found for "{searchTerm}"</p>
              </div>
            )
          )}
        </div>
      )}

      {showResults && <div className="fixed inset-0 z-40" onClick={() => setShowResults(false)} />}

      {/* Adjustment Modal */}
      <EnhancedModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Inventory Adjustment"
        size="medium"
      >
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-emerald-600">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-black text-slate-900">{selectedProductForAdjust?.name}</h4>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                SKU: {selectedProductForAdjust?.sku} | Current Stock: {getStockQty(selectedProductForAdjust as Product)}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setAdjustmentType('add')}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${adjustmentType === 'add'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-500/10'
                  : 'border-slate-100 hover:border-slate-200 text-slate-500'
                  }`}
              >
                <Plus className="w-6 h-6" />
                <span className="font-bold uppercase tracking-widest text-[10px]">Add Stock</span>
              </button>
              <button
                onClick={() => setAdjustmentType('remove')}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${adjustmentType === 'remove'
                  ? 'border-red-500 bg-red-50 text-red-700 ring-4 ring-red-500/10'
                  : 'border-slate-100 hover:border-slate-200 text-slate-500'
                  }`}
              >
                <Minus className="w-6 h-6" />
                <span className="font-bold uppercase tracking-widest text-[10px]">Remove Stock</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 px-1">
                Quantity to {adjustmentType === 'add' ? 'Add' : 'Remove'}
              </label>
              <input
                type="number"
                value={adjustmentQuantity}
                onChange={(e) => setAdjustmentQuantity(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-emerald-500 outline-none transition-all font-bold text-lg"
                placeholder="0"
                min="1"
              />
              {parseInt(adjustmentQuantity) > 50 && (
                <p className="text-[10px] text-amber-600 font-bold uppercase mt-2 px-1">
                   Adjustment exceeds 50 units and will require manager approval
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 px-1">
                Reason for Adjustment
              </label>
              <textarea
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-emerald-500 outline-none transition-all font-medium text-sm min-h-[100px] resize-none"
                placeholder="Enter reason for this adjustment..."
              />
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={() => setIsAdjustModalOpen(false)}
              className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStockAdjustment}
              disabled={submitting || !adjustmentQuantity || !adjustmentReason}
              className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${adjustmentType === 'add'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
                : 'bg-red-600 hover:bg-red-700 shadow-red-100'
                } disabled:opacity-50 disabled:shadow-none`}
            >
              {submitting ? 'Processing...' : (parseInt(adjustmentQuantity) > 50 ? 'Request Approval' : 'Confirm Adjustment')}
            </button>
          </div>
        </div>
      </EnhancedModal>
    </div>
  );
};

export default ProductSearch;
