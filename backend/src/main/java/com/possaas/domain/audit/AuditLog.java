package com.possaas.domain.audit;

import com.possaas.domain.base.AuditableEntity;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Entity
@Table(name = "audit_logs", indexes = {
    @Index(name = "idx_audit_logs_tenant", columnList = "tenant_id"),
    @Index(name = "idx_audit_logs_user", columnList = "user_id"),
    @Index(name = "idx_audit_logs_action", columnList = "action"),
    @Index(name = "idx_audit_logs_resource", columnList = "resource"),
    @Index(name = "idx_audit_logs_created", columnList = "created_at")
})
@Data
@EqualsAndHashCode(callSuper = true)
public class AuditLog extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "username")
    private String username;

    @Column(name = "action", nullable = false)
    private String action;

    @Column(name = "resource")
    private String resource;

    @Column(name = "resource_id")
    private String resourceId;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "branch_name")
    private String branchName;

    @Column(name = "details", columnDefinition = "TEXT")
    private String details;

    @Column(name = "ip_address")
    private String ipAddress;
}
