package com.possaas.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.possaas.domain.inventory.Inventory;
import com.possaas.dto.response.InventoryStatusResponse;

import jakarta.persistence.LockModeType;

@Repository
public interface InventoryRepository extends JpaRepository<Inventory, Long> {

	Optional<Inventory> findByProductIdAndTenantId(Long productId, String tenantId);

	Optional<Inventory> findByProductIdAndBranchIdAndTenantId(Long productId, Long branchId, String tenantId);

	@Query(value = "SELECT i FROM Inventory i JOIN FETCH i.product", countQuery = "SELECT COUNT(i) FROM Inventory i")
	Page<Inventory> findAllWithProduct(Pageable pageable);

	@Query(value = "SELECT i FROM Inventory i JOIN FETCH i.product WHERE i.tenantId = :tenantId", countQuery = "SELECT COUNT(i) FROM Inventory i WHERE i.tenantId = :tenantId")
	Page<Inventory> findAllWithProductByTenant(@Param("tenantId") String tenantId, Pageable pageable);

	@Query("""
				SELECT i FROM Inventory i
				JOIN FETCH i.product p
				LEFT JOIN FETCH i.branch b
				WHERE i.tenantId = :tenantId
				AND i.branch.id = :branchId
			""")
	Page<Inventory> findByBranchIdWithProduct(@Param("tenantId") String tenantId,
			@Param("branchId") Long branchId,
			Pageable pageable);

	@Query("""
				SELECT i FROM Inventory i
				JOIN FETCH i.product p
				WHERE i.tenantId = :tenantId
				AND i.quantity <= i.lowStockThreshold
				ORDER BY i.quantity ASC
			""")
	List<Inventory> findLowStockItems(@Param("tenantId") String tenantId);

	@Query("""
				SELECT i FROM Inventory i
				JOIN FETCH i.product p
				WHERE i.tenantId = :tenantId
				AND i.branch.id = :branchId
				AND i.quantity <= i.lowStockThreshold
				ORDER BY i.quantity ASC
			""")
	List<Inventory> findLowStockItemsByBranch(@Param("tenantId") String tenantId,
			@Param("branchId") Long branchId);

	@Query("""
				SELECT i FROM Inventory i
				JOIN i.product p
				WHERE p.category.id = :categoryId
				AND i.tenantId = :tenantId
			""")
	List<Inventory> findByProductCategoryId(@Param("categoryId") Long categoryId,
			@Param("tenantId") String tenantId);

	@Query("SELECT i.quantity FROM Inventory i WHERE i.product.id = :productId AND i.tenantId = :tenantId")
	Optional<Integer> findQuantityByProductIdAndTenantId(
			@Param("productId") Long productId,
			@Param("tenantId") String tenantId);

	@Query(value = "SELECT quantity FROM inventory WHERE product_id = :productId AND tenant_id = :tenantId AND is_deleted = false", nativeQuery = true)
	Optional<Integer> findQuantityNative(
			@Param("productId") Long productId,
			@Param("tenantId") String tenantId);

