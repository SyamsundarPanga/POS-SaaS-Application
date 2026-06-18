package com.possaas.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.possaas.domain.tenant.SubscriptionPayment;
import com.possaas.domain.tenant.SubscriptionPaymentStatus;
import com.possaas.domain.tenant.SubscriptionPlanType;

@Repository
public interface SubscriptionPaymentRepository extends JpaRepository<SubscriptionPayment, Long> {

    Optional<SubscriptionPayment> findByRazorpayOrderId(String razorpayOrderId);
    Optional<SubscriptionPayment> findByRazorpayPaymentId(String razorpayPaymentId);
    Optional<SubscriptionPayment> findByIdAndTenantId(Long id, String tenantId);
    List<SubscriptionPayment> findByTenantIdOrderByCreatedAtDesc(String tenantId);
    boolean existsByTenantIdAndPaymentStatus(String tenantId, SubscriptionPaymentStatus paymentStatus);

    List<SubscriptionPayment> findByPaymentStatusOrderByCreatedAtDesc(SubscriptionPaymentStatus paymentStatus);

    List<SubscriptionPayment> findBySubscriptionPlanOrderByCreatedAtDesc(SubscriptionPlanType plan);

    List<SubscriptionPayment> findTop10ByOrderByCreatedAtDesc();

    @Query("""
            select coalesce(sum(sp.amount), 0)
            from SubscriptionPayment sp
            where sp.paymentStatus = com.possaas.domain.tenant.SubscriptionPaymentStatus.SUCCESS
            and sp.createdAt >= :from and sp.createdAt < :to
            """)
    BigDecimal getEarningsBetween(LocalDateTime from, LocalDateTime to);
}
