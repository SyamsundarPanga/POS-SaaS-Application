import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import customerService, { Customer, LoyaltyTransaction } from '../../services/customerService';

interface CustomerState {
    customers: Customer[];
    selectedCustomer: Customer | null;
    loyaltyHistory: LoyaltyTransaction[];
    loading: boolean;
    error: string | null;
    exportLoading: boolean;
    exportError: string | null;
    totalPages: number;
    currentPage: number;
}

const initialState: CustomerState = {
    customers: [],
    selectedCustomer: null,
    loyaltyHistory: [],
    loading: false,
    error: null,
    exportLoading: false,
    exportError: null,
    totalPages: 0,
    currentPage: 0,
};

export const fetchCustomers = createAsyncThunk(
    'customers/fetchAll',
    async ({ page, size, branchId }: { page: number; size: number; branchId?: number | null }) => {
        const response = await customerService.getAll(page, size, { branchId });
        return response.data;
    }
);

export const searchCustomers = createAsyncThunk(
    'customers/search',
    async (query: string) => {
        const response = await customerService.search(query);
        return response.data;
    }
);

export const fetchCustomerById = createAsyncThunk(
    'customers/fetchById',
    async (id: number) => {
        const response = await customerService.getById(id);
        return response.data;
    }
);

export const createCustomer = createAsyncThunk(
    'customers/create',
    async (data: { firstName: string; lastName: string; email: string; phone: string; address?: string }) => {
        const response = await customerService.create(data);
        return response.data;
    }
);

export const updateCustomer = createAsyncThunk(
    'customers/update',
    async ({ id, data }: { id: number; data: Partial<Customer> }) => {
        const response = await customerService.update(id, data);
        return response.data;
    }
);

export const deleteCustomer = createAsyncThunk(
    'customers/delete',
    async (id: number) => {
        await customerService.delete(id);
        return id;
    }
);

export const fetchLoyaltyHistory = createAsyncThunk(
    'customers/fetchLoyaltyHistory',
    async (customerId: number) => {
        const response = await customerService.getLoyaltyHistory(customerId);
        return response.data;
    }
);

export const exportCustomersCsv = createAsyncThunk(
    'customers/exportCsv',
    async (_, { rejectWithValue }) => {
        try {
            const userStr = localStorage.getItem('user');
            const userData = userStr ? JSON.parse(userStr) : null;
            const token = userData?.token || userData?.accessToken;
            const tenantId = userData?.tenantId || userData?.user?.tenantId;

            const response = await api.get('/customers/export/csv', {
                responseType: 'blob',
                headers: {
                    Accept: 'text/csv',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
                },
            });

            const disposition = response.headers?.['content-disposition'];
            let filename = `customers_${new Date().toISOString().split('T')[0]}.csv`;
            if (disposition) {
                const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (match?.[1]) {
                    filename = match[1].replace(/['"]/g, '');
                }
            }

            const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            return true;
        } catch (error: any) {
            if (error?.response?.data instanceof Blob) {
                try {
                    const text = await error.response.data.text();
                    const json = JSON.parse(text);
                    return rejectWithValue(json?.message || 'Export failed');
                } catch {
                    return rejectWithValue('Export failed');
                }
            }
            if (error?.response?.status === 403) {
                return rejectWithValue('Access denied. You do not have permission to export customers.');
            }
            if (error?.response?.status === 404) {
                return rejectWithValue('Export endpoint not found. Please contact support.');
            }
            return rejectWithValue(
                error?.response?.data?.message || 'Export failed. Please try again.'
            );
        }
    }
);

const customerSlice = createSlice({
    name: 'customers',
    initialState,
    reducers: {
        clearSelectedCustomer: (state) => {
            state.selectedCustomer = null;
            state.loyaltyHistory = [];
        },
        setSelectedCustomer: (state, action: PayloadAction<Customer>) => {
            state.selectedCustomer = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCustomers.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchCustomers.fulfilled, (state, action) => {
                state.loading = false;
                state.customers = action.payload.content || action.payload;
                state.totalPages = action.payload.totalPages || 1;
                state.currentPage = action.payload.number || 0;
            })
            .addCase(fetchCustomers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch customers';
            })
            .addCase(searchCustomers.fulfilled, (state, action) => {
                state.customers = action.payload;
                state.loading = false;
            })
            .addCase(fetchCustomerById.fulfilled, (state, action) => {
                state.selectedCustomer = action.payload;
                state.loading = false;
            })
            .addCase(createCustomer.fulfilled, (state, action) => {
                state.customers.unshift(action.payload);
            })
            .addCase(updateCustomer.fulfilled, (state, action) => {
                const index = state.customers.findIndex(c => c.id === action.payload.id);
                if (index !== -1) {
                    state.customers[index] = action.payload;
                }
                if (state.selectedCustomer?.id === action.payload.id) {
                    state.selectedCustomer = action.payload;
                }
            })
            .addCase(deleteCustomer.fulfilled, (state, action) => {
                state.customers = state.customers.filter(c => c.id !== action.payload);
            })
            .addCase(fetchLoyaltyHistory.fulfilled, (state, action) => {
                state.loyaltyHistory = action.payload;
            })
            .addCase(exportCustomersCsv.pending, (state) => {
                state.exportLoading = true;
                state.exportError = null;
            })
            .addCase(exportCustomersCsv.fulfilled, (state) => {
                state.exportLoading = false;
            })
            .addCase(exportCustomersCsv.rejected, (state, action) => {
                state.exportLoading = false;
                state.exportError = action.payload as string;
            });
    },
});

export const { clearSelectedCustomer, setSelectedCustomer } = customerSlice.actions;
export default customerSlice.reducer;
