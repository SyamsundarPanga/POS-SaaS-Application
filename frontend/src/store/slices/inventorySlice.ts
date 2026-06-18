import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import inventoryService, { StockAdjustment, LowStockAlert } from "../../services/inventoryService";

interface InventoryItem {
  id: number | null;
  tenantId: string;
  productId: number;
  productName: string;
  sku: string;
  productBarcode: string;
  price: number;
  productStatus: string;
  branchId: number | null;
  branchName: string | null;
  quantity: number;
  lowStockThreshold: number;
  reservedQuantity: number;
  availableQuantity: number;
  isLowStock: boolean;
  lastRestockDate: string | null;
  lastSaleDate: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  hasInventory?: boolean;
}

interface InventoryState {
  items: InventoryItem[];
  loading: boolean;
  error: string | null;
  totalElements: number;
  totalPages: number;
  currentPage: number;
  deadStock: InventoryItem[];
  deadStockLoading: boolean;
  deadStockError: string | null;
  lowStockAlerts: LowStockAlert[];
  lowStockLoading: boolean;
  lowStockError: string | null;
}

const initialState: InventoryState = {
  items: [],
  loading: false,
  error: null,
  totalElements: 0,
  totalPages: 0,
  currentPage: 0,
  deadStock: [],
  deadStockLoading: false,
  deadStockError: null,
  lowStockAlerts: [],
  lowStockLoading: false,
  lowStockError: null
};


// Async thunk to fetch dead stock items
export const fetchDeadStock = createAsyncThunk(
  "inventory/fetchDeadStock",
  async (params: { days?: number; branchId?: number } = {}) => {
    const res = await inventoryService.getDeadStock(params.days ?? 90, params.branchId);
    return res.data;
  }
);

export const fetchInventory = createAsyncThunk(
  "inventory/fetch",
  async (params?: { page?: number; size?: number; branchId?: number }) => {
    const res = await inventoryService.getAll(params?.page, params?.size, params?.branchId);
    // Backend returns paginated response: { content: [], totalElements, totalPages, etc }
    return res.data;
  }
);

export const fetchLowStockAlerts = createAsyncThunk(
  "inventory/fetchLowStockAlerts",
  async (params?: { branchId?: number }) => {
    const res = await inventoryService.getLowStockAlerts(params?.branchId);
    return res.data;
  }
);

export const adjustStock = createAsyncThunk(
  "inventory/adjust",
  async (data: StockAdjustment) => {
    const res = await inventoryService.adjustStock(data);
    return res.data;
  }
);

export const updateThreshold = createAsyncThunk(
  "inventory/updateThreshold",
  async (data: { productId: number; branchId: number; lowStockThreshold: number }) => {
    const res = await inventoryService.updateLowStockThreshold(data);
    return res.data;
  }
);

const inventorySlice = createSlice({
  name: "inventory",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInventory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        // Handle paginated response from backend
        const payload = action.payload;
        if (payload.content) {
          // Paginated response
          state.items = payload.content;
          state.totalElements = payload.totalElements || 0;
          state.totalPages = payload.totalPages || 0;
          state.currentPage = payload.number || 0;
        } else if (Array.isArray(payload)) {
          // Array response (fallback)
          state.items = payload;
          state.totalElements = payload.length;
        } else {
          state.items = [];
        }
        state.loading = false;
      })
      .addCase(fetchInventory.rejected, (state, action) => {
        state.error = action.error.message || "Failed to load inventory";
        state.loading = false;
        state.items = [];
      })
      // Dead stock async thunk
      .addCase(fetchDeadStock.pending, (state) => {
        state.deadStockLoading = true;
        state.deadStockError = null;
      })
      .addCase(fetchDeadStock.fulfilled, (state, action) => {
        state.deadStock = Array.isArray(action.payload) ? action.payload : [];
        state.deadStockLoading = false;
      })
      .addCase(fetchDeadStock.rejected, (state, action) => {
        state.deadStockError = action.error.message || "Failed to load dead stock";
        state.deadStockLoading = false;
        state.deadStock = [];
      })
      // Low stock alerts async thunk
      .addCase(fetchLowStockAlerts.pending, (state) => {
        state.lowStockLoading = true;
        state.lowStockError = null;
      })
      .addCase(fetchLowStockAlerts.fulfilled, (state, action) => {
        state.lowStockAlerts = Array.isArray(action.payload) ? action.payload : [];
        state.lowStockLoading = false;
      })
      .addCase(fetchLowStockAlerts.rejected, (state, action) => {
        state.lowStockError = action.error.message || "Failed to load low stock alerts";
        state.lowStockLoading = false;
        state.lowStockAlerts = [];
      })
      // Update threshold async thunk
      .addCase(updateThreshold.fulfilled, (state, action) => {
        const updated = action.payload;
        if (!updated) return;
        state.items = state.items.map((item) =>
          item.productId === updated.productId &&
          (item.branchId ?? null) === (updated.branchId ?? null)
            ? {
                ...item,
                lowStockThreshold: updated.lowStockThreshold,
                quantity: updated.quantity,
                isLowStock: updated.isLowStock,
              }
            : item
        );
      });
  },
});

export default inventorySlice.reducer;
