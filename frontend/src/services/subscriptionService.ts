import api from './api';

export type SubscriptionPlanType = 'BASIC' | 'PRO' | 'ADVANCE';
export type BillingCycle = 'MONTHLY' | 'YEARLY';

export interface SubscriptionPlanResponse {
  id: string;
  planType: SubscriptionPlanType;
  maxBranches: number;
  maxUsers: number;
  maxProducts: number;
  monthlyPrice: number;
  paymentStatus?: 'SUCCESS' | 'PENDING' | 'FAILED';
}

export interface SubscriptionOrderResponse {
  id: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface SubscriptionStatusResponse {
  status: 'PENDING_PAYMENT' | 'ACTIVE' | 'PAST_DUE' | 'EXPIRED' | 'CANCELLED' | 'GRACE_PERIOD';
  nextBillingDate?: string;
  gracePeriodEndDate?: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string;
  dataRetentionUntil?: string;
  retryCount: number;
  nextRetryAt?: string;
  paymentMethodLast4?: string;
  paymentMethodBrand?: string;
}

export interface UpdateSubscriptionPaymentMethodPayload {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  last4?: string;
  brand?: string;
}

export interface VerifySubscriptionPaymentPayload {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  plan: SubscriptionPlanType;
  billingCycle: BillingCycle;
}

export interface SubscriptionUsageResponse {
  maxUsers: number;
  maxBranches: number;
  maxProducts: number;
  currentUsers: number;
  currentBranches: number;
  currentProducts: number;
  branchLimitReached: boolean;
  productLimitReached: boolean;
  userLimitReached: boolean;
}

export type SubscriptionPaymentStatus = 'CREATED' | 'SUCCESS' | 'FAILED';

export interface SubscriptionPaymentHistoryItem {
  id: number;
  tenantId: string;
  storeAdminId: number;
  subscriptionPlan: SubscriptionPlanType;
  billingCycle: BillingCycle;
  amount: number;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  paymentStatus: SubscriptionPaymentStatus;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

const subscriptionService = {
  getCurrentPlan: async (): Promise<SubscriptionPlanResponse> => {
    const response = await api.get('/subscription/current');
    return response.data;
  },

  getUsageStatistics: async (): Promise<SubscriptionUsageResponse> => {
    const response = await api.get('/subscription/usage');
    return response.data;
  },

  getPaymentHistory: async (): Promise<SubscriptionPaymentHistoryItem[]> => {
    const response = await api.get('/subscription/payments/history');
    return response.data;
  },

  downloadInvoice: async (paymentId: number): Promise<Blob> => {
    const response = await api.get(`/subscription/payments/${paymentId}/invoice`, {
      responseType: 'blob',
    });
    return response.data;
  },

  getPlans: async (): Promise<SubscriptionPlanResponse[]> => {
    const response = await api.get('/subscription/plans');
    return response.data;
  },

  createSubscriptionOrder: async (plan: SubscriptionPlanType, billingCycle: BillingCycle): Promise<SubscriptionOrderResponse> => {
    const response = await api.post('/subscription/create-order', { plan, billingCycle });
    return response.data;
  },

  verifySubscriptionPayment: async (payload: VerifySubscriptionPaymentPayload) => {
    const response = await api.post('/subscription/verify-payment', payload);
    return response.data;
  },

  createUpgradeOrder: async (plan: SubscriptionPlanType, billingCycle: BillingCycle) => {
    const response = await api.post('/subscription/upgrade-plan', { plan, billingCycle });
    return response.data;
  },

  cancelSubscription: async () => {
    const response = await api.put('/subscription/cancel');
    return response.data;
  },

  reactivateSubscription: async () => {
    const response = await api.put('/subscription/reactivate');
    return response.data;
  },

  getSubscriptionStatus: async (): Promise<SubscriptionStatusResponse> => {
    const response = await api.get('/subscription/status');
    return response.data;
  },

  createPaymentMethodUpdateOrder: async (): Promise<SubscriptionOrderResponse> => {
    const response = await api.post('/subscription/payment-methods/create-order');
    return response.data;
  },

  updatePaymentMethod: async (payload: UpdateSubscriptionPaymentMethodPayload) => {
    const response = await api.post('/subscription/payment-methods/update', payload);
    return response.data;
  },
};

export default subscriptionService;
