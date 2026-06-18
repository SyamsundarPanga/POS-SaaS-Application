import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import DashboardHeader from '../../components/layout/Header';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, CreditCard, LayoutGrid, ShieldCheck, Bell, Download } from 'lucide-react';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectNotificationPreferences,
  updatePreferences,
} from '../../store/slices/notificationSlice';
import PlanCard from '../../components/settings/PlanCard';
import {
  fetchSubscriptionData,
  selectAvailablePlans,
  selectCurrentPlan,
  selectSubscriptionLoading,
  upgradePlan,
} from '../../store/slices/subscriptionSlice';
import subscriptionService, {
  SubscriptionPlanType,
  SubscriptionStatusResponse,
  SubscriptionUsageResponse,
  SubscriptionPaymentHistoryItem,
} from '../../services/subscriptionService';
import userService from '../../services/userService';
import toast from '../../utils/toast';
import {
  canUpgradePlan,
  DEFAULT_PLAN_LIMITS,
  formatMonthlyPlanPrice,
  formatPlanPrice,
  getPlanFeatures,
  getPlanSubtitle,
} from '../../utils/subscriptionPlans';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  },
} as const;

const SettingsPage: React.FC = () => {
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  const dispatch = useAppDispatch();
  const preferences = useAppSelector(selectNotificationPreferences);
  const availablePlans = useAppSelector(selectAvailablePlans);
  const currentPlan = useAppSelector(selectCurrentPlan);
  const subscriptionLoading = useAppSelector(selectSubscriptionLoading);
  const authUser = useAppSelector((state) => state.auth.user);
  const [storeName, setStoreName] = useState('N/A');
  const [businessEmail, setBusinessEmail] = useState('N/A');
  const [usageSummary, setUsageSummary] = useState<SubscriptionUsageResponse | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<SubscriptionPaymentHistoryItem[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatusResponse | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [subscriptionActionLoading, setSubscriptionActionLoading] = useState<'cancel' | 'reactivate' | null>(null);
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'reactivate' | null>(null);

  const updateStoredAccessMode = (accessMode: 'FULL_ACCESS' | 'BILLING_ONLY' | 'NO_ACCESS', subscriptionStatus?: string) => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;

    try {
      const userData = JSON.parse(userStr);
      localStorage.setItem('user', JSON.stringify({
        ...userData,
        accessMode,
        ...(subscriptionStatus ? { subscriptionStatus } : {}),
      }));
    } catch {
      // Ignore storage parse issues; the next login will refresh session state.
    }
  };

  useEffect(() => {
    dispatch(fetchSubscriptionData());
  }, [dispatch]);

  useEffect(() => {
    const loadSettingsData = async () => {
      try {
        setBillingLoading(true);
        const [profileRes, usageRes, paymentRes] = await Promise.all([
          userService.getProfile().catch(() => null),
          subscriptionService.getUsageStatistics().catch(() => null),
          subscriptionService.getPaymentHistory().catch(() => []),
        ]);
        const statusRes = await subscriptionService.getSubscriptionStatus().catch(() => null);

        const resolvedStoreName = authUser?.storeName || 'N/A';
        const resolvedEmail = profileRes?.data?.email || authUser?.email || 'N/A';
        setStoreName(resolvedStoreName);
        setBusinessEmail(resolvedEmail);
        setUsageSummary(usageRes);
        setPaymentHistory(paymentRes || []);
        setSubscriptionStatus(statusRes);
      } catch (_error) {
        toast.error('Failed to load settings data');
      } finally {
        setBillingLoading(false);
      }
    };

    loadSettingsData();
  }, [authUser?.email, authUser?.storeName]);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
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
  };

  const runUpgradeCheckout = async (targetPlan: SubscriptionPlanType) => {
    const order = await dispatch(upgradePlan(targetPlan)).unwrap();
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      throw new Error('Razorpay SDK failed to load');
    }

    await new Promise<void>((resolve, reject) => {
      const rz = new (window as any).Razorpay({
        key: order.keyId,
        amount: Number(order.amount) * 100,
        currency: order.currency,
        name: 'PayPoint',
        description: `Upgrade to ${targetPlan}`,
        order_id: order.id,
        handler: async (response: any) => {
          try {
            await subscriptionService.verifySubscriptionPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              plan: targetPlan,
              billingCycle: 'MONTHLY',
            });
            resolve();
          } catch (e) {
            reject(e);
          }
        },
      });
      rz.on('payment.failed', () => reject(new Error('Payment failed or cancelled')));
      rz.open();
    });
  };

  const runSubscriptionCheckout = async (targetPlan: SubscriptionPlanType, description: string) => {
    const order = await subscriptionService.createSubscriptionOrder(targetPlan, 'MONTHLY');
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      throw new Error('Razorpay SDK failed to load');
    }

    await new Promise<void>((resolve, reject) => {
      const rz = new (window as any).Razorpay({
        key: order.keyId,
        amount: Number(order.amount) * 100,
        currency: order.currency,
        name: 'PayPoint',
        description,
        order_id: order.id,
        handler: async (response: any) => {
          try {
            await subscriptionService.verifySubscriptionPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              plan: targetPlan,
              billingCycle: 'MONTHLY',
            });
            resolve();
          } catch (e) {
            reject(e);
          }
        },
      });
      rz.on('payment.failed', () => reject(new Error('Payment failed or cancelled')));
      rz.open();
    });
  };

  const handlePlanAction = async (targetPlan: SubscriptionPlanType) => {
    if (!currentPlan) {
      toast.error('Current subscription not loaded yet');
      return;
    }

    const current = currentPlan.name as SubscriptionPlanType;
    if (current === targetPlan || !canUpgradePlan(current, targetPlan)) return;

    setProcessingPlan(targetPlan);
    try {
      await runUpgradeCheckout(targetPlan);
      toast.success('Plan upgraded successfully');
      await dispatch(fetchSubscriptionData()).unwrap();
    } catch (error: any) {
      toast.error(error?.message || error || 'Plan operation failed');
    } finally {
      setProcessingPlan(null);
    }
  };

  const getPlanButtonLabel = (targetPlan: SubscriptionPlanType) => {
    if (!currentPlan) return 'Processing...';
    const current = currentPlan.name as SubscriptionPlanType;
    if (current === targetPlan) return 'Current Plan';
    return canUpgradePlan(current, targetPlan) ? 'Upgrade Plan' : 'Unavailable';
  };

  const isPlanActionDisabled = (targetPlan: SubscriptionPlanType) => {
    if (!currentPlan) return true;
    if (subscriptionLoading || processingPlan !== null) return true;
    const current = currentPlan.name as SubscriptionPlanType;
    return current === targetPlan || !canUpgradePlan(current, targetPlan);
  };

  const formatDateTime = (value?: string) => {
    if (!value) return 'N/A';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString();
  };

  const refreshSubscriptionStatus = async () => {
    const status = await subscriptionService.getSubscriptionStatus().catch(() => null);
    setSubscriptionStatus(status);
  };

  const executeCancelSubscription = async () => {
    setSubscriptionActionLoading('cancel');
    try {
      const message = await subscriptionService.cancelSubscription();
      toast.success(typeof message === 'string' ? message : 'Cancellation scheduled successfully');
      await refreshSubscriptionStatus();
      await dispatch(fetchSubscriptionData()).unwrap();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to schedule cancellation');
    } finally {
      setSubscriptionActionLoading(null);
      setConfirmAction(null);
    }
  };

  const executeReactivateSubscription = async () => {
    setSubscriptionActionLoading('reactivate');
    try {
      if (subscriptionStatus?.status === 'CANCELLED') {
        const targetPlan = currentPlan?.name as SubscriptionPlanType | undefined;
        if (!targetPlan) {
          throw new Error('Current subscription plan not available for reactivation');
        }

        await runSubscriptionCheckout(targetPlan, `Reactivate ${targetPlan}`);
        updateStoredAccessMode('FULL_ACCESS', 'ACTIVE');
        toast.success('Subscription reactivated successfully');
      } else {
        const message = await subscriptionService.reactivateSubscription();
        toast.success(typeof message === 'string' ? message : 'Subscription reactivated successfully');
      }

      await refreshSubscriptionStatus();
      await dispatch(fetchSubscriptionData()).unwrap();

      if (subscriptionStatus?.status === 'CANCELLED') {
        window.location.href = '/dashboard';
        return;
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to reactivate subscription');
    } finally {
      setSubscriptionActionLoading(null);
      setConfirmAction(null);
    }
  };

  const canDownloadInvoice = (payment: SubscriptionPaymentHistoryItem): boolean =>
    payment.paymentStatus === 'SUCCESS';

  const resolvedPlans = (['BASIC', 'PRO', 'ADVANCE'] as SubscriptionPlanType[]).map((planType) => {
    const apiPlan = availablePlans.find((plan) => plan.name === planType);
    const fallbackLimits = DEFAULT_PLAN_LIMITS[planType];
    const limits = apiPlan
      ? {
          maxBranches: apiPlan.features.maxBranches,
          maxUsers: apiPlan.features.maxUsers,
          maxProducts: apiPlan.features.maxProducts,
        }
      : fallbackLimits;
    const fallbackPrice = planType === 'BASIC' ? 1299 : planType === 'PRO' ? 2999 : 4999;

    return {
      type: planType,
      price: apiPlan?.price ?? fallbackPrice,
      subtitle: getPlanSubtitle(planType),
      features: getPlanFeatures(planType, limits),
    };
  });

  const isCancelScheduled = Boolean(subscriptionStatus?.cancelAtPeriodEnd);
  const isCancelled = subscriptionStatus?.status === 'CANCELLED';
  const retentionActive = Boolean(
    subscriptionStatus?.dataRetentionUntil &&
    new Date(subscriptionStatus.dataRetentionUntil).getTime() > Date.now(),
  );
  const showReactivate = isCancelScheduled || (isCancelled && retentionActive);
  const canCancelNow =
    !isCancelScheduled &&
    ['ACTIVE', 'GRACE_PERIOD', 'PAST_DUE'].includes(subscriptionStatus?.status || '');

  const handleInvoiceDownload = async (payment: SubscriptionPaymentHistoryItem) => {
    if (!canDownloadInvoice(payment)) return;
    try {
      const blob = await subscriptionService.downloadInvoice(payment.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `subscription-invoice-${payment.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to download invoice');
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden text-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <DashboardHeader />

        <main className="flex-1 overflow-y-auto p-8 space-y-16">
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-16">
            <motion.section variants={itemVariants}>
              <div className="mb-10">
                <h1 className="text-4xl font-black tracking-tight text-slate-900">Settings</h1>
                <p className="text-slate-500 font-medium">
                  Manage your workspace and subscription preferences.
                </p>
              </div>

              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <SettingsIcon size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">General Settings</h2>
                  <p className="text-sm text-slate-500 font-medium">Basic information about your store.</p>
                </div>
              </div>

              <div className="flex flex-col gap-12 items-start w-full">
                <div className="space-y-6 w-full">
                  <h3 className="font-black text-lg text-slate-400 uppercase tracking-widest">Store Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <StaticInput label="Company Name" value={storeName} />
                    <StaticInput label="Business Email" value={businessEmail} />
                  </div>
                </div>

                <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl w-full">
                  <ShieldCheck className="text-emerald-400 mb-4" />
                  <h4 className="font-black text-lg mb-6 tracking-tight">Usage Summary</h4>
                  <div className="space-y-6">
                    <UsageProgress label="Branches" current={usageSummary?.currentBranches || 0} max={usageSummary?.maxBranches || 0} />
                    <UsageProgress label="Users" current={usageSummary?.currentUsers || 0} max={usageSummary?.maxUsers || 0} />
                    <UsageProgress label="Products" current={usageSummary?.currentProducts || 0} max={usageSummary?.maxProducts || 0} />
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section variants={itemVariants}>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <LayoutGrid size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Subscription Plans</h2>
                  <p className="text-sm text-slate-500 font-medium">Upgrade your service level as your business grows.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {resolvedPlans.map((plan) => (
                  <PlanCard
                    key={plan.type}
                    type={plan.type}
                    price={plan.price}
                    subtitle={plan.subtitle}
                    priceLabel={formatMonthlyPlanPrice(plan.price)}
                    isCurrent={currentPlan?.name === plan.type}
                    features={plan.features}
                    actionLabel={getPlanButtonLabel(plan.type)}
                    onAction={() => handlePlanAction(plan.type)}
                    disabled={isPlanActionDisabled(plan.type)}
                  />
                ))}
              </div>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Subscription Lifecycle</h3>
                    <p className="text-sm text-slate-700 mt-2">
                      Status: <span className="font-black">{subscriptionStatus?.status || 'N/A'}</span>
                    </p>
                    {isCancelScheduled && (
                      <p className="text-sm text-amber-700 mt-1">
                        Cancellation scheduled for: <span className="font-bold">{formatDateTime(subscriptionStatus?.cancelledAt || subscriptionStatus?.nextBillingDate)}</span>
                      </p>
                    )}
                    {isCancelled && (
                      <p className="text-sm text-slate-700 mt-1">
                        Data retained until: <span className="font-bold">{formatDateTime(subscriptionStatus?.dataRetentionUntil)}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {canCancelNow && (
                      <button
                        onClick={() => setConfirmAction('cancel')}
                        disabled={subscriptionActionLoading !== null}
                        className="px-4 py-2 text-sm font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      >
                        {subscriptionActionLoading === 'cancel' ? 'Scheduling...' : 'Cancel Plan'}
                      </button>
                    )}
                    {showReactivate && (
                      <button
                        onClick={() => setConfirmAction('reactivate')}
                        disabled={subscriptionActionLoading !== null}
                        className="px-4 py-2 text-sm font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      >
                        {subscriptionActionLoading === 'reactivate' ? 'Reactivating...' : 'Reactivate'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section variants={itemVariants}>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Billing History</h2>
                  <p className="text-sm text-slate-500 font-medium">Review your past subscription payments.</p>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                {billingLoading ? (
                  <p className="text-sm text-slate-500 italic">Accessing payment history...</p>
                ) : paymentHistory.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-slate-400 font-medium">No subscription payments found yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                          <th className="py-4 pr-4">Date</th>
                          <th className="py-4 pr-4">Plan</th>
                          <th className="py-4 pr-4 text-center">Billing</th>
                          <th className="py-4 pr-4 text-center">Amount</th>
                          <th className="py-4 pr-4 text-center">Status</th>
                          <th className="py-4 pr-4 text-right">Invoice</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {paymentHistory.map((payment) => (
                          <tr key={payment.id} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 pr-4 font-bold text-slate-900">{new Date(payment.createdAt).toLocaleDateString()}</td>
                            <td className="py-4 pr-4 font-black">
                              <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 uppercase text-[10px]">
                                {payment.subscriptionPlan}
                              </span>
                            </td>
                            <td className="py-4 pr-4 text-center text-slate-500 font-medium">{payment.billingCycle}</td>
                            <td className="py-4 pr-4 text-center font-black text-slate-900">{formatPlanPrice(Number(payment.amount || 0))}</td>
                            <td className="py-4 pr-4 text-center">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${payment.paymentStatus === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                }`}>
                                {payment.paymentStatus}
                              </span>
                            </td>
                            <td className="py-4 pr-4 text-right">
                              {canDownloadInvoice(payment) ? (
                                <button
                                  onClick={() => handleInvoiceDownload(payment)}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-black transition-all active:scale-95 shadow-sm"
                                >
                                  <Download size={14} />
                                  PDF
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400 font-medium">N/A</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.section>

            <motion.section className="pb-20" variants={itemVariants}>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <Bell size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Notifications</h2>
                  <p className="text-sm text-slate-500 font-medium">Manage how you receive alerts and updates.</p>
                </div>
              </div>

              <div className="w-full">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="space-y-8">
                    <NotificationToggle
                      title="Low Stock Alerts"
                      description="Get notified when a product's stock level falls below its threshold."
                      enabled={preferences.lowStockAlerts}
                      onChange={(val: boolean) => dispatch(updatePreferences({ ...preferences, lowStockAlerts: val }))}
                    />
                    <NotificationToggle
                      title="Payment Events"
                      description="Receive alerts for failed payments and successful transactions."
                      enabled={preferences.paymentAlerts}
                      onChange={(val: boolean) => dispatch(updatePreferences({ ...preferences, paymentAlerts: val }))}
                    />
                    <NotificationToggle
                      title="Subscription & Limits"
                      description="Get notified when you approach your plan limits or when a plan changes."
                      enabled={preferences.subscriptionAlerts}
                      onChange={(val: boolean) => dispatch(updatePreferences({ ...preferences, subscriptionAlerts: val }))}
                    />
                    <div className="h-px bg-slate-100 my-4" />
                    <NotificationToggle
                      title="Email Notifications"
                      description="Receive a copy of important alerts in your inbox."
                      enabled={preferences.emailNotifications}
                      onChange={(val: boolean) => dispatch(updatePreferences({ ...preferences, emailNotifications: val }))}
                    />
                  </div>
                </div>
              </div>
            </motion.section>
          </motion.div>
        </main>
      </div>

      <ConfirmModal
        isOpen={confirmAction === 'cancel'}
        onClose={() => setConfirmAction(null)}
        onConfirm={executeCancelSubscription}
        title="Cancel Subscription"
        message="Your plan will be cancelled at the end of the current billing cycle. Access remains active until then."
        confirmText="Schedule Cancellation"
        cancelText="Keep Plan"
        variant="danger"
        loading={subscriptionActionLoading === 'cancel'}
      />

      <ConfirmModal
        isOpen={confirmAction === 'reactivate'}
        onClose={() => setConfirmAction(null)}
        onConfirm={executeReactivateSubscription}
        title="Reactivate Subscription"
        message={subscriptionStatus?.status === 'CANCELLED'
          ? 'Reactivation will start a new paid checkout for your current plan before access is restored.'
          : 'Reactivate now and continue with your current store data.'}
        confirmText={subscriptionStatus?.status === 'CANCELLED' ? 'Pay & Reactivate' : 'Reactivate'}
        cancelText="Not Now"
        variant="info"
        loading={subscriptionActionLoading === 'reactivate'}
      />
    </div>
  );
};

const StaticInput = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</label>
    <input disabled value={value} className="px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 cursor-not-allowed w-full shadow-sm" />
  </div>
);

const UsageProgress = ({ label, current, max }: { label: string; current: number; max: number }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-300">
      <span>{label}</span>
      <span className="text-white font-bold">{current} / {max}</span>
    </div>
    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
      <div
        className="h-full bg-emerald-500 transition-all duration-1000 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
        style={{ width: `${max > 0 ? Math.min((current / max) * 100, 100) : 0}%` }}
      />
    </div>
  </div>
);

const NotificationToggle = ({ title, description, enabled, onChange }: { title: string; description: string; enabled: boolean; onChange: (val: boolean) => void }) => (
  <div className="flex items-center justify-between py-2 group">
    <div className="flex-1 pr-10">
      <h4 className="text-sm font-black text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">{title}</h4>
      <p className="text-xs text-slate-500 leading-relaxed font-medium">{description}</p>
    </div>
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-emerald-500 shadow-inner' : 'bg-slate-200'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
);

export default SettingsPage;
