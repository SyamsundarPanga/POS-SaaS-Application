package com.possaas.listener;

import com.possaas.config.HibernateTenantFilterConfig;
import com.possaas.config.TenantContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class TenantHibernateInterceptor implements HandlerInterceptor {

    private final HibernateTenantFilterConfig hibernateFilterConfig;

    public TenantHibernateInterceptor(HibernateTenantFilterConfig hibernateFilterConfig) {
        this.hibernateFilterConfig = hibernateFilterConfig;
    }

    @Override
    public boolean preHandle(HttpServletRequest request,
            HttpServletResponse response,
            Object handler) {

        String path = request.getRequestURI();

        // Skip tenant filter for public endpoints
        if (path.startsWith("/api/auth/") ||
                path.startsWith("/api/test/") ||
                path.startsWith("/swagger") ||
                path.startsWith("/v3/api-docs")) {
            // Only enable filter if tenant is actually set
            String tenantId = TenantContext.getTenantIdOrNull();
            if (tenantId != null) {
                hibernateFilterConfig.enableTenantFilter();
            }
            return true;
        }

        hibernateFilterConfig.enableTenantFilter();
        return true;
    }
}
