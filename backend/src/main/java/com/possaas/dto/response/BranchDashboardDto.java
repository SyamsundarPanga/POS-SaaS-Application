package com.possaas.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BranchDashboardDto {

    private Long branchId;
    private String branchName;
    
    // Sales Stats
    private BigDecimal todaySales;
    private BigDecimal weekSales;
    private BigDecimal monthSales;
    private BigDecimal salesGrowthPercentage;
    
    private Long todayOrders;
    private Long weekOrders;
    private Long monthOrders;
    
    // Employee Stats
    private Long activeEmployees;
    private Long employeesOnShift;
    
    // Inventory Stats
    private Long totalProducts;
    private Long lowStockProducts;
    private BigDecimal inventoryValue;
    
    // Sales Trends
    private List<DashboardStatsDto.SalesTrendDto> salesTrends;
    
    // Top Products
    private List<DashboardStatsDto.TopProductDto> topProducts;
    
    // Payment Distribution
    private Map<String, DashboardStatsDto.PaymentDistributionDto> paymentDistribution;
    
    // Recent Orders
    private List<OrderSummaryDto> recentOrders;
    
    // Low Stock Alerts
    private List<DashboardStatsDto.LowStockAlertDto> lowStockAlerts;
}
