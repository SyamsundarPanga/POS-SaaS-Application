package com.possaas.domain.tenant;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "usage_tracking")
@Data
public class UsageTracking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String tenantId;

    @Column(nullable = false)
    private Long currentUsers = 0L;

    @Column(nullable = false)
    private Long currentBranches = 0L;

    @Column(nullable = false)
    private Long currentProducts = 0L;

    @Version
    private Long version; // optimistic locking

    @Column(nullable = false)
    private LocalDateTime lastUpdated;
}