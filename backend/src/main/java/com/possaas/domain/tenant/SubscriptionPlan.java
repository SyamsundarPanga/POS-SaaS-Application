package com.possaas.domain.tenant;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "subscription_plan")
@Data

public class SubscriptionPlan{

    @Id
    @Column(length = 50)
    private String id;   // BASIC, PRO, ADVANCE

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubscriptionPlanType planType;

    @Column(nullable = false)
    private Integer maxBranches;

    @Column(nullable = false)
    private Integer maxUsers;

    @Column(nullable = false)
    private Integer maxProducts;

    @Column(nullable = false)
    private BigDecimal monthlyPrice;
 
}
