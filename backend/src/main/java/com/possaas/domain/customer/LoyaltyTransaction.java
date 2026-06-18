package com.possaas.domain.customer;

import com.possaas.domain.base.AuditableEntity;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

@Entity
@Table(
        name = "loyalty_transactions",
        indexes = {
                @Index(name = "idx_loyalty_customer", columnList = "tenant_id, customer_id"),
                @Index(name = "idx_loyalty_order", columnList = "tenant_id, order_id"),
                @Index(name = "idx_loyalty_type", columnList = "tenant_id, transaction_type")
        }
)
@Data
@EqualsAndHashCode(callSuper = true)
public class LoyaltyTransaction extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "order_id")
    private Long orderId;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 20)
    private LoyaltyTransactionType transactionType;

    @Column(nullable = false)
    private Integer points;

    @Column(name = "order_amount", precision = 10, scale = 2)
    private BigDecimal orderAmount;

    @Column(name = "points_before", nullable = false)
    private Integer pointsBefore;

    @Column(name = "points_after", nullable = false)
    private Integer pointsAfter;

    @Column(name = "tier_before", length = 20)
    private String tierBefore;

    @Column(name = "tier_after", length = 20)
    private String tierAfter;

    @Column(length = 500)
    private String description;

    @Column(name = "reference_type", length = 50)
    private String referenceType; // ORDER, MANUAL_ADJUSTMENT, REFERRAL, BIRTHDAY_BONUS, etc.

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(name = "performed_by")
    private Long performedBy; // User ID who performed the transaction (for manual adjustments)
}
