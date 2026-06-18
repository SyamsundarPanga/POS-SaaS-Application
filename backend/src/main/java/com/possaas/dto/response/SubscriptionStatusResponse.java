package com.possaas.dto.response;

import java.time.LocalDateTime;

import com.possaas.domain.tenant.SubscriptionStatus;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SubscriptionStatusResponse {
    private SubscriptionStatus status;
    private LocalDateTime nextBillingDate;
    private LocalDateTime gracePeriodEndDate;
    private boolean cancelAtPeriodEnd;
    private LocalDateTime cancelledAt;
    private LocalDateTime dataRetentionUntil;
    private int retryCount;
    private LocalDateTime nextRetryAt;
    private String paymentMethodLast4;
    private String paymentMethodBrand;
}
