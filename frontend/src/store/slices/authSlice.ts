import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../../services/authService';
import userService from '../../services/userService';

// Load initial state from local storage
const user = JSON.parse(localStorage.getItem('user') || 'null');

interface AuthState {
  isLoggedIn: boolean;
  user: any | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = user
  ? { isLoggedIn: true, user, loading: false, error: null }
  : { isLoggedIn: false, user: null, loading: false, error: null };

// ASYNC THUNKS
export const register = createAsyncThunk(
  'auth/register',
  async ({ storeName, adminUsername, adminEmail, adminPassword, plan }: any, thunkAPI) => {
    try {
      return await authService.register(storeName, adminUsername, adminEmail, adminPassword, plan);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  },
);

export const login = createAsyncThunk('auth/login', async ({ email, password }: any, thunkAPI) => {
  try {
    const data = await authService.login(email, password);
    return { user: data };
  } catch (error: any) {
    const payload = error.response?.data || { message: error.message || error.toString() };
    return thunkAPI.rejectWithValue(payload);
  }
});

export const superAdminLogin = createAsyncThunk(
  'auth/superAdminLogin',
  async ({ email, password }: any, thunkAPI) => {
    try {
      const data = await authService.superAdminLogin(email, password);
      return { user: data };
    } catch (error: any) {
      const payload = error.response?.data || { message: error.message || error.toString() };
      return thunkAPI.rejectWithValue(payload);
    }
  },
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

export const fetchMyProfile = createAsyncThunk('auth/fetchProfile', async (_, thunkAPI) => {
  try {
    const response = await userService.getProfile();
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to load profile');
  }
});

// SLICE
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // 🟢 Useful for Modals: Clear errors when opening/closing
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* REGISTER */
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoggedIn = false;
        state.user = null;
        state.loading = false;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      /* LOGIN */
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoggedIn = true;
        state.user = action.payload.user;
        state.loading = false;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoggedIn = false;
        state.user = null;
        state.loading = false;
        state.error =
          (action.payload as any)?.message ||
          (action.payload as any)?.error ||
          (typeof action.payload === 'string' ? action.payload : null);
      })
      /* SUPER ADMIN LOGIN */
      .addCase(superAdminLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(superAdminLogin.fulfilled, (state, action) => {
        state.isLoggedIn = true;
        state.user = action.payload.user;
        state.loading = false;
      })
      .addCase(superAdminLogin.rejected, (state, action) => {
        state.isLoggedIn = false;
        state.user = null;
        state.loading = false;
        state.error =
          (action.payload as any)?.message ||
          (action.payload as any)?.error ||
          (typeof action.payload === 'string' ? action.payload : null);
      })
      .addCase(fetchMyProfile.fulfilled, (state, action) => {
        state.user = { ...state.user, ...action.payload };
      })

      /* LOGOUT */
      .addCase(logout.fulfilled, (state) => {
        state.isLoggedIn = false;
        state.user = null;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
