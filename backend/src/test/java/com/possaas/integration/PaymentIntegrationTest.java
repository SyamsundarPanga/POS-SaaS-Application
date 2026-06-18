package com.possaas.integration;

import com.possaas.config.TenantContext;
import com.possaas.domain.payment.PaymentMethod;
import com.possaas.domain.payment.PaymentStatus;
import com.possaas.dto.response.PaymentDto;
import com.possaas.service.payment.PaymentService;
import com.possaas.service.auth.JwtTokenProvider;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public class PaymentIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PaymentService paymentService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @BeforeEach
    void setUp() {
        TenantContext.setTenantId("tenant_1");

        Mockito.when(jwtTokenProvider.validateToken(anyString())).thenReturn(true);
        Mockito.when(jwtTokenProvider.getTenantId(anyString())).thenReturn("tenant_1");
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    // =====================================
    // GET PAYMENT BY ID
    // =====================================

    @Test
    @WithMockUser(roles = {"STORE_ADMIN"})
    void shouldGetPaymentById() throws Exception {

        PaymentDto dto = PaymentDto.builder()
                .id(1L)
                .orderId(100L)
                .method(PaymentMethod.CARD)
                .amount(BigDecimal.valueOf(500))
                .status(PaymentStatus.SUCCESS)
                .transactionId("txn_123")
                .createdAt(LocalDateTime.now())
                .build();

        Mockito.when(paymentService.getPaymentById(anyLong()))
                .thenReturn(null);

        Mockito.when(paymentService.mapToDto(null))
                .thenReturn(dto);

        mockMvc.perform(get("/api/payments/1")
                        .header("Authorization", "Bearer test-token")
                        .header("X-Tenant-ID", "tenant_1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.orderId").value(100))
                .andExpect(jsonPath("$.method").value("CARD"))
                .andExpect(jsonPath("$.status").value("SUCCESS"));
    }

    // =====================================
    // DAILY SALES
    // =====================================

    @Test
    @WithMockUser(roles = {"STORE_ADMIN"})
    void shouldReturnDailySales() throws Exception {

        Mockito.when(paymentService.getDailySales(anyString()))
                .thenReturn(BigDecimal.valueOf(2500));

        mockMvc.perform(get("/api/payments/daily-sales")
                        .header("Authorization", "Bearer test-token")
                        .header("X-Tenant-ID", "tenant_1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().string("2500"));
    }

    // =====================================
    // PAYMENT SUMMARY
    // =====================================

    @Test
    @WithMockUser(roles = {"STORE_ADMIN"})
    void shouldReturnPaymentSummary() throws Exception {

        List<Object[]> summary = List.of(
                new Object[]{PaymentMethod.CARD, 2L, BigDecimal.valueOf(2000)},
                new Object[]{PaymentMethod.CASH, 1L, BigDecimal.valueOf(500)}
        );

        Mockito.when(paymentService.getPaymentSummary(anyString()))
                .thenReturn(summary);

        mockMvc.perform(get("/api/payments/summary")
                        .header("Authorization", "Bearer test-token")
                        .header("X-Tenant-ID", "tenant_1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0][0]").value("CARD"))
                .andExpect(jsonPath("$[0][1]").value(2))
                .andExpect(jsonPath("$[0][2]").value(2000))
                .andExpect(jsonPath("$[1][0]").value("CASH"))
                .andExpect(jsonPath("$[1][1]").value(1))
                .andExpect(jsonPath("$[1][2]").value(500));
    }

    // =====================================
    // SECURITY TEST
    // =====================================

    @Test
    void shouldReturn403WhenNoRole() throws Exception {

        mockMvc.perform(get("/api/payments/daily-sales")
                        .header("Authorization", "Bearer test-token")
                        .header("X-Tenant-ID", "tenant_1"))
                .andExpect(status().isForbidden());
    }
}