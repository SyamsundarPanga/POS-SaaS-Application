package com.possaas.domain.security;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.possaas.domain.tenant.BillingCycle;
import com.possaas.domain.tenant.SubscriptionPaymentStatus;
import com.possaas.domain.tenant.SubscriptionPlanType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "pending_registrations")
@Data
public class PendingRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "store_name", nullable = false)
    private String storeName;

    @Column(name = "admin_username", nullable = false)
    private String adminUsername;

    @Column(name = "admin_email", nullable = false)
    private String adminEmail;

    @Column(name = "admin_password_hash", nullable = false)
    private String adminPasswordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubscriptionPlanType plan;

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_cycle", nullable = false)
    private BillingCycle billingCycle = BillingCycle.MONTHLY;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified = false;

    @Column(name = "verification_token", nullable = false, unique = true)
    private String verificationToken;

    @Column(name = "verification_token_expires_at", nullable = false)
    private LocalDateTime verificationTokenExpiresAt;

    @Column(name = "session_token", nullable = false, unique = true)
    private String sessionToken;

    @Column(name = "session_token_expires_at", nullable = false)
    private LocalDateTime sessionTokenExpiresAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status")
    private SubscriptionPaymentStatus paymentStatus;

    @Column(name = "payment_amount", precision = 12, scale = 2)
    private BigDecimal paymentAmount;

    @Column(name = "razorpay_order_id", unique = true)
    private String razorpayOrderId;

    @Column(name = "razorpay_payment_id")
    private String razorpayPaymentId;

    @Column(name = "razorpay_signature", columnDefinition = "TEXT")
    private String razorpaySignature;

    @Column(nullable = false)
    private boolean completed = false;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
