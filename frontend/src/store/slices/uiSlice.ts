import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';

// Types
export type ThemeMode = 'light' | 'dark';
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

interface ModalState {
  isOpen: boolean;
  data?: any;
}

interface UIState {
  modals: {
    [key: string]: ModalState;
  };
  sidebar: {
    isOpen: boolean;
    isCollapsed: boolean;
  };
  loading: {
    global: boolean;
    operations: Record<string, boolean>;
  };
  theme: ThemeMode;
  notifications: {
    position: ToastPosition;
    autoClose: number;
  };
}

const initialState: UIState = {
  modals: {},
  sidebar: {
    isOpen: true,
    isCollapsed: true,
  },
  loading: {
    global: false,
    operations: {},
  },
  theme: 'light',
  notifications: {
    position: 'top-right',
    autoClose: 5000,
  },
};

// Slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Modal actions
    openModal: (state, action: PayloadAction<{ modalId: string; data?: any }>) => {
      state.modals[action.payload.modalId] = {
        isOpen: true,
        data: action.payload.data,
      };
    },
    closeModal: (state, action: PayloadAction<string>) => {
      if (state.modals[action.payload]) {
        state.modals[action.payload].isOpen = false;
        state.modals[action.payload].data = undefined;
      }
    },
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach(key => {
        state.modals[key].isOpen = false;
        state.modals[key].data = undefined;
      });
    },

    // Sidebar actions
    toggleSidebar: (state) => {
      state.sidebar.isOpen = !state.sidebar.isOpen;
    },
    collapseSidebar: (state, action: PayloadAction<boolean>) => {
      state.sidebar.isCollapsed = action.payload;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebar.isOpen = action.payload;
    },

    // Loading actions
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.loading.global = action.payload;
    },
    setOperationLoading: (state, action: PayloadAction<{ operation: string; loading: boolean }>) => {
      state.loading.operations[action.payload.operation] = action.payload.loading;
    },
    clearOperationLoading: (state, action: PayloadAction<string>) => {
      delete state.loading.operations[action.payload];
    },
    clearAllOperationLoading: (state) => {
      state.loading.operations = {};
    },

    // Theme actions
    setTheme: (state, action: PayloadAction<ThemeMode>) => {
      state.theme = action.payload;
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
    },

    // Notification settings
    setNotificationPosition: (state, action: PayloadAction<ToastPosition>) => {
      state.notifications.position = action.payload;
    },
    setNotificationAutoClose: (state, action: PayloadAction<number>) => {
      state.notifications.autoClose = action.payload;
    },
  },
});

// Actions
export const {
  openModal,
  closeModal,
  closeAllModals,
  toggleSidebar,
  collapseSidebar,
  setSidebarOpen,
  setGlobalLoading,
  setOperationLoading,
  clearOperationLoading,
  clearAllOperationLoading,
  setTheme,
  toggleTheme,
  setNotificationPosition,
  setNotificationAutoClose,
} = uiSlice.actions;

// Selectors
export const selectModalState = (modalId: string) => (state: RootState) =>
  state.ui.modals[modalId] || { isOpen: false, data: undefined };

export const selectSidebarState = (state: RootState) => state.ui.sidebar;
export const selectGlobalLoading = (state: RootState) => state.ui.loading.global;
export const selectOperationLoading = (operation: string) => (state: RootState) =>
  state.ui.loading.operations[operation] || false;
export const selectTheme = (state: RootState) => state.ui.theme;
export const selectNotificationSettings = (state: RootState) => state.ui.notifications;

export default uiSlice.reducer;
