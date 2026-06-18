package com.possaas.config;

import jakarta.persistence.EntityManager;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.hibernate.Filter;
import org.hibernate.Session;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TenantFilterConfigTest {

    @InjectMocks
    private TenantFilterConfig tenantFilter;

    @Mock
    private EntityManager entityManager;

    @Mock
    private Session session;

    @Mock
    private Filter hibernateFilter;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        TenantContext.clear();
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("Should enable Hibernate filter when X-Tenant-ID header is present")
    void shouldEnableFilterWhenHeaderPresent() throws ServletException, IOException {

        String tenantId = "tenant_abc";

        when(request.getHeader("X-Tenant-ID")).thenReturn(tenantId);
        when(entityManager.unwrap(Session.class)).thenReturn(session);
        when(session.enableFilter("tenantFilter")).thenReturn(hibernateFilter);

        tenantFilter.doFilterInternal(request, response, filterChain);

        verify(session).enableFilter("tenantFilter");
        verify(hibernateFilter).setParameter("tenantId", tenantId);
        verify(filterChain).doFilter(request, response);

        assertThrows(IllegalStateException.class, TenantContext::getTenantId);
    }

    @Test
    @DisplayName("Should skip filter enabling when header is missing")
    void shouldSkipWhenHeaderMissing() throws ServletException, IOException {

        when(request.getHeader("X-Tenant-ID")).thenReturn(null);

        tenantFilter.doFilterInternal(request, response, filterChain);

        verify(entityManager, never()).unwrap(any());
        verify(filterChain).doFilter(request, response);

        assertThrows(IllegalStateException.class, TenantContext::getTenantId);
    }

    @Test
    @DisplayName("Should ensure TenantContext is cleared even on exception")
    void shouldClearContextOnException() throws ServletException, IOException {

        when(request.getHeader("X-Tenant-ID")).thenReturn("err_tenant");
        when(entityManager.unwrap(Session.class)).thenReturn(session);
        when(session.enableFilter(anyString())).thenReturn(hibernateFilter);

        doThrow(new RuntimeException("Downstream error"))
                .when(filterChain).doFilter(any(), any());

        assertThrows(RuntimeException.class, () ->
                tenantFilter.doFilterInternal(request, response, filterChain)
        );

        assertThrows(IllegalStateException.class, TenantContext::getTenantId);
    }
}