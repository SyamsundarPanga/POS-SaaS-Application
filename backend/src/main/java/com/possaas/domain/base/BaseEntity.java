package com.possaas.domain.base;

import java.io.Serializable;

import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

import com.possaas.config.TenantContext;
import com.possaas.listener.TenantEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import lombok.Data;

@MappedSuperclass
@Data
@EntityListeners(TenantEntityListener.class)
@FilterDef(
        name = "tenantFilter",
        parameters = @ParamDef(name = "tenantId", type = String.class)
)
@Filter(
        name = "tenantFilter",
        condition = "tenant_id = :tenantId AND is_deleted = false"
)
public abstract class BaseEntity implements Serializable {

    @Column(name = "tenant_id", nullable = false, updatable = false)
    private String tenantId;

    @PrePersist
    public void assignTenant() {
        if (this.tenantId != null) {
            return; // manual override allowed
        }

        String tenant = TenantContext.getTenantIdOrNull();
        if (tenant == null) {
            throw new IllegalStateException("TenantId not set in TenantContext");
        }

        this.tenantId = tenant;
    }
}