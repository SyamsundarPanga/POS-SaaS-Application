package com.possaas.listener;

import com.possaas.config.TenantContext;
import com.possaas.domain.base.BaseEntity;
import jakarta.persistence.PrePersist;

public class TenantEntityListener {

    @PrePersist
    public void prePersist(Object entity) {

        // Apply only to BaseEntity
        if (!(entity instanceof BaseEntity baseEntity)) {
            return;
        }

        // Respect explicitly set tenant_id (admin override)
        if (baseEntity.getTenantId() != null) {
            return;
        }

        // Fetch tenant from context
        String tenantId = TenantContext.getTenantIdOrNull();

        if (tenantId == null) {
            throw new IllegalStateException(
                "Cannot save entity without tenant context"
            );
        }

        // Auto-populate tenant_id
        baseEntity.setTenantId(tenantId);
    }
}
