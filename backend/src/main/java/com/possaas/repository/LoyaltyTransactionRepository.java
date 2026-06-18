package com.possaas.repository;

import com.possaas.domain.customer.LoyaltyTransaction;
import com.possaas.domain.customer.LoyaltyTransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LoyaltyTransactionRepository extends JpaRepository<LoyaltyTransaction, Long> {

    // Get transactions for a customer (List version for history)
    List<LoyaltyTransaction> findByTenantIdAndCustomerId(String tenantId, Long customerId);

    // Get transactions for a customer (Paginated)
    Page<LoyaltyTransaction> findByTenantIdAndCustomerIdOrderByCreatedAtDesc(
            String tenantId, Long customerId, Pageable pageable);

    // Get transactions by type
    Page<LoyaltyTransaction> findByTenantIdAndTransactionTypeOrderByCreatedAtDesc(
            String tenantId, LoyaltyTransactionType type, Pageable pageable);

    // Get transactions for an order
    List<LoyaltyTransaction> findByTenantIdAndOrderId(String tenantId, Long orderId);

    // Get recent transactions
    @Query("SELECT lt FROM LoyaltyTransaction lt WHERE lt.tenantId = :tenantId " +
           "AND lt.createdAt >= :startDate ORDER BY lt.createdAt DESC")
    List<LoyaltyTransaction> findRecentTransactions(@Param("tenantId") String tenantId,
                                                    @Param("startDate") LocalDateTime startDate);

    // Statistics
    @Query("SELECT SUM(lt.points) FROM LoyaltyTransaction lt " +
           "WHERE lt.tenantId = :tenantId AND lt.transactionType = :type " +
           "AND lt.createdAt >= :startDate AND lt.createdAt < :endDate")
    Integer sumPointsByTypeAndDateRange(@Param("tenantId") String tenantId,
                                       @Param("type") LoyaltyTransactionType type,
                                       @Param("startDate") LocalDateTime startDate,
                                       @Param("endDate") LocalDateTime endDate);

    @Query("SELECT COUNT(lt) FROM LoyaltyTransaction lt " +
           "WHERE lt.tenantId = :tenantId AND lt.customerId = :customerId")
    Long countByCustomer(@Param("tenantId") String tenantId, @Param("customerId") Long customerId);
}
