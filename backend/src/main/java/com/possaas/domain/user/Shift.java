package com.possaas.domain.user;

import com.possaas.domain.base.AuditableEntity;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "shifts",
        indexes = {
                @Index(name = "idx_shifts_tenant", columnList = "tenant_id"),
                @Index(name = "idx_shifts_employee", columnList = "employee_id"),
                @Index(name = "idx_shifts_branch", columnList = "branch_id"),
                @Index(name = "idx_shifts_status", columnList = "status")
        }
)
@Data
@EqualsAndHashCode(callSuper = true)
public class Shift extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private User employee;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @Column(name = "shift_start", nullable = false)
    private LocalDateTime shiftStart;

    @Column(name = "shift_end")
    private LocalDateTime shiftEnd;

    @Column(name = "starting_cash", nullable = false, precision = 10, scale = 2)
    private BigDecimal startingCash;

    @Column(name = "final_cash", precision = 10, scale = 2)
    private BigDecimal finalCash;

    @Column(length = 50)
    private String status = "OPEN"; // OPEN, CLOSED

    @Column(columnDefinition = "TEXT")
    private String notes;
}
