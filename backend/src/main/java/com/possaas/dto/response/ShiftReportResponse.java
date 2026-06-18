package com.possaas.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShiftReportResponse {
    private ShiftResponse shift;
    private Integer totalTransactions;
    private BigDecimal totalSales;
    private Map<String, BigDecimal> paymentBreakdown;
    private BigDecimal expectedCash;
    private BigDecimal actualCash;
    private BigDecimal variance;
}
