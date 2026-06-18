import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import userService from '../../services/userService';

interface User {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    tenantId: string;
    branchId?: number | null;
    status?: 'ACTIVE' | 'INACTIVE';
}

interface UserState {
    list: User[];
    loading: boolean;
    error: string | null;
    totalPages?: number;
    totalElements?: number;
}

const initialState: UserState = {
    list: [],
    loading: false,
    error: null,
    totalPages: 0,
    totalElements: 0,
};

// Async Thunk to fetch users
export const fetchUsers = createAsyncThunk(
    'users/fetchAll', 
    async (params: { page?: number; size?: number; branchId?: number } = {}, thunkAPI) => {
        try {
            console.log('🔍 Fetching users...'); // Debug log
            const { page = 0, size = 100, branchId } = params;
            const response = await userService.getUsers(page, size, branchId);
            console.log('📦 Users API response:', response); // Debug log
            console.log('📊 Users data:', response.data); // Debug log
            
            // Return full response for pagination support
            return response.data;
        } catch (error: any) {
            console.error('❌ Error fetching users:', error);
            console.error('❌ Error response:', error.response?.data);
            console.error('❌ Error status:', error.response?.status);
            return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to fetch users');
        }
    }
);

export const deleteUser = createAsyncThunk('users/delete', async (id: number, thunkAPI) => {
    try {
        await userService.deleteUser(id);
        return id;
    } catch (error: any) {
        return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to delete user');
    }
});

const userSlice = createSlice({
    name: 'users',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchUsers.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchUsers.fulfilled, (state, action) => {
                state.loading = false;
                // Handle both paginated and non-paginated responses
                const users = action.payload?.content || action.payload || [];
                state.list = users;
                state.totalPages = action.payload?.totalPages || 0;
                state.totalElements = action.payload?.totalElements || users.length;
            })
            .addCase(fetchUsers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(deleteUser.fulfilled, (state, action) => {
                state.list = state.list.filter(user => user.id !== action.payload);
            });
    },
});

export default userSlice.reducer;
