import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch } from '../../store/hooks';
import { updateProduct } from '../../store/slices/productSlice'; // Ensure this action exists in your slice
import { Product } from '../../types/product.types';
import EnhancedModal from '../../components/ui/EnhancedModal';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import CategorySelector from '../../pages/admin/CategorySelector';
import BarcodeScanner from '../../components/barcode/BarcodeScanner';
import ConfirmModal from '../../components/ui/ConfirmModal';

interface Props {
  open: boolean;
  onClose: () => void;
  product: Product | null; // The product being edited
}

// Aligning with your UpdateProductRequest Backend DTO
interface UpdateProductFormData {
  name: string;
  price: number;
  costPrice: number;
  description: string;
  status: string;
  categoryId: number | null;
  barcode: string;
  unit: string;
  minStockLevel: number;
  maxStockLevel: number;
  reorderPoint: number;
  isTaxable: boolean;
  allowDecimalQuantity: boolean;
}

const EditProductModal: React.FC<Props> = ({ open, onClose, product }) => {
  const dispatch = useAppDispatch();
  const [file, setFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateProductFormData>();

  // ✅ Pre-fill form values when the product changes
  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        price: product.price,
        barcode: product.barcode,
        categoryId: product.categoryId,
        unit: product.unit,
        status: product.status,
        isTaxable: product.isTaxable ?? true,
        description: product.description || '',
        // Add other fields from your UpdateProductRequest DTO
      });
    }
  }, [product, reset]);

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const handleCloseAttempt = () => {
    if (isDirty || file) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const onSubmit = async (data: UpdateProductFormData) => {
    if (!product) return;
    setErrorMsg(null);

    // Matches your backend UpdateProductRequest logic
    const resultAction = await dispatch(
      updateProduct({
        id: product.id,
        productData: data,
        file: file ?? undefined,
      })
    );

    if (updateProduct.fulfilled.match(resultAction)) {
      import('../../utils/toast').then((m) => m.default.success('Product updated successfully'));
      new BroadcastChannel('paypoint_sync').postMessage('PRODUCT_UPDATED');
      onClose();
    } else {
      const err = resultAction.payload as string;
      setErrorMsg(err || 'Failed to update product.');
    }
  };

  return (
    <EnhancedModal
      isOpen={open}
      onClose={onClose}
      onCloseIconClick={handleCloseAttempt}
      title="Edit Product"
      size="small"
      className=""
      hideHeaderBorder={true}
      hideScrollbar={true}
    >
      <form onSubmit={handleSubmit(onSubmit)} autoComplete="off" className="flex flex-col gap-5">
        <ConfirmModal
          isOpen={showCloseConfirm}
          onClose={() => setShowCloseConfirm(false)}
          onConfirm={() => {
            setShowCloseConfirm(false);
            onClose();
          }}
          title="Confirm Close"
          message="You have unsaved changes. Are you sure you want to close this form?"
          confirmText="Yes, Close"
          cancelText="No, Keep Editing"
        />
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm">
            {errorMsg}
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
            Basic Information
          </h3>

          <Input
            label="Product Name"
            {...register('name', { required: 'Name is required' })}
            error={errors.name?.message}
          />

          <div>
            
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <CategorySelector
                  selectedId={field.value || undefined}
                  onSelect={(id) => field.onChange(id)}
                />
              )}
            />
          </div>

          <Input label="Unit" {...register('unit')} placeholder="e.g. PCS, KG, BOX" />
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-indigo-900">Update Barcode</label>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              {...register('barcode')}
              className="flex-1"
              placeholder="Scan or type new code..."
            />
            <div className="flex-shrink-0">
              <BarcodeScanner onScan={(code) => setValue('barcode', code, { shouldDirty: true })} />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Update Product Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
        </div>

        <div className="space-y-4">
          <Input
            type="number"
            step="0.01"
            label="Selling Price"
            {...register('price', { required: 'Price is required', valueAsNumber: true })}
            error={errors.price?.message}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register('isTaxable')}
              id="editTaxable"
              className="w-4 h-4 accent-emerald-500"
            />
            <label htmlFor="editTaxable" className="text-sm font-semibold text-slate-700">
              Taxable
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-5 border-t border-gray-200 mt-3">
          <Button type="button" variant="secondary" onClick={handleCloseAttempt} className="shadow-none flex-1">
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting} className="shadow-none flex-1">
            Update Record
          </Button>
        </div>
      </form>
    </EnhancedModal>
  );
};

export default EditProductModal;
