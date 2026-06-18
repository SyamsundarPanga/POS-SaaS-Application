package com.possaas.domain.order;

import com.possaas.domain.base.AuditableEntity;
import com.possaas.domain.product.Product;
import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Entity
@Table(
        name = "order_line_items",
        indexes = {@Index(name = "idx_order_line_items_tenant", columnList = "tenant_id")}
)
@Data
@EqualsAndHashCode(callSuper = true)
public class OrderLineItem extends AuditableEntity  {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;
    
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;
    
    @Column(nullable = false)
    private Integer quantity;
    
    @Column(nullable = false)
    private Double price;

    @Column(nullable = false)
    private Double discount;
    
    @Column(nullable = false)
    private Double lineTotal;

    @Column(name = "discount_percent", precision = 5, scale = 2)
    private BigDecimal discountPercent;

    @Column(name = "discount_amount", precision = 19, scale = 4)
    private BigDecimal discountAmount;

    @Column(name = "subtotal_before_discount", precision = 19, scale = 4)
    private BigDecimal subtotalBeforeDiscount;

    @Column(name = "taxable_amount", precision = 19, scale = 4)
    private BigDecimal taxableAmount;

    @Column(name = "tax_amount", precision = 19, scale = 4)
    private BigDecimal taxAmount;

    @Column(name = "final_total", precision = 19, scale = 4)
    private BigDecimal finalTotal;
}
