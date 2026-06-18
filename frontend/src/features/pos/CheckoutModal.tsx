import React, { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { CartItem } from './Cart';
import paymentService from '../../services/paymentService';
import orderService, { CreateOrderRequest } from '../../services/orderService';
import EnhancedModal from '../../components/ui/EnhancedModal';
import UPIQRModal from './UPIQRModal';
import ConfirmModal from '../../components/ui/ConfirmModal';
import toast from '../../utils/toast';

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  loyaltyPoints: number;
  loyaltyTier: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  customer: Customer | null;
  total: number;
  discountType?: 'PERCENTAGE' | 'FIXED';
  discountPercent?: number;
  discountAmount?: number;
  taxableAmount?: number;
  taxAmount?: number;
  cartFinalTotal?: number;
  branchId?: number;
  onComplete: (paymentData: PaymentData) => void;
}

export interface PaymentData {
  orderId: number;
  orderNumber?: string;
  paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'SPLIT';
  amountPaid: number;
  change: number;
  pointsEarned: number;
  pointsRedeemed: number;
  payments?: Array<{
    method: string;
    amount: number;
    transactionId?: string;
  }>;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  customer,
  total,
  discountType = 'PERCENTAGE',
  discountPercent = 0,
  discountAmount = 0,
  taxableAmount = total,
  taxAmount = 0,
  cartFinalTotal = total,
  branchId,
  onComplete,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'UPI'>('CASH');
  const [amountPaid, setAmountPaid] = useState<string>(total.toFixed(2));
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUPIModal, setShowUPIModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const isDirty = paymentMethod !== 'CASH' || 
    amountPaid !== total.toFixed(2) || 
    pointsToRedeem !== 0 ||
    showUPIModal;

  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const maxRedeemablePoints = customer ? Math.min(customer.loyaltyPoints, Math.floor(total * 100)) : 0;
  const pointsDiscount = pointsToRedeem / 100;
  const finalTotal = total - pointsDiscount;
  const change = paymentMethod === 'CASH' ? Math.max(0, parseFloat(amountPaid) - finalTotal) : 0;
  const pointsEarned = customer ? 1 : 0;

  const handleComplete = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      // Validation
      if (paymentMethod === 'CASH' && parseFloat(amountPaid) < finalTotal) {
        setError('Insufficient payment amount');
        setIsProcessing(false);
        return;
      }

      let orderId: number | null = null;
      let orderNumber: string | undefined;
      let paymentReference: string | undefined;

