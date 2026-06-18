package com.possaas.domain.inventory;

import com.possaas.domain.base.AuditableEntity;
import com.possaas.domain.product.Product;
import com.possaas.domain.user.User;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Entity
@Table(name = "stock_transfers",
        indexes = {
                @Index(name = "idx_stock_transfers_tenant", columnList = "tenant_id"),
                @Index(name = "idx_stock_transfers_source", columnList = "source_branch_id"),
                @Index(name = "idx_stock_transfers_destination", columnList = "destination_branch_id"),
                @Index(name = "idx_stock_transfers_status", columnList = "status")
        }
)
@Data
@EqualsAndHashCode(callSuper = true)
public class StockTransfer extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "source_branch_id", nullable = false)
    private Long sourceBranchId;

    @Column(name = "destination_branch_id", nullable = false)
    private Long destinationBranchId;

    @Column(nullable = false)
    private Integer quantity;

    @Column(length = 50)
    private String status = "PENDING"; // PENDING, COMPLETED, CANCELLED

    @Column(columnDefinition = "TEXT")
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;
}
