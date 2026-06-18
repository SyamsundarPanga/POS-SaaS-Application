package com.possaas.config;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.hibernate.Session;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class TenantFilterConfig extends OncePerRequestFilter {

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    private com.possaas.repository.TenantRepository tenantRepository;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
    	if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            response.setStatus(HttpServletResponse.SC_OK);
            filterChain.doFilter(request, response);
            return;
        }
        String tenantId = request.getHeader("X-Tenant-ID");

        try {
            if (tenantId != null && !tenantId.isBlank()) {

                // 1️⃣ Store tenant in ThreadLocal
                TenantContext.setTenantId(tenantId);

                // 2️⃣ Enable Hibernate tenant filter
                if (!"SUPERADMIN".equalsIgnoreCase(tenantId)) {
                    // Check if tenant is active
                    com.possaas.domain.tenant.Tenant tenant = tenantRepository.findById(tenantId).orElse(null);
                    if (tenant != null && !tenant.isActive()) {
                        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                        response.setContentType("application/json");
                        response.getWriter().write("{\"error\":\"Forbidden\",\"message\":\"This tenant is deactivated. Access denied.\"}");
                        TenantContext.clear();
                        return;
                    }

                    Session session = entityManager.unwrap(Session.class);
                    session.enableFilter("tenantFilter")
                           .setParameter("tenantId", tenantId);
                }
            }

            filterChain.doFilter(request, response);

        } finally {
            // 3️⃣ Cleanup (VERY IMPORTANT)
            TenantContext.clear();
        }
    }
}
