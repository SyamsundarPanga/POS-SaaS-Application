package com.possaas.dto.request;

import com.possaas.domain.tenant.BillingCycle;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PendingRegistrationPaymentOrderRequest {

    @NotBlank(message = "Registration session token is required")
    private String sessionToken;

    private BillingCycle billingCycle = BillingCycle.MONTHLY;
}
