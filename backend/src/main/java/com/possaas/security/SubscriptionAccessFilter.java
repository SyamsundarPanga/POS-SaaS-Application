package com.possaas.security;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Set;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import com.possaas.config.TenantContext;
import com.possaas.domain.tenant.Subscription;
import com.possaas.domain.tenant.SubscriptionPaymentStatus;
import com.possaas.domain.tenant.SubscriptionStatus;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.repository.SubscriptionPaymentRepository;
import com.possaas.repository.SubscriptionRepository;
import com.possaas.repository.UserRepository;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class SubscriptionAccessFilter extends OncePerRequestFilter {

    private static final Set<String> STORE_ADMIN_BILLING_ONLY_PATTERNS = Set.of(
            "/api/subscription/**",
            "/api/billing/**",
            "/api/users/me/profile",
            "/api/auth/logout",
            "/api/auth/refresh-token");

    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionPaymentRepository subscriptionPaymentRepository;
    private final UserRepository userRepository;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return "OPTIONS".equalsIgnoreCase(request.getMethod())
                || path.startsWith("/api/auth/")
                || path.startsWith("/api/superadmin/")
                || path.startsWith("/api/webhooks/")
                || path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs")
                || path.startsWith("/swagger-resources");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            filterChain.doFilter(request, response);
            return;
        }

        String tenantId = TenantContext.getTenantId();
        if (!StringUtils.hasText(tenantId) || "SUPERADMIN".equalsIgnoreCase(tenantId)) {
            filterChain.doFilter(request, response);
            return;
        }

        User currentUser = resolveCurrentUser(authentication.getName(), tenantId);
        if (currentUser == null) {
            filterChain.doFilter(request, response);
            return;
        }

        Subscription subscription = subscriptionRepository.findByTenantId(tenantId).orElse(null);

        if (!currentUser.isEmailVerified()) {
            writeForbidden(response,
                    "Your email is not verified. Please verify your email and complete payment before signing in.");
            return;
        }

        boolean hasSuccessfulPayment = subscriptionPaymentRepository.existsByTenantIdAndPaymentStatus(
                tenantId,
                SubscriptionPaymentStatus.SUCCESS);
        if (!hasSuccessfulPayment || (subscription != null && subscription.getStatus() == SubscriptionStatus.PENDING_PAYMENT)) {
            writeForbidden(response,
                    "Your subscription payment is pending. Please complete payment before signing in.");
            return;
        }

        if (subscription == null || subscription.getStatus() != SubscriptionStatus.CANCELLED) {
            filterChain.doFilter(request, response);
            return;
        }

        boolean retentionActive = subscription.getDataRetentionUntil() != null
                && !LocalDateTime.now().isAfter(subscription.getDataRetentionUntil());

        if (currentUser.getRole() == Role.ROLE_STORE_ADMIN && retentionActive) {
            if (isAllowedForBillingOnly(request.getRequestURI())) {
                filterChain.doFilter(request, response);
                return;
            }
            writeForbidden(response,
                    "Subscription is cancelled. Billing-only access is enforced. Open Settings to reactivate.");
            return;
        }

        writeForbidden(response,
                "Subscription is cancelled. No access is available for this role until the Store Admin reactivates the subscription.");
    }

    private User resolveCurrentUser(String principal, String tenantId) {
        return userRepository.findByEmailAndTenantId(principal, tenantId)
                .or(() -> userRepository.findByUsernameAndTenantId(principal, tenantId))
                .orElse(null);
    }

    private boolean isAllowedForBillingOnly(String requestUri) {
        return STORE_ADMIN_BILLING_ONLY_PATTERNS.stream().anyMatch(pattern -> pathMatcher.match(pattern, requestUri));
    }

    private void writeForbidden(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"Forbidden\",\"message\":\"" + escapeJson(message) + "\"}");
    }

    private String escapeJson(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
