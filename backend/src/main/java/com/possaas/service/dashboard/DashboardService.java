package com.possaas.service.dashboard;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.possaas.config.TenantContext;
import com.possaas.dto.response.BranchDashboardDto;
import com.possaas.dto.response.CategoryDistributionResponse;
import com.possaas.dto.response.DashboardStatsDto;
import com.possaas.dto.response.OrderSummaryDto;
import com.possaas.repository.BranchRepository;
import com.possaas.repository.CustomerRepository;
import com.possaas.repository.InventoryRepository;
import com.possaas.repository.OrderRepository;
import com.possaas.repository.ProductRepository;
import com.possaas.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService {

    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final BranchRepository branchRepository;
    private final UserRepository userRepository;
    private final InventoryRepository inventoryRepository;

    /**
     * Get admin dashboard statistics (enterprise-wide)
     */
    
    
    @Transactional(readOnly = true)
    public DashboardStatsDto getAdminDashboard() {
        String tenantId = TenantContext.getTenantId();
        
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfToday = now.toLocalDate().atStartOfDay();
        LocalDateTime startOfYesterday = startOfToday.minusDays(1);
        LocalDateTime startOfWeek = startOfToday.minusDays(7);
        LocalDateTime startOfMonth = startOfToday.minusDays(30);

        // Sales Stats
        BigDecimal todaySales = calculateSales(tenantId, startOfToday, now);
        BigDecimal yesterdaySales = calculateSales(tenantId, startOfYesterday, startOfToday);
        BigDecimal weekSales = calculateSales(tenantId, startOfWeek, now);
        BigDecimal monthSales = calculateSales(tenantId, startOfMonth, now);
        
        // Calculate growth percentage
        BigDecimal salesGrowth = calculateGrowthPercentage(todaySales, yesterdaySales);

        // Order Stats
        Long todayOrders = countOrders(tenantId, startOfToday, now);
        Long weekOrders = countOrders(tenantId, startOfWeek, now);
        Long monthOrders = countOrders(tenantId, startOfMonth, now);
        Long totalOrders = orderRepository.countByTenantId(tenantId);

        // Customer Stats
        Long totalCustomers = customerRepository.countByTenantId(tenantId);
        Long newCustomersThisMonth = customerRepository.countByTenantIdAndCreatedAtAfter(tenantId, startOfMonth);
        Long activeCustomers = customerRepository.countActiveCustomers(tenantId);

        // Product Stats
        Long totalProducts = productRepository.countByTenantId(tenantId);
        Long lowStockProducts = inventoryRepository.countLowStockProducts(tenantId);
        Long outOfStockProducts = inventoryRepository.countOutOfStockProducts(tenantId);

        // Branch & Employee Stats
        Long activeBranches = branchRepository.countActiveBranches(tenantId);
        Long activeEmployees = userRepository.countByTenantId(tenantId);

        // Sales Trends (Last 7 days)
        List<DashboardStatsDto.SalesTrendDto> salesTrends = calculateSalesTrends(tenantId, 7);

        // Top Products (Top 10)
        List<DashboardStatsDto.TopProductDto> topProducts = getTopProducts(tenantId, 10);

        // Payment Distribution
        Map<String, DashboardStatsDto.PaymentDistributionDto> paymentDistribution = 
            getPaymentDistribution(tenantId, startOfMonth, now);

        // Recent Orders (Last 10)
        List<OrderSummaryDto> recentOrders = getRecentOrders(tenantId, 10);

        // Low Stock Alerts
        List<DashboardStatsDto.LowStockAlertDto> lowStockAlerts = getLowStockAlerts(tenantId, null);

        return DashboardStatsDto.builder()
                .todaySales(todaySales)
                .yesterdaySales(yesterdaySales)
                .weekSales(weekSales)
                .monthSales(monthSales)
                .salesGrowthPercentage(salesGrowth)
                .todayOrders(todayOrders)
                .weekOrders(weekOrders)
                .monthOrders(monthOrders)
                .totalOrders(totalOrders)
                .totalCustomers(totalCustomers)
                .newCustomersThisMonth(newCustomersThisMonth)
                .activeCustomers(activeCustomers)
                .totalProducts(totalProducts)
                .lowStockProducts(lowStockProducts)
                .outOfStockProducts(outOfStockProducts)
                .activeBranches(activeBranches)
                .activeEmployees(activeEmployees)
                .salesTrends(salesTrends)
                .topProducts(topProducts)
                .paymentDistribution(paymentDistribution)
                .recentOrders(recentOrders)
                .lowStockAlerts(lowStockAlerts)
                .build();
    }

    /**
     * Get branch manager dashboard statistics
     */
    @Transactional(readOnly = true)
    public BranchDashboardDto getBranchDashboard(Long branchId) {
        String tenantId = TenantContext.getTenantId();
        
        // Verify branch exists and belongs to tenant
        var branch = branchRepository.findByIdAndTenantId(branchId, tenantId)
                .orElseThrow(() -> new com.possaas.exception.ResourceNotFoundException(
                        "Branch not found with ID: " + branchId));

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfToday = now.toLocalDate().atStartOfDay();
        LocalDateTime startOfWeek = startOfToday.minusDays(7);
        LocalDateTime startOfMonth = startOfToday.minusDays(30);

        // Sales Stats (branch-specific would require branch_id in orders table)
        // For now, using tenant-wide stats
        BigDecimal todaySales = calculateSales(tenantId, startOfToday, now);
        BigDecimal weekSales = calculateSales(tenantId, startOfWeek, now);
        BigDecimal monthSales = calculateSales(tenantId, startOfMonth, now);
        BigDecimal yesterdaySales = calculateSales(tenantId, startOfToday.minusDays(1), startOfToday);
        BigDecimal salesGrowth = calculateGrowthPercentage(todaySales, yesterdaySales);

        // Order Stats
        Long todayOrders = countOrders(tenantId, startOfToday, now);
        Long weekOrders = countOrders(tenantId, startOfWeek, now);
        Long monthOrders = countOrders(tenantId, startOfMonth, now);

        // Employee Stats
        Long activeEmployees = userRepository.countByTenantId(tenantId);
        Long employeesOnShift = 0L; // Would require shift management

        // Inventory Stats (branch-specific)
        Long totalProducts = inventoryRepository.countByBranchId(branchId);
        Long lowStockProducts = inventoryRepository.countLowStockByBranch(branchId);
        BigDecimal inventoryValue = inventoryRepository.calculateInventoryValue(branchId);

        // Sales Trends
        List<DashboardStatsDto.SalesTrendDto> salesTrends = calculateSalesTrends(tenantId, 7);

        // Top Products
        List<DashboardStatsDto.TopProductDto> topProducts = getTopProducts(tenantId, 10);

        // Payment Distribution
        Map<String, DashboardStatsDto.PaymentDistributionDto> paymentDistribution = 
            getPaymentDistribution(tenantId, startOfMonth, now);

        // Recent Orders
        List<OrderSummaryDto> recentOrders = getRecentOrders(tenantId, 10);

        // Low Stock Alerts (branch-specific)
        List<DashboardStatsDto.LowStockAlertDto> lowStockAlerts = getLowStockAlerts(tenantId, branchId);

        return BranchDashboardDto.builder()
                .branchId(branchId)
                .branchName(branch.getName())
                .todaySales(todaySales)
                .weekSales(weekSales)
                .monthSales(monthSales)
                .salesGrowthPercentage(salesGrowth)
                .todayOrders(todayOrders)
                .weekOrders(weekOrders)
                .monthOrders(monthOrders)
                .activeEmployees(activeEmployees)
                .employeesOnShift(employeesOnShift)
                .totalProducts(totalProducts)
                .lowStockProducts(lowStockProducts)
                .inventoryValue(inventoryValue)
                .salesTrends(salesTrends)
                .topProducts(topProducts)
                .paymentDistribution(paymentDistribution)
                .recentOrders(recentOrders)
                .lowStockAlerts(lowStockAlerts)
                .build();
    }

    // Helper Methods

    private BigDecimal calculateSales(String tenantId, LocalDateTime start, LocalDateTime end) {
        BigDecimal sales = orderRepository.calculateTotalSales(tenantId, start, end);
        return sales != null ? sales : BigDecimal.ZERO;
    }

    private Long countOrders(String tenantId, LocalDateTime start, LocalDateTime end) {
        return orderRepository.countByTenantIdAndCreatedAtBetween(tenantId, start, end);
    }

    private BigDecimal calculateGrowthPercentage(BigDecimal current, BigDecimal previous) {
        if (previous == null || previous.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return current.subtract(previous)
                .divide(previous, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private List<DashboardStatsDto.SalesTrendDto> calculateSalesTrends(String tenantId, int days) {
        List<DashboardStatsDto.SalesTrendDto> trends = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            LocalDateTime start = date.atStartOfDay();
            LocalDateTime end = date.atTime(LocalTime.MAX);

            BigDecimal sales = calculateSales(tenantId, start, end);
            Long orders = countOrders(tenantId, start, end);

            trends.add(DashboardStatsDto.SalesTrendDto.builder()
                    .date(date)
                    .sales(sales)
                    .orders(orders)
                    .build());
        }

        return trends;
    }

    private List<DashboardStatsDto.TopProductDto> getTopProducts(String tenantId, int limit) {
        List<Object[]> results = orderRepository.findTopSellingProducts(tenantId, PageRequest.of(0, limit));
        
        return results.stream()
                .map(row -> DashboardStatsDto.TopProductDto.builder()
                        .productId((Long) row[0])
                        .productName((String) row[1])
                        .sku((String) row[2])
                        .quantitySold(((Number) row[3]).longValue())
                        .revenue((BigDecimal) row[4])
                        .build())
                .collect(Collectors.toList());
    }

    private Map<String, DashboardStatsDto.PaymentDistributionDto> getPaymentDistribution(
            String tenantId, LocalDateTime start, LocalDateTime end) {
        
        List<Object[]> results = orderRepository.getPaymentDistribution(tenantId, start, end);
        BigDecimal totalAmount = results.stream()
                .map(row -> (BigDecimal) row[2])
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return results.stream()
                .collect(Collectors.toMap(
                        row -> (String) row[0],
                        row -> {
                            BigDecimal amount = (BigDecimal) row[2];
                            Double percentage = totalAmount.compareTo(BigDecimal.ZERO) > 0
                                    ? amount.divide(totalAmount, 4, RoundingMode.HALF_UP)
                                            .multiply(BigDecimal.valueOf(100))
                                            .doubleValue()
                                    : 0.0;

                            return DashboardStatsDto.PaymentDistributionDto.builder()
                                    .method((String) row[0])
                                    .count(((Number) row[1]).longValue())
                                    .amount(amount)
                                    .percentage(percentage)
                                    .build();
                        }
                ));
    }

    private List<OrderSummaryDto> getRecentOrders(String tenantId, int limit) {
        var orders = orderRepository.findRecentOrders(tenantId, PageRequest.of(0, limit));
        
        return orders.stream()
                .map(order -> OrderSummaryDto.builder()
                        .id(order.getId())
                        .orderNumber(order.getOrderNumber())
                        .total(order.getTotalAmount())
                        .createdAt(order.getCreatedAt())
                        .status(order.getStatus())
                        .cashierName(order.getCashier() != null 
                                ? order.getCashier().getFirstName() + " " + order.getCashier().getLastName()
                                : "System")
                        .build())
                .collect(Collectors.toList());
    }

    private List<DashboardStatsDto.LowStockAlertDto> getLowStockAlerts(String tenantId, Long branchId) {
        List<Object[]> results = branchId != null
                ? inventoryRepository.findLowStockAlertsByBranch(branchId)
                : inventoryRepository.findLowStockAlerts(tenantId);

        return results.stream()
                .map(row -> DashboardStatsDto.LowStockAlertDto.builder()
                        .productId((Long) row[0])
                        .productName((String) row[1])
                        .sku((String) row[2])
                        .currentStock((Integer) row[3])
                        .minStockLevel((Integer) row[4])
                        .severity((String) row[5])
                        .branchId((Long) row[6])
                        .branchName((String) row[7])
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Get today's total revenue for the current tenant
     * @return Total revenue for today
     */
    @Transactional(readOnly = true)
    public BigDecimal getTodaysRevenue() {
        String tenantId = TenantContext.getTenantId();
        LocalDateTime startOfToday = LocalDateTime.now().toLocalDate().atStartOfDay();
        LocalDateTime endOfToday = LocalDateTime.now().toLocalDate().atTime(LocalTime.MAX);
        
        BigDecimal revenue = orderRepository.calculateTotalSales(tenantId, startOfToday, endOfToday);
        return revenue != null ? revenue : BigDecimal.ZERO;
    }

    /**
     * Get today's total transaction count for the current tenant
     * @return Number of transactions (orders) today
     */
    @Transactional(readOnly = true)
    public Long getTodaysTransactions() {
        String tenantId = TenantContext.getTenantId();
        LocalDateTime startOfToday = LocalDateTime.now().toLocalDate().atStartOfDay();
        LocalDateTime endOfToday = LocalDateTime.now().toLocalDate().atTime(LocalTime.MAX);
        
        return countOrders(tenantId, startOfToday, endOfToday);
    }

    /**
     * Get average order value for today
     * @return Average order value calculated as: today's revenue / today's transactions
     */
    @Transactional(readOnly = true)
    public BigDecimal getAverageOrderValue() {
        BigDecimal revenue = getTodaysRevenue();
        Long transactions = getTodaysTransactions();
        
        if (transactions == null || transactions <= 0) {
            return BigDecimal.ZERO;
        }
        
        return revenue.divide(BigDecimal.valueOf(transactions), 2, RoundingMode.HALF_UP);
    }
    
    
}
