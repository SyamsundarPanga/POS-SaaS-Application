package com.possaas.repository;

import com.possaas.domain.branch.Branch;
import com.possaas.domain.branch.BranchStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BranchRepository extends JpaRepository<Branch, Long> {

    long countByTenantId(String tenantId);

    boolean existsByCodeAndTenantId(String code, String tenantId);

    boolean existsByTenantIdAndIsMainBranchTrue(String tenantId);

    Optional<Branch> findByIdAndTenantId(Long id, String tenantId);

    Page<Branch> findByStatus(BranchStatus status, Pageable pageable);

    List<Branch> findByStatusAndTenantId(BranchStatus status, String tenantId);

    List<Branch> findByTenantIdAndIsDeletedFalse(String tenantId);

    @Query("SELECT COUNT(b) FROM Branch b WHERE b.tenantId = :tenantId AND b.status = 'ACTIVE'")
    long countActiveBranches(@Param("tenantId") String tenantId);

    @Query("""
                SELECT b FROM Branch b
                WHERE b.tenantId = :tenantId
                AND (
                    LOWER(b.name) LIKE LOWER(CONCAT('%', :query, '%'))
                    OR LOWER(b.code) LIKE LOWER(CONCAT('%', :query, '%'))
                    OR LOWER(b.city) LIKE LOWER(CONCAT('%', :query, '%'))
                )
            """)
    Page<Branch> searchBranches(@Param("tenantId") String tenantId,
            @Param("query") String query,
            Pageable pageable);
}
