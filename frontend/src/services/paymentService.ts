/**
 * Payment Service
 * 
 * Handles all payment-related operations including:
 * - Razorpay payment processing
 * - Cash payment recording
 * - Card payment processing
 * - Split payment handling
 * - Payment verification
 * - Payment history and reporting
 * 
 * @module paymentService
 */

import api from "./api";

// ============================================
// TYPE DEFINITIONS
// ============================================

export enum PaymentMethod {
  CASH = "CASH",
  CARD = "CARD",  // Razorpay online payment
  UPI = "UPI",
}

export enum PaymentStatus {
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  PENDING = "PENDING",
  REFUNDED = "REFUNDED",
}

export interface CreatePaymentOrderRequest {
  amount: number;
  currency?: string;
  orderId?: number;
  receipt?: string;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  keyId: string;
  orderId?: number;
}

export interface VerifyPaymentRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  orderId?: number;
}

export interface VerifyPaymentResponse {
  verified: boolean;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  timestamp: string;
  message: string;
}

export interface PaymentDto {
  id: number;
  orderId: number;
  method: PaymentMethod;
  amount: number;
  amountTendered?: number;
  changeAmount?: number;
  status: PaymentStatus;
  transactionId?: string;
  createdAt: string;
}

export interface SplitPaymentDetail {
  method: PaymentMethod;
  amount: number;
  transactionId?: string;
}

export interface PaymentSummary {
  method: string;
  totalAmount: number;
  transactionCount: number;
}

// ============================================
// RAZORPAY INTEGRATION
// ============================================

/**
 * Load Razorpay SDK script dynamically
 */
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const getCheckoutBranding = () => {
  try {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const storeName =
      storedUser?.storeName ||
      storedUser?.tenantName ||
      storedUser?.tenant?.name ||
      storedUser?.companyName;
    const branchName =
      storedUser?.branchName ||
      storedUser?.branch?.name ||
      storedUser?.assignedBranch?.name ||
      storedUser?.assignedBranchName;

    return {
      name: storeName || branchName || "PayPoint",
      descriptionSuffix: branchName || storeName || "Store",
    };
  } catch {
    return {
      name: "PayPoint",
      descriptionSuffix: "Store",
    };
  }
};

/**
 * Display Razorpay payment modal
 */
const displayRazorpayModal = (
  options: any,
  onSuccess: (response: any) => void,
  onFailure: (error: any) => void
): void => {
  const razorpay = new (window as any).Razorpay({
    ...options,
    handler: onSuccess,
    modal: {
      ondismiss: () => {
        onFailure({ error: "Payment cancelled by user" });
      },
    },
  });
  razorpay.open();
};

// ============================================
// PAYMENT SERVICE
// ============================================

