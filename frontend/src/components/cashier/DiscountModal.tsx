import React, { useMemo, useState } from 'react';
import EnhancedModal from '../ui/EnhancedModal';
import orderService from '../../services/orderService';
import toast from '../../utils/toast';
import ConfirmModal from '../ui/ConfirmModal';

type DiscountType = 'PERCENTAGE' | 'FIXED';

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: number;
  maxDiscountPercent: number;
  taxRate: number;
  subtotal: number;
  initialType?: DiscountType;
  initialValue?: number;
  onApply: (payload: { type: DiscountType; value: number }) => void;
  onLimitExceeded?: (message: string) => void;
}

const toTwo = (value: number): number => Number(value.toFixed(2));

const DiscountModal: React.FC<DiscountModalProps> = ({
  isOpen,
  onClose,
  branchId,
  maxDiscountPercent,
  taxRate,
  subtotal,
  initialType = 'PERCENTAGE',
  initialValue = 0,
  onApply,
  onLimitExceeded,
}) => {
  const [discountType, setDiscountType] = useState<DiscountType>(initialType);
  const [valueInput, setValueInput] = useState<string>(
    initialValue > 0 ? String(initialValue) : '0',
  );
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const isDirty = discountType !== initialType || 
    valueInput !== (initialValue > 0 ? String(initialValue) : '0');

  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };
  const numericValue = Number(valueInput);
  const value = Number.isFinite(numericValue) ? numericValue : 0;

  const preview = useMemo(() => {
    const safeValue = Math.max(0, Number.isFinite(value) ? value : 0);
    const discountAmount =
      discountType === 'PERCENTAGE'
        ? subtotal * (safeValue / 100)
        : safeValue;
    const boundedDiscountAmount = Math.min(discountAmount, subtotal);
    const derivedPercent = subtotal > 0 ? (boundedDiscountAmount / subtotal) * 100 : 0;
    const taxableAmount = Math.max(0, subtotal - boundedDiscountAmount);
    const taxAmount = taxableAmount * (taxRate / 100);
    const total = taxableAmount + taxAmount;
    return {
      discountAmount: toTwo(boundedDiscountAmount),
      discountPercent: toTwo(derivedPercent),
      taxableAmount: toTwo(taxableAmount),
      taxAmount: toTwo(taxAmount),
      total: toTwo(total),
    };
  }, [discountType, subtotal, taxRate, value]);

  const validateClient = (): string => {
    if (value < 0) return 'Discount cannot be negative';
    if (discountType === 'PERCENTAGE' && value > maxDiscountPercent) {
      return `Maximum discount allowed is ${maxDiscountPercent}%`;
    }
    if (preview.discountPercent > maxDiscountPercent) {
      return `Maximum discount allowed is ${maxDiscountPercent}%`;
    }
    return '';
  };

  const handleConfirm = async () => {
    const clientError = validateClient();
    if (clientError) {
      setError(clientError);
      onLimitExceeded?.(clientError);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await orderService.validateDiscount({
        branchId,
        discountType,
        discountPercent: discountType === 'PERCENTAGE' ? value : preview.discountPercent,
        discountAmount: discountType === 'FIXED' ? value : preview.discountAmount,
      });

      if (!response.allowed) {
        const message = response.message || `Maximum discount allowed is ${response.maxAllowed}%`;
        setError(message);
        onLimitExceeded?.(message);
        setIsSubmitting(false);
        return;
      }
    } catch (apiError) {
      toast.error('Discount validation failed. Applying local validation fallback.');
    }

    onApply({ type: discountType, value: Math.max(0, value) });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <EnhancedModal
      isOpen={isOpen}
      onClose={onClose}
      onCloseIconClick={handleCloseAttempt}
      title="Apply Discount"
      size="small"
      className="max-h-[560px] h-[560px]"
      hideScrollbar={true}
    >
      <div className="space-y-4">
        <ConfirmModal
          isOpen={showCloseConfirm}
          onClose={() => setShowCloseConfirm(false)}
          onConfirm={() => {
            setShowCloseConfirm(false);
            onClose();
          }}
          title="Confirm Close"
          message="You have unsaved discount details. Are you sure you want to close this form?"
          confirmText="Yes, Close"
          cancelText="No, Keep Editing"
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setDiscountType('PERCENTAGE')}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
              discountType === 'PERCENTAGE'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-slate-300 text-slate-600'
            }`}
          >
            Percentage (%)
          </button>
          <button
            onClick={() => setDiscountType('FIXED')}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
              discountType === 'FIXED'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-slate-300 text-slate-600'
            }`}
          >
            Fixed Amount (INR)
          </button>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Discount Value
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={valueInput}
            onChange={(e) => {
              const next = e.target.value;
              if (next === '' || /^\d*\.?\d{0,2}$/.test(next)) {
                setValueInput(next);
              }
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>INR {toTwo(subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-orange-600">
            <span>
              Discount ({preview.discountPercent.toFixed(2)}%):
            </span>
            <span>-INR {preview.discountAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Taxable Amount:</span>
            <span>INR {preview.taxableAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax ({taxRate}%):</span>
            <span>INR {preview.taxAmount.toFixed(2)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
            <span>Total:</span>
            <span>INR {preview.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCloseAttempt}
            className="w-full rounded-lg border border-slate-300 py-2 text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isSubmitting ? 'Validating...' : 'Confirm'}
          </button>
        </div>
      </div>
    </EnhancedModal>
  );
};

export default DiscountModal;
