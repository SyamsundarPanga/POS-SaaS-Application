package com.possaas.dto.response;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class CustomerStatsDto {
    private Long totalCustomers;
    private Long activeCustomers;
    private Long inactiveCustomers;
    private Long vipCustomers;
    private BigDecimal totalRevenue;
    private BigDecimal averageOrderValue;
    private Integer totalLoyaltyPointsIssued;
    private Integer totalLoyaltyPointsRedeemed;
    private Long newCustomersThisMonth;
    private Long newCustomersLastMonth;
    private Double customerGrowthRate;
}
