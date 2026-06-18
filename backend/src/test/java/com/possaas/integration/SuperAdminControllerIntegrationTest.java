package com.possaas.integration;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import jakarta.servlet.FilterChain;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.possaas.domain.tenant.SubscriptionStatus;
import com.possaas.dto.request.SuperAdminLoginRequest;
import com.possaas.dto.response.SuperAdminDashboardResponse;
import com.possaas.dto.response.SuperAdminLoginResponse;
import com.possaas.dto.response.TenantOverviewResponse;
import com.possaas.exception.ResourceNotFoundException;
import com.possaas.security.JwtAuthenticationFilter;
import com.possaas.service.superadmin.SuperAdminService;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("SuperAdmin Controller Integration Tests")
class SuperAdminControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private SuperAdminService superAdminService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    private SuperAdminLoginRequest validLoginRequest;
    private SuperAdminLoginResponse loginResponse;
    private SuperAdminDashboardResponse dashboardResponse;
    private TenantOverviewResponse tenantOverviewResponse;

    @BeforeEach
    void setUp() throws Exception {
        validLoginRequest = new SuperAdminLoginRequest();
        validLoginRequest.setEmail("superadmin@possaas.com");
        validLoginRequest.setPassword("SecurePass@123");

        loginResponse = SuperAdminLoginResponse.builder()
                .accessToken("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock.token")
                .email("superadmin@possaas.com")
                .role("ROLE_SUPER_ADMIN")
                .build();

        dashboardResponse = SuperAdminDashboardResponse.builder()
                .totalTenants(15L)
                .activeTenants(12L)
                .inactiveTenants(3L)
                .totalMonthlyRevenue(new BigDecimal("45000.00"))
                .tenantsCreatedThisMonth(3L)
                .build();

        tenantOverviewResponse = TenantOverviewResponse.builder()
                .tenantId("tenant-uuid-001")
                .tenantName("Retail Store One")
                .subscriptionStatus(SubscriptionStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .currentUsers(10L)
                .build();

        org.mockito.Mockito.doAnswer(invocation -> {
            FilterChain filterChain = invocation.getArgument(2);
            filterChain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());
    }

    @Nested
    @DisplayName("Login Tests - POST /api/superadmin/login")
    class LoginTests {

        @Test
        @DisplayName("Should return 200 and token for valid credentials")
        void login_shouldReturn200_whenCredentialsAreValid() throws Exception {
            // Arrange
            when(superAdminService.login(any(SuperAdminLoginRequest.class))).thenReturn(loginResponse);

            // Act + Assert
            mockMvc.perform(post("/api/superadmin/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validLoginRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.accessToken").value("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock.token"))
                    .andExpect(jsonPath("$.email").value("superadmin@possaas.com"))
                    .andExpect(jsonPath("$.role").value("ROLE_SUPER_ADMIN"));
        }

        @Test
        @DisplayName("Should return 400 for blank email/password and skip service call")
        void login_shouldReturn400_whenEmailOrPasswordBlank() throws Exception {
            // Arrange
            SuperAdminLoginRequest invalid = new SuperAdminLoginRequest();
            invalid.setEmail("");
            invalid.setPassword("");

            // Act + Assert
            mockMvc.perform(post("/api/superadmin/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalid)))
                    .andExpect(status().isBadRequest());

            verify(superAdminService, never()).login(any());
        }

        @Test
        @DisplayName("Should return 401 when service throws BadCredentialsException")
        void login_shouldReturn401_whenBadCredentials() throws Exception {
            // Arrange
            when(superAdminService.login(any(SuperAdminLoginRequest.class)))
                    .thenThrow(new BadCredentialsException("Invalid username or password"));

            // Act + Assert
            mockMvc.perform(post("/api/superadmin/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validLoginRequest)))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("Dashboard Tests - GET /api/superadmin/dashboard")
    class DashboardTests {

        @Test
        @WithMockUser(roles = "SUPER_ADMIN")
        @DisplayName("Should return 200 with dashboard metrics for SUPER_ADMIN")
        void dashboard_shouldReturn200_forSuperAdmin() throws Exception {
            // Arrange
            when(superAdminService.getDashboardStats()).thenReturn(dashboardResponse);

            // Act + Assert
            mockMvc.perform(get("/api/superadmin/dashboard"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalTenants").value(15))
                    .andExpect(jsonPath("$.activeTenants").value(12));
        }

        @Test
        @DisplayName("Should return 403 when unauthenticated")
        void dashboard_shouldReturn403_whenUnauthenticated() throws Exception {
            // Act + Assert
            mockMvc.perform(get("/api/superadmin/dashboard"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should return 403 for non-super-admin role")
        void dashboard_shouldReturn403_forAdminRole() throws Exception {
            // Act + Assert
            mockMvc.perform(get("/api/superadmin/dashboard"))
                    .andExpect(status().isForbidden());
        }
    }

    @Nested
    @DisplayName("Tenant List Tests - GET /api/superadmin/tenants")
    class TenantListTests {

        @Test
        @WithMockUser(roles = "SUPER_ADMIN")
        @DisplayName("Should return 200 with tenant list for SUPER_ADMIN")
        void tenants_shouldReturn200_withTenantContent() throws Exception {
            // Arrange
            Page<TenantOverviewResponse> page = new PageImpl<>(List.of(tenantOverviewResponse));
            when(superAdminService.getAllTenants(any(Pageable.class))).thenReturn(page);

            // Act + Assert
            mockMvc.perform(get("/api/superadmin/tenants"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].tenantId").value("tenant-uuid-001"));
        }

        @Test
        @WithMockUser(roles = "SUPER_ADMIN")
        @DisplayName("Should pass default pageable (size=20, sort=createdAt,DESC)")
        void tenants_shouldUseDefaultPageable() throws Exception {
            // Arrange
            when(superAdminService.getAllTenants(any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(tenantOverviewResponse)));

            // Act
            mockMvc.perform(get("/api/superadmin/tenants"))
                    .andExpect(status().isOk());

            // Assert
            org.mockito.ArgumentCaptor<Pageable> captor = org.mockito.ArgumentCaptor.forClass(Pageable.class);
            verify(superAdminService).getAllTenants(captor.capture());
            Pageable pageable = captor.getValue();
            org.junit.jupiter.api.Assertions.assertEquals(20, pageable.getPageSize());
            org.junit.jupiter.api.Assertions.assertEquals(org.springframework.data.domain.Sort.Direction.DESC,
                    pageable.getSort().getOrderFor("createdAt").getDirection());
        }

        @Test
        @DisplayName("Should return 403 when unauthenticated")
        void tenants_shouldReturn403_whenUnauthenticated() throws Exception {
            // Act + Assert
            mockMvc.perform(get("/api/superadmin/tenants"))
                    .andExpect(status().isForbidden());
        }
    }

    @Nested
    @DisplayName("Tenant Detail Tests - GET /api/superadmin/tenants/{tenantId}")
    class TenantDetailTests {

        @Test
        @WithMockUser(roles = "SUPER_ADMIN")
        @DisplayName("Should return 200 for valid tenantId")
        void tenantDetail_shouldReturn200_whenTenantExists() throws Exception {
            // Arrange
            when(superAdminService.getTenantById("tenant-uuid-001")).thenReturn(tenantOverviewResponse);

            // Act + Assert
            mockMvc.perform(get("/api/superadmin/tenants/{tenantId}", "tenant-uuid-001"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.tenantName").value("Retail Store One"));
        }

        @Test
        @WithMockUser(roles = "SUPER_ADMIN")
        @DisplayName("Should return 404 when tenant not found")
        void tenantDetail_shouldReturn404_whenTenantMissing() throws Exception {
            // Arrange
            when(superAdminService.getTenantById("tenant-uuid-001"))
                    .thenThrow(new ResourceNotFoundException("Tenant not found"));

            // Act + Assert
            mockMvc.perform(get("/api/superadmin/tenants/{tenantId}", "tenant-uuid-001"))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("Should return 403 when unauthenticated")
        void tenantDetail_shouldReturn403_whenUnauthenticated() throws Exception {
            // Act + Assert
            mockMvc.perform(get("/api/superadmin/tenants/{tenantId}", "tenant-uuid-001"))
                    .andExpect(status().isForbidden());
        }
    }
}
