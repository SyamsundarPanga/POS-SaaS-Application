import api from './api';

export interface SplitPaymentDetail {
  method: 'CASH' | 'CARD';
  amount: number;
  transactionId?: string;
}

export interface SplitPaymentRequest {
  customerId: number;
  lineItems: {
    productId: number;
    quantity: number;
  }[];
  payments: SplitPaymentDetail[];
  notes?: string;
  branchId?: number;
}

export interface SplitPaymentResponse {
  id: number;
  orderNumber: string;
  total: number;
  taxAmount?: number;
  discountAmount?: number;
  subtotalBeforeDiscount?: number;
  finalTotal?: number;
  status: string;
  payments: {
    id: number;
    method: string;
    amount: number;
    status: string;
    transactionId?: string;
  }[];
}

const splitPaymentService = {
  createSplitPaymentOrder: async (request: SplitPaymentRequest): Promise<SplitPaymentResponse> => {
    const response = await api.post('/orders/split-payment', request);
    return response.data;
  },
};

export default splitPaymentService;
