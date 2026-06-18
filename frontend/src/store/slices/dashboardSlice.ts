import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { 
  getAdminDashboard, 
  getBranchDashboard,
  DashboardStats,
  BranchDashboard 
} from '../../services/dashboardService';
import api from '../../services/api';

export interface TopProduct {
  productId?: number;
  productName?: string;
  sku?: string;
  imageUrl?: string | null;
  categoryName?: string | null;
  totalUnitsSold?: number;
  totalRevenue?: number;
  rank?: number;
  branchBreakdown?: Array<{
    branchId: number;
    branchName: string;
    unitsSold: number;
    revenue: number;
  }>;
  id?: number;
  name?: string;
  quantitySold?: number;
  revenue?: number;
}

// State Interface
interface DashboardState {
  adminDashboard: DashboardStats | null;
  branchDashboard: BranchDashboard | null;
  topProducts: TopProduct[];
  topProductsLoading: boolean;
  topProductsError: string | null;
  selectedBranchFilter: number | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: DashboardState = {
  adminDashboard: null,
  branchDashboard: null,
  topProducts: [],
  topProductsLoading: false,
  topProductsError: null,
  selectedBranchFilter: null,
  loading: false,
  error: null,
  lastFetched: null,
};

// Async Thunks
export const fetchAdminDashboard = createAsyncThunk(
  'dashboard/fetchAdminDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const data = await getAdminDashboard();
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch admin dashboard');
    }
  }
);

export const fetchBranchDashboard = createAsyncThunk(
  'dashboard/fetchBranchDashboard',
  async (branchId: number, { rejectWithValue }) => {
    try {
      const data = await getBranchDashboard(branchId);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch branch dashboard');
    }
  }
);

export const fetchTopProducts = createAsyncThunk(
  'dashboard/fetchTopProducts',
  async ({ branchId = null, limit = 10 }: { branchId?: number | null; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (branchId) params.append('branchId', String(branchId));
      params.append('limit', String(limit));

      const response = await api.get(`/dashboard/top-products?${params.toString()}`);
      return response.data as TopProduct[];
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to load top products'
      );
    }
  }
);

// Slice
const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearDashboard: (state) => {
      state.adminDashboard = null;
      state.branchDashboard = null;
      state.lastFetched = null;
    },
    setSelectedBranchFilter: (state, action) => {
      state.selectedBranchFilter = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Admin Dashboard
      .addCase(fetchAdminDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminDashboard.fulfilled, (state, action) => {
        state.adminDashboard = action.payload;
        state.loading = false;
        state.lastFetched = Date.now();
      })
      .addCase(fetchAdminDashboard.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      })
      // Fetch Branch Dashboard
      .addCase(fetchBranchDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBranchDashboard.fulfilled, (state, action) => {
        state.branchDashboard = action.payload;
        state.loading = false;
        state.lastFetched = Date.now();
      })
      .addCase(fetchBranchDashboard.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      })
      .addCase(fetchTopProducts.pending, (state) => {
        state.topProductsLoading = true;
        state.topProductsError = null;
      })
      .addCase(fetchTopProducts.fulfilled, (state, action) => {
        state.topProducts = action.payload || [];
        state.topProductsLoading = false;
      })
      .addCase(fetchTopProducts.rejected, (state, action) => {
        state.topProductsLoading = false;
        state.topProductsError = action.payload as string;
      });
  },
});

// Actions
export const { clearError, clearDashboard, setSelectedBranchFilter } = dashboardSlice.actions;

// Selectors
export const selectAdminDashboard = (state: RootState) => state.dashboard.adminDashboard;
export const selectBranchDashboard = (state: RootState) => state.dashboard.branchDashboard;
export const selectDashboardLoading = (state: RootState) => state.dashboard.loading;
export const selectDashboardError = (state: RootState) => state.dashboard.error;
export const selectLastFetched = (state: RootState) => state.dashboard.lastFetched;
export const selectTopProducts = (state: RootState) => state.dashboard.topProducts;
export const selectTopProductsLoading = (state: RootState) => state.dashboard.topProductsLoading;
export const selectTopProductsError = (state: RootState) => state.dashboard.topProductsError;
export const selectSelectedBranchFilter = (state: RootState) => state.dashboard.selectedBranchFilter;

export default dashboardSlice.reducer;
