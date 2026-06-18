package com.possaas.dto.request;

import com.possaas.domain.tenant.SubscriptionPlanType;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DowngradePlanRequest {
    @NotNull
    private SubscriptionPlanType plan;
}
