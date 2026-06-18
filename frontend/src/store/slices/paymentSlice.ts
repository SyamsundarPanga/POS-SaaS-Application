import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import { handleAPIError } from '../../utils/errorHandler';

export interface PaymentState {
  processing: boolean;
  orderResponse: any | null; // Razorpay Order details
  error: string | null;
}

const initialState: PaymentState = {
  processing: false,
  orderResponse: null,
  error: null,
};

// --- Async Thunks ---

export const initiateRazorpayOrder = createAsyncThunk(
  'payments/initiateOrder',
  async (amount: number, { rejectWithValue }) => {
    try {
      // Calls /api/payments/create-order
      const response = await api.post('/payments/create-order', { amount });
      return response.data; 
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  }
);

export const verifyPaymentSignature = createAsyncThunk(
  'payments/verify',
  async (verificationData: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }, { rejectWithValue }) => {
    try {
      // Calls /api/payments/verify
      const response = await api.post('/payments/verify', verificationData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  }
);

const paymentSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    resetPaymentStatus: (state) => {
      state.error = null;
      state.orderResponse = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(initiateRazorpayOrder.pending, (state) => { state.processing = true; })
      .addCase(initiateRazorpayOrder.fulfilled, (state, action) => {
        state.processing = false;
        state.orderResponse = action.payload;
      })
      .addCase(verifyPaymentSignature.fulfilled, (state) => {
        state.processing = false;
        state.orderResponse = null; // Clear after success
      });
  },
});

export const { resetPaymentStatus } = paymentSlice.actions;
export default paymentSlice.reducer;