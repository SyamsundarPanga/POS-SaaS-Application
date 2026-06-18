package com.possaas.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.possaas.domain.tenant.UsageTracking;

@Repository
public interface UsageTrackingRepository
        extends JpaRepository<UsageTracking, Long> {

    Optional<UsageTracking> findByTenantId(String tenantId);
}