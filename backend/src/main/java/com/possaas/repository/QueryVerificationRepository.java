package com.possaas.repository;

import com.possaas.domain.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for verifying tenant isolation behavior across different query
 * types.
 * 
 * This repository demonstrates the difference in Hibernate Filter behavior
 * between:
 * - JPQL queries (automatically filtered by @Filter)
 * - Native SQL queries (NOT filtered - potential security risk)
 */
@Repository
public interface QueryVerificationRepository extends JpaRepository<User, Long> {

    /**
     * TASK 1: Test Hibernate Filter with JPQL Query
     * 
     * JPQL queries are intercepted by Hibernate and the @Filter annotation
     * on BaseEntity will automatically append: WHERE tenant_id = :tenantId
     * 
     * Expected: Returns ONLY users belonging to the current tenant context
     */
    @Query("SELECT u FROM User u")
    List<User> findAllUsersWithJpqlQuery();

    /**
     * TASK 2: Test Hibernate Filter with Native Query
     * 
     * Native SQL queries bypass Hibernate's filter mechanism entirely.
     * The @Filter annotation has NO effect on native queries.
     * 
     * Expected: Returns ALL users from ALL tenants (SECURITY RISK!)
     * 
     * WARNING: This demonstrates a data leakage vulnerability.
     * Native queries should include manual tenant filtering:
     * SELECT * FROM users WHERE tenant_id = :tenantId
     */
    @Query(value = "SELECT * FROM users", nativeQuery = true)
    List<User> findAllUsersWithNativeQuery();

    /**
     * Example of SECURE native query with manual tenant filtering.
     * Use this pattern if native queries are absolutely required.
     */
    @Query(value = "SELECT * FROM users WHERE tenant_id = :tenantId", nativeQuery = true)
    List<User> findAllUsersWithSecureNativeQuery(String tenantId);
}
