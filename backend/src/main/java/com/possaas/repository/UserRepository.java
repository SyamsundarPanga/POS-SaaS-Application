package com.possaas.repository;

import com.possaas.domain.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import com.possaas.domain.user.Role;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Optional<User> findByEmailIgnoreCase(String email);

    @Query("""
           SELECT u FROM User u
           WHERE LOWER(u.email) = LOWER(:email)
             AND u.status = com.possaas.domain.user.UserStatus.ACTIVE
             AND u.isDeleted = false
           """)
    Optional<User> findActiveByEmail(@Param("email") String email);
    
    Optional<User> findByUsernameAndTenantId(String username, String tenantId);
    
    Optional<User> findByEmailAndTenantId(String email, String tenantId);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);
    
    boolean existsByUsernameAndTenantId(String username, String tenantId);
    
    boolean existsByEmailAndTenantId(String email, String tenantId);

    long countByTenantId(String tenantId);
    
    Optional<User> findByIdAndTenantId(Long id, String tenantId);

    List<User> findByTenantIdAndRoleInAndIsDeletedFalse(String tenantId, List<Role> roles);

    List<User> findByTenantIdAndRoleAndIsDeletedFalse(String tenantId, Role role);

    Page<User> findByTenantIdAndIsDeletedFalse(String tenantId, Pageable pageable);

    Page<User> findByTenantIdAndBranch_IdAndIsDeletedFalse(String tenantId, Long branchId, Pageable pageable);
    
    boolean existsByEmailAndTenantIdAndIdNot(String email, String tenantId, Long id);
    
    // Manager Employee Management
    List<User> findByTenantIdAndBranch_Id(String tenantId, Long branchId);
    
    @Query("SELECT u FROM User u WHERE u.tenantId = :tenantId AND u.branch.id = :branchId " +
           "AND u.role IN ('ROLE_CASHIER', 'ROLE_VIEWER') AND u.isDeleted = false")
    List<User> findEmployeesByBranch(@Param("tenantId") String tenantId, @Param("branchId") Long branchId);
    
    // Manager Dashboard - show latest shift status (OPEN/CLOSED) for today
    @Query("SELECT new com.possaas.dto.response.ActiveCashierResponse(" +
           "u.id, " +
           "CASE " +
           "  WHEN u.firstName IS NOT NULL AND u.lastName IS NOT NULL THEN CONCAT(u.firstName, ' ', u.lastName) " +
           "  WHEN u.firstName IS NOT NULL THEN u.firstName " +
           "  WHEN u.lastName IS NOT NULL THEN u.lastName " +
           "  ELSE COALESCE(u.username, u.email) " +
           "END, " +
           "s.shiftStart, " +
           "CAST(COUNT(o.id) AS int), " +
           "COALESCE(SUM(o.totalAmount), 0), " +
           "s.status) " +
           "FROM User u " +
           "JOIN Shift s ON s.employee.id = u.id " +
           "LEFT JOIN Order o ON o.cashier.id = u.id AND o.createdAt >= :startOfDay AND o.isDeleted = false " +
           "WHERE u.tenantId = :tenantId " +
           "AND u.branch.id = :branchId " +
            "AND u.role = com.possaas.domain.user.Role.ROLE_CASHIER " +
            "AND u.status = com.possaas.domain.user.UserStatus.ACTIVE " +
            "AND u.isDeleted = false " +
           "AND s.branchId = :branchId " +
           "AND s.status IN ('OPEN', 'CLOSED') " +
           "AND (s.shiftStart >= :startOfDay OR (s.shiftEnd IS NOT NULL AND s.shiftEnd >= :startOfDay)) " +
           "AND s.isDeleted = false " +
           "AND s.shiftStart = (" +
           "  SELECT MAX(s2.shiftStart) FROM Shift s2 " +
           "  WHERE s2.employee.id = u.id " +
           "  AND s2.branchId = :branchId " +
           "  AND s2.status IN ('OPEN', 'CLOSED') " +
           "  AND (s2.shiftStart >= :startOfDay OR (s2.shiftEnd IS NOT NULL AND s2.shiftEnd >= :startOfDay)) " +
           "  AND s2.isDeleted = false" +
           ") " +
           "GROUP BY u.id, u.firstName, u.lastName, u.username, u.email, s.shiftStart, s.status " +
           "ORDER BY COALESCE(SUM(o.totalAmount), 0) DESC")
    List<com.possaas.dto.response.ActiveCashierResponse> findActiveCashiersByBranch(
            @Param("tenantId") String tenantId,
            @Param("branchId") Long branchId,
            @Param("startOfDay") LocalDateTime startOfDay);
}

