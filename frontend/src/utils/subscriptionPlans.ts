import type { SubscriptionPlanType } from '../services/subscriptionService';

export interface PlanLimits {
  maxBranches: number;
  maxUsers: number;
  maxProducts: number;
}

export const PLAN_ORDER: Record<SubscriptionPlanType, number> = {
  BASIC: 1,
  PRO: 2,
  ADVANCE: 3,
};

export const DEFAULT_PLAN_LIMITS: Record<SubscriptionPlanType, PlanLimits> = {
  BASIC: {
    maxBranches: 10,
    maxUsers: 50,
    maxProducts: 1000,
  },
  PRO: {
    maxBranches: 100,
    maxUsers: 500,
    maxProducts: 9000,
  },
  ADVANCE: {
    maxBranches: 400,
    maxUsers: 5000,
    maxProducts: 50000,
  },
};

const PLAN_SUBTITLES: Record<SubscriptionPlanType, string> = {
  BASIC: 'Essential control for single-brand growth',
  PRO: 'Built for regional operations and scaling teams',
  ADVANCE: 'Enterprise tooling for large retail networks',
};

const PLAN_DISPLAY_NAMES: Record<SubscriptionPlanType, string> = {
  BASIC: 'Basic',
  PRO: 'Pro',
  ADVANCE: 'Advance',
};

export const getPlanDisplayName = (planType: SubscriptionPlanType): string =>
  PLAN_DISPLAY_NAMES[planType];

export const getPlanSubtitle = (planType: SubscriptionPlanType): string =>
  PLAN_SUBTITLES[planType];

export const formatPlanPrice = (amount: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

export const formatMonthlyPlanPrice = (amount: number): string =>
  `${formatPlanPrice(amount)}/month`;

export const getPlanFeatures = (
  planType: SubscriptionPlanType,
  limits: PlanLimits = DEFAULT_PLAN_LIMITS[planType],
): string[] => {
  const limitFeatures = [
    `Up to ${limits.maxBranches.toLocaleString()} branches`,
    `Up to ${limits.maxUsers.toLocaleString()} users/employees`,
    `Up to ${limits.maxProducts.toLocaleString()} products`,
  ];

  switch (planType) {
    case 'BASIC':
      return [
        ...limitFeatures,
        'Standard API access',
        'Advanced reporting',
        'Email support',
      ];
    case 'PRO':
      return [
        ...limitFeatures,
        'Shift management features',
        'Priority API access',
        'Phone support',
        'Custom integrations',
      ];
    case 'ADVANCE':
      return [
        ...limitFeatures,
        'Unlimited API access',
        'White-label options',
        'Dedicated account manager',
        '24/7 premium support',
      ];
    default:
      return limitFeatures;
  }
};

export const canUpgradePlan = (
  currentPlan: SubscriptionPlanType | null | undefined,
  targetPlan: SubscriptionPlanType,
): boolean => {
  if (!currentPlan) return true;
  return PLAN_ORDER[targetPlan] > PLAN_ORDER[currentPlan];
};
