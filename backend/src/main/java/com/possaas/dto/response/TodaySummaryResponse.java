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
public class TodaySummaryResponse {
    private BigDecimal todayRevenue;
    private Integer todayTransactions;
    private Integer orders;
    private BigDecimal averageOrderValue;
}
