package com.possaas.dto.request;

import com.possaas.domain.tenant.BillingCycle;
import com.possaas.domain.tenant.SubscriptionPlanType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class VerifySubscriptionPaymentRequest {
    @NotBlank
    private String razorpayOrderId;
    @NotBlank
    private String razorpayPaymentId;
    @NotBlank
    private String razorpaySignature;
    @NotNull
    private SubscriptionPlanType plan;
    @NotNull
    private BillingCycle billingCycle;
}
