package com.possaas.integration;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import com.possaas.config.TenantFilterConfig;
import com.possaas.dto.response.ShiftReportResponse;
import com.possaas.dto.response.ShiftResponse;
import com.possaas.security.JwtAuthenticationFilter;
import com.possaas.security.TenantFilterInterceptor;
import com.possaas.service.shift.ShiftService;

import jakarta.servlet.FilterChain;

class ShiftControllerIntegrationTests extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ShiftService shiftService;

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
    @WithMockUser(authorities = "ROLE_CASHIER")
    void openShift_shouldReturn200() throws Exception {
        ShiftResponse response = ShiftResponse.builder()
                .id(10L)
                .employeeId(101L)
                .employeeName("Cashier One")
                .branchId(1L)
                .branchName("Main Branch")
                .shiftStart(LocalDateTime.now())
                .startingCash(new BigDecimal("500.00"))
                .status("OPEN")
                .notes("Opening notes")
                .build();

        when(shiftService.openShift(any())).thenReturn(response);

        mockMvc.perform(post("/api/shifts/open")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "startingCash": 500.00,
                          "notes": "Opening notes"
                        }
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.startingCash").value(500.00));
    }

    @Test
    @WithMockUser(authorities = "ROLE_CASHIER")
    void closeShift_shouldReturn200() throws Exception {
        ShiftResponse shift = ShiftResponse.builder()
                .id(10L)
                .employeeId(101L)
                .employeeName("Cashier One")
                .branchId(1L)
                .status("CLOSED")
                .startingCash(new BigDecimal("500.00"))
                .finalCash(new BigDecimal("900.00"))
                .build();

        ShiftReportResponse report = ShiftReportResponse.builder()
                .shift(shift)
                .totalTransactions(6)
                .totalSales(new BigDecimal("450.00"))
                .paymentBreakdown(Map.of("CASH", new BigDecimal("400.00")))
                .expectedCash(new BigDecimal("900.00"))
                .actualCash(new BigDecimal("900.00"))
                .variance(BigDecimal.ZERO)
                .build();

        when(shiftService.closeShift(any())).thenReturn(report);

        mockMvc.perform(post("/api/shifts/close")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "finalCash": 900.00,
                          "notes": "Closing notes"
                        }
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalTransactions").value(6))
                .andExpect(jsonPath("$.shift.status").value("CLOSED"))
                .andExpect(jsonPath("$.expectedCash").value(900.00))
                .andExpect(jsonPath("$.variance").value(0));
    }

    @Test
    @WithMockUser(authorities = "ROLE_BRANCH_MANAGER")
    void getCurrentShift_shouldReturn200() throws Exception {
        ShiftResponse response = ShiftResponse.builder()
                .id(11L)
                .employeeId(201L)
                .employeeName("Manager One")
                .branchId(2L)
                .status("OPEN")
                .startingCash(new BigDecimal("1200.00"))
                .build();

        when(shiftService.getCurrentShift()).thenReturn(response);

        mockMvc.perform(get("/api/shifts/current"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(11))
                .andExpect(jsonPath("$.employeeName").value("Manager One"))
                .andExpect(jsonPath("$.status").value("OPEN"));
    }

    @Test
    @WithMockUser(authorities = "ROLE_STORE_ADMIN")
    void getShiftHistory_shouldReturnPage() throws Exception {
        ShiftResponse s1 = ShiftResponse.builder().id(1L).status("OPEN").employeeName("A User").build();
        ShiftResponse s2 = ShiftResponse.builder().id(2L).status("CLOSED").employeeName("B User").build();

        when(shiftService.getShiftHistory(any(), any(), any(), any())).thenReturn(
                new PageImpl<>(List.of(s1, s2), PageRequest.of(0, 10), 2));

        mockMvc.perform(get("/api/shifts/history")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.content[0].id").value(1))
                .andExpect(jsonPath("$.content[1].id").value(2));
    }

    @Test
    @WithMockUser(authorities = "ROLE_CASHIER")
    void getShiftReport_shouldReturn200() throws Exception {
        ShiftResponse shift = ShiftResponse.builder()
                .id(25L)
                .employeeId(300L)
                .employeeName("Cashier Two")
                .branchId(3L)
                .status("CLOSED")
                .startingCash(new BigDecimal("600.00"))
                .finalCash(new BigDecimal("700.00"))
                .build();

        ShiftReportResponse report = ShiftReportResponse.builder()
                .shift(shift)
                .totalTransactions(2)
                .totalSales(new BigDecimal("100.00"))
                .paymentBreakdown(Map.of("CASH", new BigDecimal("100.00")))
                .expectedCash(new BigDecimal("700.00"))
                .actualCash(new BigDecimal("700.00"))
                .variance(BigDecimal.ZERO)
                .build();

        when(shiftService.getShiftReport(25L)).thenReturn(report);

        mockMvc.perform(get("/api/shifts/{id}/report", 25L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shift.id").value(25))
                .andExpect(jsonPath("$.totalSales").value(100.00))
                .andExpect(jsonPath("$.actualCash").value(700.00));

        verify(shiftService).getShiftReport(eq(25L));
    }

    @Test
    @WithMockUser(authorities = "ROLE_CASHIER")
    void openShift_shouldReturn400_whenStartingCashMissing() throws Exception {
        mockMvc.perform(post("/api/shifts/open")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "notes": "No cash"
                        }
                        """))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(authorities = "ROLE_STORE_ADMIN")
    void closeShift_shouldReturn400_whenFinalCashNegative() throws Exception {
        mockMvc.perform(post("/api/shifts/close")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "finalCash": -5.00
                        }
                        """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void endpointsShouldReturn403_whenUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/shifts/current"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = "ROLE_VIEWER")
    void endpointsShouldReturn403_whenRoleNotAllowed() throws Exception {
        mockMvc.perform(get("/api/shifts/current"))
                .andExpect(status().isForbidden());
    }
}