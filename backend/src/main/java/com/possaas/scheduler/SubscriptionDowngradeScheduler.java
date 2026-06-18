package com.possaas.scheduler;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.possaas.service.tenant.SubscriptionService;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class SubscriptionDowngradeScheduler {

    private final SubscriptionService subscriptionService;

    @Scheduled(cron = "0 30 1 * * ?") // Daily at 1:30 AM
    @Transactional
    public void applyDowngrades() {
        subscriptionService.processOverdueSubscriptions();
        subscriptionService.processSubscriptionReminders();
    }
}
