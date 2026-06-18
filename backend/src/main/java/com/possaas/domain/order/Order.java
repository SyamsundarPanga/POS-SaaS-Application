package com.possaas.domain.order;

import java.math.BigDecimal;
import java.util.List;

import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;

import com.possaas.domain.base.AuditableEntity;
import com.possaas.domain.branch.Branch;
import com.possaas.domain.payment.Payment;
import com.possaas.domain.user.Shift;
import com.possaas.domain.user.User;
import com.possaas.listener.TenantEntityListener;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Entity
@Table(name = "orders",
       indexes = {
           @Index(name = "idx_orders_tenant_id", columnList = "tenant_id"),
          @Index(name = "idx_orders_tenant_active", columnList = "tenant_id,is_deleted")
       },
       uniqueConstraints = {
               // This ensures ORD-001 is unique per store, not globally.
               @UniqueConstraint(name = "uk_order_number_tenant", columnNames = {"order_number", "tenant_id"})
           })
@Data
@EqualsAndHashCode(callSuper = true)
@EntityListeners(TenantEntityListener.class)
public class Order extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "order_number", nullable = false)
    private String orderNumber;
    
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cashier_id", nullable = false)
    private User cashier;
    
    @Column(nullable = false)
    private BigDecimal subtotal;

    @Column(nullable = false)
    private BigDecimal tax;

    @Column(nullable = false)
    private BigDecimal discount;

//    @Column(nullable = false)
//    private BigDecimal total;

    @Column(name = "discount_type", length = 20)
    private String discountType;

    @Column(name = "discount_percent", precision = 5, scale = 2)
    private BigDecimal discountPercent;

    @Column(name = "discount_amount", precision = 19, scale = 4)
    private BigDecimal discountAmount;

    @Column(name = "subtotal_before_discount", nullable = false, precision = 19, scale = 4)
    private BigDecimal subtotalBeforeDiscount;

    @Column(name = "taxable_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal taxableAmount;

    @Column(name = "tax_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal taxAmount;

    @Column(name = "final_total", nullable = false, precision = 19, scale = 4)
    private BigDecimal finalTotal;

    // Customer/User - optional for walk-in customers
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "user_id", nullable = true)
    private User user;

    @Column(name = "customer_id")
    private Long customerId;

    @Column(name = "customer_name")
    private String customerName;

    @Column(name = "customer_email")
    private String customerEmail;

    @Column(name = "total_amount", nullable = false,precision = 19, scale = 4)
    private BigDecimal totalAmount;

    @Convert(converter = OrderStatusConverter.class)
    @Column(nullable = false)
    private OrderStatus status;
    
    @OneToMany(
            mappedBy = "order",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    @Fetch(FetchMode.SUBSELECT)
    private List<OrderLineItem> lineItems;

    @Lob
    @Column(name = "line_items_snapshot")
    private String lineItemsSnapshot;
    
    
    @OneToMany(
            mappedBy = "order",
            cascade = CascadeType.ALL,
            fetch = FetchType.LAZY,
            orphanRemoval = true
    )
    @Fetch(FetchMode.SUBSELECT)
    private List<Payment> payments; // BE-03: Bidirectional relationship


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id")
    private Shift shift;
}
