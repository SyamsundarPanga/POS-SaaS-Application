

import React, { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createProductWithImage } from '../../store/slices/productSlice';
import EnhancedModal from '../../components/ui/EnhancedModal';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import CategorySelector from '../../pages/admin/CategorySelector';
import BarcodeScanner from '../../components/barcode/BarcodeScanner';
import branchService, { Branch } from '../../services/branchService';
import userService from '../../services/userService';
import ConfirmModal from '../../components/ui/ConfirmModal';


interface Props {
  open: boolean;
  onClose: () => void;
  preferredBranchId?: number | null;
}

interface ProductFormData {
  name: string;
  price: number;
  barcode: string;
  categoryId: number | null;
  unit: string;
  status: string;
  branchId: number | null;
  isTaxable: boolean;
  imageUrl?: string;
}

const sortBranchesForSelection = (branchList: Branch[]) =>
  [...branchList].sort((first, second) => {
    if (first.isMainBranch !== second.isMainBranch) {
      return first.isMainBranch ? -1 : 1;
    }

    return first.name.localeCompare(second.name);
  });

const getDefaultBranchId = (branchList: Branch[]) =>
  branchList.find((branch) => branch.isMainBranch)?.id ?? branchList[0]?.id ?? null;

const getInitialFormValues = (branchId: number | null) => ({
  name: '',
  barcode: '',
  categoryId: null,
  unit: 'PCS',
  status: 'ACTIVE',
  branchId,
  isTaxable: true,
});

