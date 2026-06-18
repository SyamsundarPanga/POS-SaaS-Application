package com.possaas.repository;

import com.possaas.domain.branch.BranchSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BranchSettingsRepository extends JpaRepository<BranchSettings, Long> {
    
    Optional<BranchSettings> findByBranchIdAndTenantId(Long branchId, String tenantId);
    
    Optional<BranchSettings> findByBranchId(Long branchId);
}
