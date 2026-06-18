package com.possaas.domain.security;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "login_attempts")
@Data
public class LoginAttempt {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String username;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "attempt_time", nullable = false)
    private LocalDateTime attemptTime;

    @Column(nullable = false)
    private boolean successful;

    @Column(name = "failure_reason")
    private String failureReason;

    @Column(name = "tenant_id")
    private String tenantId;

    @PrePersist
    protected void onCreate() {
        attemptTime = LocalDateTime.now();
    }
}
