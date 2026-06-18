import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import cartSlice from './slices/cartSlice';
import productSlice from './slices/productSlice';
import orderSlice from './slices/orderSlice';
import userSlice from './slices/userSlice';
import inventorySlice from './slices/inventorySlice';
import tenantSlice from './slices/tenantSlice';
import customerSlice from './slices/customerSlice';
import branchSlice from './slices/branchSlice';
import categorySlice from './slices/categorySlice';
import paymentSlice from './slices/paymentSlice';
import subscriptionSlice from './slices/subscriptionSlice';
import dashboardSlice from './slices/dashboardSlice';
import notificationSlice from './slices/notificationSlice';
import uiSlice from './slices/uiSlice';
import settingsSlice from './slices/settingsSlice';
import auditSlice from './slices/auditSlice';
import shiftSlice from './slices/shiftSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    cart: cartSlice,
    products: productSlice,
    orders: orderSlice,
    users: userSlice,
    inventory: inventorySlice,
    tenant: tenantSlice,
    customers: customerSlice,
    branches: branchSlice,
    categories: categorySlice,
    payments: paymentSlice,
    subscription: subscriptionSlice,
    dashboard: dashboardSlice,
    notifications: notificationSlice,
    ui: uiSlice,
    settings: settingsSlice,
    audit: auditSlice,
    shift: shiftSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

