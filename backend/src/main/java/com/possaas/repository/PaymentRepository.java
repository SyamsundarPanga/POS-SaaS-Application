package com.possaas.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.possaas.domain.payment.Payment;
import com.possaas.domain.payment.PaymentStatus;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    
    List<Payment> findByOrderId(Long orderId);
    
    Optional<Payment> findByTransactionId(String transactionId);
    Optional<Payment> findFirstByTransactionIdAndStatus(String transactionId, PaymentStatus status);
    
    Page<Payment> findByTenantId(String tenantId, Pageable pageable);
    
    @Query("SELECT p FROM Payment p WHERE p.tenantId = :tenantId AND p.createdAt BETWEEN :startDate AND :endDate")
    List<Payment> findByDateRange(@Param("tenantId") String tenantId,
                                   @Param("startDate") LocalDateTime startDate,
                                   @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT SUM(p.amount) FROM Payment p WHERE p.tenantId = :tenantId AND p.createdAt BETWEEN :startDate AND :endDate")
    BigDecimal getTotalPaymentsForPeriod(@Param("tenantId") String tenantId,
                                         @Param("startDate") LocalDateTime startDate,
                                         @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT p.method, COUNT(p), SUM(p.amount) FROM Payment p " +
           "WHERE p.tenantId = :tenantId AND p.createdAt BETWEEN :startDate AND :endDate " +
           "GROUP BY p.method")
    List<Object[]> getPaymentSummaryByMethod(@Param("tenantId") String tenantId,
                                             @Param("startDate") LocalDateTime startDate,
                                             @Param("endDate") LocalDateTime endDate);
    
    Optional<Payment> findFirstByOrder_IdAndStatus(Long orderId, PaymentStatus status);
    Optional<Payment> findFirstByTransactionId(String transactionId);
    
    @Query("""
    	    SELECT p.method, COUNT(p), SUM(p.amount)
    	    FROM Payment p
    	    WHERE p.tenantId = :tenantId
    	      AND p.status = com.possaas.domain.payment.PaymentStatus.SUCCESS
    	    GROUP BY p.method
    	""")
    	List<Object[]> getPaymentSummary(@Param("tenantId") String tenantId);

}
