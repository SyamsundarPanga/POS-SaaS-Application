package com.possaas.dto.response;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SuperAdminDashboardResponse {

    // Platform-wide metrics
    private Long totalTenants;
    private Long activeTenants;
    private Long inactiveTenants;

    // Subscription metrics
    private Long basicPlanCount;
    private Long proPlanCount;
    private Long advancePlanCount;

    // Revenue metrics
    private BigDecimal totalMonthlyRevenue;
    private BigDecimal projectedAnnualRevenue;
    private BigDecimal todayRevenue;
    private Long todayOrders;

    // Usage metrics
    private Long totalUsers;
    private Long totalBranches;
    private Long totalProducts;
    private Long totalOrders;

    // Recent activity
    private Long tenantsCreatedThisMonth;
    private Long tenantsCreatedToday;
}
