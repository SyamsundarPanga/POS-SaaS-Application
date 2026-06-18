package com.possaas.domain.branch;

import java.time.LocalTime;

import com.possaas.domain.base.AuditableEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Entity
@Table(
    name = "branches",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"tenant_id", "code"})
    },
    indexes = {
        @Index(name = "idx_branches_tenant", columnList = "tenant_id"),
        @Index(name = "idx_branches_code", columnList = "code"),
        @Index(name = "idx_branches_status", columnList = "status")
    }
)
@Data
@EqualsAndHashCode(callSuper = true)
public class Branch extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String code;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 500)
    private String address;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String state;

    @Column(length = 20)
    private String zipCode;

    @Column(length = 100)
    private String country;

    @Column(length = 20)
    private String phone;

    @Column(length = 100)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BranchStatus status = BranchStatus.ACTIVE;

    @Column(name = "manager_id")
    private Long managerId;

    @Column(name = "opening_time", length = 10)
    private LocalTime openingTime; // e.g., "09:00"

    @Column(name = "closing_time", length = 10)
    private LocalTime closingTime; // e.g., "21:00"

    @Column(name = "tax_rate", precision = 5, scale = 2)
    private java.math.BigDecimal taxRate; // e.g., 8.50 for 8.5%

    @Column(name = "is_main_branch")
    private Boolean isMainBranch = false;
}
