package com.possaas.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.possaas.domain.tenant.SubscriptionStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantOverviewResponse {

    private String tenantId;
    private String tenantName;
    private boolean active;
    private String planType;
    private SubscriptionStatus subscriptionStatus;
    private LocalDateTime subscriptionStartDate;
    private LocalDateTime nextBillingDate;
    private BigDecimal monthlyPrice;

    // Usage statistics
    private Long currentUsers;
    private Integer maxUsers;
    private Long currentBranches;
    private Integer maxBranches;
    private Long currentProducts;
    private Integer maxProducts;

    // Activity metrics
    private LocalDateTime createdAt;
    private Long totalOrders;
    private BigDecimal totalRevenue;
}
