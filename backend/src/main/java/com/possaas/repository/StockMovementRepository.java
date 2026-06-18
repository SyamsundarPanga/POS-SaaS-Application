package com.possaas.repository;

import com.possaas.domain.inventory.StockMovement;
import com.possaas.domain.inventory.StockMovementType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    Page<StockMovement> findByProductIdOrderByCreatedAtDesc(Long productId, Pageable pageable);

    Page<StockMovement> findByBranchIdOrderByCreatedAtDesc(Long branchId, Pageable pageable);

    Page<StockMovement> findByMovementTypeOrderByCreatedAtDesc(StockMovementType movementType, Pageable pageable);

    @Query("""
        SELECT sm FROM StockMovement sm 
        WHERE sm.tenantId = :tenantId 
        AND sm.branchId = :branchId 
        AND sm.createdAt BETWEEN :startDate AND :endDate
        ORDER BY sm.createdAt DESC
    """)
    Page<StockMovement> findMovementsByBranchAndDateRange(
        @Param("tenantId") String tenantId,
        @Param("branchId") Long branchId,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate,
        Pageable pageable
    );

    @Query("""
        SELECT sm FROM StockMovement sm 
        WHERE sm.tenantId = :tenantId 
        AND sm.product.id = :productId 
        AND sm.createdAt BETWEEN :startDate AND :endDate
        ORDER BY sm.createdAt DESC
    """)
    List<StockMovement> findMovementsByProductAndDateRange(
        @Param("tenantId") String tenantId,
        @Param("productId") Long productId,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );

    @Query("""
        SELECT sm FROM StockMovement sm
        WHERE sm.tenantId = :tenantId
        AND sm.referenceType = 'TRANSFER'
        ORDER BY sm.createdAt DESC
    """)
    List<StockMovement> findTransferMovementsByTenant(
        @Param("tenantId") String tenantId
    );

    @Query("""
        SELECT sm FROM StockMovement sm
        WHERE sm.tenantId = :tenantId
        AND sm.referenceType = 'TRANSFER'
        AND sm.branchId = :branchId
        ORDER BY sm.createdAt DESC
    """)
    List<StockMovement> findTransferMovementsByTenantAndBranch(
        @Param("tenantId") String tenantId,
        @Param("branchId") Long branchId
    );
}
