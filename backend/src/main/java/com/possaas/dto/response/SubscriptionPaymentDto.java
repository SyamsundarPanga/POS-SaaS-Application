package com.possaas.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.possaas.domain.tenant.BillingCycle;
import com.possaas.domain.tenant.SubscriptionPaymentStatus;
import com.possaas.domain.tenant.SubscriptionPlanType;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SubscriptionPaymentDto {
    private Long id;
    private String tenantId;
    private Long storeAdminId;
    private SubscriptionPlanType subscriptionPlan;
    private BillingCycle billingCycle;
    private BigDecimal amount;
    private String razorpayOrderId;
    private String razorpayPaymentId;
    private String razorpaySignature;
    private SubscriptionPaymentStatus paymentStatus;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
