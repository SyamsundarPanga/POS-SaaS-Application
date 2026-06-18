package com.possaas.integration;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import jakarta.servlet.FilterChain;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import com.possaas.config.TenantFilterConfig;
import com.possaas.dto.response.BranchDashboardDto;
import com.possaas.dto.response.DashboardStatsDto;
import com.possaas.exception.ResourceNotFoundException;
import com.possaas.security.JwtAuthenticationFilter;
import com.possaas.security.TenantFilterInterceptor;
import com.possaas.service.dashboard.DashboardService;

class DashboardControllerIntegrationTests extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
 
    @MockBean
    private DashboardService dashboardService;

    @MockBean
    private TenantFilterConfig tenantFilterConfig;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private TenantFilterInterceptor tenantFilterInterceptor;

    @BeforeEach
    void setUp() throws Exception {
        doAnswer(invocation -> {
            FilterChain filterChain = invocation.getArgument(2);
            filterChain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(tenantFilterConfig).doFilter(any(), any(), any());

        doAnswer(invocation -> {
            FilterChain filterChain = invocation.getArgument(2);
            filterChain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());

        when(tenantFilterInterceptor.preHandle(any(), any(), any())).thenReturn(true);
    }

    @Test
    @WithMockUser(authorities = "ROLE_STORE_ADMIN")
    void getAdminDashboard_shouldReturn200_forStoreAdmin() throws Exception {
        DashboardStatsDto response = DashboardStatsDto.builder()
                .todaySales(new BigDecimal("1000.00"))
                .todayOrders(12L)
                .totalCustomers(50L)
                .activeBranches(3L)
                .topProducts(List.of(
                        DashboardStatsDto.TopProductDto.builder()
                                .productId(1L)
                                .productName("Coffee")
                                .sku("CF-001")
                                .quantitySold(20L)
                                .revenue(new BigDecimal("400.00"))
                                .build()))
                .paymentDistribution(Map.of(
                        "CASH",
                        DashboardStatsDto.PaymentDistributionDto.builder()
                                .method("CASH")
                                .count(8L)
                                .amount(new BigDecimal("600.00"))
                                .percentage(60.0)
                                .build()))
                .build();

        when(dashboardService.getAdminDashboard()).thenReturn(response);

        mockMvc.perform(get("/api/dashboard/admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.todaySales").value(1000.00))
                .andExpect(jsonPath("$.todayOrders").value(12))
                .andExpect(jsonPath("$.totalCustomers").value(50))
                .andExpect(jsonPath("$.activeBranches").value(3))
                .andExpect(jsonPath("$.topProducts[0].productName").value("Coffee"))
                .andExpect(jsonPath("$.paymentDistribution.CASH.amount").value(600.00));

        verify(dashboardService).getAdminDashboard();
    }

    @Test
    @WithMockUser(authorities = "ROLE_SUPER_ADMIN")
    void getAdminDashboard_shouldReturn200_forSuperAdmin() throws Exception {
        when(dashboardService.getAdminDashboard()).thenReturn(
                DashboardStatsDto.builder()
                        .todaySales(new BigDecimal("10.00"))
                        .todayOrders(1L)
                        .build());

        mockMvc.perform(get("/api/dashboard/admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.todayOrders").value(1));
    }

    @Test
    @WithMockUser(authorities = "ROLE_CASHIER")
    void getAdminDashboard_shouldReturn403_forCashier() throws Exception {
        mockMvc.perform(get("/api/dashboard/admin"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = "ROLE_BRANCH_MANAGER")
    void getBranchDashboard_shouldReturn200_forBranchManager() throws Exception {
        BranchDashboardDto response = BranchDashboardDto.builder()
                .branchId(5L)
                .branchName("Downtown")
                .todaySales(new BigDecimal("750.00"))
                .weekSales(new BigDecimal("5200.00"))
                .todayOrders(9L)
                .activeEmployees(6L)
                .employeesOnShift(3L)
                .build();

        when(dashboardService.getBranchDashboard(5L)).thenReturn(response);

        mockMvc.perform(get("/api/dashboard/branch/{branchId}", 5L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.branchId").value(5))
                .andExpect(jsonPath("$.branchName").value("Downtown"))
                .andExpect(jsonPath("$.todaySales").value(750.00))
                .andExpect(jsonPath("$.todayOrders").value(9))
                .andExpect(jsonPath("$.activeEmployees").value(6));

        verify(dashboardService).getBranchDashboard(eq(5L));
    }

    @Test
    @WithMockUser(authorities = "ROLE_STORE_ADMIN")
    void getBranchDashboard_shouldReturn200_forStoreAdmin() throws Exception {
        when(dashboardService.getBranchDashboard(7L)).thenReturn(
                BranchDashboardDto.builder()
                        .branchId(7L)
                        .branchName("Airport")
                        .todayOrders(4L)
                        .build());

        mockMvc.perform(get("/api/dashboard/branch/{branchId}", 7L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.branchName").value("Airport"))
                .andExpect(jsonPath("$.todayOrders").value(4));
    }

    @Test
    @WithMockUser(authorities = "ROLE_CASHIER")
    void getBranchDashboard_shouldReturn403_forCashier() throws Exception {
        mockMvc.perform(get("/api/dashboard/branch/{branchId}", 2L))
                .andExpect(status().isForbidden());
    }

    @Test
    void dashboardEndpoints_shouldReturn403_whenUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/dashboard/admin"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/dashboard/branch/{branchId}", 1L))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = "ROLE_STORE_ADMIN")
    void getBranchDashboard_shouldReturn404_whenBranchMissing() throws Exception {
        when(dashboardService.getBranchDashboard(999L))
                .thenThrow(new ResourceNotFoundException("Branch not found"));

        mockMvc.perform(get("/api/dashboard/branch/{branchId}", 999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Resource Not Found"))
                .andExpect(jsonPath("$.message").value("Branch not found"));
    }
}