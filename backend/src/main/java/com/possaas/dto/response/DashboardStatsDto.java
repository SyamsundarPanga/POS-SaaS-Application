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
public class DashboardStatsDto {

    // Overview Stats
    private BigDecimal todaySales;
    private BigDecimal yesterdaySales;
    private BigDecimal weekSales;
    private BigDecimal monthSales;
    private BigDecimal salesGrowthPercentage;
    
    private Long todayOrders;
    private Long weekOrders;
    private Long monthOrders;
    private Long totalOrders;
    
    private Long totalCustomers;
    private Long newCustomersThisMonth;
    private Long activeCustomers;
    
    private Long totalProducts;
    private Long lowStockProducts;
    private Long outOfStockProducts;
    
    private Long activeBranches;
    private Long activeEmployees;
    
    // Sales Trends (Last 7 days)
    private List<SalesTrendDto> salesTrends;
    
    // Top Products
    private List<TopProductDto> topProducts;
    
    // Payment Distribution
    private Map<String, PaymentDistributionDto> paymentDistribution;
    
    // Recent Orders
    private List<OrderSummaryDto> recentOrders;
    
    // Low Stock Alerts
    private List<LowStockAlertDto> lowStockAlerts;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SalesTrendDto {
        private LocalDate date;
        private BigDecimal sales;
        private Long orders;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopProductDto {
        private Long productId;
        private String productName;
        private String sku;
        private Long quantitySold;
        private BigDecimal revenue;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentDistributionDto {
        private String method;
        private Long count;
        private BigDecimal amount;
        private Double percentage;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LowStockAlertDto {
        private Long productId;
        private String productName;
        private String sku;
        private Integer currentStock;
        private Integer minStockLevel;
        private String severity;
        private Long branchId;
        private String branchName;
    }
}