const paymentService = {
  // ==========================================
  // RAZORPAY PAYMENT PROCESSING
  // ==========================================

  /**
   * Create Razorpay order in backend
   * 
   * @param amount - Payment amount in rupees
   * @param orderId - Optional order ID for reference
   * @param receipt - Optional receipt number
   * @returns Promise with Razorpay order details
   */
  createRazorpayOrder: async (
    amount: number,
    orderId?: number,
    receipt?: string
  ): Promise<RazorpayOrderResponse> => {
    const request: CreatePaymentOrderRequest = {
      amount,
      currency: "INR",
      orderId,
      receipt: receipt || `receipt_${Date.now()}`,
    };

    const response = await api.post<RazorpayOrderResponse>(
      "/payments/create-order",
      request
    );
    return response.data;
  },

  /**
   * Process Razorpay payment with modal
   * 
   * @param amount - Payment amount
   * @param orderId - Order ID
   * @param customerName - Customer name for payment modal
   * @param customerEmail - Customer email for payment modal
   * @param customerPhone - Customer phone for payment modal
   * @returns Promise with payment verification result
   */
  processRazorpayPayment: async (
    amount: number,
    orderId?: number,
    gatewayMethod: "card" | "upi" = "card",
    customerName?: string,
    customerEmail?: string,
    customerPhone?: string
  ): Promise<VerifyPaymentResponse> => {
    try {
      // Step 1: Load Razorpay SDK
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error("Failed to load Razorpay SDK");
      }

      // Step 2: Create order in backend
      const orderResponse = await paymentService.createRazorpayOrder(
        amount,
        orderId
      );

      // Step 3: Display Razorpay payment modal
      return new Promise((resolve, reject) => {
        const branding = getCheckoutBranding();
        const options = {
          key: orderResponse.keyId,
          amount: orderResponse.amount * 100, // Convert to paise
          currency: orderResponse.currency,
          name: branding.name,
          description: orderId
            ? `Payment for Order #${orderId} - ${branding.descriptionSuffix}`
            : `${branding.descriptionSuffix} checkout payment`,
          order_id: orderResponse.id,
          method: {
            card: true,
            upi: false,
            netbanking: true,
            wallet: false,
            emi: false,
            paylater: true,
          },
          prefill: {
            name: customerName || "",
            email: customerEmail || "",
            contact: customerPhone || "",
          },
          theme: {
            color: "#3B82F6",
          },
        };

        displayRazorpayModal(
          options,
          async (response: any) => {
            try {
              // Step 4: Verify payment signature
              const verificationResult = await paymentService.verifyPayment({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                orderId,
              });
              resolve(verificationResult);
            } catch (error) {
              reject(error);
            }
          },
          (error: any) => {
            reject(new Error(error?.error || "Payment declined"));
          }
        );
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Verify Razorpay payment signature
   * 
   * @param paymentData - Payment verification data
   * @returns Promise with verification result
   */
  verifyPayment: async (
    paymentData: VerifyPaymentRequest
  ): Promise<VerifyPaymentResponse> => {
    const response = await api.post<VerifyPaymentResponse>(
      "/payments/verify",
      paymentData
    );
    return response.data;
  },

  // ==========================================
  // CASH PAYMENT PROCESSING
  // ==========================================

  /**
   * Process cash payment
   * 
   * @param orderId - Order ID
   * @param amount - Payment amount
   * @param amountTendered - Cash amount given by customer
   * @returns Promise with payment details
   */
  processCashPayment: async (
    orderId: number,
    amount: number,
    amountTendered: number
  ): Promise<PaymentDto> => {
    const changeAmount = amountTendered - amount;

    if (changeAmount < 0) {
      throw new Error("Insufficient cash tendered");
    }

    const request = {
      orderId,
      method: PaymentMethod.CASH,
      amount,
      amountTendered,
      changeAmount,
      status: PaymentStatus.SUCCESS,
    };

    const response = await api.post<PaymentDto>("/payments/cash", request);
    return response.data;
  },

  // ==========================================
  // CARD PAYMENT PROCESSING
  // ==========================================

  /**
   * Process card payment (via Razorpay)
   * 
   * @param orderId - Order ID
   * @param amount - Payment amount
   * @param customerName - Customer name
   * @param customerEmail - Customer email
   * @param customerPhone - Customer phone
   * @returns Promise with payment verification result
   */
  processCardPayment: async (
    orderId: number,
    amount: number,
    customerName?: string,
    customerEmail?: string,
    customerPhone?: string
  ): Promise<VerifyPaymentResponse> => {
    return paymentService.processRazorpayPayment(
      amount,
      orderId,
      "card",
      customerName,
      customerEmail,
      customerPhone
    );
  },

  processUpiPayment: async (
    amount: number,
    customerName?: string,
    customerEmail?: string,
    customerPhone?: string
  ): Promise<VerifyPaymentResponse> => {
    return paymentService.processRazorpayPayment(
      amount,
      undefined,
      "upi",
      customerName,
      customerEmail,
      customerPhone
    );
  },

  // ==========================================
  // SPLIT PAYMENT PROCESSING
  // ==========================================

  /**
   * Process split payment (multiple payment methods)
   * 
   * @param orderId - Order ID
   * @param payments - Array of payment details
   * @returns Promise with payment results
   */
  processSplitPayment: async (
    orderId: number,
    payments: SplitPaymentDetail[]
  ): Promise<PaymentDto[]> => {
    const request = {
      orderId,
      payments,
    };

    const response = await api.post<PaymentDto[]>(
      "/payments/split",
      request
    );
    return response.data;
  },

  // ==========================================
  // PAYMENT RETRIEVAL
  // ==========================================

  /**
   * Get payment by ID
   * 
   * @param paymentId - Payment ID
   * @returns Promise with payment details
   */
  getPaymentById: async (paymentId: number): Promise<PaymentDto> => {
    const response = await api.get<PaymentDto>(`/payments/${paymentId}`);
    return response.data;
  },

  /**
   * Get all payments for an order
   * 
   * @param orderId - Order ID
   * @returns Promise with array of payments
   */
  getPaymentsByOrderId: async (orderId: number): Promise<PaymentDto[]> => {
    const response = await api.get<PaymentDto[]>(`/payments/order/${orderId}`);
    return response.data;
  },

  // ==========================================
  // PAYMENT REPORTING
  // ==========================================

  /**
   * Get daily sales total
   * 
   * @returns Promise with daily sales amount
   */
  getDailySales: async (): Promise<number> => {
    const response = await api.get<number>("/payments/daily-sales");
    return response.data;
  },

  /**
   * Get payment summary by method
   * 
   * @returns Promise with payment summary
   */
  getPaymentSummary: async (): Promise<PaymentSummary[]> => {
    const response = await api.get<any[]>("/payments/summary");
    
    // Transform backend response [method, totalAmount, count] to typed object
    return response.data.map((item: any[]) => ({
      method: item[0],
      totalAmount: item[1],
      transactionCount: item[2],
    }));
  },

  // ==========================================
  // REFUND PROCESSING
  // ==========================================

  /**
   * Refund payment for an order
   * 
   * @param orderId - Order ID
   * @param reason - Refund reason
   * @returns Promise with refund result
   */
  refundPayment: async (
    orderId: number,
    reason?: string
  ): Promise<{ status: string; message: string; orderId: number }> => {
    const params = reason ? { reason } : {};
    const response = await api.post<{
      status: string;
      message: string;
      orderId: number;
    }>(`/paymentits/refund/${orderId}`, null, { params });
    return response.data;
  },

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Calculate change amount
   * 
   * @param totalAmount - Total order amount
   * @param amountTendered - Cash given by customer
   * @returns Change amount
   */
  calculateChange: (totalAmount: number, amountTendered: number): number => {
    return Math.max(0, amountTendered - totalAmount);
  },

  /**
   * Validate payment amount
   * 
   * @param amount - Payment amount
   * @param orderTotal - Order total
   * @returns True if valid
   */
  validatePaymentAmount: (amount: number, orderTotal: number): boolean => {
    return amount > 0 && amount <= orderTotal;
  },

  /**
   * Format currency
   * 
   * @param amount - Amount to format
   * @param currency - Currency code (default: INR)
   * @returns Formatted currency string
   */
  formatCurrency: (amount: number, currency: string = "INR"): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
    }).format(amount);
  },

  /**
   * Test Razorpay configuration
   * 
   * @returns Promise with configuration status
   */
  testRazorpayConfig: async (): Promise<{
    status: string;
    mode: string;
    keyIdPrefix: string;
  }> => {
    const response = await api.get<{
      status: string;
      mode: string;
      keyIdPrefix: string;
    }>("/payments/test-config");
    return response.data;
  },
};

export default paymentService;