const CreateProductModal: React.FC<Props> = ({ open, onClose, preferredBranchId = null }) => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);
  const currentBranchId = auth.user?.branchId || null;
  const userRoles = auth.user?.roles ?? [];
  const userRole = auth.user?.role;
  const isBranchManager =
    userRoles.includes('ROLE_BRANCH_MANAGER') || userRole === 'ROLE_BRANCH_MANAGER';

  const [file, setFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [managerBranchId, setManagerBranchId] = useState<number | null>(currentBranchId);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProductFormData>({
    mode: 'onSubmit',
    defaultValues: getInitialFormValues(currentBranchId),
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(getInitialFormValues(isBranchManager ? currentBranchId : preferredBranchId));
    clearErrors();
    setErrorMsg(null);
    setFile(null);
    setBranches([]);

    // Branch managers don't select branch in UI, but payload needs a resolved branch id.
    if (isBranchManager) {
      const resolveManagerBranch = async () => {
        if (currentBranchId) {
          setManagerBranchId(currentBranchId);
          setValue('branchId', currentBranchId, { shouldValidate: false });
          clearErrors('branchId');
          return;
        }

        try {
          const response = await userService.getProfile();
          const profileBranchId = response.data?.branchId ?? null;

          setManagerBranchId(profileBranchId);

          if (profileBranchId) {
            setValue('branchId', profileBranchId, { shouldValidate: false });
            clearErrors('branchId');
          } else {
            setErrorMsg('Branch information not available. Please contact administrator.');
          }
        } catch (error) {
          console.error('Failed to resolve manager branch from profile:', error);
          setManagerBranchId(null);
          setErrorMsg('Branch information not available. Please contact administrator.');
        }
      };

      resolveManagerBranch();
      return;
    }

    setManagerBranchId(null);

    // Only admins fetch branches list
    const fetchBranches = async () => {
      setLoadingBranches(true);
      try {
        const data = sortBranchesForSelection(await branchService.getBranches());
        setBranches(data);

        const defaultBranchId =
          preferredBranchId && data.some((branch) => branch.id === preferredBranchId)
            ? preferredBranchId
            : getDefaultBranchId(data);

        if (defaultBranchId) {
          setValue('branchId', defaultBranchId, {
            shouldValidate: false,
            shouldDirty: false,
          });
          clearErrors('branchId');
        }
      } catch (error) {
        console.error('Failed to fetch branches:', error);
        setErrorMsg('Failed to load branches. Please try again.');
      } finally {
        setLoadingBranches(false);
      }
    };

    fetchBranches();
  }, [open, isBranchManager, currentBranchId, preferredBranchId, reset, clearErrors, setValue]);

  const onSubmit = async (data: ProductFormData) => {
    setErrorMsg(null);

    const finalBranchId = isBranchManager ? managerBranchId : data.branchId;

    if (isBranchManager && !finalBranchId) {
      setErrorMsg('Branch information not available. Please contact administrator.');
      return;
    }

    // Only validate branchId for admins
    if (!isBranchManager && !finalBranchId) {
      setErrorMsg('Please select a branch.');
      return;
    }

    const normalizedPrice = Number(data.price);
    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
      setErrorMsg('Please enter a valid selling price.');
      return;
    }

    const normalizedCategoryId =
      data.categoryId != null && Number.isFinite(Number(data.categoryId))
        ? Number(data.categoryId)
        : null;
    const normalizedBranchId =
      finalBranchId != null && Number.isFinite(Number(finalBranchId))
        ? Number(finalBranchId)
        : null;

    const payload = {
      name: data.name?.trim(),
      price: normalizedPrice,
      barcode: data.barcode?.trim(),
      categoryId: normalizedCategoryId,
      unit: data.unit,
      status: data.status,
      branchId: normalizedBranchId,
      isTaxable: data.isTaxable,
      imageUrl: data.imageUrl,
    };

    const resultAction = await dispatch(
      createProductWithImage({
        productData: payload,
        file: file ?? undefined,
      }),
    );

    if (createProductWithImage.fulfilled.match(resultAction)) {
      import('../../utils/toast').then((m) => m.default.success('Product created successfully'));
      if (typeof BroadcastChannel !== 'undefined') {
        new BroadcastChannel('paypoint_sync').postMessage('PRODUCT_UPDATED');
      }
      reset();
      setFile(null);
      onClose();
    } else if (createProductWithImage.rejected.match(resultAction)) {
      const err = resultAction.payload as string;
      if (err?.includes('409')) {
        setErrorMsg('Barcode already exists. Please choose a unique barcode.');
      } else {
        setErrorMsg(err || 'Failed to create product.');
      }
    }
  };

  return (
    <EnhancedModal
      isOpen={open}
      onClose={onClose}
      title="Add New Product"
      size="small"
      className="max-h-[550px] h-[550px]"
      hideHeaderBorder={true}
      hideScrollbar={true}
      onCloseIconClick={() => {
        if (isDirty || file) {
          setShowCloseConfirm(true);
        } else {
          onClose();
        }
      }}
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

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
            Basic Information
          </h3>

          <Input
            label="Product Name"
            placeholder="e.g. Wireless Mouse"
            {...register('name', { required: 'Product name is required' })}
            error={errors.name?.message}
          />

          <div>

            <Controller
              name="categoryId"
              control={control}
              rules={{ required: 'Please select a category' }}
              render={({ field }) => (
                <CategorySelector
                  selectedId={field.value || undefined}
                  onSelect={(id) => field.onChange(id)}
                />
              )}
            />
            {errors.categoryId && (
              <p className="mt-1 text-xs text-red-600">{errors.categoryId.message}</p>
            )}
          </div>

          {/* Only show branch selector for Admin users */}
          {!isBranchManager && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Branch *</label>
              <Controller
                name="branchId"
                control={control}
                rules={{ required: !isBranchManager ? 'Please select a branch' : false }}
                render={({ field }) => (
                  <select
                    name={field.name}
                    ref={field.ref}
                    value={field.value ?? ''}
                    onBlur={field.onBlur}
                    onChange={(event) => {
                      const nextValue = event.target.value === '' ? null : Number(event.target.value);
                      field.onChange(nextValue);
                    }}
                    disabled={loadingBranches}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">
                      {loadingBranches ? 'Loading branches...' : 'Select branch'}
                    </option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}{branch.isMainBranch ? ' (Head Branch)' : ''}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.branchId && (
                <p className="mt-1 text-xs text-red-600">{errors.branchId.message}</p>
              )}
            </div>
          )}
        </div>

        {/* Barcode Section */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-indigo-900">
              Barcode / ISBN <span className="text-red-600">*</span>
            </label>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full font-medium">
              Required
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              {...register('barcode', {
                required: 'Barcode is required',
                validate: (val) => !!val.trim() || 'Barcode cannot be empty',
              })}
              placeholder="Scan or enter barcode..."
              error={errors.barcode?.message}
              className="flex-1"
            />

            <div className="flex-shrink-0">
              <BarcodeScanner
                onScan={(code) => {
                  setValue('barcode', code, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }}
              />
            </div>
          </div>

          <p className="text-xs text-indigo-700/80">
            A valid barcode is mandatory to save this product.
          </p>
        </div>

        {/* Image Upload */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Product Image</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <div className="flex items-center gap-3">
            <div className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-500 bg-white truncate">
              {file?.name || 'No file chosen'}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-medium transition-colors"
            >
              Choose File
            </button>
          </div>
        </div>

        {/* Pricing & Details */}
        <div className="space-y-4">
          <Input
            type="text"
            inputMode="decimal"
            label="Selling Price"
            placeholder="0.00"
            {...register('price', {
              required: 'Price is required',
              setValueAs: (value) => {
                const parsed = Number.parseFloat(String(value).trim());
                return Number.isNaN(parsed) ? 0 : parsed;
              },
              validate: (value) => value >= 0.01 || 'Price must be at least 0.01',
            })}
            error={errors.price?.message}
          />

          <Input label="Unit" {...register('unit')} placeholder="e.g. PCS, KG, BOX" />
        </div>

        {/* Footer Actions */}
        <div className="grid grid-cols-2 gap-4 pt-5 border-t border-gray-200 mt-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (isDirty || file) {
                setShowCloseConfirm(true);
              } else {
                onClose();
              }
            }}
            className="shadow-none flex-1"
          >
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting} className="shadow-none flex-1">
            Save Product
          </Button>
        </div>
      </form>
    </EnhancedModal>
  );
};

export default CreateProductModal;
