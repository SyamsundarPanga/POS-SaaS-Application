package com.possaas.dto.response;

import com.possaas.domain.tenant.SubscriptionPlanType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class SubscriptionPlanResponse {

    private String id;
    private SubscriptionPlanType planType;
    private Integer maxBranches;
    private Integer maxUsers;
    private Integer maxProducts;
    private BigDecimal monthlyPrice;
}