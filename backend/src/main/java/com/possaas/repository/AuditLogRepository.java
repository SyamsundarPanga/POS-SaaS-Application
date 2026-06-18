package com.possaas.repository;

import com.possaas.domain.audit.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findByTenantId(String tenantId, Pageable pageable);

    Page<AuditLog> findByTenantIdAndCreatedAtBetween(
            String tenantId, 
            java.time.LocalDateTime start, 
            java.time.LocalDateTime end, 
            Pageable pageable);

    List<AuditLog> findByTenantIdOrderByCreatedAtDesc(String tenantId);

    List<AuditLog> findByTenantIdAndCreatedAtBetweenOrderByCreatedAtDesc(
            String tenantId,
            LocalDateTime start,
            LocalDateTime end);
}
