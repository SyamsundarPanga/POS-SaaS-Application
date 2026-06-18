import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import shiftService, { ShiftResponse } from '../../services/shiftService';

interface ShiftState {
    currentShift: ShiftResponse | null;
    loading: boolean;
    error: string | null;
}

const initialState: ShiftState = {
    currentShift: null,
    loading: false,
    error: null,
};

export const loadCurrentShift = createAsyncThunk(
    'shift/loadCurrentShift',
    async (_, { rejectWithValue }) => {
        try {
            return await shiftService.getCurrentShift();
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch shift');
        }
    }
);

const shiftSlice = createSlice({
    name: 'shift',
    initialState,
    reducers: {
        setCurrentShift: (state, action: PayloadAction<ShiftResponse | null>) => {
            state.currentShift = action.payload;
        },
        clearShift: (state) => {
            state.currentShift = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loadCurrentShift.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loadCurrentShift.fulfilled, (state, action) => {
                state.loading = false;
                state.currentShift = action.payload;
            })
            .addCase(loadCurrentShift.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export const { setCurrentShift, clearShift } = shiftSlice.actions;
export default shiftSlice.reducer;
