import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import orderService from "../../services/orderService";

interface OrderItem {
  id: number;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  discount: number;
  lineTotal: number;
}

interface Order {
  id: number;
  orderNumber: string;
  customerName?: string;
  customerEmail?: string;
  cashierName?: string;
  subtotal?: number;
  tax?: number;
  discount?: number;
  total: number;
  status: string;
  createdAt: string;
  paymentMethod?: string;
  items?: OrderItem[];
}

interface OrderState {
  orders: Order[];
  loading: boolean;
  error: string | null;
}

const initialState: OrderState = {
  orders: [],
  loading: false,
  error: null,
};

export const fetchOrders = createAsyncThunk(
  "orders/fetch",
  async () => {
    const res = await orderService.getAll();
    // Paginated response handling: backend returns Page<OrderSummaryDto>
    return res.data.content || res.data;
  }
);

const orderSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.orders = action.payload;
        state.loading = false;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.error = action.error.message || "Failed to fetch orders";
        state.loading = false;
      });
  },
});

export default orderSlice.reducer;
