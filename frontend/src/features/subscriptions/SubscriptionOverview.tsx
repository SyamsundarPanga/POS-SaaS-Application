import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchSubscriptionData,
  selectCurrentPlan,
  selectUsageMetrics,
  selectSubscriptionLoading,
  selectSubscriptionError,
} from '../../store/slices/subscriptionSlice';
import { LoadingSkeleton } from '../../components/ui';
import { ArrowUpCircle, Calendar, CheckCircle, CreditCard } from 'lucide-react';
import { toast } from '../../utils/toast';
import UsageMetrics from './UsageMetrics';
import {
  formatMonthlyPlanPrice,
  getPlanDisplayName,
  getPlanSubtitle,
} from '../../utils/subscriptionPlans';

const SubscriptionOverview: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const currentPlan = useAppSelector(selectCurrentPlan);
  const usageMetrics = useAppSelector(selectUsageMetrics);
  const loading = useAppSelector(selectSubscriptionLoading);
  const error = useAppSelector(selectSubscriptionError);

  useEffect(() => {
    dispatch(fetchSubscriptionData());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  if (loading && !currentPlan) {
    return (
      <div className="p-6">
        <LoadingSkeleton variant="card" count={2} />
      </div>
    );
  }

  if (!currentPlan) {
    return (
      <div className="p-6">
        <div className="card text-center">
          <p className="text-secondary-600">No active subscription found</p>
        </div>
      </div>
    );
  }

  const displayName = getPlanDisplayName(currentPlan.name);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-secondary-900 tracking-tight">
            Subscription
          </h1>
          <p className="text-secondary-600 mt-1">
            Manage your subscription plan and billing
          </p>
        </div>
        <button
          onClick={() => navigate('/subscription/upgrade')}
          className="btn-primary flex items-center gap-2"
        >
          <ArrowUpCircle className="w-5 h-5" />
          Upgrade Plan
        </button>
      </div>

      <div className="card">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-secondary-900">
                {displayName} Plan
              </h2>
              <span className="badge bg-primary-100 text-primary-700">
                Current Plan
              </span>
            </div>
            <p className="text-sm text-secondary-600 mb-3">
              {getPlanSubtitle(currentPlan.name)}
            </p>
            <p className="text-3xl font-black text-primary-500">
              {formatMonthlyPlanPrice(currentPlan.price)}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-secondary-600 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Next billing date</span>
            </div>
            <p className="text-lg font-semibold text-secondary-900">
              {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        <div className="border-t border-secondary-200 pt-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-secondary-700 mb-4">
            Plan Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentPlan.features.includedFeatures.map((feature) => (
              <div key={feature} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <p className="font-medium text-secondary-900">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {usageMetrics && <UsageMetrics metrics={usageMetrics} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/subscription/billing')}
          className="card-hover flex items-center gap-4 p-6 text-left"
        >
          <div className="p-3 bg-primary-100 rounded-xl">
            <CreditCard className="w-6 h-6 text-primary-500" />
          </div>
          <div>
            <h3 className="font-semibold text-secondary-900 mb-1">
              Billing History
            </h3>
            <p className="text-sm text-secondary-600">
              View invoices and payment history
            </p>
          </div>
        </button>

        <button
          onClick={() => navigate('/subscription/payment-methods')}
          className="card-hover flex items-center gap-4 p-6 text-left"
        >
          <div className="p-3 bg-blue-100 rounded-xl">
            <CreditCard className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold text-secondary-900 mb-1">
              Payment Methods
            </h3>
            <p className="text-sm text-secondary-600">
              Manage your payment methods
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};

export default SubscriptionOverview;
