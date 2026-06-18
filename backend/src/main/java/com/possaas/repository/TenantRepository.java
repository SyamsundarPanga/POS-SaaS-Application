package com.possaas.repository;

import com.possaas.domain.tenant.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, String> {

    Optional<Tenant> findByName(String name);

    boolean existsByName(String name);
    
    long countByActive(boolean active);
    
    long countByCreatedAtAfter(LocalDateTime date);
}
