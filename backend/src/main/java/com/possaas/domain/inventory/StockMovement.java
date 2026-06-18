package com.possaas.domain.inventory;

import com.possaas.domain.base.AuditableEntity;
import com.possaas.domain.product.Product;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Entity
@Table(
    name = "stock_movements",
    indexes = {
        @Index(name = "idx_stock_movements_tenant", columnList = "tenant_id"),
        @Index(name = "idx_stock_movements_product", columnList = "product_id"),
        @Index(name = "idx_stock_movements_branch", columnList = "branch_id"),
        @Index(name = "idx_stock_movements_type", columnList = "movement_type"),
        @Index(name = "idx_stock_movements_created", columnList = "created_at")
    }
)
@Data
@EqualsAndHashCode(callSuper = true)
public class StockMovement extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "branch_id")
    private Long branchId;

    @Enumerated(EnumType.STRING)
    @Column(name = "movement_type", nullable = false, length = 30)
    private StockMovementType movementType;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "reference_id")
    private Long referenceId; // order_id, transfer_id, adjustment_id

    @Column(name = "reference_type", length = 50)
    private String referenceType; // ORDER, TRANSFER, ADJUSTMENT, RETURN

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "performed_by")
    private Long performedBy; // User ID who performed the action

    @Column(name = "previous_quantity")
    private Integer previousQuantity;

    @Column(name = "new_quantity")
    private Integer newQuantity;
}
