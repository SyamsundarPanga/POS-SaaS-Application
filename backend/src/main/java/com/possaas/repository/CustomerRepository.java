package com.possaas.repository;

import com.possaas.domain.customer.Customer;
import com.possaas.domain.customer.CustomerStatus;
import com.possaas.domain.customer.LoyaltyTier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    // Basic CRUD with tenant isolation
    Optional<Customer> findByIdAndTenantId(Long id, String tenantId);

    Page<Customer> findByTenantIdAndIsDeletedFalse(String tenantId, Pageable pageable);

    @Query("""
           SELECT c FROM Customer c
           WHERE c.tenantId = :tenantId
           AND c.isDeleted = false
           AND EXISTS (
               SELECT 1 FROM Order o
               WHERE o.customerId = c.id
               AND o.tenantId = :tenantId
               AND o.isDeleted = false
               AND o.branch.id = :branchId
           )
           ORDER BY c.createdAt DESC
           """)
    Page<Customer> findDistinctByTenantIdAndBranchId(@Param("tenantId") String tenantId,
                                                     @Param("branchId") Long branchId,
                                                     Pageable pageable);

    // Search by email or phone
    Optional<Customer> findByTenantIdAndEmail(String tenantId, String email);

    Optional<Customer> findByTenantIdAndPhone(String tenantId, String phone);

    boolean existsByTenantIdAndEmail(String tenantId, String email);

    boolean existsByTenantIdAndPhone(String tenantId, String phone);

    // Search customers
    @Query("SELECT c FROM Customer c WHERE c.tenantId = :tenantId AND c.isDeleted = false " +
           "AND (LOWER(c.firstName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(c.lastName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(c.email) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR c.phone LIKE CONCAT('%', :search, '%'))")
    Page<Customer> searchCustomers(@Param("tenantId") String tenantId,
                                   @Param("search") String search,
                                   Pageable pageable);

    // Filter by status
    Page<Customer> findByTenantIdAndStatusAndIsDeletedFalse(String tenantId, 
                                                             CustomerStatus status, 
                                                             Pageable pageable);

    // Filter by loyalty tier
    Page<Customer> findByTenantIdAndLoyaltyTierAndIsDeletedFalse(String tenantId, 
                                                                  LoyaltyTier tier, 
                                                                  Pageable pageable);

    // VIP customers
    @Query("SELECT c FROM Customer c WHERE c.tenantId = :tenantId AND c.isDeleted = false " +
           "AND c.loyaltyTier IN ('PLATINUM', 'DIAMOND')")
    Page<Customer> findVipCustomers(@Param("tenantId") String tenantId, Pageable pageable);

    // Top customers by spending
    @Query("SELECT c FROM Customer c WHERE c.tenantId = :tenantId AND c.isDeleted = false " +
           "ORDER BY c.totalSpent DESC")
    Page<Customer> findTopCustomersBySpending(@Param("tenantId") String tenantId, Pageable pageable);

    // Inactive customers (no purchase in last N days)
    @Query("SELECT c FROM Customer c WHERE c.tenantId = :tenantId AND c.isDeleted = false " +
           "AND c.status = 'ACTIVE' " +
           "AND (c.lastPurchaseDate IS NULL OR c.lastPurchaseDate < :cutoffDate)")
    List<Customer> findInactiveCustomers(@Param("tenantId") String tenantId,
                                         @Param("cutoffDate") LocalDateTime cutoffDate);

    // Birthday customers (for marketing)
    @Query("SELECT c FROM Customer c WHERE c.tenantId = :tenantId AND c.isDeleted = false " +
           "AND c.status = 'ACTIVE' " +
           "AND MONTH(c.dateOfBirth) = :month AND DAY(c.dateOfBirth) = :day")
    List<Customer> findBirthdayCustomers(@Param("tenantId") String tenantId,
                                         @Param("month") int month,
                                         @Param("day") int day);

    // Statistics queries
    @Query("SELECT COUNT(c) FROM Customer c WHERE c.tenantId = :tenantId AND c.isDeleted = false")
    Long countByTenantId(@Param("tenantId") String tenantId);

    @Query("SELECT COUNT(c) FROM Customer c WHERE c.tenantId = :tenantId " +
           "AND c.isDeleted = false AND c.status = :status")
    Long countByTenantIdAndStatus(@Param("tenantId") String tenantId, 
                                  @Param("status") CustomerStatus status);

    @Query("SELECT COUNT(c) FROM Customer c WHERE c.tenantId = :tenantId AND c.isDeleted = false " +
           "AND c.loyaltyTier IN ('PLATINUM', 'DIAMOND')")
    Long countVipCustomers(@Param("tenantId") String tenantId);

    @Query("SELECT COUNT(c) FROM Customer c WHERE c.tenantId = :tenantId AND c.isDeleted = false " +
           "AND c.createdAt >= :startDate AND c.createdAt < :endDate")
    Long countNewCustomers(@Param("tenantId") String tenantId,
                          @Param("startDate") LocalDateTime startDate,
                          @Param("endDate") LocalDateTime endDate);

    @Query("SELECT SUM(c.totalSpent) FROM Customer c WHERE c.tenantId = :tenantId AND c.isDeleted = false")
    java.math.BigDecimal sumTotalSpent(@Param("tenantId") String tenantId);

    @Query("SELECT SUM(c.loyaltyPoints) FROM Customer c WHERE c.tenantId = :tenantId AND c.isDeleted = false")
    Integer sumLoyaltyPoints(@Param("tenantId") String tenantId);

    @Query("SELECT SUM(c.totalPointsEarned) FROM Customer c WHERE c.tenantId = :tenantId AND c.isDeleted = false")
    Integer sumTotalPointsEarned(@Param("tenantId") String tenantId);

    @Query("SELECT SUM(c.totalPointsRedeemed) FROM Customer c WHERE c.tenantId = :tenantId AND c.isDeleted = false")
    Integer sumTotalPointsRedeemed(@Param("tenantId") String tenantId);

    // Referral code lookup
    Optional<Customer> findByTenantIdAndReferralCode(String tenantId, String referralCode);

    // Dashboard queries
    @Query("SELECT COUNT(c) FROM Customer c WHERE c.tenantId = :tenantId " +
           "AND c.isDeleted = false AND c.createdAt >= :startDate")
    Long countByTenantIdAndCreatedAtAfter(@Param("tenantId") String tenantId, 
                                          @Param("startDate") LocalDateTime startDate);

    @Query("SELECT COUNT(c) FROM Customer c WHERE c.tenantId = :tenantId " +
           "AND c.isDeleted = false AND c.status = 'ACTIVE'")
    Long countActiveCustomers(@Param("tenantId") String tenantId);

    // Export customers (active only)
    @Query("""
           SELECT c FROM Customer c
           WHERE c.tenantId = :tenantId
           AND c.status = 'ACTIVE'
           ORDER BY c.createdAt DESC
           """)
    List<Customer> findAllForExport(@Param("tenantId") String tenantId);

    @Query("""
           SELECT c FROM Customer c
           WHERE c.tenantId = :tenantId
           AND c.status = 'ACTIVE'
           AND c.isDeleted = false
           AND EXISTS (
               SELECT 1 FROM Order o
               WHERE o.customerId = c.id
               AND o.tenantId = :tenantId
               AND o.isDeleted = false
               AND o.branch.id = :branchId
           )
           ORDER BY c.createdAt DESC
           """)
    List<Customer> findAllForExportByBranch(@Param("tenantId") String tenantId,
                                            @Param("branchId") Long branchId);

    // Order count per customer
    @Query("""
           SELECT COUNT(o) FROM Order o
           WHERE o.customerId = :customerId
           AND o.tenantId = :tenantId
           AND o.isDeleted = false
           """)
    Long countOrdersByCustomerId(@Param("customerId") Long customerId,
                                 @Param("tenantId") String tenantId);
}
