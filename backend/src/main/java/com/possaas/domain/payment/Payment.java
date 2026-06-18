package com.possaas.domain.payment;

import com.possaas.domain.base.AuditableEntity;
import com.possaas.domain.order.Order;
import com.possaas.listener.TenantEntityListener;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "payments",
        indexes = {
                @Index(name = "idx_payments_tenant", columnList = "tenant_id"),
                @Index(name = "idx_payments_order", columnList = "order_id"),
                @Index(name = "idx_payments_tenant_created", columnList = "tenant_id, created_at"),
                @Index(name = "idx_payments_tenant_order", columnList = "tenant_id, order_id")
        }
)
@Data
@EqualsAndHashCode(callSuper = true)
public class Payment extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentMethod method;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentStatus status;

    @Column(name = "transaction_id")
    private String transactionId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        // Don't set default tenant here - let TenantEntityListener handle it
    }
    
    @Column(name = "amount_tendered", precision = 19, scale = 4)
    private BigDecimal amountTendered; // Cash received (e.g., $50)

    @Column(name = "change_amount", precision = 19, scale = 4)
    private BigDecimal changeAmount; // Calculated change (e.g., $5)
}