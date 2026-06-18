import React, { useState } from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';
import EnhancedModal from '../../components/ui/EnhancedModal';
import { CartItem } from './Cart';
import ConfirmModal from '../../components/ui/ConfirmModal';

interface VoidTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  items: CartItem[];
  totalAmount: number;
  onVoid: (data: VoidData) => Promise<void>;
  requireManagerPin?: boolean;
  actionLabel?: string;
}

export interface VoidData {
  orderId: number;
  reason: string;
  managerPin: string;
}

export const VoidTransactionModal: React.FC<VoidTransactionModalProps> = ({
  isOpen,
  onClose,
  orderId,
  items,
  totalAmount,
  onVoid,
  requireManagerPin = true,
  actionLabel = 'Void Request',
}) => {
  const [reason, setReason] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const isDirty = reason.trim() !== '' || managerPin !== '';

  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowCloseConfirm(true);
    } else {
      handleClose();
    }
  };

  const isApprovalFlow = requireManagerPin;

  const handleVoid = async () => {
    if (!reason.trim()) {
      alert('Please provide a reason for voiding this transaction');
      return;
    }

    if (requireManagerPin && !managerPin) {
      alert('Manager PIN is required to void a transaction');
      return;
    }

    setIsProcessing(true);

    try {
      const voidData: VoidData = {
        orderId,
        reason: reason.trim(),
        managerPin: requireManagerPin ? managerPin : '',
      };

      await onVoid(voidData);
      handleClose();
    } catch (error) {
      console.error('Void transaction failed:', error);
      alert('Failed to process void request. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setManagerPin('');
    onClose();
  };

  return (
    <EnhancedModal
      isOpen={isOpen}
      onClose={handleClose}
      onCloseIconClick={handleCloseAttempt}
      title={actionLabel}
      size="small"
      className="max-h-[500px] h-[500px]"
      hideScrollbar={true}
    >
      <div className="space-y-6">
        <ConfirmModal
          isOpen={showCloseConfirm}
          onClose={() => setShowCloseConfirm(false)}
          onConfirm={() => {
            setShowCloseConfirm(false);
            handleClose();
          }}
          title="Confirm Close"
          message="You have unsaved details. Are you sure you want to close this form?"
          confirmText="Yes, Close"
          cancelText="No, Keep Editing"
        />
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-red-900 text-lg">Critical Action</div>
              <div className="text-sm text-red-700 mt-2 space-y-1">
                <p>- This action is irreversible{isApprovalFlow ? ' and will void the transaction after approval' : ' and will void the transaction immediately'}</p>
                <p>- Inventory will be restored {isApprovalFlow ? 'only after manager approval' : 'immediately after voiding'}</p>
                <p>- This action will be logged in the audit trail</p>
                <p>- {isApprovalFlow ? 'Manager approval is required' : 'No additional approval is required for your role'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4">
          <div className="text-sm font-medium text-slate-700 mb-3">Order #{orderId || 'N/A'}</div>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div className="flex-1">
                  <div className="font-medium text-slate-900">{item.name}</div>
                  <div className="text-slate-600">
                    Rs {(item.price || 0).toFixed(2)} x {item.quantity || 0}
                  </div>
                </div>
                <div className="font-medium text-slate-900">Rs {(item.subtotal || 0).toFixed(2)}</div>
              </div>
            ))}
            <div className="pt-2 border-t flex items-center justify-between">
              <span className="font-bold text-slate-900">Total Amount</span>
              <span className="text-xl font-bold text-red-600">Rs {(totalAmount || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Reason for Void <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Provide a detailed reason for voiding this transaction..."
            className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            required
          />
          <div className="text-xs text-slate-500 mt-1">This reason will be permanently recorded in the audit logs</div>
        </div>

        {requireManagerPin && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-purple-600" />
              <div className="font-medium text-purple-900">Manager Authorization Required</div>
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
                required
              />
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={handleCloseAttempt}
            disabled={isProcessing}
            className="flex-1 px-6 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleVoid}
            disabled={isProcessing || !reason.trim() || (requireManagerPin && !managerPin)}
            className="flex-1 px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5" />
                <span>{actionLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </EnhancedModal>
  );
};

export default VoidTransactionModal;
