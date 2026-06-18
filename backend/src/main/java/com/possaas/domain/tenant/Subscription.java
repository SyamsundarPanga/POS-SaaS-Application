package com.possaas.domain.tenant;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "subscriptions")
@Data
public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String tenantId;

    @ManyToOne
    @JoinColumn(name = "plan_id", nullable = false)
    private SubscriptionPlan plan;


    @Enumerated(EnumType.STRING)
    private SubscriptionStatus status;

    private LocalDateTime startDate;
    private LocalDateTime nextBillingDate;
    
    private LocalDateTime gracePeriodEndDate;
    private int retryCount = 0;
    private LocalDateTime nextRetryAt;

    @Column(nullable = false)
    private boolean cancelAtPeriodEnd = false;
    private LocalDateTime cancellationRequestedAt;
    private LocalDateTime cancelledAt;
    private LocalDateTime dataRetentionUntil;

    private String paymentMethodToken;
    private String paymentMethodLast4;
    private String paymentMethodBrand;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BillingCycle billingCycle = BillingCycle.MONTHLY;

    @ManyToOne
    @JoinColumn(name = "next_plan_id")
    private SubscriptionPlan nextPlan;

    private LocalDateTime downgradeEffectiveDate;
}
