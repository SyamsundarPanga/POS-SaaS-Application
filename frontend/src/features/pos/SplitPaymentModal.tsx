import React, { useState, useEffect } from 'react';
import { Wallet, CreditCard, Loader2 } from 'lucide-react';
import EnhancedModal from '../../components/ui/EnhancedModal';
import paymentService from '../../services/paymentService';
import splitPaymentService from '../../services/splitPaymentService';
import orderService from '../../services/orderService';
import shiftService from '../../services/shiftService';
import { CartItem } from './Cart';
import toast from '../../utils/toast';
import type { PaymentData } from './CheckoutModal';
import ConfirmModal from '../../components/ui/ConfirmModal';

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone: string;
}

interface SplitPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  customer: Customer | null;
  total: number;
  discountType?: 'PERCENTAGE' | 'FIXED';
  discountPercent?: number;
  discountAmount?: number;
  branchId?: number;
  ensureActiveShift?: () => Promise<boolean>;
  onComplete: (paymentData: PaymentData) => void;
}

const SplitPaymentModal: React.FC<SplitPaymentModalProps> = ({
  isOpen,
  onClose,
  items,
  customer,
  total,
  discountType,
  discountPercent = 0,
  discountAmount = 0,
  branchId,
  ensureActiveShift,
  onComplete,
}) => {
  const [cashAmount, setCashAmount] = useState<string>('0');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const isDirty = cashAmount !== '0';

  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };
  const roundMoney = (value: number) => Number(value.toFixed(2));

  useEffect(() => {
    if (isOpen) {
      setCashAmount('0');
      setError(null);
    }
  }, [isOpen]);

  const normalizedTotal = roundMoney(total);
  const cashPaid = roundMoney(parseFloat(cashAmount) || 0);
  const cardAmount = roundMoney(Math.max(0, normalizedTotal - cashPaid));
  const isValid = cashPaid >= 0 && cashPaid <= total;

  const triggerReceiptEmail = (orderId: number) => {
    const to = customer?.email?.trim();
    if (!to) return;

    void orderService
      .emailReceipt(orderId, to)
      .then(() => {
        toast.success('Receipt sent to customer email');
      })
      .catch((err: any) => {
        console.error('Failed to email receipt for split payment:', err);
        toast.warning('Split payment completed, but receipt email failed');
      });
  };

  // Debug logging
  useEffect(() => {
    console.log('Split Payment Debug:');
    console.log('- Order Total:', normalizedTotal);
    console.log('- Cash Amount:', cashPaid);
    console.log('- Card Amount:', cardAmount);
    console.log('- Sum:', cashPaid + cardAmount);
    console.log('- Match:', roundMoney(cashPaid + cardAmount) === normalizedTotal);
  }, [cashPaid, cardAmount, normalizedTotal]);

  const handleSubmit = async () => {
    if (!customer) {
      setError('Customer is required for split payment');
      return;
    }

    if (!isValid) {
      setError('Invalid cash amount');
      return;
    }

    if (cashPaid === 0 && cardAmount === 0) {
      setError('Please enter a payment amount');
      return;
    }

    // Ensure amounts sum exactly to total
    const roundedCash = roundMoney(cashPaid);
    const roundedCard = roundMoney(normalizedTotal - roundedCash);
    const sum = roundMoney(roundedCash + roundedCard);
    
    console.log('Payment Validation:');
    console.log('- Order Total:', normalizedTotal);
    console.log('- Rounded Cash:', roundedCash);
    console.log('- Rounded Card:', roundedCard);
    console.log('- Sum:', sum);
    console.log('- Difference:', Math.abs(sum - normalizedTotal));

    if (Math.abs(sum - normalizedTotal) > 0.01) {
      setError(`Payment amounts don't match order total. Difference: ₹${Math.abs(sum - total).toFixed(2)}`);
      return;
    }

    const hasActiveShift =
      typeof ensureActiveShift === 'function'
        ? await ensureActiveShift()
        : (await shiftService.getCurrentShift()) !== null;

    if (!hasActiveShift) {
      setError('Open shift is required to place split payment orders');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Prepare payments array with rounded amounts
      const payments: Array<{ method: 'CASH' | 'CARD'; amount: number; transactionId?: string }> = [];

      // If only cash payment (no card)
      if (roundedCard === 0 || roundedCard < 0.01) {
        payments.push({
          method: 'CASH',
          amount: normalizedTotal
        });

        const requestPayload = {
          customerId: customer.id,
          lineItems: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity
          })),
          payments: payments,
          discountType: discountType,
          discountPercent: discountPercent,
          discountAmount: discountAmount,
          branchId: branchId
        };

        console.log('Split payment request (cash only):', JSON.stringify(requestPayload, null, 2));

        const order = await splitPaymentService.createSplitPaymentOrder(requestPayload);
        triggerReceiptEmail(order.id);

                onComplete({
                  orderId: order.id,
                  orderNumber: order.orderNumber,
                  paymentMethod: 'CASH',
                  amountPaid: normalizedTotal,
                  change: 0,
                  pointsEarned: 1,
                  pointsRedeemed: 0,
                  payments: order.payments?.map((payment) => ({
                    method: payment.method,
                    amount: Number(payment.amount),
                    transactionId: payment.transactionId,
                  })),
                });
        onClose();
        setIsProcessing(false);
        return;
      }

      // If there's a card payment, process Razorpay first
      // Load Razorpay SDK
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);

      script.onload = async () => {
        try {
          // Create Razorpay order
          const razorpayOrder = await paymentService.createRazorpayOrder(roundedCard);

          // Open Razorpay checkout
          const options = {
            key: razorpayOrder.keyId,
            amount: razorpayOrder.amount * 100, // Convert to paise
            currency: razorpayOrder.currency,
            name: 'POS SaaS',
            description: 'Split Payment - Card',
            order_id: razorpayOrder.id,
            handler: async function (response: any) {
              try {
                const hasActiveShiftBeforeCreate =
                  typeof ensureActiveShift === 'function'
                    ? await ensureActiveShift()
                    : (await shiftService.getCurrentShift()) !== null;

                if (!hasActiveShiftBeforeCreate) {
                  const shiftError = 'Open shift is required to place split payment orders';
                  setError(shiftError);
                  toast.error(shiftError);
                  setIsProcessing(false);
                  return;
                }

                // Use rounded amounts that sum exactly to total
                const finalCash = roundedCash;
                const finalCard = roundedCard;

                // Add cash payment if any
                if (finalCash > 0.01) {
                  payments.push({
                    method: 'CASH',
                    amount: finalCash
                  });
                }

                // Add card payment with transaction ID
                payments.push({
                  method: 'CARD',
                  amount: finalCard,
                  transactionId: response.razorpay_payment_id
                });

                const requestPayload = {
                  customerId: customer.id,
                  lineItems: items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity
                  })),
                  payments: payments,
                  discountType: discountType,
                  discountPercent: discountPercent,
                  discountAmount: discountAmount,
                  branchId: branchId
                };

                console.log('Split payment request (with card):', JSON.stringify(requestPayload, null, 2));

                // Create split payment order
                const order = await splitPaymentService.createSplitPaymentOrder(requestPayload);
                triggerReceiptEmail(order.id);

                onComplete({
                  orderId: order.id,
                  orderNumber: order.orderNumber,
                  paymentMethod: 'SPLIT',
                  amountPaid: normalizedTotal,
                  change: 0,
                  pointsEarned: 1,
                  pointsRedeemed: 0,
                  payments: order.payments?.map((payment) => ({
                    method: payment.method,
                    amount: Number(payment.amount),
                    transactionId: payment.transactionId,
                  })),
                });
                onClose();
                setIsProcessing(false);
              } catch (err: any) {
                console.error('Order creation error:', err);
                console.error('Error response:', err.response?.data);
                const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to create order';
                setError(errorMsg);
                toast.error(errorMsg);
                setIsProcessing(false);
              }
            },
            prefill: {
              name: customer.name,
              email: customer.email || 'guest@example.com',
              contact: customer.phone
            },
            theme: {
              color: '#10b981'
            },
            modal: {
              ondismiss: function() {
                setIsProcessing(false);
                setError('Payment cancelled');
              }
            }
          };

          const razorpay = new (window as any).Razorpay(options);
          razorpay.open();
        } catch (err: any) {
          console.error('Razorpay error:', err);
          const msg = err.response?.data?.message || 'Failed to initialize payment';
          if (msg.includes('Amount exceeds maximum amount allowed')) {
            toast.error('The maximum limit for a single Razorpay payment is ₹5,00,000. Please reduce the amount or use an alternative payment method.');
          } else {
            setError(msg);
          }
          setIsProcessing(false);
        }
      };

      script.onerror = () => {
        setError('Failed to load payment gateway');
        setIsProcessing(false);
      };

    } catch (err: any) {
      console.error('Split payment error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to process split payment';
      if (errorMessage.includes('Amount exceeds maximum amount allowed')) {
        toast.error('The maximum limit for a single Razorpay payment is ₹5,00,000. Please reduce the amount or use an alternative payment method.');
      } else {
        setError(errorMessage);
        toast.error(errorMessage);
      }
      setIsProcessing(false);
    }
  };

  const quickAmounts = [10, 20, 50, 100, 200];

  if (!isOpen) return null;

  return (
    <EnhancedModal
      isOpen={isOpen}
      onClose={onClose}
      onCloseIconClick={handleCloseAttempt}
      title="Split Payment"
      size="small"
      hideScrollbar={true}
      className="max-w-sm"
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
          message="You have unsaved payment details. Are you sure you want to close this form?"
          confirmText="Yes, Close"
          cancelText="No, Keep Editing"
        />
        {/* Order Summary */}
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-600">Order Total:</span>
            <span className="text-2xl font-bold text-slate-900">₹{total.toFixed(2)}</span>
          </div>
          {customer && (
            <div className="text-sm text-slate-600">
              Customer: <span className="font-medium">{customer.name}</span>
            </div>
          )}
        </div>

        {/* Cash Payment Section */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <Wallet className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Cash Payment</h3>
              <p className="text-sm text-slate-600">Enter the cash amount received</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Cash Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={total}
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 text-xl border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex gap-2">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setCashAmount(amount.toString())}
                  disabled={amount > total}
                  className="flex-1 px-3 py-2 border rounded-lg hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ₹{amount}
                </button>
              ))}
            </div>

            {/* Full Amount Button */}
            <button
              onClick={() => setCashAmount(total.toString())}
              className="w-full px-4 py-2 border-2 border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors text-sm font-medium"
            >
              Pay Full Amount in Cash (₹{total.toFixed(2)})
            </button>
          </div>
        </div>

        {/* Card Payment Section */}
        {cardAmount > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-900">Card Payment (Razorpay)</h3>
                <p className="text-sm text-blue-700">Remaining amount will be paid via Razorpay</p>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Card Amount:</span>
                <span className="text-2xl font-bold text-blue-600">₹{cardAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Summary */}
        <div className="bg-slate-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-slate-600">
            <span>Cash:</span>
            <span className="font-bold">₹{cashPaid.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Card (Razorpay):</span>
            <span className="font-bold">₹{cardAmount.toFixed(2)}</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span className={cashPaid + cardAmount === total ? 'text-emerald-600' : 'text-red-600'}>
              ₹{(cashPaid + cardAmount).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleCloseAttempt}
            disabled={isProcessing}
            className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isProcessing || !isValid || !customer}
            className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Payment Now</span>
            )}
          </button>
        </div>
      </div>
    </EnhancedModal>
  );
};

export default SplitPaymentModal;
