import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';
import subscriptionService, { BillingCycle, SubscriptionPlanType } from '../../services/subscriptionService';
import { handleAPIError } from '../../utils/errorHandler';
import { getPlanFeatures } from '../../utils/subscriptionPlans';

export type PlanName = 'BASIC' | 'PRO' | 'ADVANCE';

export interface SubscriptionPlan {
  id: string;
  name: PlanName;
  price: number;
  billingCycle: BillingCycle;
  features: {
    maxBranches: number;
    maxUsers: number;
    maxProducts: number;
    includedFeatures: string[];
  };
}

export interface BillingRecord {
  id: number;
  date: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'FAILED';
  invoiceUrl: string;
}

export interface PaymentMethodInfo {
  id: number;
  type: string;
  last4: string;
  expiryDate?: string;
  isDefault: boolean;
}

export interface PaymentMethodDto {
  type: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
}

export interface UsageMetrics {
  branches: { used: number; limit: number };
  users: { used: number; limit: number };
  products: { used: number; limit: number };
  lastUpdated: string;
}

interface SubscriptionState {
  currentPlan: SubscriptionPlan | null;
  availablePlans: SubscriptionPlan[];
  usageMetrics: any | null;
  billingHistory: any[];
  paymentMethods: any[];
  nextBillingDate: string | null;
  renewalAmount: number | null;
  loading: boolean;
  error: string | null;
}

const initialState: SubscriptionState = {
  currentPlan: null,
  availablePlans: [],
  usageMetrics: null,
  billingHistory: [],
  paymentMethods: [],
  nextBillingDate: null,
  renewalAmount: null,
  loading: false,
  error: null,
};

const mapPlan = (p: any): SubscriptionPlan => ({
  id: p.id,
  name: p.planType,
  price: Number(p.monthlyPrice || 0),
  billingCycle: 'MONTHLY',
  features: {
    maxBranches: p.maxBranches,
    maxUsers: p.maxUsers,
    maxProducts: p.maxProducts,
    includedFeatures: getPlanFeatures(p.planType, {
      maxBranches: p.maxBranches,
      maxUsers: p.maxUsers,
      maxProducts: p.maxProducts,
    }),
  },
});

export const fetchSubscriptionData = createAsyncThunk(
  'subscription/fetchData',
  async (_, { rejectWithValue }) => {
    try {
      const [currentPlan, plans] = await Promise.all([
        subscriptionService.getCurrentPlan(),
        subscriptionService.getPlans(),
      ]);

      return {
        currentPlan: mapPlan(currentPlan),
        availablePlans: plans.map(mapPlan),
      };
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  }
);

export const upgradePlan = createAsyncThunk(
  'subscription/upgradePlan',
  async (planId: string, { rejectWithValue }) => {
    try {
      const plan = planId.toUpperCase() as SubscriptionPlanType;
      return await subscriptionService.createUpgradeOrder(plan, 'MONTHLY');
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  }
);

export const addPaymentMethod = createAsyncThunk(
  'subscription/addPaymentMethod',
  async (payload: any) => payload
);

export const removePaymentMethod = createAsyncThunk(
  'subscription/removePaymentMethod',
  async (id: number) => id
);

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubscriptionData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubscriptionData.fulfilled, (state, action) => {
        state.currentPlan = action.payload.currentPlan;
        state.availablePlans = action.payload.availablePlans;
        state.loading = false;
      })
      .addCase(fetchSubscriptionData.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      })
      .addCase(upgradePlan.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(upgradePlan.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(upgradePlan.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      })
      .addCase(addPaymentMethod.fulfilled, (state, action) => {
        state.paymentMethods.push(action.payload);
      })
      .addCase(removePaymentMethod.fulfilled, (state, action) => {
        state.paymentMethods = state.paymentMethods.filter((m: any) => m.id !== action.payload);
      });
  },
});

export const { clearError } = subscriptionSlice.actions;

export const selectCurrentPlan = (state: RootState) => state.subscription.currentPlan;
export const selectAvailablePlans = (state: RootState) => state.subscription.availablePlans;
export const selectUsageMetrics = (state: RootState) => state.subscription.usageMetrics;
export const selectBillingHistory = (state: RootState) => state.subscription.billingHistory;
export const selectPaymentMethods = (state: RootState) => state.subscription.paymentMethods;
export const selectSubscriptionLoading = (state: RootState) => state.subscription.loading;
export const selectSubscriptionError = (state: RootState) => state.subscription.error;
export const selectUsageWarnings = (_state: RootState) => [];

export default subscriptionSlice.reducer;
