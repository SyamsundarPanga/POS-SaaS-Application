import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/endpoints';
import { handleAPIError } from '../../utils/errorHandler';

// Types
export type NotificationType = 'LOW_STOCK' | 'PAYMENT_FAILED' | 'SUBSCRIPTION_LIMIT' | 'SYSTEM' | 'ORDER';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  lowStockAlerts: boolean;
  paymentAlerts: boolean;
  subscriptionAlerts: boolean;
  systemAlerts: boolean;
  emailNotifications: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  preferences: NotificationPreferences;
  page: number;
  hasMore: boolean;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  preferences: {
    lowStockAlerts: true,
    paymentAlerts: true,
    subscriptionAlerts: true,
    systemAlerts: true,
    emailNotifications: true,
  },
  page: 0,
  hasMore: true,
};

// Async Thunks
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (params: { page: number; limit: number }, { rejectWithValue }) => {
    try {
      const response = await api.get(API_ENDPOINTS.NOTIFICATIONS, {
        params,
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  }
);

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(API_ENDPOINTS.UNREAD_COUNT);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  }
);

export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId: number, { rejectWithValue }) => {
    try {
      await api.put(API_ENDPOINTS.MARK_AS_READ(notificationId));
      return notificationId;
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  }
);

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      await api.put(API_ENDPOINTS.MARK_ALL_READ);
      return true;
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  }
);

export const clearAllNotifications = createAsyncThunk(
  'notifications/clearAllNotifications',
  async (_, { rejectWithValue }) => {
    try {
      await api.delete(API_ENDPOINTS.CLEAR_ALL_NOTIFICATIONS);
      return true;
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  }
);

export const updatePreferences = createAsyncThunk(
  'notifications/updatePreferences',
  async (preferences: NotificationPreferences, { rejectWithValue }) => {
    try {
      const response = await api.put(API_ENDPOINTS.NOTIFICATION_PREFERENCES, preferences);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  }
);

export const deleteNotification = createAsyncThunk(
  'notifications/deleteNotification',
  async (notificationId: number, { rejectWithValue }) => {
    try {
      await api.delete(API_ENDPOINTS.NOTIFICATION_BY_ID(notificationId));
      return notificationId;
    } catch (error: any) {
      return rejectWithValue(handleAPIError(error));
    }
  }
);

// Slice
const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        const { content, last } = action.payload;

        if (state.page === 0) {
          state.notifications = content || [];
        } else {
          state.notifications.push(...(content || []));
        }

        state.hasMore = !last;
        state.loading = false;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      })
      // Fetch Unread Count
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })
      // Mark As Read
      .addCase(markAsRead.fulfilled, (state, action) => {
        const notification = state.notifications.find(n => n.id === action.payload);
        if (notification && !notification.read) {
          notification.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAsRead.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Mark All As Read
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications.forEach(n => {
          n.read = true;
        });
        state.unreadCount = 0;
      })
      .addCase(markAllAsRead.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Clear All Notifications
      .addCase(clearAllNotifications.fulfilled, (state) => {
        state.notifications = [];
        state.unreadCount = 0;
      })
      .addCase(clearAllNotifications.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Update Preferences
      .addCase(updatePreferences.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePreferences.fulfilled, (state, action) => {
        state.preferences = action.payload;
        state.loading = false;
      })
      .addCase(updatePreferences.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      })
      // Delete Notification
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const notification = state.notifications.find(n => n.id === action.payload);
        if (notification && !notification.read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.notifications = state.notifications.filter(n => n.id !== action.payload);
      })
      .addCase(deleteNotification.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

// Actions
export const { addNotification, clearError } = notificationSlice.actions;

// Selectors
export const selectNotifications = (state: RootState) => state.notifications.notifications;
export const selectUnreadCount = (state: RootState) => state.notifications.unreadCount;
export const selectNotificationLoading = (state: RootState) => state.notifications.loading;
export const selectNotificationError = (state: RootState) => state.notifications.error;
export const selectNotificationPreferences = (state: RootState) => state.notifications.preferences;
export const selectHasMoreNotifications = (state: RootState) => state.notifications.hasMore;

// Filtered selectors
export const selectUnreadNotifications = (state: RootState) =>
  state.notifications.notifications.filter(n => !n.read);

export const selectNotificationsByType = (type: NotificationType) => (state: RootState) =>
  state.notifications.notifications.filter(n => n.type === type);

export default notificationSlice.reducer;
