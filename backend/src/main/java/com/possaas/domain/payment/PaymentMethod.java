package com.possaas.domain.payment;

/**
 * Payment methods supported by the POS system
 * CASH - Direct cash payment
 * CARD - Card payment via Razorpay gateway
 */
public enum PaymentMethod {
    CASH,
    CARD,
    UPI
}
