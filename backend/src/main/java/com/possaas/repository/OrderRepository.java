package com.possaas.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.possaas.domain.order.Order;
import com.possaas.dto.response.BranchPerformanceResponse;
import com.possaas.dto.response.WeeklySalesResponse;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

	// ==============================
	// Range Filter
	// ==============================
	@Query("SELECT o FROM Order o WHERE o.tenantId = :tenantId "
			+ "AND o.isDeleted = false "
			+ "AND (:startDate IS NULL OR o.createdAt >= :startDate) "
			+ "AND (:endDate IS NULL OR o.createdAt <= :endDate)")
	Page<Order> findAllByDateRange(
			@Param("tenantId") String tenantId,
			@Param("startDate") LocalDateTime startDate,
			@Param("endDate") LocalDateTime endDate,
			Pageable pageable);

	Page<Order> findByTenantIdAndIsDeletedFalseOrderByCreatedAtDesc(String tenantId, Pageable pageable);

	Page<Order> findByTenantIdAndIsDeletedFalseAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
			String tenantId, LocalDateTime startDate, Pageable pageable);

	Page<Order> findByTenantIdAndIsDeletedFalseAndCreatedAtLessThanEqualOrderByCreatedAtDesc(
			String tenantId, LocalDateTime endDate, Pageable pageable);

	Page<Order> findByTenantIdAndIsDeletedFalseAndCreatedAtBetweenOrderByCreatedAtDesc(
			String tenantId, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);

	Page<Order> findByTenantIdAndBranch_IdAndIsDeletedFalseOrderByCreatedAtDesc(
			String tenantId, Long branchId, Pageable pageable);

	Page<Order> findByTenantIdAndBranch_IdAndIsDeletedFalseAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
			String tenantId, Long branchId, LocalDateTime startDate, Pageable pageable);

	Page<Order> findByTenantIdAndBranch_IdAndIsDeletedFalseAndCreatedAtLessThanEqualOrderByCreatedAtDesc(
			String tenantId, Long branchId, LocalDateTime endDate, Pageable pageable);

	Page<Order> findByTenantIdAndBranch_IdAndIsDeletedFalseAndCreatedAtBetweenOrderByCreatedAtDesc(
			String tenantId, Long branchId, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);

	List<Order> findByTenantIdAndIsDeletedFalse(String tenantId);

	Optional<Order> findByOrderNumberAndTenantId(String orderNumber, String tenantId);

	// ==============================
	// Fetch Order With Full Details
	// ==============================
	@Query("SELECT DISTINCT o FROM Order o "
			+ "LEFT JOIN FETCH o.lineItems li "
			+ "LEFT JOIN FETCH li.product "
			+ "LEFT JOIN FETCH o.cashier "
			+ "WHERE o.id = :id AND o.tenantId = :tenantId")
	Optional<Order> findByIdWithDetails(
			@Param("id") Long id,
			@Param("tenantId") String tenantId);

	// ==============================
	// Order Number Generation
	// ==============================
	@Query("SELECT MAX(o.orderNumber) FROM Order o "
			+ "WHERE o.tenantId = :tenantId "
			+ "AND o.createdAt >= :startOfDay")
	Optional<String> findMaxOrderNumberForToday(
			@Param("tenantId") String tenantId,
			@Param("startOfDay") LocalDateTime startOfDay);

	// ==============================
	// Dashboard - Basic Metrics
	// ==============================
	@Query("SELECT COUNT(o) FROM Order o WHERE o.tenantId = :tenantId")
	Long countByTenantId(@Param("tenantId") String tenantId);

	@Query("SELECT COUNT(o) FROM Order o WHERE o.tenantId = :tenantId "
			+ "AND o.createdAt BETWEEN :start AND :end")
	Long countByTenantIdAndCreatedAtBetween(
			@Param("tenantId") String tenantId,
			@Param("start") LocalDateTime start,
			@Param("end") LocalDateTime end);

	@Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o "
			+ "WHERE o.tenantId = :tenantId "
			+ "AND o.createdAt BETWEEN :start AND :end "
			+ "AND o.isDeleted = false")
	BigDecimal calculateTotalSales(
			@Param("tenantId") String tenantId,
			@Param("start") LocalDateTime start,
			@Param("end") LocalDateTime end);

	@Query(value = "SELECT COALESCE(SUM(total_amount), 0) FROM orders "
			+ "WHERE created_at >= :start "
			+ "AND is_deleted = false", nativeQuery = true)
	BigDecimal calculatePlatformTotalSales(@Param("start") LocalDateTime start);

	@Query(value = "SELECT COUNT(*) FROM orders "
			+ "WHERE created_at >= :start "
			+ "AND is_deleted = false", nativeQuery = true)
	Long countPlatformTodayOrders(@Param("start") LocalDateTime start);

	@Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.tenantId = :tenantId")
	BigDecimal sumTotalAmountByTenantId(@Param("tenantId") String tenantId);

	// ==============================
	// Dashboard - Advanced Analytics
	// ==============================
	@Query("SELECT p.id, p.name, p.sku, SUM(li.quantity), SUM(li.lineTotal) "
			+ "FROM OrderLineItem li "
			+ "JOIN li.product p "
			+ "JOIN li.order o "
			+ "WHERE o.tenantId = :tenantId "
			+ "AND o.isDeleted = false "
			+ "GROUP BY p.id, p.name, p.sku "
			+ "ORDER BY SUM(li.quantity) DESC")
	List<Object[]> findTopSellingProducts(@Param("tenantId") String tenantId, Pageable pageable);

	@Query("""
			SELECT
				p.id AS productId,
				p.name AS productName,
				p.sku AS sku,
				p.imageUrl AS imageUrl,
				c.name AS categoryName,
				SUM(oli.quantity) AS totalUnitsSold,
				SUM(oli.quantity * oli.price) AS totalRevenue
			FROM OrderLineItem oli
			JOIN oli.order o
			JOIN oli.product p
			LEFT JOIN p.category c
			WHERE o.tenantId = :tenantId
			AND o.status IN ('COMPLETED', 'COMPLETE')
			AND o.isDeleted = false
			GROUP BY p.id, p.name, p.sku, p.imageUrl, c.name
			ORDER BY SUM(oli.quantity) DESC
			""")
	List<Object[]> findTopProductsByTenant(
			@Param("tenantId") String tenantId,
			Pageable pageable);

	@Query("""
			SELECT
				b.id AS branchId,
				b.name AS branchName,
				SUM(oli.quantity) AS unitsSold,
				SUM(oli.quantity * oli.price) AS revenue
			FROM OrderLineItem oli
			JOIN oli.order o
			JOIN o.branch b
			WHERE o.tenantId = :tenantId
			AND oli.product.id = :productId
			AND o.status IN ('COMPLETED', 'COMPLETE')
			AND o.isDeleted = false
			GROUP BY b.id, b.name
			ORDER BY SUM(oli.quantity) DESC
			""")
	List<Object[]> findProductSalesByBranch(
			@Param("tenantId") String tenantId,
			@Param("productId") Long productId);

	@Query("""
			SELECT
				p.id AS productId,
				p.name AS productName,
				p.sku AS sku,
				p.imageUrl AS imageUrl,
				c.name AS categoryName,
				SUM(oli.quantity) AS totalUnitsSold,
				SUM(oli.quantity * oli.price) AS totalRevenue
			FROM OrderLineItem oli
			JOIN oli.order o
			JOIN oli.product p
			LEFT JOIN p.category c
			WHERE o.tenantId = :tenantId
			AND o.branch.id = :branchId
			AND o.status IN ('COMPLETED', 'COMPLETE')
			AND o.isDeleted = false
			GROUP BY p.id, p.name, p.sku, p.imageUrl, c.name
			ORDER BY SUM(oli.quantity) DESC
			""")
	List<Object[]> findTopProductsByBranch(
			@Param("tenantId") String tenantId,
			@Param("branchId") Long branchId,
			Pageable pageable);

	@Query("SELECT pm.method, COUNT(pm), SUM(pm.amount) "
			+ "FROM Payment pm "
			+ "JOIN pm.order o "
			+ "WHERE o.tenantId = :tenantId "
			+ "AND o.createdAt BETWEEN :start AND :end "
			+ "AND o.isDeleted = false "
			+ "GROUP BY pm.method")
	List<Object[]> getPaymentDistribution(
			@Param("tenantId") String tenantId,
			@Param("start") LocalDateTime start,
			@Param("end") LocalDateTime end);

	@Query("SELECT o FROM Order o "
			+ "WHERE o.tenantId = :tenantId "
			+ "AND o.isDeleted = false "
			+ "ORDER BY o.createdAt DESC")
	List<Order> findRecentOrders(@Param("tenantId") String tenantId, Pageable pageable);

	// ==============================
	// Multi-Branch Queries
	// ==============================
	List<Order> findByTenantIdAndBranchIdAndCreatedAtBetween(
			String tenantId, Long branchId, LocalDateTime start, LocalDateTime end);

	List<Order> findByTenantIdAndCreatedAtBetween(
			String tenantId, LocalDateTime start, LocalDateTime end);

	// ==============================
	// Cashier Performance (Orders)
	// ==============================
	@Query("""
			SELECT
				o.cashier.id,
				o.cashier.firstName,
				o.cashier.lastName,
				o.cashier.username,
				COUNT(o),
				COALESCE(SUM(o.totalAmount), 0)
			FROM Order o
			WHERE o.tenantId = :tenantId
			AND o.isDeleted = false
			AND o.branch.id = :branchId
			AND o.status = com.possaas.domain.order.OrderStatus.COMPLETED
			AND o.createdAt BETWEEN :start AND :end
			GROUP BY o.cashier.id, o.cashier.firstName, o.cashier.lastName, o.cashier.username
			ORDER BY COUNT(o) DESC
			""")
	List<Object[]> findTopCashiersByOrderCount(
			@Param("tenantId") String tenantId,
			@Param("branchId") Long branchId,
			@Param("start") LocalDateTime start,
			@Param("end") LocalDateTime end,
			Pageable pageable);

	// ==============================
	// Cashier Specific Queries
	// ==============================
	Page<Order> findByCashierIdAndIsDeletedFalseOrderByCreatedAtDesc(Long cashierId, Pageable pageable);

	Page<Order> findByCashierIdAndIsDeletedFalseAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
			Long cashierId, LocalDateTime startDate, Pageable pageable);

	Page<Order> findByCashierIdAndIsDeletedFalseAndCreatedAtLessThanEqualOrderByCreatedAtDesc(
			Long cashierId, LocalDateTime endDate, Pageable pageable);

	Page<Order> findByCashierIdAndIsDeletedFalseAndCreatedAtBetweenOrderByCreatedAtDesc(Long cashierId,
			LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);

	@Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o "
			+ "WHERE o.cashier.id = :cashierId AND o.tenantId = :tenantId "
			+ "AND o.status IN ('COMPLETED', 'COMPLETE') AND o.isDeleted = false")
	BigDecimal calculateTotalSalesByCashier(
			@Param("cashierId") Long cashierId,
			@Param("tenantId") String tenantId);

	@Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o "
			+ "WHERE o.cashier.id = :cashierId AND o.tenantId = :tenantId "
			+ "AND o.status IN ('COMPLETED', 'COMPLETE') AND o.isDeleted = false "
			+ "AND o.createdAt >= :startOfDay")
	BigDecimal calculateTodaySalesByCashier(
			@Param("cashierId") Long cashierId,
			@Param("tenantId") String tenantId,
			@Param("startOfDay") LocalDateTime startOfDay);

	// ==============================
	// Weekly Sales
	// ==============================
	@Query("SELECT new com.possaas.dto.response.WeeklySalesResponse("
			+ "CAST(o.createdAt AS date), SUM(o.totalAmount), CAST(COUNT(o) AS integer)) "
			+ "FROM Order o "
			+ "WHERE o.tenantId = :tenantId "
			+ "AND o.isDeleted = false "
			+ "AND o.createdAt >= :startDate "
			+ "GROUP BY CAST(o.createdAt AS date) "
			+ "ORDER BY CAST(o.createdAt AS date) ASC")
	List<WeeklySalesResponse> getWeeklySalesData(
			@Param("tenantId") String tenantId,
			@Param("startDate") LocalDateTime startDate);

	// ==============================
	// Branch Performance (FIXED)
	// ==============================
	@Query("SELECT new com.possaas.dto.response.BranchPerformanceResponse("
			+ "o.branch.id, "
			+ "o.branch.name, "
			+ "SUM(o.totalAmount), "
			+ "CAST(COUNT(o) AS integer), "
			+ "CAST(AVG(o.totalAmount) AS double)) "
			+ "FROM Order o "
			+ "WHERE o.tenantId = :tenantId "
			+ "AND o.isDeleted = false "
			+ "GROUP BY o.branch.id, o.branch.name")
	List<BranchPerformanceResponse> getBranchPerformance(
			@Param("tenantId") String tenantId);

}
