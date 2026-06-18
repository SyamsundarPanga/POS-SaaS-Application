package com.possaas.security;

import com.possaas.config.TenantContext;
import com.possaas.service.auth.JwtTokenProvider;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.PrintWriter;
import java.io.StringWriter;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TenantFilterInterceptorTest {

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @InjectMocks
    private TenantFilterInterceptor tenantFilterInterceptor;

    @AfterEach
    void cleanup() {
        TenantContext.clear();
    }

    // ==================================================
    // VALID TOKEN + TENANT
    // ==================================================
    @Test
    void preHandle_validTokenAndTenantId_setsTenantContext() throws Exception {
        when(request.getHeader("Authorization")).thenReturn("Bearer token");
        when(jwtTokenProvider.validateToken("token")).thenReturn(true);
        when(jwtTokenProvider.getTenantId("token")).thenReturn("tenant-123");

        boolean result =
                tenantFilterInterceptor.preHandle(
                        request, response, new Object()
                );

        assertTrue(result);
        assertEquals("tenant-123", TenantContext.getTenantIdOrNull());
    }

    // ==================================================
    // MISSING TENANT ID
    // ==================================================
    @Test
    void preHandle_missingTenantId_returnsBadRequest() throws Exception {
        StringWriter responseBody = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(responseBody));

        when(request.getHeader("Authorization")).thenReturn("Bearer token");
        when(jwtTokenProvider.validateToken("token")).thenReturn(true);
        when(jwtTokenProvider.getTenantId("token")).thenReturn(null);

        boolean result =
                tenantFilterInterceptor.preHandle(
                        request, response, new Object()
                );

        assertFalse(result);
        verify(response).setStatus(HttpServletResponse.SC_BAD_REQUEST);
        assertTrue(
                responseBody.toString()
                        .contains("Tenant ID is missing")
        );
    }

    @Test
    void preHandle_emptyTenantId_returnsBadRequest() throws Exception {
        StringWriter responseBody = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(responseBody));

        when(request.getHeader("Authorization")).thenReturn("Bearer token");
        when(jwtTokenProvider.validateToken("token")).thenReturn(true);
        when(jwtTokenProvider.getTenantId("token")).thenReturn("");

        boolean result =
                tenantFilterInterceptor.preHandle(
                        request, response, new Object()
                );

        assertFalse(result);
    }

    // ==================================================
    // INVALID TOKEN
    // ==================================================
    @Test
    void preHandle_invalidToken_allowsRequestWithoutContext() throws Exception {
        when(request.getHeader("Authorization")).thenReturn("Bearer token");
        when(jwtTokenProvider.validateToken("token")).thenReturn(false);

        boolean result =
                tenantFilterInterceptor.preHandle(
                        request, response, new Object()
                );

        assertTrue(result);
        assertNull(TenantContext.getTenantIdOrNull());
    }

    // ==================================================
    // NO AUTH HEADER
    // ==================================================
    @Test
    void preHandle_noAuthorizationHeader_allowsRequest() throws Exception {
        when(request.getHeader("Authorization")).thenReturn(null);

        boolean result =
                tenantFilterInterceptor.preHandle(
                        request, response, new Object()
                );

        assertTrue(result);
        verifyNoInteractions(jwtTokenProvider);
    }

    // ==================================================
    // CLEANUP
    // ==================================================
    @Test
    void afterCompletion_alwaysClearsTenantContext() {
        TenantContext.setTenantId("tenant-123");

        tenantFilterInterceptor.afterCompletion(
                request, response, new Object(), null
        );

        assertNull(TenantContext.getTenantIdOrNull());
    }

    @Test
    void afterCompletion_withException_stillClearsContext() {
        TenantContext.setTenantId("tenant-123");

        tenantFilterInterceptor.afterCompletion(
                request,
                response,
                new Object(),
                new RuntimeException("boom")
        );

        assertNull(TenantContext.getTenantIdOrNull());
    }
}
