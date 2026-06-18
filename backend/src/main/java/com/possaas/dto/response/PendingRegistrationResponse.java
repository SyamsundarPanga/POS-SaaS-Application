package com.possaas.dto.response;

import com.possaas.domain.tenant.BillingCycle;
import com.possaas.domain.tenant.SubscriptionPaymentStatus;
import com.possaas.domain.tenant.SubscriptionPlanType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PendingRegistrationResponse {
    private String sessionToken;
    private String storeName;
    private String adminEmail;
    private SubscriptionPlanType plan;
    private BillingCycle billingCycle;
    private boolean emailVerified;
    private SubscriptionPaymentStatus paymentStatus;
    private boolean completed;
    private String message;
}
