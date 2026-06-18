import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import branchService, { Branch } from '../../services/branchService';
import { handleAPIError } from '../../utils/errorHandler';

interface BranchState {
  branches: Branch[];
  selectedBranch: Branch | null;
  loading: boolean;
  error: string | null;
  totalPages?: number;
  totalElements?: number;
}

const initialState: BranchState = {
  branches: [],
  selectedBranch: null,
  loading: false,
  error: null,
  totalPages: 0,
  totalElements: 0,
};

export const fetchBranches = createAsyncThunk(
  'branches/fetchAll',
  async (params: { includeInactive?: boolean; page?: number; size?: number } | undefined, { rejectWithValue }) => {
    try {
      const { includeInactive, page = 0, size = 100 } = params || {};
      
      if (includeInactive) {
        // For paginated requests
        if (page !== undefined || size !== undefined) {
          return await branchService.getAllBranches(page, size);
        }
        return await branchService.getAllBranchesList();
      }
      return await branchService.getBranches();
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  },
);

export const createBranch = createAsyncThunk(
  'branches/create',
  async (data: Partial<Branch>, { rejectWithValue }) => {
    try {
      return await branchService.createBranch(data);
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  },
);

export const deleteBranch = createAsyncThunk(
  'branches/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await branchService.deleteBranch(id);
      return id; // Return ID to remove it from state
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  },
);

export const updateBranch = createAsyncThunk(
  'branches/update',
  async ({ id, data }: { id: number; data: Partial<Branch> }, { rejectWithValue }) => {
    try {
      return await branchService.updateBranch(id, data);
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  },
);

export const updateBranchStatus = createAsyncThunk(
  'branches/updateStatus',
  async ({ id, status }: { id: number; status: string }, { rejectWithValue }) => {
    try {
      return await branchService.updateBranchStatus(id, status);
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  },
);

const branchSlice = createSlice({
  name: 'branches',
  initialState,
  reducers: {
    setSelectedBranch: (state, action: PayloadAction<Branch | null>) => {
      state.selectedBranch = action.payload;
      if (action.payload) {
        localStorage.setItem('activeBranchId', action.payload.id.toString());
      }
    },
    clearBranchError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBranches.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBranches.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;

        // --- ROBUST DATA HANDLING ---
        // 1. Check if payload is the 'content' array from a Spring Page object
        // 2. Otherwise, check if it's a direct array
        // 3. Default to empty array to prevent .map() crashes
        const extractedData =
          action.payload?.content || (Array.isArray(action.payload) ? action.payload : []);

        state.branches = extractedData;
        state.totalPages = action.payload?.totalPages || 0;
        state.totalElements = action.payload?.totalElements || extractedData.length;

        // Handle default selection
        if (!state.selectedBranch && extractedData.length > 0) {
          state.selectedBranch =
            extractedData.find((b: Branch) => b.isMainBranch) || extractedData[0];
        }
      })
      .addCase(fetchBranches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        // Ensure branches stays an array even on failure
        if (!state.branches) state.branches = [];
      })

      // Create Branch
      .addCase(createBranch.pending, (state) => {
        state.loading = true;
      })
      .addCase(createBranch.fulfilled, (state, action: PayloadAction<Branch>) => {
        state.loading = false;
        // Double check branches is an array before pushing
        if (Array.isArray(state.branches)) {
          state.branches.push(action.payload);
        } else {
          state.branches = [action.payload];
        }
      })
      .addCase(createBranch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Update Branch
      .addCase(updateBranch.fulfilled, (state, action: PayloadAction<Branch>) => {
        if (Array.isArray(state.branches)) {
          const index = state.branches.findIndex((b) => b.id === action.payload.id);
          if (index !== -1) state.branches[index] = action.payload;
        }
        if (state.selectedBranch?.id === action.payload.id) {
          state.selectedBranch = action.payload;
        }
      })
      // Inside extraReducers in branchSlice.ts, add:

      .addCase(deleteBranch.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteBranch.fulfilled, (state, action: PayloadAction<number>) => {
        state.loading = false;
        // Filter out the deleted branch from the array
        state.branches = state.branches.filter((branch) => branch.id !== action.payload);

        // If deleted branch was selected, clear it
        if (state.selectedBranch?.id === action.payload) {
          state.selectedBranch = null;
        }
      })
      .addCase(deleteBranch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Update Branch Status
      .addCase(updateBranchStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateBranchStatus.fulfilled, (state, action: PayloadAction<Branch>) => {
        state.loading = false;
        if (Array.isArray(state.branches)) {
          const index = state.branches.findIndex((b) => b.id === action.payload.id);
          if (index !== -1) state.branches[index] = action.payload;
        }
        if (state.selectedBranch?.id === action.payload.id) {
          state.selectedBranch = action.payload;
        }
      })
      .addCase(updateBranchStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedBranch, clearBranchError } = branchSlice.actions;
export default branchSlice.reducer;
