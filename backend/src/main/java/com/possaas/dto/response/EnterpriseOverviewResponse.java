package com.possaas.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnterpriseOverviewResponse {
    private BigDecimal totalRevenue;
    private Integer activeBranches;
    private Integer totalEmployees;
    private Integer totalCustomers;
    private Integer totalOrders;
    private BigDecimal monthOverMonthGrowth;
}
