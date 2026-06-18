import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchSubscriptionData,
  selectPaymentMethods,
  selectSubscriptionLoading,
} from '../../store/slices/subscriptionSlice';
import { openModal, closeModal, selectModalState } from '../../store/slices/uiSlice';
import { EnhancedModal, LoadingSkeleton, EmptyState } from '../../components/ui';
import { ArrowLeft, CreditCard, Plus, Trash2 } from 'lucide-react';
import { toast } from '../../utils/toast';
import subscriptionService from '../../services/subscriptionService';

const PaymentMethodManager: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const paymentMethods = useAppSelector(selectPaymentMethods);
  const loading = useAppSelector(selectSubscriptionLoading);

  useEffect(() => {
    dispatch(fetchSubscriptionData());
  }, [dispatch]);

  const handleAddPaymentMethod = () => {
    dispatch(openModal({ modalId: 'addPaymentMethod' }));
  };

  if (loading && paymentMethods.length === 0) {
    return (
      <div className="p-6">
        <LoadingSkeleton variant="card" count={2} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/subscription')}
            className="flex items-center gap-2 text-secondary-600 hover:text-secondary-900 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Subscription
          </button>
          <h1 className="text-3xl font-black text-secondary-900 tracking-tight">Payment Methods</h1>
          <p className="text-secondary-600 mt-1">Manage your payment methods</p>
        </div>
        <button
          onClick={handleAddPaymentMethod}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Update Payment Method
        </button>
      </div>

      {paymentMethods.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paymentMethods.map((method: any) => (
            <div key={method.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-secondary-100 rounded-xl">
                    <CreditCard className="w-6 h-6 text-secondary-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-secondary-900">
                        {method.type || 'Card'} •••• {method.last4 || '****'}
                      </p>
                      {method.isDefault && <span className="badge-success text-xs">Default</span>}
                    </div>
                    {method.expiryDate && (
                      <p className="text-sm text-secondary-600">Expires {method.expiryDate}</p>
                    )}
                  </div>
                </div>
                <button className="p-2 hover:bg-red-50 rounded-lg transition-colors group" disabled>
                  <Trash2 className="w-5 h-5 text-secondary-300" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CreditCard}
          title="No payment methods"
          description="Add a payment method to manage your subscription"
          action={{
            label: 'Update Payment Method',
            onClick: handleAddPaymentMethod,
            icon: Plus,
          }}
        />
      )}

      <AddPaymentMethodModal />
    </div>
  );
};

const AddPaymentMethodModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const modalState = useAppSelector(selectModalState('addPaymentMethod'));
  const [submitting, setSubmitting] = useState(false);

  const loadRazorpayScript = (): Promise<boolean> =>
    new Promise((resolve) => {
      const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existing) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handleTokenize = async () => {
    setSubmitting(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error('Razorpay SDK failed to load');
      }
      const order = await subscriptionService.createPaymentMethodUpdateOrder();
      await new Promise<void>((resolve, reject) => {
        const rz = new (window as any).Razorpay({
          key: order.keyId,
          amount: Number(order.amount) * 100,
          currency: order.currency,
          name: 'PayPoint',
          description: 'Update payment method',
          order_id: order.id,
          method: { card: true, upi: false, netbanking: false, wallet: false, emi: false },
          handler: async (response: any) => {
            try {
              await subscriptionService.updatePaymentMethod({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              resolve();
            } catch (e) {
              reject(e);
            }
          },
        });
        rz.on('payment.failed', () => reject(new Error('Payment declined')));
        rz.open();
      });

      toast.success('Payment method updated securely');
      await dispatch(fetchSubscriptionData()).unwrap();
      dispatch(closeModal('addPaymentMethod'));
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update payment method');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EnhancedModal
      isOpen={modalState.isOpen}
      onClose={() => !submitting && dispatch(closeModal('addPaymentMethod'))}
      title="Update Payment Method"
      size="medium"
      closeOnBackdrop={!submitting}
      closeOnEsc={!submitting}
    >
      <div className="space-y-4">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            Card details are entered in Razorpay checkout. Only a tokenized gateway reference is stored.
          </p>
        </div>
        <div className="flex gap-3 justify-end pt-4">
          <button
            type="button"
            onClick={() => dispatch(closeModal('addPaymentMethod'))}
            disabled={submitting}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleTokenize}
            className="btn-primary"
          >
            {submitting ? 'Processing...' : 'Continue'}
          </button>
        </div>
      </div>
    </EnhancedModal>
  );
};

export default PaymentMethodManager;
