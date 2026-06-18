package com.possaas.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class TenantContext {

    private static final Logger logger = LoggerFactory.getLogger(TenantContext.class);
    private static final ThreadLocal<String> CURRENT_TENANT = new ThreadLocal<>();

    private TenantContext() {
        // Utility class
    }

    public static void setTenantId(String tenantId) {
        logger.debug("Setting tenantId: {}", tenantId);
        CURRENT_TENANT.set(tenantId);
    }

    /**
     * STRICT method – use ONLY in repository / Hibernate filter logic.
     * Throws exception if tenant is not set.
     */
    public static String getTenantId() {
        String tenantId = CURRENT_TENANT.get();

        if (tenantId == null) {
            throw new IllegalStateException(
                    "Tenant ID is not set in TenantContext"
            );
        }

        return tenantId;
    }

    /**
     * SAFE method – use in controllers / public endpoints
     */
    public static String getTenantIdOrNull() {
        return CURRENT_TENANT.get();
    }

    public static void clear() {
        logger.debug("Clearing tenant context");
        CURRENT_TENANT.remove();
    }
}