	@Query(value = "SELECT quantity FROM inventory WHERE product_id = :productId AND branch_id = :branchId AND tenant_id = :tenantId AND is_deleted = false", nativeQuery = true)
	Optional<Integer> findQuantityNativeByBranch(
			@Param("productId") Long productId,
			@Param("branchId") Long branchId,
			@Param("tenantId") String tenantId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT i FROM Inventory i WHERE i.product.id = :productId AND i.tenantId = :tenantId")
	Optional<Inventory> findByProductIdAndTenantIdForUpdate(
			@Param("productId") Long productId,
			@Param("tenantId") String tenantId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT i FROM Inventory i WHERE i.product.id = :productId AND i.branch.id = :branchId AND i.tenantId = :tenantId")
	Optional<Inventory> findByProductIdAndBranchIdForUpdate(
			@Param("productId") Long productId,
			@Param("branchId") Long branchId,
			@Param("tenantId") String tenantId);

	@org.springframework.data.jpa.repository.Modifying
	@org.springframework.transaction.annotation.Transactional
	@Query(value = "UPDATE inventory SET quantity = quantity - :amount, updated_at = CURRENT_TIMESTAMP " +
			"WHERE product_id = :productId AND tenant_id = :tenantId AND is_deleted = false AND quantity >= :amount", nativeQuery = true)
	int deductStockNative(
			@Param("productId") Long productId,
			@Param("tenantId") String tenantId,
			@Param("amount") Integer amount);

	@org.springframework.data.jpa.repository.Modifying
	@org.springframework.transaction.annotation.Transactional
	@Query(value = "UPDATE inventory SET quantity = quantity - :amount, updated_at = CURRENT_TIMESTAMP " +
			"WHERE product_id = :productId AND branch_id = :branchId AND tenant_id = :tenantId AND is_deleted = false AND quantity >= :amount", nativeQuery = true)
	int deductStockNativeByBranch(
			@Param("productId") Long productId,
			@Param("branchId") Long branchId,
			@Param("tenantId") String tenantId,
			@Param("amount") Integer amount);

	@org.springframework.data.jpa.repository.Modifying
	@org.springframework.transaction.annotation.Transactional
	@Query(value = "UPDATE inventory SET quantity = quantity + :amount, updated_at = CURRENT_TIMESTAMP " +
			"WHERE product_id = :productId AND tenant_id = :tenantId AND is_deleted = false", nativeQuery = true)
	int addStockNative(
			@Param("productId") Long productId,
			@Param("tenantId") String tenantId,
			@Param("amount") Integer amount);

	@org.springframework.data.jpa.repository.Modifying
	@org.springframework.transaction.annotation.Transactional
	@Query(value = "UPDATE inventory SET quantity = quantity + :amount, updated_at = CURRENT_TIMESTAMP " +
			"WHERE product_id = :productId AND branch_id = :branchId AND tenant_id = :tenantId AND is_deleted = false", nativeQuery = true)
	int addStockNativeByBranch(
			@Param("productId") Long productId,
			@Param("branchId") Long branchId,
			@Param("tenantId") String tenantId,
			@Param("amount") Integer amount);

	@Query("""
				SELECT SUM(i.quantity * p.costPrice)
				FROM Inventory i
				JOIN i.product p
				WHERE i.tenantId = :tenantId
			""")
	java.math.BigDecimal calculateTotalInventoryValue(@Param("tenantId") String tenantId);

	@Query("""
				SELECT SUM(i.quantity * p.costPrice)
				FROM Inventory i
				JOIN i.product p
				WHERE i.tenantId = :tenantId
				AND i.branch.id = :branchId
			""")
	java.math.BigDecimal calculateBranchInventoryValue(@Param("tenantId") String tenantId,
			@Param("branchId") Long branchId);

	// Dashboard queries

	/**
	 * Find products with no sales in the last N days (dead stock analysis)
	 */
	@Query("""
				SELECT i FROM Inventory i
				JOIN FETCH i.product p
				LEFT JOIN FETCH i.branch b
				WHERE i.tenantId = :tenantId
				AND (i.lastSaleDate IS NULL OR i.lastSaleDate < :cutoffDate)
				AND i.quantity > 0
				AND i.isDeleted = false
			""")
	List<Inventory> findDeadStockItems(@Param("tenantId") String tenantId,
			@Param("cutoffDate") java.time.LocalDateTime cutoffDate);

	@Query("""
				SELECT i FROM Inventory i
				JOIN FETCH i.product p
				LEFT JOIN FETCH i.branch b
				WHERE i.tenantId = :tenantId
				AND i.branch.id = :branchId
				AND (i.lastSaleDate IS NULL OR i.lastSaleDate < :cutoffDate)
				AND i.quantity > 0
				AND i.isDeleted = false
			""")
	List<Inventory> findDeadStockItemsByBranch(@Param("tenantId") String tenantId,
			@Param("cutoffDate") java.time.LocalDateTime cutoffDate,
			@Param("branchId") Long branchId);

	@Query(value = "SELECT i.product_id, p.name, p.sku, i.quantity, p.min_stock_level, " +
			"CASE " +
			"  WHEN i.quantity = 0 THEN 'CRITICAL' " +
			"  WHEN i.quantity <= p.min_stock_level * 0.25 THEN 'HIGH' " +
			"  WHEN i.quantity <= p.min_stock_level * 0.5 THEN 'MEDIUM' " +
			"  ELSE 'LOW' " +
			"END as severity, " +
			"i.branch_id, b.name as branch_name " +
			"FROM inventory i " +
			"JOIN products p ON i.product_id = p.id " +
			"LEFT JOIN branches b ON i.branch_id = b.id " +
			"WHERE i.tenant_id = :tenantId " +
			"AND i.quantity <= p.min_stock_level " +
			"AND i.is_deleted = false " +
			"ORDER BY severity, i.quantity ASC", nativeQuery = true)
	List<Object[]> findLowStockAlerts(@Param("tenantId") String tenantId);

	@Query(value = "SELECT i.product_id, p.name, p.sku, i.quantity, p.min_stock_level, " +
			"CASE " +
			"  WHEN i.quantity = 0 THEN 'CRITICAL' " +
			"  WHEN i.quantity <= p.min_stock_level * 0.25 THEN 'HIGH' " +
			"  WHEN i.quantity <= p.min_stock_level * 0.5 THEN 'MEDIUM' " +
			"  ELSE 'LOW' " +
			"END as severity, " +
			"i.branch_id, b.name as branch_name " +
			"FROM inventory i " +
			"JOIN products p ON i.product_id = p.id " +
			"LEFT JOIN branches b ON i.branch_id = b.id " +
			"WHERE i.branch_id = :branchId " +
			"AND i.quantity <= p.min_stock_level " +
			"AND i.is_deleted = false " +
			"ORDER BY severity, i.quantity ASC", nativeQuery = true)
	List<Object[]> findLowStockAlertsByBranch(@Param("branchId") Long branchId);

	@Query("SELECT COUNT(i) FROM Inventory i JOIN i.product p " +
			"WHERE i.tenantId = :tenantId AND i.quantity <= p.minStockLevel " +
			"AND i.isDeleted = false")
	Long countLowStockProducts(@Param("tenantId") String tenantId);

	@Query("SELECT COUNT(i) FROM Inventory i " +
			"WHERE i.tenantId = :tenantId AND i.quantity = 0 " +
			"AND i.isDeleted = false")
	Long countOutOfStockProducts(@Param("tenantId") String tenantId);

	@Query("SELECT COUNT(i) FROM Inventory i WHERE i.branch.id = :branchId " +
			"AND i.isDeleted = false")
	Long countByBranchId(@Param("branchId") Long branchId);

	@Query("SELECT COUNT(i) FROM Inventory i JOIN i.product p " +
			"WHERE i.branch.id = :branchId AND i.quantity <= p.minStockLevel " +
			"AND i.isDeleted = false")
	Long countLowStockByBranch(@Param("branchId") Long branchId);

	@Query("SELECT COALESCE(SUM(i.quantity * p.costPrice), 0) FROM Inventory i " +
			"JOIN i.product p " +
			"WHERE i.branch.id = :branchId AND i.isDeleted = false")
	java.math.BigDecimal calculateInventoryValue(@Param("branchId") Long branchId);

	@Query("""
				SELECT new com.possaas.dto.response.InventoryValuationDto(
					p.id, p.name, p.sku,
					c.name,
					i.quantity,
					p.costPrice,
					(p.costPrice * i.quantity),
					(i.quantity <= i.lowStockThreshold)
				)
				FROM Inventory i
				JOIN i.product p
				LEFT JOIN p.category c
				WHERE i.tenantId = :tenantId
				AND (:branchId IS NULL OR i.branch.id = :branchId)
			""")
	List<com.possaas.dto.response.InventoryValuationDto> getInventoryValuation(
			@Param("tenantId") String tenantId,
			@Param("branchId") Long branchId);

	// Manager Dashboard - Low Stock Products by Branch
	@Query("SELECT new com.possaas.dto.response.LowStockAlertResponse(" +
			"p.id, p.name, p.sku, i.quantity, p.minStockLevel) " +
			"FROM Inventory i " +
			"JOIN i.product p " +
			"WHERE i.tenantId = :tenantId " +
			"AND i.branch.id = :branchId " +
			"AND i.quantity <= p.minStockLevel " +
			"AND i.isDeleted = false " +
			"ORDER BY i.quantity ASC")
	List<com.possaas.dto.response.LowStockAlertResponse> findLowStockProductsByBranch(
			@Param("tenantId") String tenantId,
			@Param("branchId") Long branchId);

	@Query("SELECT new com.possaas.dto.response.InventoryStatusResponse(" +
			"p.category.name, " +
			"CAST(SUM(CASE WHEN i.quantity > i.lowStockThreshold THEN i.quantity ELSE 0 END) AS int), " +
			"CAST(SUM(CASE WHEN i.quantity <= 0 THEN 1 ELSE 0 END) AS int), " +
			"CAST(SUM(CASE WHEN i.quantity > 0 AND i.quantity <= i.lowStockThreshold THEN i.quantity ELSE 0 END) AS int)) "
			+
			"FROM Inventory i " +
			"JOIN i.product p " +
			"WHERE i.tenantId = :tenantId " + // Hierarchical Filter
			"AND i.isDeleted = false " +
			"GROUP BY p.category.name")
	List<InventoryStatusResponse> getGlobalInventoryStatus(@Param("tenantId") String tenantId);

	@Modifying
	@org.springframework.transaction.annotation.Transactional
	@Query("""
			UPDATE Inventory i
			SET i.lowStockThreshold = :lowStockThreshold
			WHERE i.tenantId = :tenantId
			AND i.branch.id = :branchId
			AND i.isDeleted = false
			""")
	int updateLowStockThresholdByBranch(
			@Param("tenantId") String tenantId,
			@Param("branchId") Long branchId,
			@Param("lowStockThreshold") Integer lowStockThreshold);
}
