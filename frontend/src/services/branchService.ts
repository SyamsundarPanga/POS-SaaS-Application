import api from './api';
import { Branch as BranchType } from '../types/branch';

export type Branch = BranchType;

export interface BranchSettings {
    id?: number;
    branchId: number;
    branchName?: string;
    openingHours: Record<string, string>; // e.g., {"MONDAY": "09:00-18:00"}
    taxRate: number;
    receiptTemplate?: string;
    paymentMethods: string[]; // e.g., ["CASH", "CARD", "UPI"]
    lowStockThreshold: number;
    discountEnabled?: boolean;
    maxDiscountPercent?: number;
    requireManagerApproval?: boolean;
    updatedAt?: string;
}

export interface BranchSettingsRequest {
    openingHours?: Record<string, string>;
    taxRate: number;
    receiptTemplate?: string;
    paymentMethods?: string[];
    lowStockThreshold: number;
    discountEnabled?: boolean;
    maxDiscountPercent?: number;
    requireManagerApproval?: boolean;
}

const branchService = {
    getBranches: async () => {
        // Use /active endpoint to get simple list instead of paginated response
        const response = await api.get('/branches/active');
        return response.data;
    },

    getAllBranchesList: async () => {
        const response = await api.get('/branches/all');
        return response.data;
    },

    getAllBranches: async (page = 0, size = 10) => {
        // Paginated endpoint
        const response = await api.get('/branches', {
            params: { page, size }
        });
        return response.data;
    },

    getBranchById: async (id: number) => {
        const response = await api.get(`/branches/${id}`);
        return response.data;
    },

    createBranch: async (data: Partial<Branch>) => {
        const response = await api.post('/branches', data);
        return response.data;
    },

    updateBranch: async (id: number, data: Partial<Branch>) => {
        const response = await api.put(`/branches/${id}`, data);
        return response.data;
    },

    deleteBranch: async (id: number) => {
        await api.delete(`/branches/${id}`);
    },

    updateBranchStatus: async (id: number, status: string) => {
        const response = await api.patch(`/branches/${id}/status`, null, {
            params: { status }
        });
        return response.data;
    },

    // Branch Settings endpoints
    getBranchSettings: async (branchId?: number): Promise<BranchSettings> => {
        const response = await api.get('/branches/settings', {
            params: branchId ? { branchId } : {}
        });
        return response.data;
    },

    updateBranchSettings: async (data: BranchSettingsRequest): Promise<BranchSettings> => {
        const response = await api.put('/branches/settings', data);
        return response.data;
    }
};

export default branchService;
