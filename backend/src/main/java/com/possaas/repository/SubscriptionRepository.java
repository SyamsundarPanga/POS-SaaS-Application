
package com.possaas.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.possaas.domain.tenant.Subscription;
import com.possaas.domain.tenant.SubscriptionPlanType;
import com.possaas.domain.tenant.SubscriptionStatus;


@Repository
public interface SubscriptionRepository
        extends JpaRepository<Subscription, Long> {

    Optional<Subscription> findByTenantIdAndStatus(
            String tenantId,
            SubscriptionStatus status
    );

    Optional<Subscription> findByTenantId(String tenantId);
    
    List<Subscription> findByStatusAndNextBillingDateBefore(
            SubscriptionStatus status,
            LocalDateTime date
    );

    List<Subscription> findByStatusAndGracePeriodEndDateBefore(
            SubscriptionStatus status,
            LocalDateTime date
    );

    List<Subscription> findByStatusInAndNextRetryAtBefore(
            List<SubscriptionStatus> statuses,
            LocalDateTime date
    );

    List<Subscription> findByStatusAndDataRetentionUntilBefore(
            SubscriptionStatus status,
            LocalDateTime date
    );

    List<Subscription> findByCancelAtPeriodEndTrueAndNextBillingDateBefore(
            LocalDateTime date
    );
    
    long countByPlan_PlanType(SubscriptionPlanType planType);
}
