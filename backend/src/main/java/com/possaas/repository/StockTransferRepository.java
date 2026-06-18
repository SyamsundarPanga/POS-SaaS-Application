package com.possaas.repository;

import com.possaas.domain.inventory.StockTransfer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface StockTransferRepository extends JpaRepository<StockTransfer, Long> {
    
    /**
     * Find all transfers for a tenant
     */
    Page<StockTransfer> findByTenantIdOrderByCreatedAtDesc(String tenantId, Pageable pageable);
    
    /**
     * Find transfers involving a specific branch (either source or destination)
     */
    @Query("SELECT st FROM StockTransfer st " +
           "WHERE st.tenantId = :tenantId " +
           "AND (st.sourceBranchId = :branchId OR st.destinationBranchId = :branchId) " +
           "ORDER BY st.createdAt DESC")
    Page<StockTransfer> findByTenantIdAndBranch(
            @Param("tenantId") String tenantId,
            @Param("branchId") Long branchId,
            Pageable pageable);
}
