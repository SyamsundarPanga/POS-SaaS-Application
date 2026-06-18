package com.possaas.service.admin;

import com.possaas.config.TenantContext;
import com.possaas.domain.order.Order;
import com.possaas.dto.response.*;
import com.possaas.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
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
public class AdminDashboardService {

        private final OrderRepository orderRepository;
        private final BranchRepository branchRepository;
        private final UserRepository userRepository;
        private final CustomerRepository customerRepository;
        private final ProductRepository productRepository;
        private final InventoryRepository inventoryRepository;

        /**
         * Get enterprise overview with optional date range filtering
         */
        public EnterpriseOverviewResponse getEnterpriseOverview(LocalDate startDate, LocalDate endDate) {
                String tenantId = TenantContext.getTenantId();
                DateRange range = normalizeRange(startDate, endDate);

                List<Order> allOrders;
                if (range.startDate() != null && range.endDate() != null) {
                        allOrders = orderRepository.findByTenantIdAndCreatedAtBetween(
                                        tenantId,
                                        range.startDate().atStartOfDay(),
                                        range.endDate().atTime(LocalTime.MAX));
                } else {
                        allOrders = orderRepository.findByTenantIdAndIsDeletedFalse(tenantId);
                }

                BigDecimal totalRevenue = sumOrderTotalAmount(allOrders);

                long activeBranches = branchRepository.countActiveBranches(tenantId);
                long totalEmployees = userRepository.countByTenantId(tenantId);
                long totalCustomers = Optional.ofNullable(customerRepository.countByTenantId(tenantId)).orElse(0L);
                int totalOrders = allOrders.size();

                BigDecimal monthOverMonthGrowth = BigDecimal.ZERO;

                return EnterpriseOverviewResponse.builder()
                                .totalRevenue(totalRevenue)
                                .activeBranches((int) activeBranches)
                                .totalEmployees((int) totalEmployees)
                                .totalCustomers((int) totalCustomers)
                                .totalOrders(totalOrders)
                                .monthOverMonthGrowth(monthOverMonthGrowth)
                                .build();
        }

        /**
         * Get revenue trend
         */
        public List<RevenueTrendResponse> getRevenueTrend(int months) {
                String tenantId = TenantContext.getTenantId();
                List<RevenueTrendResponse> trend = new ArrayList<>();

                for (int i = months - 1; i >= 0; i--) {
                        LocalDate monthStart = LocalDate.now().minusMonths(i).withDayOfMonth(1);
                        LocalDate monthEnd = monthStart.plusMonths(1).minusDays(1);

                        List<Order> monthOrders = orderRepository.findByTenantIdAndCreatedAtBetween(
                                        tenantId,
                                        monthStart.atStartOfDay(),
                                        monthEnd.atTime(LocalTime.MAX));

                        BigDecimal revenue = sumOrderTotalAmount(monthOrders);

                        trend.add(RevenueTrendResponse.builder()
                                        .month(monthStart.getMonth().toString())
                                        .revenue(revenue)
                                        .transactions(monthOrders.size())
                                        .build());
                }

                return trend;
        }

        /**
         * Branch performance
         */
        public List<BranchPerformanceResponse> getBranchPerformance(LocalDate startDate, LocalDate endDate) {
                String tenantId = TenantContext.getTenantId();
                DateRange range = normalizeRange(startDate, endDate);

                LocalDate effectiveStartDate = range.startDate() == null ? LocalDate.now().minusDays(30)
                                : range.startDate();
                LocalDate effectiveEndDate = range.endDate() == null ? LocalDate.now() : range.endDate();

                List<com.possaas.domain.branch.Branch> branches = branchRepository.findByStatusAndTenantId(
                                com.possaas.domain.branch.BranchStatus.ACTIVE, tenantId);
                List<BranchPerformanceResponse> performance = new ArrayList<>();

                for (com.possaas.domain.branch.Branch branch : branches) {

                        List<Order> branchOrders = orderRepository.findByTenantIdAndBranchIdAndCreatedAtBetween(
                                        tenantId,
                                        branch.getId(),
                                        effectiveStartDate.atStartOfDay(),
                                        effectiveEndDate.atTime(LocalTime.MAX));

                        BigDecimal revenue = sumOrderTotalAmount(branchOrders);

                        int transactions = branchOrders.size();

                        BigDecimal avgOrderValue = transactions > 0
                                        ? revenue.divide(BigDecimal.valueOf(transactions), 2, RoundingMode.HALF_UP)
                                        : BigDecimal.ZERO;

                        performance.add(BranchPerformanceResponse.builder()
                                        .branchId(branch.getId())
                                        .branchName(branch.getName())
                                        .revenue(revenue)
                                        .transactions(transactions)
                                        .averageOrderValue(avgOrderValue)
                                        .build());
                }

                return performance;
        }

