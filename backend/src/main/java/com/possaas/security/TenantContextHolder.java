package com.possaas.security;

import com.possaas.config.TenantContext;
import com.possaas.security.service.UserDetailsImpl;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * Wrapper to avoid direct ThreadLocal usage.
 */
public final class TenantContextHolder {

    private TenantContextHolder() {
    }

    public static void setTenant(String tenantId) {
        TenantContext.setTenantId(tenantId);
    }

    public static String getTenant() {
        return TenantContext.getTenantId();
    }

    public static String getTenantOrNull() {
        return TenantContext.getTenantIdOrNull();
    }

    public static void clear() {
        TenantContext.clear();
    }

    /**
     * Get the current authenticated user's ID from Spring Security context.
     * Returns null if no authentication is present.
     */
    public static Long getUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        Object principal = authentication.getPrincipal();
        
        if (principal instanceof UserDetailsImpl) {
            return ((UserDetailsImpl) principal).getId();
        }
        
        return null;
    }

    /**
     * Get the current authenticated username from Spring Security context.
     * Returns null if no authentication is present.
     */
    public static String getUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        Object principal = authentication.getPrincipal();
        
        if (principal instanceof UserDetails) {
            return ((UserDetails) principal).getUsername();
        }
        
        return principal.toString();
    }
}
