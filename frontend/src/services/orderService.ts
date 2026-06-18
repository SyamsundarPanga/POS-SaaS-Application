import api from './api';

export interface OrderItem {
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
}

export interface OrderLineItem {
    id?: number;
    productId: number;
    productName: string;
    quantity: number;
    price: number;
    lineTotal: number;
}

export interface Order {
    id: number;
    orderNumber: string;
    customerId?: number;
    customerName?: string;
    branchId: number;
    branchName: string;
    cashierId: number;
    cashierName: string;
    items: OrderItem[];
    lineItems?: OrderLineItem[];
    subtotal: number;
    tax: number;
    discount?: number;
    discountType?: 'PERCENTAGE' | 'FIXED';
    discountPercent?: number;
    discountAmount?: number;
    subtotalBeforeDiscount?: number;
    taxableAmount?: number;
    taxAmount?: number;
    finalTotal?: number;
    total: number;
    paymentMethod: string;
    paymentStatus?: string;
    status: string;
    shiftId?: number;
    shiftStatus?: string;
    createdAt: string;
}

export interface CreateOrderRequest {
    customerId?: number | null;  // Optional - for walk-in customers
    items: {
        productId: number;
        quantity: number;
    }[];
    paymentMethod: 'CASH' | 'CARD' | 'UPI';
    amountPaid: number;
    customerEmail?: string;  // Optional - for receipt
    discountType?: 'PERCENTAGE' | 'FIXED';
    discountPercent?: number;
    discountAmount?: number;
    taxableAmount?: number;
    taxAmount?: number;
    finalTotal?: number;
    paymentReference?: string;
    branchId?: number;
}

export interface ValidateDiscountRequest {
    branchId: number;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountPercent?: number;
    discountAmount?: number;
}

export interface ValidateDiscountResponse {
    allowed: boolean;
    maxAllowed: number;
    message: string;
}

export interface RefundRequest {
    orderId?: number;
    reason: string;
    customReason?: string;
    refundAmount?: number;
    managerPin?: string;
    items?: Array<{
        productId: number;
        quantity: number;
    }>;
    itemIds?: number[];
    notes?: string;
}

export interface VoidRequestPayload {
    orderId: number;
    reason: string;
    managerPin?: string;
    managerApprovalCode?: string;
}

export interface ManagerOrderFilters {
    search?: string;
    status?: string;
    paymentMethod?: string;
    cashierId?: number;
    startDate?: string; // ISO date format: YYYY-MM-DD
    endDate?: string;   // ISO date format: YYYY-MM-DD
    page?: number;
    size?: number;
    sort?: string;
}

