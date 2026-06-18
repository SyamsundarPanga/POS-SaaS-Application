package com.possaas.security;

import com.possaas.config.TenantContext;
import com.possaas.service.auth.JwtTokenProvider;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class TenantFilterInterceptor implements HandlerInterceptor {

    private static final Logger logger =
            LoggerFactory.getLogger(TenantFilterInterceptor.class);

    private static final String AUTH_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtTokenProvider jwtTokenProvider;

    public TenantFilterInterceptor(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {

        // 🔴 ALWAYS start clean
        TenantContext.clear();

        String authHeader = request.getHeader(AUTH_HEADER);

        // Public / unauthenticated request
        if (!StringUtils.hasText(authHeader)
                || !authHeader.startsWith(BEARER_PREFIX)) {
            logger.debug("No Authorization header for {}",
                    request.getRequestURI());
            return true;
        }

        String token = authHeader.substring(BEARER_PREFIX.length());

        if (!jwtTokenProvider.validateToken(token)) {
            logger.warn("Invalid JWT token for {}",
                    request.getRequestURI());
            TenantContext.clear();
            return true; // Let security handle it
        }

        String tenantId = jwtTokenProvider.getTenantId(token);

        if (!StringUtils.hasText(tenantId)) {
            logger.warn("Tenant ID missing in token");

            TenantContext.clear();

            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.setContentType("application/json");
            response.getWriter()
                    .write("{\"error\":\"Tenant ID is missing in token\"}");
            response.getWriter().flush();

            return false;
        }

        TenantContext.setTenantId(tenantId);
        logger.debug("TenantContext set for tenant: {}", tenantId);

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request,
                                HttpServletResponse response,
                                Object handler,
                                Exception ex) {

        // 🔴 GUARANTEED cleanup
        TenantContext.clear();
        logger.debug("TenantContext cleared");
    }
}
