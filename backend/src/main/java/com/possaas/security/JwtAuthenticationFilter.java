package com.possaas.security;

import com.possaas.config.TenantContext;
import com.possaas.service.auth.JwtTokenProvider;
import com.possaas.service.security.TokenBlacklistService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger logger =
            LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private UserDetailsService userDetailsService;

    @Autowired
    private TokenBlacklistService tokenBlacklistService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        boolean authenticationFailed = false;
        try {
            String jwt = parseJwt(request);
            
            logger.debug("JWT Filter - Request URI: {}", request.getRequestURI());
            logger.debug("JWT Filter - Token present: {}", jwt != null);

            if (jwt != null && tokenBlacklistService.isBlacklisted(jwt)) {
                logger.warn("JWT Filter - Blocked blacklisted token for URI: {}", request.getRequestURI());
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"Token is blacklisted\"}");
                TenantContext.clear();
                return;
            }

            if (jwt != null && jwtTokenProvider.validateToken(jwt)) {
                
                logger.debug("JWT Filter - Token is valid");

                String username = jwtTokenProvider.getUsername(jwt);
                String tenantId = jwtTokenProvider.getTenantId(jwt);
                
                logger.debug("JWT Filter - Username: {}, TenantId: {}", username, tenantId);

                if (StringUtils.hasText(tenantId)) {
                    TenantContext.setTenantId(tenantId);
                }
                UserDetails userDetails =
                        userDetailsService.loadUserByUsername(username);
                
                logger.debug("JWT Filter - UserDetails loaded: {}", userDetails.getUsername());

//                if (tenantId != null) {
//                    TenantContext.setTenantId(tenantId);
//                }

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities()
                        );

                authentication.setDetails(
                        new WebAuthenticationDetailsSource()
                                .buildDetails(request)
                );

                SecurityContextHolder.getContext()
                        .setAuthentication(authentication);
                
                logger.debug("JWT Filter - Authentication set in SecurityContext");
            } else {
                logger.debug("JWT Filter - Token validation failed or token is null");
            }
        } catch (Exception e) {
            logger.error("Cannot set user authentication: {}", e.getMessage(), e);
            authenticationFailed = true;
            if (!response.isCommitted()) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\""
                        + escapeJson(e.getMessage() != null ? e.getMessage() : "Authentication failed") + "\"}");
            }
        }

        if (authenticationFailed) {
            TenantContext.clear();
            return;
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            // 🔴 CRITICAL cleanup
            TenantContext.clear();
        }
    }

    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");

        if (StringUtils.hasText(headerAuth)
                && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }

        return null;
    }

    private String escapeJson(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
