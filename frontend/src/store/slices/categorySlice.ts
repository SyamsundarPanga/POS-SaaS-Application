import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { handleAPIError } from '../../utils/errorHandler';

export type CategoryStatus = 'ACTIVE' | 'INACTIVE';

export interface Category {
  id: number;
  name: string;
  description: string;
  imageUrl?: string; // Updated to include image URL
  status: CategoryStatus;
  displayOrder?: number;
  productCount?: number;
  parentId?: number;
  subcategories?: Category[];
}

interface CategoryState {
  categories: Category[]; // Flat list for general use/search
  hierarchy: Category[];  // Tree structure for selectors
  totalElements: number;
  totalPages: number;
  loading: boolean;
  uploading: boolean;     // New state for image upload tracking
  error: string | null;
}

const initialState: CategoryState = {
  categories: [],
  hierarchy: [],
  totalElements: 0,
  totalPages: 0,
  loading: false,
  uploading: false,
  error: null,
};

// --- Helper to flatten hierarchy for the 'categories' state ---
const flattenCategories = (nodes: Category[]): Category[] => {
  let flat: Category[] = [];
  nodes.forEach((node) => {
    flat.push(node);
    if (node.subcategories && node.subcategories.length > 0) {
      flat = flat.concat(flattenCategories(node.subcategories));
    }
  });
  return flat;
};

// --- Async Thunks ---

// NEW: Upload Category Image
export const uploadCategoryImage = createAsyncThunk(
  'categories/uploadImage',
  async (file: File, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/categories/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.imageUrl; // Expecting { imageUrl: "..." }
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  }
);

export const fetchCategoryHierarchy = createAsyncThunk(
  'categories/fetchHierarchy',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/categories/hierarchy');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  }
);

export const fetchAllCategories = createAsyncThunk(
  'categories/fetchAll',
  async ({ page, size, status }: { page: number; size: number; status?: string }, { rejectWithValue }) => {
    try {
      const response = await api.get('/categories', { params: { page, size, status } });
      return response.data; 
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  }
);

export const createCategory = createAsyncThunk(
  'categories/create',
  async (data: { name: string; description: string; parentId?: number; imageUrl?: string; displayOrder?: number }, { rejectWithValue }) => {
    try {
      const response = await api.post('/categories', data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  }
);

export const updateCategory = createAsyncThunk(
  'categories/update',
  async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/categories/${id}`, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  }
);

export const deleteCategory = createAsyncThunk(
  'categories/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await api.delete(`/categories/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  }
);

const categorySlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    clearCategoryError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Image Upload
      .addCase(uploadCategoryImage.pending, (state) => { 
        state.uploading = true; 
        state.error = null;
      })
      .addCase(uploadCategoryImage.fulfilled, (state) => { 
        state.uploading = false; 
      })
      .addCase(uploadCategoryImage.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload as string;
      })

      // Fetch Hierarchy
      .addCase(fetchCategoryHierarchy.pending, (state) => { state.loading = true; })
      .addCase(fetchCategoryHierarchy.fulfilled, (state, action: PayloadAction<Category[]>) => {
        state.loading = false;
        state.hierarchy = action.payload;
        state.categories = flattenCategories(action.payload);
      })
      .addCase(fetchCategoryHierarchy.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch All (Paginated)
      .addCase(fetchAllCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload.content;
        state.totalElements = action.payload.totalElements;
        state.totalPages = action.payload.totalPages;
      })

      // Create Category
      .addCase(createCategory.fulfilled, (state, action: PayloadAction<Category>) => {
        state.loading = false;
        // Check if it's a root category to update the hierarchy view
        if (!action.payload.parentId) {
          state.hierarchy.push(action.payload);
        }
        state.categories.push(action.payload);
      })

      // Update Category
      .addCase(updateCategory.fulfilled, (state, action: PayloadAction<Category>) => {
        state.loading = false;
        const index = state.categories.findIndex(c => c.id === action.payload.id);
        if (index !== -1) state.categories[index] = action.payload;
      })

      // Delete Category
      .addCase(deleteCategory.fulfilled, (state, action: PayloadAction<number>) => {
        state.loading = false;
        state.hierarchy = state.hierarchy.filter(c => c.id !== action.payload);
        state.categories = state.categories.filter(c => c.id !== action.payload);
      });
  },
});

export const { clearCategoryError } = categorySlice.actions;
export default categorySlice.reducer;