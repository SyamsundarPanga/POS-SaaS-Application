package com.possaas.domain.branch;

import com.possaas.domain.base.AuditableEntity;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.util.Map;

@Entity
@Table(name = "branch_settings",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"branch_id", "tenant_id"})
        },
        indexes = {
                @Index(name = "idx_branch_settings_tenant", columnList = "tenant_id"),
                @Index(name = "idx_branch_settings_branch", columnList = "branch_id")
        }
)
@Data
@EqualsAndHashCode(callSuper = true)
public class BranchSettings extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @ElementCollection
    @CollectionTable(name = "branch_opening_hours", joinColumns = @JoinColumn(name = "settings_id"))
    @MapKeyColumn(name = "day_of_week")
    @Column(name = "hours")
    private Map<String, String> openingHours;

    @Column(name = "tax_rate", precision = 5, scale = 2)
    private BigDecimal taxRate = BigDecimal.ZERO;

    @Column(name = "receipt_template", columnDefinition = "TEXT")
    private String receiptTemplate;

    @ElementCollection
    @CollectionTable(name = "branch_payment_methods", joinColumns = @JoinColumn(name = "settings_id"))
    @Column(name = "payment_method")
    private java.util.List<String> paymentMethods;

    @Column(name = "low_stock_threshold")
    private Integer lowStockThreshold = 10;

    @Column(name = "discount_enabled", nullable = false)
    private Boolean discountEnabled = true;

    @Column(name = "max_discount_percent", precision = 5, scale = 2, nullable = false)
    private BigDecimal maxDiscountPercent = new BigDecimal("100.00");

    @Column(name = "require_manager_approval", nullable = false)
    private Boolean requireManagerApproval = false;
}
