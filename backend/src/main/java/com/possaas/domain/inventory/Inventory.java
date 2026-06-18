package com.possaas.domain.inventory;

import com.possaas.domain.base.AuditableEntity;
import com.possaas.domain.branch.Branch;
import com.possaas.domain.product.Product;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Entity
@Table(
        name = "inventory",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_inventory_tenant_branch_product",
                        columnNames = {"tenant_id", "branch_id", "product_id"}
                )
        },
        indexes = {
                @Index(name = "idx_inventory_tenant", columnList = "tenant_id"),
                @Index(name = "idx_inventory_product", columnList = "product_id"),
                @Index(name = "idx_inventory_branch", columnList = "branch_id"),
                @Index(name = "idx_inventory_low_stock", columnList = "quantity, low_stock_threshold")
        }
)
@Data
@EqualsAndHashCode(callSuper = true, exclude = {"product", "branch"})
public class Inventory extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @Column(nullable = false)
    private Integer quantity = 0;

    @Column(name = "low_stock_threshold")
    private Integer lowStockThreshold = 10;

    @Column(name = "reserved_quantity")
    private Integer reservedQuantity = 0; // For pending orders

    @Column(name = "available_quantity")
    private Integer availableQuantity = 0; // quantity - reservedQuantity

    @Column(name = "last_restock_date")
    private java.time.LocalDateTime lastRestockDate;

    @Column(name = "last_sale_date")
    private java.time.LocalDateTime lastSaleDate;

    @PrePersist
    @PreUpdate
    public void calculateAvailableQuantity() {
        if (this.quantity == null) {
            this.quantity = 0;
        }
        if (this.reservedQuantity == null) {
            this.reservedQuantity = 0;
        }
        this.availableQuantity = this.quantity - this.reservedQuantity;
    }

    public boolean isLowStock() {
        return this.quantity != null && this.lowStockThreshold != null 
               && this.quantity <= this.lowStockThreshold;
    }
}
