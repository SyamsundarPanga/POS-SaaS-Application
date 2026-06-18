import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import tenantService from "../../services/tenantService";

interface Tenant {
  name: string;
  email: string;
  planType: string;
  maxBranches: number;
  currentBranches: number;
  maxProducts: number;
  currentProducts: number;
  taxRate?: number;
  currency?: string;
}

interface TenantState {
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;
}

const initialState: TenantState = {
  tenant: null,
  loading: false,
  error: null,
};

export const fetchTenantDetails = createAsyncThunk(
  "tenant/fetch",
  async () => {
    const res = await tenantService.getTenant();
    return res.data;
  }
);

const tenantSlice = createSlice({
  name: "tenant",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTenantDetails.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTenantDetails.fulfilled, (state, action) => {
        state.tenant = action.payload;
        state.loading = false;
      })
      .addCase(fetchTenantDetails.rejected, (state, action) => {
        state.error =
          action.error.message || "Failed to fetch tenant";
        state.loading = false;
      });
  },
});

export default tenantSlice.reducer;
