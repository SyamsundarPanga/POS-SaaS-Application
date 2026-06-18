import api from './api';

export interface Customer {
    id: number;
    firstName: string;
    lastName: string;
    name?: string; // Computed full name from backend
    email: string;
    phone: string;
    address?: string;
    loyaltyPoints: number;
    loyaltyTier: string;
    totalPurchases: number;
    totalSpent: number;
    status: string;
    createdAt: string;
}

export interface CustomerQueryOptions {
    branchId?: number | null;
}

export interface CreateCustomerRequest {
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    address?: string;
}

export interface LoyaltyTransaction {
    id: number;
    customerId: number;
    points: number;
    type: 'EARNED' | 'REDEEMED' | 'EXPIRED' | 'ADJUSTED';
    description: string;
    createdAt: string;
}

const customerService = {
    getAll: (page: number = 0, size: number = 20, options?: CustomerQueryOptions) =>
        api.get('/customers', {
            params: {
                page,
                size,
                ...(typeof options?.branchId === 'number' ? { branchId: options.branchId } : {}),
            },
        }),

    getById: (id: number) =>
        api.get(`/customers/${id}`),

    search: (query: string) =>
        api.get(`/customers/search?query=${query}`),

    create: (data: CreateCustomerRequest) =>
        api.post('/customers', data),

    update: (id: number, data: Partial<CreateCustomerRequest>) =>
        api.put(`/customers/${id}`, data),

    delete: (id: number) =>
        api.delete(`/customers/${id}`),

    getLoyaltyPoints: (id: number) =>
        api.get(`/customers/${id}/loyalty-points`),

    addLoyaltyPoints: (id: number, points: number, description: string) =>
        api.post(`/customers/${id}/loyalty-points/add`, { points, description }),

    redeemLoyaltyPoints: (id: number, points: number) =>
        api.post(`/customers/${id}/loyalty-points/redeem`, { points }),

    getLoyaltyHistory: (id: number) =>
        api.get<LoyaltyTransaction[]>(`/customers/${id}/loyalty-history`),
};

export default customerService;
