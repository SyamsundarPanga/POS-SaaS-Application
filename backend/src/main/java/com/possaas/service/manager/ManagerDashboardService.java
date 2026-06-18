package com.possaas.service.manager;

import com.possaas.config.TenantContext;
import com.possaas.domain.order.Order;
import com.possaas.domain.order.OrderLineItem;
import com.possaas.domain.user.User;
import com.possaas.dto.response.*;
import com.possaas.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ManagerDashboardService {

        private final OrderRepository orderRepository;
        private final ProductRepository productRepository;
        private final UserRepository userRepository;
        private final InventoryRepository inventoryRepository;

        private Long getCurrentUserBranchId() {
                String username = SecurityContextHolder.getContext().getAuthentication().getName();
                User user = userRepository.findByUsername(username)
                                .orElseThrow(() -> new RuntimeException("User not found"));

                if (user.getBranch() == null || user.getBranch().getId() == null) {
                        return null; // Return null instead of throwing exception to prevent dashboard crash
                }

                return user.getBranch().getId();
        }

        public TodaySummaryResponse getTodaySummary() {
                return getSummaryByDateRange(1);
        }

        public TodaySummaryResponse getSummaryByDateRange(int days) {
                log.info("Fetching dashboard summary for last {} days", days);
                String tenantId = TenantContext.getTenantId();
                Long branchId = getCurrentUserBranchId();

                LocalDate endDate = LocalDate.now();
                LocalDate startDate = endDate.minusDays(days - 1);
                log.info("Summary data range: {} to {}", startDate, endDate);

                List<Order> orders = orderRepository
                                .findByTenantIdAndBranchIdAndCreatedAtBetween(
                                                tenantId,
                                                branchId,
                                                startDate.atStartOfDay(),
                                                endDate.atTime(LocalTime.MAX));

                BigDecimal revenue = orders.stream()
                                .map(Order::getTotalAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                int transactions = orders.size();

                BigDecimal avgOrderValue = transactions > 0
                                ? revenue.divide(BigDecimal.valueOf(transactions), 2, RoundingMode.HALF_UP)
                                : BigDecimal.ZERO;

                return TodaySummaryResponse.builder()
                                .todayRevenue(revenue)
                                .todayTransactions(transactions)
                                .orders(transactions)
                                .averageOrderValue(avgOrderValue)
                                .build();
        }

        public List<SalesTrendResponse> getSalesTrend(int days) {
                log.info("Fetching sales trend for last {} days", days);
                String tenantId = TenantContext.getTenantId();
                Long branchId = getCurrentUserBranchId();

                LocalDate endDate = LocalDate.now();
                LocalDate startDate = endDate.minusDays(days - 1);

                List<Order> orders = orderRepository
                                .findByTenantIdAndBranchIdAndCreatedAtBetween(
                                                tenantId,
                                                branchId,
                                                startDate.atStartOfDay(),
                                                endDate.atTime(LocalTime.MAX));

                Map<LocalDate, List<Order>> ordersByDate = orders.stream()
                                .collect(Collectors.groupingBy(order -> order.getCreatedAt().toLocalDate()));

                List<SalesTrendResponse> trend = new ArrayList<>();

                for (int i = days - 1; i >= 0; i--) {
                        LocalDate date = LocalDate.now().minusDays(i);
                        List<Order> dayOrders = ordersByDate.getOrDefault(date, List.of());

                        BigDecimal revenue = dayOrders.stream()
                                        .map(Order::getTotalAmount)
                                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                        trend.add(SalesTrendResponse.builder()
                                        .date(date)
                                        .revenue(revenue)
                                        .transactions(dayOrders.size())
                                        .build());
                }

                return trend;
        }

        public List<PaymentDistributionResponse> getPaymentDistribution(
                        LocalDate startDate, LocalDate endDate) {

                String tenantId = TenantContext.getTenantId();
                Long branchId = getCurrentUserBranchId();

                if (startDate == null)
                        startDate = LocalDate.now().minusDays(30);
                if (endDate == null)
                        endDate = LocalDate.now();

                log.info("Fetching payment distribution for range: {} to {}", startDate, endDate);

                List<Order> orders = orderRepository
                                .findByTenantIdAndBranchIdAndCreatedAtBetween(
                                                tenantId,
                                                branchId,
                                                startDate.atStartOfDay(),
                                                endDate.atTime(LocalTime.MAX));

                Map<String, BigDecimal> paymentTotals = new HashMap<>();
                BigDecimal grandTotal = BigDecimal.ZERO;

                for (Order order : orders) {
                        if (order.getPayments() != null) {
                                for (com.possaas.domain.payment.Payment payment : order.getPayments()) {

                                        String method = payment.getMethod().name();
                                        BigDecimal amount = payment.getAmount();

                                        paymentTotals.merge(method, amount, BigDecimal::add);
                                        grandTotal = grandTotal.add(amount);
                                }
                        }
                }

                List<PaymentDistributionResponse> distribution = new ArrayList<>();

                for (Map.Entry<String, BigDecimal> entry : paymentTotals.entrySet()) {

                        double percentage = grandTotal.compareTo(BigDecimal.ZERO) > 0
                                        ? entry.getValue()
                                                        .divide(grandTotal, 4, RoundingMode.HALF_UP)
                                                        .multiply(BigDecimal.valueOf(100))
                                                        .doubleValue()
                                        : 0.0;

                        distribution.add(PaymentDistributionResponse.builder()
                                        .method(entry.getKey())
                                        .amount(entry.getValue())
                                        .percentage(percentage)
                                        .build());
                }

                return distribution;
        }

        public List<TopProductResponse> getTopProducts(
                        int limit, LocalDate startDate, LocalDate endDate) {

                String tenantId = TenantContext.getTenantId();
                Long branchId = getCurrentUserBranchId();

                if (startDate == null)
                        startDate = LocalDate.now().minusDays(30);
                if (endDate == null)
                        endDate = LocalDate.now();

                List<Order> orders = orderRepository
                                .findByTenantIdAndBranchIdAndCreatedAtBetween(
                                                tenantId,
                                                branchId,
                                                startDate.atStartOfDay(),
                                                endDate.atTime(LocalTime.MAX));

                Map<Long, ProductSalesData> productSales = new HashMap<>();

                for (Order order : orders) {
                        if (order.getLineItems() != null) {
                                for (OrderLineItem item : order.getLineItems()) {

                                        Long productId = item.getProduct().getId();

                                        productSales
                                                        .computeIfAbsent(productId,
                                                                        k -> new ProductSalesData(
                                                                                        item.getProduct().getName(),
                                                                                        item.getProduct().getSku()))
                                                        .addSale(
                                                                        item.getQuantity(),
                                                                        BigDecimal.valueOf(item.getLineTotal()));
                                }
                        }
                }

                return productSales.values()
                                .stream()
                                .sorted(Comparator
                                                .comparingInt((ProductSalesData d) -> d.quantity)
                                                .reversed())
                                .limit(limit)
                                .map(data -> TopProductResponse.builder()
                                                .id(null)
                                                .name(data.productName)
                                                .sku(data.sku)
                                                .quantitySold(data.quantity)
                                                .revenue(data.revenue)
                                                .build())
                                .collect(Collectors.toList());
        }

        private static class ProductSalesData {
                String productName;
                String sku;
                int quantity = 0;
                BigDecimal revenue = BigDecimal.ZERO;

                ProductSalesData(String productName, String sku) {
                        this.productName = productName;
                        this.sku = sku;
                }

                void addSale(int qty, BigDecimal amount) {
                        this.quantity += qty;
                        this.revenue = this.revenue.add(amount);
                }
        }

        public List<LowStockAlertResponse> getLowStockAlerts() {
                String tenantId = TenantContext.getTenantId();
                Long branchId = getCurrentUserBranchId();
                return inventoryRepository.findLowStockProductsByBranch(tenantId, branchId);
        }

        public List<ActiveCashierResponse> getActiveCashiers() {
                String tenantId = TenantContext.getTenantId();
                Long branchId = getCurrentUserBranchId();

                LocalDateTime startOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);

                return userRepository.findActiveCashiersByBranch(
                                tenantId,
                                branchId,
                                startOfDay);
        }

        public List<EmployeePerformanceResponse> getTopCashiersByOrders(LocalDate startDate, LocalDate endDate, int limit) {
                String tenantId = TenantContext.getTenantId();
                Long branchId = getCurrentUserBranchId();

                if (branchId == null) {
                        return List.of();
                }

                LocalDate start = startDate != null ? startDate : LocalDate.now().minusDays(6);
                LocalDate end = endDate != null ? endDate : LocalDate.now();

                List<Object[]> rows = orderRepository.findTopCashiersByOrderCount(
                                tenantId,
                                branchId,
                                start.atStartOfDay(),
                                end.atTime(LocalTime.MAX),
                                PageRequest.of(0, Math.max(1, limit)));

                List<EmployeePerformanceResponse> result = new ArrayList<>();
                for (Object[] r : rows) {
                        Long userId = (Long) r[0];
                        String firstName = (String) r[1];
                        String lastName = (String) r[2];
                        String username = (String) r[3];
                        Long orders = (Long) r[4];
                        BigDecimal totalRevenue = (BigDecimal) r[5];

                        int orderCount = orders == null ? 0 : orders.intValue();
                        BigDecimal avgOrderValue = orderCount > 0
                                        ? totalRevenue.divide(BigDecimal.valueOf(orderCount), 2, RoundingMode.HALF_UP)
                                        : BigDecimal.ZERO;

                        String name = ((firstName == null ? "" : firstName) + " " + (lastName == null ? "" : lastName)).trim();
                        if (name.isBlank()) {
                                name = username == null ? "Unknown" : username;
                        }

                        result.add(new EmployeePerformanceResponse(userId, name, branchId, orderCount, totalRevenue, avgOrderValue));
                }

                return result;
        }

        public DashboardStatsResponse getCompleteDashboardStats(int days) {
                log.info("Generating complete dashboard stats for last {} days", days);
                LocalDate endDate = LocalDate.now();
                LocalDate startDate = endDate.minusDays(days - 1);

                return DashboardStatsResponse.builder()
                                .todaySummary(getSummaryByDateRange(days))
                                .salesTrend(getSalesTrend(days))
                                .paymentDistribution(getPaymentDistribution(startDate, endDate))
                                .topProducts(getTopProducts(10, startDate, endDate))
                                .lowStockAlerts(getLowStockAlerts())
                                .activeCashiers(getActiveCashiers())
                                .topCashiers(getTopCashiersByOrders(startDate, endDate, 5))
                                .build();
        }
}
