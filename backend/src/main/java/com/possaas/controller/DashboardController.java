package com.possaas.controller;

import com.possaas.dto.response.*;
import com.possaas.service.admin.AdminDashboardService;
import com.possaas.service.dashboard.DashboardService;
import com.possaas.service.manager.ManagerDashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Dashboard and analytics APIs")
public class DashboardController {

    private final DashboardService dashboardService;
    private final AdminDashboardService adminDashboardService;
    private final ManagerDashboardService managerDashboardService;

    @GetMapping("/admin")
    @PreAuthorize("hasAnyAuthority('ROLE_STORE_ADMIN', 'ROLE_SUPER_ADMIN')")
    @Operation(
        summary = "Get admin dashboard statistics",
        description = "Retrieve enterprise-wide dashboard statistics including sales, orders, customers, and inventory metrics."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Dashboard statistics retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Forbidden - Only STORE_ADMIN can access")
    })
    public ResponseEntity<DashboardStatsDto> getAdminDashboard() {
        DashboardStatsDto stats = dashboardService.getAdminDashboard();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/branch/{branchId}")
    @PreAuthorize("hasAnyAuthority('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER')")
    @Operation(
        summary = "Get branch dashboard statistics",
        description = "Retrieve branch-specific dashboard statistics including sales, orders, employees, and inventory metrics."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Branch dashboard statistics retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Branch not found"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<BranchDashboardDto> getBranchDashboard(@PathVariable Long branchId) {
        BranchDashboardDto stats = dashboardService.getBranchDashboard(branchId);
        return ResponseEntity.ok(stats);
    }

    // =====================================================
    // ADMIN DASHBOARD (Merged from AdminDashboardController)
    // =====================================================

    @GetMapping("/admin/overview")
    @PreAuthorize("hasAuthority('ROLE_STORE_ADMIN')")
    @Operation(summary = "Get enterprise overview with optional date range filtering")
    public ResponseEntity<EnterpriseOverviewResponse> getOverview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(adminDashboardService.getEnterpriseOverview(startDate, endDate));
    }

    @GetMapping("/admin/revenue-trend")
    @PreAuthorize("hasAuthority('ROLE_STORE_ADMIN')")
    @Operation(summary = "Get revenue trend (monthly)")
    public ResponseEntity<List<RevenueTrendResponse>> getRevenueTrend(
            @RequestParam(defaultValue = "12") int months) {
        return ResponseEntity.ok(adminDashboardService.getRevenueTrend(months));
    }

    @GetMapping("/admin/branch-performance")
    @PreAuthorize("hasAuthority('ROLE_STORE_ADMIN')")
    @Operation(summary = "Get branch performance comparison")
    public ResponseEntity<List<BranchPerformanceResponse>> getBranchPerformance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(adminDashboardService.getBranchPerformance(startDate, endDate));
    }

    @GetMapping("/admin/top-products-global")
    @PreAuthorize("hasAuthority('ROLE_STORE_ADMIN')")
    @Operation(summary = "Get top products across all branches")
    public ResponseEntity<List<TopProductResponse>> getTopProductsGlobal(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(adminDashboardService.getTopProductsGlobal(limit));
    }

    @GetMapping("/top-products")
    @PreAuthorize("hasAnyAuthority('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER')")
    @Operation(summary = "Get top products with optional branch filter")
    public ResponseEntity<List<TopProductResponse>> getTopProducts(
            @RequestParam(required = false) Long branchId,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(adminDashboardService.getTopProducts(branchId, limit));
    }
    
    @GetMapping("/admin/category-distribution")
    @PreAuthorize("hasAuthority('ROLE_STORE_ADMIN')")
    @Operation(summary = "Get product count distribution by category with optional date range")
    public ResponseEntity<List<CategoryDistributionResponse>> getCategoryDistribution(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(adminDashboardService.getCategoryDistribution(startDate, endDate));
    }

    /**
     * Get sales revenue for the last 7 days (Weekly Sales Component) with optional date range
     */
    @GetMapping("/admin/weekly-sales")
    @PreAuthorize("hasAuthority('ROLE_STORE_ADMIN')")
    @Operation(summary = "Get sales revenue with optional date range", description = "Aggregates revenue by day for the specified date range or last 7 days.")
    public ResponseEntity<List<WeeklySalesResponse>> getWeeklySales(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(adminDashboardService.getWeeklySalesData(startDate, endDate));
    }

    /**
     * Get branch performance comparison data (Branch Performance Component) with optional date range
     */
    @GetMapping("/admin/branch-performance-data")
    @PreAuthorize("hasAuthority('ROLE_STORE_ADMIN')")
    @Operation(summary = "Get branch revenue comparison with optional date range", description = "Aggregates total revenue for each branch for the specified date range.")
    public ResponseEntity<List<BranchPerformanceResponse>> getBranchPerformanceData(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(adminDashboardService.getBranchPerformanceData(startDate, endDate));
    }
    
    
    
    
    
    
    
    // =====================================================
    // MANAGER DASHBOARD (Merged from ManagerDashboardController)
    // =====================================================

    /**
     * Get today's sales summary
     */
    @GetMapping("/manager/today-summary")
    @PreAuthorize("hasAnyAuthority('ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    @Operation(summary = "Get today's sales summary")
    public ResponseEntity<TodaySummaryResponse> getTodaySummary() {
        return ResponseEntity.ok(managerDashboardService.getTodaySummary());
    }

    /**
     * Get sales trend for last N days
     */
    @GetMapping("/manager/sales-trend")
    @PreAuthorize("hasAnyAuthority('ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    @Operation(summary = "Get sales trend chart data")
    public ResponseEntity<List<SalesTrendResponse>> getSalesTrend(
            @RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.ok(managerDashboardService.getSalesTrend(days));
    }

    /**
     * Get payment method distribution
     */
    @GetMapping("/manager/payment-distribution")
    @PreAuthorize("hasAnyAuthority('ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    @Operation(summary = "Get payment method distribution")
    public ResponseEntity<List<PaymentDistributionResponse>> getPaymentDistribution(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(managerDashboardService.getPaymentDistribution(startDate, endDate));
    }

    /**
     * Get top selling products
     */
    @GetMapping("/manager/top-products")
    @PreAuthorize("hasAnyAuthority('ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    @Operation(summary = "Get top selling products")
    public ResponseEntity<List<TopProductResponse>> getTopProducts(
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(managerDashboardService.getTopProducts(limit, startDate, endDate));
    }

    /**
     * Get low stock alerts
     */
    @GetMapping("/manager/low-stock")
    @PreAuthorize("hasAnyAuthority('ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    @Operation(summary = "Get low stock alerts")
    public ResponseEntity<List<LowStockAlertResponse>> getLowStockAlerts() {
        return ResponseEntity.ok(managerDashboardService.getLowStockAlerts());
    }

    /**
     * Get active cashiers and current shift status
     */
    @GetMapping("/manager/active-cashiers")
    @PreAuthorize("hasAnyAuthority('ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    @Operation(summary = "Get active cashiers with shift status")
    public ResponseEntity<List<ActiveCashierResponse>> getActiveCashiers() {
        return ResponseEntity.ok(managerDashboardService.getActiveCashiers());
    }

    /**
     * Get complete dashboard data in one call
     */
    @GetMapping("/manager")
    @PreAuthorize("hasAnyAuthority('ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    @Operation(summary = "Get complete dashboard data")
    public ResponseEntity<DashboardStatsResponse> getDashboardStats(
            @RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.ok(managerDashboardService.getCompleteDashboardStats(days));
    }

    // =====================================================
    // ANALYTICS METRICS - Individual endpoints
    // =====================================================

    /**
     * Get today's total revenue
     */
    @GetMapping("/todays-revenue")
    @PreAuthorize("hasAnyAuthority('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER', 'ROLE_CASHIER')")
    @Operation(summary = "Get today's total revenue")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Today's revenue retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<?> getTodaysRevenue() {
        return ResponseEntity.ok(dashboardService.getTodaysRevenue());
    }

    /**
     * Get today's transaction count
     */
    @GetMapping("/todays-transactions")
    @PreAuthorize("hasAnyAuthority('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER', 'ROLE_CASHIER')")
    @Operation(summary = "Get today's transaction count")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Today's transaction count retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<?> getTodaysTransactions() {
        return ResponseEntity.ok(dashboardService.getTodaysTransactions());
    }

    
    
    /**
     * Get average order value for today
     */
    @GetMapping("/average-order-value")
    @PreAuthorize("hasAnyAuthority('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER', 'ROLE_CASHIER')")
    @Operation(summary = "Get today's average order value")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Average order value retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<?> getAverageOrderValue() {
        return ResponseEntity.ok(dashboardService.getAverageOrderValue());
    }
    
    @GetMapping("/admin/inventory-status")
    @PreAuthorize("hasAuthority('ROLE_STORE_ADMIN')")
    @Operation(summary = "Get global inventory health grouped by category with optional date range")
    public ResponseEntity<List<InventoryStatusResponse>> getGlobalInventoryStatus(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(adminDashboardService.getGlobalInventoryStatus(startDate, endDate));
    }
}
