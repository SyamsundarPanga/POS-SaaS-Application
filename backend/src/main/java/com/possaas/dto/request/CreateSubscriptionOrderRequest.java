package com.possaas.dto.request;

import com.possaas.domain.tenant.BillingCycle;
import com.possaas.domain.tenant.SubscriptionPlanType;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateSubscriptionOrderRequest {
    @NotNull
    private SubscriptionPlanType plan;

    @NotNull
    private BillingCycle billingCycle;
}
