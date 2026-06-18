import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/endpoints';
import { handleAPIError } from '../../utils/errorHandler';

// Types
export interface CompanyProfile {
  name: string;
  logo: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website: string;
}

export interface TaxConfiguration {
  id?: number;
  branchId: number;
  taxName: string;
  taxRate: number;
  taxInclusive: boolean;
  active: boolean;
}

export interface ReceiptTemplate {
  header: string;
  footer: string;
  includeFields: {
    logo: boolean;
    companyInfo: boolean;
    customerInfo: boolean;
    itemDetails: boolean;
    taxBreakdown: boolean;
    paymentMethod: boolean;
  };
}

export interface EmailTemplate {
  subject: string;
  body: string;
  variables: string[];
}

export interface PaymentGatewayConfig {
  provider: 'STRIPE' | 'PAYPAL' | 'SQUARE';
  apiKey: string; // masked
  webhookUrl: string;
  testMode: boolean;
}

interface SettingsState {
  company: CompanyProfile | null;
  tax: TaxConfiguration[];
  receipt: ReceiptTemplate | null;
  email: EmailTemplate | null;
  paymentGateway: PaymentGatewayConfig | null;
  loading: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  company: null,
  tax: [],
  receipt: null,
  email: null,
  paymentGateway: null,
  loading: false,
  error: null,
};

// Async Thunks
export const fetchSettings = createAsyncThunk(
  'settings/fetchSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(API_ENDPOINTS.SETTINGS);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  }
);

export const updateCompanyProfile = createAsyncThunk(
  'settings/updateCompanyProfile',
  async (data: CompanyProfile, { rejectWithValue }) => {
    try {
      const response = await api.put(API_ENDPOINTS.COMPANY_PROFILE, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  }
);

export const updateTaxConfiguration = createAsyncThunk(
  'settings/updateTaxConfiguration',
  async (data: TaxConfiguration, { rejectWithValue }) => {
    try {
      const response = await api.put(API_ENDPOINTS.TAX_CONFIG, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  }
);

export const updateReceiptTemplate = createAsyncThunk(
  'settings/updateReceiptTemplate',
  async (data: ReceiptTemplate, { rejectWithValue }) => {
    try {
      const response = await api.put(API_ENDPOINTS.RECEIPT_TEMPLATE, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  }
);

export const updateEmailTemplate = createAsyncThunk(
  'settings/updateEmailTemplate',
  async (data: EmailTemplate, { rejectWithValue }) => {
    try {
      const response = await api.put(API_ENDPOINTS.EMAIL_TEMPLATE, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  }
);

export const updatePaymentGateway = createAsyncThunk(
  'settings/updatePaymentGateway',
  async (data: PaymentGatewayConfig, { rejectWithValue }) => {
    try {
      const response = await api.put(API_ENDPOINTS.PAYMENT_GATEWAY, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  }
);

// Slice
const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Settings
      .addCase(fetchSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.company = action.payload.company;
        state.tax = action.payload.tax;
        state.receipt = action.payload.receipt;
        state.email = action.payload.email;
        state.paymentGateway = action.payload.paymentGateway;
        state.loading = false;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      })
      // Update Company Profile
      .addCase(updateCompanyProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCompanyProfile.fulfilled, (state, action) => {
        state.company = action.payload;
        state.loading = false;
      })
      .addCase(updateCompanyProfile.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      })
      // Update Tax Configuration
      .addCase(updateTaxConfiguration.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTaxConfiguration.fulfilled, (state, action) => {
        const index = state.tax.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.tax[index] = action.payload;
        } else {
          state.tax.push(action.payload);
        }
        state.loading = false;
      })
      .addCase(updateTaxConfiguration.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      })
      // Update Receipt Template
      .addCase(updateReceiptTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateReceiptTemplate.fulfilled, (state, action) => {
        state.receipt = action.payload;
        state.loading = false;
      })
      .addCase(updateReceiptTemplate.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      })
      // Update Email Template
      .addCase(updateEmailTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateEmailTemplate.fulfilled, (state, action) => {
        state.email = action.payload;
        state.loading = false;
      })
      .addCase(updateEmailTemplate.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      })
      // Update Payment Gateway
      .addCase(updatePaymentGateway.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePaymentGateway.fulfilled, (state, action) => {
        state.paymentGateway = action.payload;
        state.loading = false;
      })
      .addCase(updatePaymentGateway.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      });
  },
});

// Actions
export const { clearError } = settingsSlice.actions;

// Selectors
export const selectCompanyProfile = (state: RootState) => state.settings.company;
export const selectTaxConfiguration = (state: RootState) => state.settings.tax;
export const selectReceiptTemplate = (state: RootState) => state.settings.receipt;
export const selectEmailTemplate = (state: RootState) => state.settings.email;
export const selectPaymentGateway = (state: RootState) => state.settings.paymentGateway;
export const selectSettingsLoading = (state: RootState) => state.settings.loading;
export const selectSettingsError = (state: RootState) => state.settings.error;

export default settingsSlice.reducer;