        /**
         * Top products across all branches
         */
        public List<TopProductResponse> getTopProductsGlobal(int limit) {

                String tenantId = TenantContext.getTenantId();

                LocalDate startDate = LocalDate.now().minusDays(30);
                LocalDate endDate = LocalDate.now();

                List<Order> orders = orderRepository.findByTenantIdAndCreatedAtBetween(
                                tenantId,
                                startDate.atStartOfDay(),
                                endDate.atTime(LocalTime.MAX));

                Map<Long, ProductSalesData> productSales = new HashMap<>();

                for (Order order : orders) {
                        if (order.getLineItems() != null) {
                                for (com.possaas.domain.order.OrderLineItem item : order.getLineItems()) {

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
                                                .id(null) // optional
                                                .name(data.productName) // ✅ FIXED HERE
                                                .sku(data.sku)
                                                .quantitySold(data.quantity)
                                                .revenue(data.revenue)
                                                .build())
                                .collect(Collectors.toList());
        }

        public List<TopProductResponse> getTopProducts(Long branchId, int limit) {
                String tenantId = TenantContext.getTenantId();
                var pageable = PageRequest.of(0, limit);

                List<Object[]> rawResults = branchId != null
                                ? orderRepository.findTopProductsByBranch(tenantId, branchId, pageable)
                                : orderRepository.findTopProductsByTenant(tenantId, pageable);

                List<TopProductResponse> products = new ArrayList<>();
                int rank = 1;

                for (Object[] row : rawResults) {
                        Long productId = ((Number) row[0]).longValue();
                        String productName = (String) row[1];
                        String sku = (String) row[2];
                        String imageUrl = (String) row[3];
                        String categoryName = (String) row[4];
                        Integer totalUnitsSold = ((Number) row[5]).intValue();
                        BigDecimal totalRevenue = row[6] != null
                                        ? new BigDecimal(row[6].toString())
                                        : BigDecimal.ZERO;

                        List<Object[]> branchRaw = orderRepository.findProductSalesByBranch(tenantId, productId);

                        List<TopProductBranchBreakdownDto> breakdown = branchRaw.stream()
                                        .map(b -> TopProductBranchBreakdownDto.builder()
                                                        .branchId(((Number) b[0]).longValue())
                                                        .branchName((String) b[1])
                                                        .unitsSold(((Number) b[2]).intValue())
                                                        .revenue(b[3] != null ? new BigDecimal(b[3].toString()) : BigDecimal.ZERO)
                                                        .build())
                                        .collect(Collectors.toList());

                        products.add(TopProductResponse.builder()
                                        .id(productId)
                                        .name(productName)
                                        .productId(productId)
                                        .productName(productName)
                                        .sku(sku)
                                        .imageUrl(imageUrl)
                                        .categoryName(categoryName)
                                        .quantitySold(totalUnitsSold)
                                        .revenue(totalRevenue)
                                        .totalUnitsSold(totalUnitsSold)
                                        .totalRevenue(totalRevenue)
                                        .rank(rank++)
                                        .branchBreakdown(breakdown)
                                        .build());
                }

                return products;
        }

        public List<CategoryDistributionResponse> getCategoryDistribution(LocalDate startDate, LocalDate endDate) {
                String tenantId = TenantContext.getTenantId();

                // Category distribution should show all product categories regardless of date
                // range
                // This gives a complete view of product catalog organization
                return productRepository.getCategoryDistribution(tenantId);
        }

        public List<WeeklySalesResponse> getWeeklySalesData(LocalDate startDate, LocalDate endDate) {
                String tenantId = TenantContext.getTenantId();

                if (startDate == null || endDate == null) {
                        LocalDateTime lastWeek = LocalDateTime.now().minusDays(7);
                        return orderRepository.getWeeklySalesData(tenantId, lastWeek);
                }

                return orderRepository.getWeeklySalesData(tenantId, startDate.atStartOfDay());
        }

        public List<BranchPerformanceResponse> getBranchPerformanceData(LocalDate startDate, LocalDate endDate) {
                // Reuse the robust branch-performance aggregation logic instead of
                // constructor-based JPQL projection to avoid type-conversion failures.
                return getBranchPerformance(startDate, endDate);
        }

        public List<InventoryStatusResponse> getGlobalInventoryStatus(LocalDate startDate, LocalDate endDate) {
                String tenantId = TenantContext.getTenantId();
                log.info("Fetching global inventory status for tenant: {} with date range: {} to {}", tenantId,
                                startDate, endDate);
                // Note: Inventory status is typically a snapshot, not time-based
                // But we keep the parameters for consistency
                return inventoryRepository.getGlobalInventoryStatus(tenantId);
        }

        private BigDecimal sumOrderTotalAmount(List<Order> orders) {
                return orders.stream()
                                .map(Order::getTotalAmount)
                                .filter(Objects::nonNull)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        private DateRange normalizeRange(LocalDate startDate, LocalDate endDate) {
                if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
                        return new DateRange(endDate, startDate);
                }
                return new DateRange(startDate, endDate);
        }

        private record DateRange(LocalDate startDate, LocalDate endDate) {
        }

        /**
         * Helper class
         */
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
}
