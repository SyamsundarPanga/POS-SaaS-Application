package com.possaas.domain.customer;

public enum LoyaltyTransactionType {
    EARNED,          // Points earned from purchase
    REDEEMED,        // Points redeemed for discount
    EXPIRED,         // Points expired
    ADJUSTED,        // Manual adjustment by admin
    BONUS,           // Bonus points (birthday, referral, etc.)
    REFUNDED,        // Points refunded due to order cancellation
    TRANSFERRED      // Points transferred to another customer
}
