import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, IndianRupee } from 'lucide-react';
import EnhancedModal from '../../components/ui/EnhancedModal';
import { CartItem } from './Cart';
import ConfirmModal from '../../components/ui/ConfirmModal';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  orderNumber?: string;
  items: CartItem[];
  totalAmount: number;
  subtotalAmount?: number;
  taxAmount?: number;
  discountAmount?: number;
  onRefund: (data: RefundData) => Promise<void>;
  requireManagerApproval?: boolean;
  approvalThreshold?: number;
}

export interface RefundData {
  orderId: number;
  reason: string;
  customReason?: string;
  refundAmount: number;
  managerPin?: string;
  items: Array<{ productId: number; quantity: number }>;
}

const REFUND_REASONS = [
  'Wrong item',
  'Damaged product',
  'Customer request',
  'Pricing error',
  'Quality issue',
  'Other',
];

export const RefundModal: React.FC<RefundModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  items,
  totalAmount,
  subtotalAmount,
  taxAmount,
  discountAmount,
  onRefund,
  requireManagerApproval = false,
  approvalThreshold = 0,
}) => {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>(
    items.reduce((acc, item) => ({ ...acc, [item.id]: 0 }), {})
  );
  const [selectedProducts, setSelectedProducts] = useState<Record<string, boolean>>(
    items.reduce((acc, item) => ({ ...acc, [item.id]: false }), {})
  );
  const [isReasonDropdownOpen, setIsReasonDropdownOpen] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const needsApproval = requireManagerApproval && totalAmount >= approvalThreshold;

  const isDirty = reason !== '' || 
    Object.values(selectedProducts).some(v => v === true) || 
    managerPin !== '';

  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowCloseConfirm(true);
    } else {
      handleClose();
    }
  };

  const roundCurrency = (value: number): number => Number(value.toFixed(2));

  const orderBaseSubtotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
  const effectiveSubtotal = subtotalAmount && subtotalAmount > 0 ? subtotalAmount : orderBaseSubtotal;
  const hasExplicitTaxDiscount =
    typeof taxAmount === 'number' || typeof discountAmount === 'number';
  const effectiveTax = Math.max(0, Number(taxAmount ?? 0));
  const effectiveDiscount = Math.max(0, Number(discountAmount ?? 0));
  const netAdjustmentFactor = orderBaseSubtotal > 0 ? totalAmount / orderBaseSubtotal : 1;

  const getRefundBreakdownForQuantity = (item: CartItem, quantity: number) => {
    const safeQty = Math.max(0, Math.min(quantity, item.quantity || 0));
    const baseAmount = (item.price || 0) * safeQty;

    if (!hasExplicitTaxDiscount || effectiveSubtotal <= 0) {
      const adjusted = roundCurrency(baseAmount * netAdjustmentFactor);
      return {
        baseAmount: roundCurrency(baseAmount),
        taxShare: 0,
        discountShare: 0,
        total: adjusted,
      };
    }

    const ratio = baseAmount / effectiveSubtotal;
    const proportionalTax = roundCurrency(effectiveTax * ratio);
    const proportionalDiscount = roundCurrency(effectiveDiscount * ratio);
    const total = roundCurrency(baseAmount + proportionalTax - proportionalDiscount);

    return {
      baseAmount: roundCurrency(baseAmount),
      taxShare: proportionalTax,
      discountShare: proportionalDiscount,
      total,
    };
  };

  const getAdjustedRefundForQuantity = (item: CartItem, quantity: number) => {
    return getRefundBreakdownForQuantity(item, quantity).total;
  };

  const refundBaseAmount = roundCurrency(
    items.reduce((sum, item) => {
      const quantity = selectedItems[item.id] || 0;
      const safeQty = Math.max(0, Math.min(quantity, item.quantity || 0));
      return sum + (item.price || 0) * safeQty;
    }, 0),
  );

  const refundTaxShare = roundCurrency(
    items.reduce((sum, item) => {
      const quantity = selectedItems[item.id] || 0;
      return sum + getRefundBreakdownForQuantity(item, quantity).taxShare;
    }, 0),
  );

  const refundDiscountShare = roundCurrency(
    items.reduce((sum, item) => {
      const quantity = selectedItems[item.id] || 0;
      return sum + getRefundBreakdownForQuantity(item, quantity).discountShare;
    }, 0),
  );

  const refundAmount = roundCurrency(
    items.reduce((sum, item) => {
      const quantity = selectedItems[item.id] || 0;
      return sum + getAdjustedRefundForQuantity(item, quantity);
    }, 0),
  );

  const handleItemQuantityChange = (itemId: string | number, quantity: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const maxQuantity = item.quantity;
    const validQuantity = Math.max(0, Math.min(quantity, maxQuantity));

    setSelectedItems({
      ...selectedItems,
      [itemId]: validQuantity,
    });
    setSelectedProducts({
      ...selectedProducts,
      [itemId]: validQuantity > 0,
    });
  };

  const handleItemToggle = (itemId: string | number, checked: boolean) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    setSelectedProducts({
      ...selectedProducts,
      [itemId]: checked,
    });

    setSelectedItems({
      ...selectedItems,
      [itemId]: checked ? item.quantity : 0,
    });
  };

  const handleRefund = async () => {
    if (!reason) {
      alert('Please select a refund reason');
      return;
    }

    if (reason === 'Other' && !customReason.trim()) {
      alert('Please provide a custom reason');
      return;
    }

    if (needsApproval && !managerPin) {
      alert('Manager approval is required for this refund amount');
      return;
    }

    if (refundAmount === 0) {
      alert('Please select at least one item to refund');
      return;
    }

    setIsProcessing(true);

    try {
      const refundData: RefundData = {
        orderId,
        reason: reason === 'Other' ? customReason : reason,
        customReason: reason === 'Other' ? customReason : undefined,
        refundAmount,
        managerPin: needsApproval ? managerPin : undefined,
        items: items
          .filter((item) => selectedProducts[item.id] && selectedItems[item.id] > 0)
          .map((item) => ({
            productId: item.productId,
            quantity: selectedItems[item.id],
          })),
      };

      await onRefund(refundData);
      handleClose();
    } catch (error) {
      console.error('Refund failed:', error);
      alert('Refund failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setCustomReason('');
    setManagerPin('');
    setSelectedItems(items.reduce((acc, item) => ({ ...acc, [item.id]: 0 }), {}));
    setSelectedProducts(items.reduce((acc, item) => ({ ...acc, [item.id]: false }), {}));
    onClose();
  };

  return (
    <EnhancedModal
      isOpen={isOpen}
      onClose={handleClose}
      onCloseIconClick={handleCloseAttempt}
      title={`Process Refund - ${orderNumber || `#${orderId}`}`}
      size="small"
      className="max-h-[550px] h-[550px]"
      hideScrollbar={true}
      hideHeaderBorder={true}
    >
      <div className="space-y-4 -mt-2">
        <ConfirmModal
          isOpen={showCloseConfirm}
          onClose={() => setShowCloseConfirm(false)}
          onConfirm={() => {
            setShowCloseConfirm(false);
            handleClose();
          }}
          title="Confirm Close"
          message="You have unsaved refund details. Are you sure you want to close this form?"
          confirmText="Yes, Close"
          cancelText="No, Keep Editing"
        />
        {/* Warning Banner */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-2 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium text-orange-900">Refund Transaction</div>
            <div className="text-sm text-orange-700 mt-1">
              This action will refund the selected items and return them to inventory.
              {needsApproval && ' Manager approval is required.'}
            </div>
          </div>
        </div>

        {/* Order Information */}
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="text-sm font-medium text-slate-700 mb-3">Order #{orderId || 'N/A'}</div>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedProducts[item.id] || false}
                      onChange={(e) => handleItemToggle(item.id, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="font-medium text-slate-900">{item.name}</div>
                  </label>
                  <div className="text-sm text-slate-600">
                    ₹{(item.price || 0).toFixed(2)} × {item.quantity || 0}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-slate-600">Refund Qty:</div>
                  <input
                    type="number"
                    min="0"
                    max={item.quantity}
                    value={selectedItems[item.id] || 0}
                    onChange={(e) =>
                      handleItemQuantityChange(item.id, parseInt(e.target.value) || 0)
                    }
                    className="w-20 px-3 py-1 border border-slate-300 rounded-lg text-center focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <div className="text-right min-w-[100px]">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                      Item Total
                    </p>
                    <p className="text-sm font-black text-slate-900">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </p>
                    {selectedItems[item.id] > 0 && (
                      <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                        Refund: ₹{getAdjustedRefundForQuantity(item, selectedItems[item.id]).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Refund Reason */}
        <div className="relative">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Refund Reason <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsReasonDropdownOpen(!isReasonDropdownOpen)}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-left focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all flex items-center justify-between"
            >
              <span className={reason ? 'text-slate-900' : 'text-slate-400'}>
                {reason || 'Select a reason...'}
              </span>
              <div className={`w-4 h-4 transition-transform duration-200 ${isReasonDropdownOpen ? 'rotate-180' : ''}`}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isReasonDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsReasonDropdownOpen(false)}
                />
                <div className="absolute z-40 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl py-2 animate-in fade-in zoom-in-95 duration-200">
                  {REFUND_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setReason(r);
                        setIsReasonDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${reason === r
                          ? 'bg-emerald-50 text-emerald-700 font-bold'
                          : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Custom Reason */}
        {reason === 'Other' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Custom Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={3}
              placeholder="Please provide details..."
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
          </div>
        )}

        {/* Manager Approval */}
        {needsApproval && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-purple-600" />
              <div className="font-medium text-purple-900">Manager Approval Required</div>
            </div>
            <div className="text-sm text-purple-700 mb-3">
              Refund amount exceeds ₹{(approvalThreshold || 0).toFixed(2)} threshold
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-900 mb-2">
                Manager PIN <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value)}
                placeholder="Enter manager PIN"
                className="w-full px-4 py-2 border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                maxLength={6}
              />
            </div>
          </div>
        )}

        {/* Refund Amount */}
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4">
          <div className="flex items-center justify-between text-emerald-900">
            <div className="flex items-center gap-2">
              <IndianRupee className="w-6 h-6" />
              <span className="text-lg font-bold uppercase tracking-wider">Refund Amount</span>
            </div>
            <div className="text-3xl font-black">
              ₹{refundAmount.toFixed(2)}
            </div>
          </div>
          <div className="mt-3 border-t border-emerald-200 pt-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-emerald-900/80">
              <span>Base item amount</span>
              <span>₹{refundBaseAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-emerald-900/80">
              <span>Tax adjustment</span>
              <span>+₹{refundTaxShare.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-emerald-900/80">
              <span>Discount adjustment</span>
              <span>-₹{refundDiscountShare.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={handleCloseAttempt}
            disabled={isProcessing}
            className="flex-1 px-6 py-3 border border-slate-300 rounded-xl hover:bg-slate-50 font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRefund}
            disabled={isProcessing || !reason || refundAmount === 0}
            className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Process Refund</span>
              </>
            )}
          </button>
        </div>
      </div>
    </EnhancedModal>
  );
};

export default RefundModal;
