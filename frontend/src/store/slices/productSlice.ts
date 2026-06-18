import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import productService from '../../services/productService';
import { handleAPIError } from '../../utils/errorHandler';

export interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  costPrice?: number;
  imageUrl?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  categoryId?: number;
  categoryName?: string;
  barcode?: string;
  unit?: string;
  minStockLevel?: number;
  maxStockLevel?: number;
  reorderPoint?: number;
  taxRate?: number;
  isTaxable?: boolean;
  allowDecimalQuantity?: boolean;
  tags?: string;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
  currentStock?: number;
  isLowStock?: boolean;
}

interface ProductState {
  products: {
    content: Product[];
    totalElements: number;
    totalPages?: number;
    last: boolean;
  } | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProductState = {
  products: null,
  loading: false,
  error: null,
};

// --- Async Thunks ---

export const fetchProducts = createAsyncThunk(
  'products/fetchAll',
  async (
    params: { page: number; size: number; search?: string; categoryId?: number; branchId?: number; sort?: string },
    { rejectWithValue },
  ) => {
    try {
      const { page, size, search, categoryId, branchId, sort } = params;

      let response;
      if (search && search.trim() !== '') {
        response = await productService.searchProducts(search, page, size, branchId, sort);
      } else if (categoryId) {
        response = await productService.getProductsByCategory(categoryId, page, size, branchId, sort);
      } else {
        response = await productService.getProducts(page, size, undefined, branchId, sort);
      }

      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  },
);

export const updateProduct = createAsyncThunk(
  'products/update',
  async ({ id, productData, file }: { id: number; productData: any; file?: File }, { rejectWithValue }) => {
    try {
      let finalImageUrl = productData.imageUrl;

      // Handle image update if a new file is provided
      if (file) {
        const uploadRes = await productService.uploadProductImage(file);
        finalImageUrl = uploadRes.data.imageUrl;
      }

      const response = await productService.updateProduct(id, {
        ...productData,
        imageUrl: finalImageUrl,
      });

      return response.data; // Backend returns the full updated Product object
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  }
);

export const createProductWithImage = createAsyncThunk(
  'products/createWithImage',
  async ({ productData, file }: { productData: any; file?: File }, { rejectWithValue }) => {
    try {
      let finalImageUrl = productData.imageUrl;

      if (file) {
        const uploadRes = await productService.uploadProductImage(file);
        finalImageUrl = uploadRes.data.imageUrl;
      }

      const response = await productService.createProduct({
        ...productData,
        imageUrl: finalImageUrl,
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  },
);

export const deleteProduct = createAsyncThunk(
  'products/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await productService.deleteProduct(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  },
);

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    deductStock: (state, action: { payload: { productId: number; quantity: number }[] }) => {
      if (state.products && state.products.content) {
        action.payload.forEach(({ productId, quantity }) => {
          const product = state.products?.content.find((p) => p.id === productId);
          if (product && product.currentStock !== undefined) {
            product.currentStock = Math.max(0, product.currentStock - quantity);

            // Optionally update low stock status locally
            if (product.minStockLevel !== undefined) {
              product.isLowStock = product.currentStock <= product.minStockLevel;
            }
          }
        });
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.products = action.payload;
        state.loading = false;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      })
      // Create
      .addCase(createProductWithImage.fulfilled, (state, action) => {
        if (state.products) {
          state.products.content.unshift(action.payload);
          state.products.totalElements += 1;
        }
      })
      // ✅ UPDATE (This fixes the refresh issue)
      .addCase(updateProduct.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.loading = false;
        if (state.products && state.products.content) {
          // Find the product by ID and replace it in the array
          const index = state.products.content.findIndex((p) => p.id === action.payload.id);
          if (index !== -1) {
            state.products.content[index] = action.payload;
          }
        }
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete
      .addCase(deleteProduct.fulfilled, (state, action) => {
        if (state.products) {
          state.products.content = state.products.content.filter((p) => p.id !== action.payload);
          state.products.totalElements -= 1;
        }
      });
  },
});

export const { deductStock } = productSlice.actions;

export default productSlice.reducer;