      if (paymentMethod === 'CASH') {
        // For cash, create order directly with payment info
        console.log('Processing cash payment...');
        const resolvedCustomerId =
          customer && Number.isFinite(Number(customer.id)) ? Number(customer.id) : null;

        const orderPayload: CreateOrderRequest = {
          customerId: resolvedCustomerId,
          items: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity
          })),
          paymentMethod: 'CASH',
          amountPaid: parseFloat(amountPaid),
          customerEmail: customer?.email,
          discountType,
          discountPercent,
          discountAmount,
          taxAmount,
          finalTotal: cartFinalTotal,
          branchId
        };

        console.log('Order payload:', orderPayload);
        const orderResponse = await orderService.create(orderPayload);
        orderId = orderResponse.data.id;
        orderNumber = orderResponse.data.orderNumber;
        console.log('Cash order created:', orderId);

      } else if (paymentMethod === 'UPI') {
        // Handle UPI via custom QR modal
        setShowUPIModal(true);
        setIsProcessing(false);
        return; // Wait for modal confirmation

      } else if (paymentMethod === 'CARD') {
        const paymentResponse = await paymentService.processRazorpayPayment(
          finalTotal,
          undefined,
          'card',
          customer?.name || 'Guest Customer',
          customer?.email || 'guest@example.com',
          customer?.phone || '9999999999'
        );
        paymentReference = paymentResponse.razorpayPaymentId;

        const resolvedCustomerId =
          customer && Number.isFinite(Number(customer.id)) ? Number(customer.id) : null;

        const orderPayload: CreateOrderRequest = {
          customerId: resolvedCustomerId,
          items: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity
          })),
          paymentMethod,
          amountPaid: finalTotal,
          customerEmail: customer?.email,
          discountType,
          discountPercent,
          discountAmount,
          taxAmount,
          finalTotal: cartFinalTotal,
          paymentReference,
          branchId
        };

        const orderResponse = await orderService.create(orderPayload);
        orderId = orderResponse.data.id;
        orderNumber = orderResponse.data.orderNumber;
      }

      // Step 3: Complete the order
      if (orderId === null) {
        throw new Error('Order creation failed');
      }

      const paymentData: PaymentData = {
        orderId,
        orderNumber,
        paymentMethod,
        amountPaid: paymentMethod === 'CARD' ? finalTotal : parseFloat(amountPaid),
        change,
        pointsEarned,
        pointsRedeemed: pointsToRedeem,
      };

      console.log('Order completed successfully!');
      onComplete(paymentData);

    } catch (err: any) {
      console.error('Payment error:', err);
      const backendMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (typeof err?.response?.data === 'string' ? err.response.data : null);

      if (
        String(backendMessage || '').toLowerCase().includes('insufficient stock') ||
        String(err?.message || '').toLowerCase().includes('insufficient stock')
      ) {
        setError('One or more items are out of stock. Please remove unavailable items and try again.');
      } else {
        const msg = String(backendMessage || err.message || 'Payment failed');
        
        // Handle Razorpay amount limit error specifically
        if (msg.includes('Amount exceeds maximum amount allowed')) {
          toast.error('The maximum limit for a single Razorpay payment is ₹5,00,000. Please reduce the amount or use an alternative payment method.');
          // Don't set the local error state so the ugly technical message is not shown in the modal
        } else if (msg.toLowerCase().includes('declined')) {
          setError('Payment declined');
        } else {
          setError(msg);
        }
      }
      setIsProcessing(false);
    }
  };

  const handleUPISuccess = async () => {
    try {
      setShowUPIModal(false);
      setIsProcessing(true);
      setError(null);

      const resolvedCustomerId =
        customer && Number.isFinite(Number(customer.id)) ? Number(customer.id) : null;

      const orderPayload: CreateOrderRequest = {
        customerId: resolvedCustomerId,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        })),
        paymentMethod: 'UPI',
        amountPaid: finalTotal,
        customerEmail: customer?.email,
        discountType,
        discountPercent,
        discountAmount,
        taxAmount,
        finalTotal: cartFinalTotal,
        paymentReference: `UPI_${Date.now()}`, // Internal reference for manual verification
        branchId
      };

      const orderResponse = await orderService.create(orderPayload);
      const orderId = orderResponse.data.id;
      const orderNumber = orderResponse.data.orderNumber;

      const paymentData: PaymentData = {
        orderId,
        orderNumber,
        paymentMethod: 'UPI',
        amountPaid: finalTotal,
        change: 0,
        pointsEarned,
        pointsRedeemed: pointsToRedeem,
      };

      onComplete(paymentData);
    } catch (err: any) {
      console.error('UPI completion error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to complete UPI order');
      setIsProcessing(false);
    }
  };

  const quickAmounts = [10, 20, 50, 100, 200];

  return (
    <EnhancedModal
      isOpen={isOpen}
      onClose={onClose}
      onCloseIconClick={handleCloseAttempt}
      title="Checkout"
      size="small"
      hideScrollbar={true}
      className="max-w-lg"
    >
      <div className="space-y-6">
        <ConfirmModal
          isOpen={showCloseConfirm}
          onClose={() => setShowCloseConfirm(false)}
          onConfirm={() => {
            setShowCloseConfirm(false);
            onClose();
          }}
          title="Confirm Close"
          message="You have unsaved payment details. Are you sure you want to close the checkout?"
          confirmText="Yes, Close"
          cancelText="No, Keep Editing"
        />
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="font-semibold mb-3">Order Summary</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.name} x{item.quantity}</span>
                <span className="font-medium">₹{item.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span className="text-emerald-600">₹{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Customer Loyalty */}
        {customer && (
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <h3 className="font-semibold mb-3 flex items-center">
              <span className="mr-2">🎁</span>
              Loyalty Rewards - {customer.name}
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Available Points:</span>
                <span className="font-medium text-purple-600">{customer.loyaltyPoints} pts</span>
              </div>

              {maxRedeemablePoints > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Redeem Points (100 pts = ₹1.00)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={maxRedeemablePoints}
                    step="100"
                    value={pointsToRedeem}
                    onChange={(e) => setPointsToRedeem(parseInt(e.target.value))}
                    className="w-full accent-emerald-600"
                  />
                  <div className="flex justify-between text-sm mt-1">
                    <span>{pointsToRedeem} points</span>
                    <span className="text-emerald-600 font-medium">-₹{pointsDiscount.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between text-sm pt-2 border-t">
                <span>Points to Earn:</span>
                <span className="font-medium text-emerald-600">+{pointsEarned} pts</span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Method */}
        <div>
          <h3 className="font-semibold mb-3">Payment Method</h3>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setPaymentMethod('CASH')}
              className={`py-4 px-3 border-2 rounded-lg flex items-center justify-center transition-all ${paymentMethod === 'CASH'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-gray-300 hover:border-gray-400'
                }`}
            >
              <span className="font-semibold text-base">Cash</span>
            </button>
            <button
              onClick={() => setPaymentMethod('CARD')}
              className={`py-4 px-3 border-2 rounded-lg flex items-center justify-center transition-all ${paymentMethod === 'CARD'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-gray-300 hover:border-gray-400'
                }`}
            >
              <span className="font-semibold text-base">Card (Razorpay)</span>
            </button>
            <button
              onClick={() => setPaymentMethod('UPI')}
              className={`py-4 px-3 border-2 rounded-lg flex items-center justify-center transition-all ${paymentMethod === 'UPI'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-gray-300 hover:border-gray-400'
                }`}
            >
              <span className="font-semibold text-base">UPI (QR)</span>
            </button>
          </div>
        </div>

        {/* Cash Payment Details */}
        {paymentMethod === 'CASH' && (
          <div>
            <h3 className="font-semibold mb-3">Cash Payment</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">Amount Received</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 text-xl border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setAmountPaid(amount.toFixed(2))}
                    className="flex-1 px-3 py-2 border rounded hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors text-sm font-medium"
                  >
                    ₹{amount}
                  </button>
                ))}
              </div>

              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium">Change:</span>
                  <span className="text-2xl font-bold text-emerald-600">
                    ₹{change.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Final Total */}
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="flex justify-between items-center">
            <span className="text-xl font-semibold">Amount to Pay:</span>
            <span className="text-3xl font-bold text-emerald-600">
              ₹{finalTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handleCloseAttempt}
            disabled={isProcessing}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleComplete}
            disabled={isProcessing}
            className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
          >
            {isProcessing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Check size={20} />
                <span>Complete Sale</span>
              </>
            )}
          </button>
        </div>
      </div>

      <UPIQRModal
        isOpen={showUPIModal}
        onClose={() => setShowUPIModal(false)}
        onConfirm={handleUPISuccess}
        amount={finalTotal}
      />
    </EnhancedModal>
  );
};

