package com.possaas.domain.product;

import java.math.BigDecimal;

import com.possaas.domain.base.AuditableEntity;
import com.possaas.domain.branch.Branch;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Entity
@Table(
        name = "products",
        uniqueConstraints = {
        		@UniqueConstraint(columnNames = {"tenant_id", "branch_id", "sku"}),
        		@UniqueConstraint(columnNames = {"tenant_id", "branch_id", "barcode"})
        },
        indexes = {
                @Index(name = "idx_products_tenant", columnList = "tenant_id"),
                @Index(name = "idx_products_branch", columnList = "branch_id"),
                @Index(name = "idx_products_sku", columnList = "sku"),
                @Index(name = "idx_products_name", columnList = "name"),
                @Index(name = "idx_products_category", columnList = "category_id"),
                @Index(name = "idx_products_status", columnList = "status")
        }
)
@Data
@EqualsAndHashCode(callSuper = true, exclude = {"category"})
public class Product extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(nullable = false, length = 50)
    private String sku;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "cost_price", precision = 10, scale = 2)
    private BigDecimal costPrice; // For profit margin calculation

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProductStatus status = ProductStatus.ACTIVE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @Column(length = 100)
    private String barcode;

    @Column(length = 50)
    private String unit = "PCS"; // Unit of measurement (PCS, KG, L, etc.)

    @Column(name = "min_stock_level")
    private Integer minStockLevel = 10; // Low stock threshold

    @Column(name = "max_stock_level")
    private Integer maxStockLevel;

    @Column(name = "reorder_point")
    private Integer reorderPoint;

    @Column(name = "tax_rate", precision = 5, scale = 2)
    private BigDecimal taxRate; // Product-specific tax rate

    @Column(name = "is_taxable")
    private Boolean isTaxable = true;

    @Column(name = "allow_decimal_quantity")
    private Boolean allowDecimalQuantity = false;

    @Column(columnDefinition = "TEXT")
    private String tags; // Comma-separated tags for search
}
