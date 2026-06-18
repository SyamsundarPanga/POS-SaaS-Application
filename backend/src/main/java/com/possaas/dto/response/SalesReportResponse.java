package com.possaas.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SalesReportResponse {
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal totalRevenue;
    private Integer transactionCount;
    private List<TopProductResponse> topProducts;
    private List<PaymentDistributionResponse> paymentBreakdown;
}
