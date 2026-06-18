package com.possaas.dto.request;

import com.possaas.domain.tenant.SubscriptionPlanType;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateSubscriptionPlanRequest {

    private String id;
    private SubscriptionPlanType planType;
    private Integer maxBranches;
    private Integer maxUsers;
    private Integer maxProducts;
    private BigDecimal monthlyPrice;
}