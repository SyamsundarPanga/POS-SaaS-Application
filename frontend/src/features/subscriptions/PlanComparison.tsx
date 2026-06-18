import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchSubscriptionData,
  selectCurrentPlan,
  selectAvailablePlans,
  selectSubscriptionLoading,
} from '../../store/slices/subscriptionSlice';
import { openModal } from '../../store/slices/uiSlice';
import { LoadingSkeleton } from '../../components/ui';
import { ArrowLeft, Check, Zap } from 'lucide-react';
import PlanChangeModal from './PlanChangeModal';
import {
  canUpgradePlan,
  formatMonthlyPlanPrice,
  getPlanDisplayName,
  getPlanFeatures,
  getPlanSubtitle,
} from '../../utils/subscriptionPlans';

const PlanComparison: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const currentPlan = useAppSelector(selectCurrentPlan);
  const availablePlans = useAppSelector(selectAvailablePlans);
  const loading = useAppSelector(selectSubscriptionLoading);

  useEffect(() => {
    dispatch(fetchSubscriptionData());
  }, [dispatch]);

  const plans = availablePlans.length > 0 ? availablePlans : [
    {
      id: 'BASIC',
      name: 'BASIC' as const,
      price: 1299,
      billingCycle: 'MONTHLY' as const,
      features: {
        maxBranches: 10,
        maxUsers: 50,
        maxProducts: 1000,
        includedFeatures: getPlanFeatures('BASIC'),
      },
    },
    {
      id: 'PRO',
      name: 'PRO' as const,
      price: 2999,
      billingCycle: 'MONTHLY' as const,
      features: {
        maxBranches: 100,
        maxUsers: 500,
        maxProducts: 9000,
        includedFeatures: getPlanFeatures('PRO'),
      },
    },
    {
      id: 'ADVANCE',
      name: 'ADVANCE' as const,
      price: 4999,
      billingCycle: 'MONTHLY' as const,
      features: {
        maxBranches: 400,
        maxUsers: 5000,
        maxProducts: 50000,
        includedFeatures: getPlanFeatures('ADVANCE'),
      },
    },
  ];

  const handleSelectPlan = (planId: string) => {
    const selectedPlan = plans.find((plan) => plan.id === planId);
    if (!selectedPlan) return;

    dispatch(openModal({
      modalId: 'planChange',
      data: { plan: selectedPlan, currentPlan },
    }));
  };

  if (loading && availablePlans.length === 0) {
    return (
      <div className="p-6">
        <LoadingSkeleton variant="card" count={3} />
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
          <h1 className="text-3xl font-black text-secondary-900 tracking-tight">
            Choose Your Plan
          </h1>
          <p className="text-secondary-600 mt-1">
            Upgrade to a higher tier whenever your business needs more capacity.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = currentPlan?.name === plan.name;
          const upgradeAvailable = canUpgradePlan(currentPlan?.name, plan.name);

          return (
            <div
              key={plan.id}
              className={`relative card ${plan.name === 'PRO' ? 'ring-2 ring-primary-500' : ''} ${
                isCurrent ? 'ring-2 ring-primary-500' : ''
              }`}
            >
              {plan.name === 'PRO' && !isCurrent && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-primary-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Most Popular
                  </div>
                </div>
              )}

              {isCurrent && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-primary-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                    Current Plan
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-secondary-900 mb-2">
                  {getPlanDisplayName(plan.name)}
                </h3>
                <p className="text-sm text-secondary-600 mb-4">
                  {getPlanSubtitle(plan.name)}
                </p>
                <div className="mb-4">
                  <span className="text-5xl font-black text-secondary-900">
                    {formatMonthlyPlanPrice(plan.price)}
                  </span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {plan.features.includedFeatures.map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-primary-500 flex-shrink-0" />
                    <span className="text-sm text-secondary-700">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={isCurrent || !upgradeAvailable}
                className={`w-full py-3 rounded-xl font-medium transition-all ${
                  isCurrent
                    ? 'bg-secondary-200 text-secondary-600 cursor-not-allowed'
                    : upgradeAvailable
                    ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-sm hover:shadow-md'
                    : 'bg-secondary-200 text-secondary-500 cursor-not-allowed'
                }`}
              >
                {isCurrent ? 'Current Plan' : upgradeAvailable ? 'Upgrade' : 'Unavailable'}
              </button>
            </div>
          );
        })}
      </div>

      <PlanChangeModal />
    </div>
  );
};

export default PlanComparison;
