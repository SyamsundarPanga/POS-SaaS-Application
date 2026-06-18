package com.possaas.domain.tenant;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "invoices")
@Data
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String tenantId;

    @Column(unique = true)
    private String invoiceNumber;

    private BigDecimal amount;
    
//    @ManyToOne(fetch = FetchType.LAZY)
//    @JoinColumn(name = "plan_id", nullable = false)
//    private SubscriptionPlan subscriptionPlan;

    private LocalDate billingStart;
    private LocalDate billingEnd;

    @Enumerated(EnumType.STRING)
    private InvoiceStatus status;

    private LocalDate dueDate;
    private LocalDate paidDate;

    private LocalDateTime createdAt;
}