package com.possaas.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsResponse {
    private TodaySummaryResponse todaySummary;
    private List<SalesTrendResponse> salesTrend;
    private List<PaymentDistributionResponse> paymentDistribution;
    private List<TopProductResponse> topProducts;
    private List<LowStockAlertResponse> lowStockAlerts;
    private List<ActiveCashierResponse> activeCashiers;
    private List<EmployeePerformanceResponse> topCashiers;
}
