import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { upgradePlan } from '../../store/slices/subscriptionSlice';
import { closeModal, selectModalState } from '../../store/slices/uiSlice';
import EnhancedModal from '../../components/ui/EnhancedModal';
import { Check, TrendingUp } from 'lucide-react';
import toast from '../../utils/toast';
import { formatMonthlyPlanPrice, getPlanDisplayName } from '../../utils/subscriptionPlans';

const PlanChangeModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const modalState = useAppSelector(selectModalState('planChange'));
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const { plan: newPlan, currentPlan } = modalState.data || {};

  if (!newPlan || !currentPlan) return null;

  const priceDifference = Math.max(0, newPlan.price - currentPlan.price);
  const newlyIncludedFeatures = newPlan.features.includedFeatures.filter(
    (feature: string) => !currentPlan.features.includedFeatures.includes(feature),
  );

  const handleConfirm = async () => {
    if (!acceptTerms) {
      toast.warning('Please accept the terms to continue');
      return;
    }

    setLoading(true);
    try {
      await dispatch(upgradePlan(String(newPlan.id))).unwrap();
      toast.success('Upgrade checkout started successfully');
      dispatch(closeModal('planChange'));
      navigate('/settings');
    } catch (error: any) {
      toast.error(error || 'Failed to change plan');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      dispatch(closeModal('planChange'));
      setAcceptTerms(false);
    }
  };

  return (
    <EnhancedModal
      isOpen={modalState.isOpen}
      onClose={handleClose}
      title="Upgrade Plan"
      size="large"
      closeOnBackdrop={!loading}
      closeOnEsc={!loading}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-secondary-50 rounded-xl border border-secondary-200">
            <p className="text-xs font-bold uppercase tracking-widest text-secondary-600 mb-2">
              Current Plan
            </p>
            <h3 className="text-2xl font-bold text-secondary-900 mb-1">
              {getPlanDisplayName(currentPlan.name)}
            </h3>
            <p className="text-3xl font-black text-secondary-700">
              {formatMonthlyPlanPrice(currentPlan.price)}
            </p>
          </div>

          <div className="p-4 bg-primary-50 rounded-xl border-2 border-primary-500">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-bold uppercase tracking-widest text-primary-700">
                New Plan
              </p>
              <TrendingUp className="w-4 h-4 text-primary-500" />
            </div>
            <h3 className="text-2xl font-bold text-secondary-900 mb-1">
              {getPlanDisplayName(newPlan.name)}
            </h3>
            <p className="text-3xl font-black text-primary-600">
              {formatMonthlyPlanPrice(newPlan.price)}
            </p>
          </div>
        </div>

        <div className="p-4 bg-secondary-50 rounded-xl">
          <h4 className="font-semibold text-secondary-900 mb-3">Upgrade Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-secondary-600">New monthly price</span>
              <span className="font-medium text-secondary-900">
                {formatMonthlyPlanPrice(newPlan.price)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary-600">Increase over current plan</span>
              <span className="font-medium text-secondary-900">
                {formatMonthlyPlanPrice(priceDifference)}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-secondary-900 mb-3">Added Features</h4>
          <div className="space-y-2">
            {newlyIncludedFeatures.map((feature: string) => (
              <div
                key={feature}
                className="flex items-center justify-between p-3 rounded-lg bg-primary-50"
              >
                <span className="text-sm font-medium text-secondary-900">
                  {feature}
                </span>
                <span className="text-sm font-semibold text-primary-600">
                  Included
                </span>
              </div>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-1 w-4 h-4 text-primary-500 border-secondary-300 rounded focus:ring-2 focus:ring-primary-500"
          />
          <span className="text-sm text-secondary-700">
            I understand and accept the{' '}
            <a href="/terms" className="text-primary-500 hover:text-primary-600 underline">
              terms and conditions
            </a>{' '}
            for this upgrade. The new billing amount will apply after checkout.
          </span>
        </label>
      </div>

      <div className="flex gap-3 justify-end mt-6">
        <button
          onClick={handleClose}
          disabled={loading}
          className="btn-secondary"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={!acceptTerms || loading}
          className="btn-primary flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Confirm Upgrade
            </>
          )}
        </button>
      </div>
    </EnhancedModal>
  );
};

export default PlanChangeModal;
