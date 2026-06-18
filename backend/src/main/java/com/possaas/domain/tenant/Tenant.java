package com.possaas.domain.tenant;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tenants")
@Data
public class Tenant {

    @Id
    private String id;

    @Column(nullable = false, unique = true)
    private String name;

//    @Enumerated(EnumType.STRING)
//    private SubscriptionPlanType plan;
    
    @ManyToOne
    @JoinColumn(name = "plan_id", nullable = false)
    private SubscriptionPlan subscriptionPlan;

    private boolean active = true;

    private LocalDateTime createdAt;

    @PrePersist
    void init() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        createdAt = LocalDateTime.now();
    }
}