const orderService = {
    getAll: (page: number = 0, size: number = 20, status?: string, branchId?: number) => {
        const params = new URLSearchParams({ page: page.toString(), size: size.toString() });
        if (status) params.append('status', status);
        if (branchId !== undefined) params.append('branchId', branchId.toString());
        return api.get(`/orders?${params.toString()}`);
    },

    getById: (id: number) =>
        api.get(`/orders/${id}`),

    getByBranch: (branchId: number, page: number = 0, size: number = 20) =>
        api.get(`/orders/branch/${branchId}?page=${page}&size=${size}`),

    getByCashier: (cashierId: number, page: number = 0, size: number = 20) =>
        api.get(`/orders/cashier/${cashierId}?page=${page}&size=${size}`),

    create: (data: CreateOrderRequest) =>
        api.post('/orders', data),

    validateDiscount: async (data: ValidateDiscountRequest): Promise<ValidateDiscountResponse> => {
        const response = await api.post('/orders/validate-discount', data);
        return response.data;
    },

    updateStatus: (id: number, status: string) =>
        api.put(`/orders/${id}/status`, { status }),

    /**
     * Get orders for the authenticated cashier
     */
    getMyOrders: async (page: number = 0, size: number = 10, startDate?: string, endDate?: string) => {
        const params = new URLSearchParams({ page: page.toString(), size: size.toString() });
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const response = await api.get(`/orders/my-orders?${params.toString()}`);
        return response.data;
    },

    /**
     * Export orders for the authenticated cashier
     */
    exportMyOrders: async (
        format: 'csv' | 'pdf' = 'csv',
        filters: { status?: string; startDate?: string; endDate?: string } = {}
    ) => {
        const params = new URLSearchParams();
        params.append('format', format);
        if (filters.status) params.append('status', filters.status);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);

        const response = await api.get(`/orders/my-orders/export?${params.toString()}`, {
            responseType: 'blob'
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `my_orders_${new Date().toISOString().split('T')[0]}.${format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        return response.data;
    },

    /**
     * Refund order (partial or full)
     */
    processRefund: async (refundData: any) => {
        const response = await api.post('/orders/refund', refundData);
        return response.data;
    },

    /**
     * Void transaction
     */
    voidOrder: async (voidData: VoidRequestPayload) => {
        const response = await api.post(`/orders/${voidData.orderId}/void`, voidData);
        return response.data;
    },

    /**
     * Request manager approval for voiding a completed order
     */
    requestVoidApproval: async (voidData: VoidRequestPayload) => {
        const response = await api.post('/orders/void-request', voidData);
        return response.data;
    },

    requestRefundApproval: async (refundData: RefundRequest) => {
        const response = await api.post('/orders/refund-request', refundData);
        return response.data;
    },

    approveVoidRequest: async (voidRequestId: number, comment?: string) => {
        const response = await api.post(`/orders/void-requests/${voidRequestId}/approve`, { comment });
        return response.data;
    },

    declineVoidRequest: async (voidRequestId: number, comment?: string) => {
        const response = await api.post(`/orders/void-requests/${voidRequestId}/decline`, { comment });
        return response.data;
    },

    approveRefundRequest: async (refundRequestId: number, comment?: string) => {
        const response = await api.post(`/orders/refund-requests/${refundRequestId}/approve`, { comment });
        return response.data;
    },

    declineRefundRequest: async (refundRequestId: number, comment?: string) => {
        const response = await api.post(`/orders/refund-requests/${refundRequestId}/decline`, { comment });
        return response.data;
    },

    /**
     * Email receipt
     */
    emailReceipt: async (orderId: number, email: string) => {
        return api.post('/orders/email-receipt', { orderId, email });
    },

    refund: (id: number, reason: string) =>
        api.post(`/orders/${id}/refund`, { reason }),

    // Manager-specific endpoints
    manager: {
        /**
         * Get orders for manager's branch with filters
         */
        getOrders: async (filters: ManagerOrderFilters = {}) => {
            const params = new URLSearchParams();

            if (filters.search) params.append('search', filters.search);
            if (filters.status) params.append('status', filters.status);
            if (filters.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
            if (filters.cashierId) params.append('cashierId', filters.cashierId.toString());
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.page !== undefined) params.append('page', filters.page.toString());
            if (filters.size !== undefined) params.append('size', filters.size.toString());
            if (filters.sort) params.append('sort', filters.sort);

            const response = await api.get(`/orders/manager?${params.toString()}`);
            return response.data;
        },

        /**
         * Process refund for an order
         */
        processRefund: async (orderId: number, refundData: RefundRequest) => {
            const response = await api.post(`/orders/manager/${orderId}/refund`, refundData);
            return response.data;
        },

        /**
         * Export orders to CSV
         */
        exportOrders: async (format: 'csv' | 'excel' | 'pdf' = 'csv', filters: Omit<ManagerOrderFilters, 'page' | 'size'> = {}) => {
            const params = new URLSearchParams();
            params.append('format', format);

            if (filters.status) params.append('status', filters.status);
            if (filters.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
            if (filters.cashierId) params.append('cashierId', filters.cashierId.toString());
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);

            const response = await api.get(`/orders/manager/export?${params.toString()}`, {
                responseType: 'blob'
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            return response.data;
        }
    }
};

export default orderService;
