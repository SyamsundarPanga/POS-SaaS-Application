import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import auditService, { AuditLogResponse, AuditLog } from '../../services/auditService';

interface AuditState {
    logs: AuditLog[];
    loading: boolean;
    error: string | null;
    totalPages: number;
    totalElements: number;
    currentPage: number;
}

const initialState: AuditState = {
    logs: [],
    loading: false,
    error: null,
    totalPages: 0,
    totalElements: 0,
    currentPage: 0,
};

export const fetchAuditLogs = createAsyncThunk(
    'audit/fetchLogs',
    async ({ page, size, startDate, endDate }: { page: number, size: number, startDate?: string, endDate?: string }, { rejectWithValue }) => {
        try {
            const response = await auditService.getAuditLogs(page, size, startDate, endDate);
            return response.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message || 'Failed to fetch audit logs');
        }
    }
);

const auditSlice = createSlice({
    name: 'audit',
    initialState,
    reducers: {
        setCurrentPage: (state, action: PayloadAction<number>) => {
            state.currentPage = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAuditLogs.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAuditLogs.fulfilled, (state, action: PayloadAction<AuditLogResponse>) => {
                state.loading = false;
                state.logs = action.payload.content;
                state.totalPages = action.payload.totalPages;
                state.totalElements = action.payload.totalElements;
            })
            .addCase(fetchAuditLogs.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export const { setCurrentPage } = auditSlice.actions;
export default auditSlice.reducer;
