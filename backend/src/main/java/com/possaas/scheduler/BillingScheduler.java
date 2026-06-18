package com.possaas.scheduler;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.possaas.domain.tenant.Subscription;
import com.possaas.domain.tenant.SubscriptionStatus;
import com.possaas.repository.SubscriptionRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.service.tenant.BillingService;
import com.possaas.service.tenant.SubscriptionService;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class BillingScheduler {

    private final TenantRepository tenantRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final BillingService billingService;
    private final SubscriptionService subscriptionService;

    
    @Scheduled(cron = "0 0 3 * * ?") // every day 3AM
    public void checkOverdueInvoices() {
        billingService.handleOverdueInvoices();
    }
    

    /**
     * Runs every day at 1:00 AM
     * Handles renewal billing + status update
     */
    @Scheduled(cron = "0 0 1 * * ?")
    @Transactional
    public void handleRenewals() {

        // Apply all scheduled period-end cancellations before renewal logic.
        subscriptionService.processScheduledCancellations();

        List<Subscription> expired =
                subscriptionRepository.findByStatusAndNextBillingDateBefore(
                        SubscriptionStatus.ACTIVE,
                        LocalDateTime.now()
                );

        for (Subscription sub : expired) {
            if (sub.isCancelAtPeriodEnd()) {
                // Safety net: if a subscription is still marked for period-end cancellation,
                // skip renewal invoice generation.
                continue;
            }

            sub.setStatus(SubscriptionStatus.GRACE_PERIOD);
            sub.setGracePeriodEndDate(LocalDateTime.now().plusDays(7));

            billingService.generateSubscriptionInvoice(
                    sub.getTenantId(),
                    sub.getPlan().getMonthlyPrice(),
                    sub.getNextBillingDate(),
                    sub.getNextBillingDate().plusMonths(1)
            );
        }
    }
    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void expireGracePeriod() {

        List<Subscription> expiredGrace =
                subscriptionRepository.findByStatusAndGracePeriodEndDateBefore(
                        SubscriptionStatus.GRACE_PERIOD,
                        LocalDateTime.now()
                );

        for (Subscription sub : expiredGrace) {
            sub.setStatus(SubscriptionStatus.PAST_DUE);
        }
    }

    @Scheduled(cron = "0 0 * * * ?")
    @Transactional
    public void runRetrySchedule() {
        List<Subscription> retryable = subscriptionRepository.findByStatusInAndNextRetryAtBefore(
                List.copyOf(Set.of(SubscriptionStatus.PAST_DUE, SubscriptionStatus.GRACE_PERIOD)),
                LocalDateTime.now());

        for (Subscription sub : retryable) {
            int nextRetry = sub.getRetryCount() + 1;
            sub.setRetryCount(nextRetry);

            // Retry schedule: +1 day, +3 days, +5 days. Keep access during grace period.
            if (nextRetry == 1) {
                sub.setNextRetryAt(LocalDateTime.now().plusDays(1));
            } else if (nextRetry == 2) {
                sub.setNextRetryAt(LocalDateTime.now().plusDays(3));
            } else if (nextRetry == 3) {
                sub.setNextRetryAt(LocalDateTime.now().plusDays(5));
            } else {
                sub.setNextRetryAt(null);
            }

            if (sub.getGracePeriodEndDate() != null && LocalDateTime.now().isBefore(sub.getGracePeriodEndDate())) {
                sub.setStatus(SubscriptionStatus.GRACE_PERIOD);
            } else {
                sub.setStatus(SubscriptionStatus.PAST_DUE);
            }
        }
    }

    @Scheduled(cron = "0 30 2 * * ?")
    @Transactional
    public void purgeExpiredCancelledRetention() {
        List<Subscription> expiredRetention = subscriptionRepository.findByStatusAndDataRetentionUntilBefore(
                SubscriptionStatus.CANCELLED,
                LocalDateTime.now());
        for (Subscription sub : expiredRetention) {
            // Mark logical retention expiry. Actual data purge/anonymization can be
            // done by downstream compliance jobs.
            sub.setStatus(SubscriptionStatus.EXPIRED);
            sub.setDataRetentionUntil(null);
            sub.setNextRetryAt(null);
            sub.setGracePeriodEndDate(null);
            sub.setPaymentMethodToken(null);
            sub.setPaymentMethodLast4(null);
            sub.setPaymentMethodBrand(null);
        }
    }
}

