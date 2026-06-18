package com.possaas.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.possaas.config.TenantContext;
import com.possaas.domain.tenant.Subscription;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionStatus;
import com.possaas.domain.tenant.Tenant;
import com.possaas.dto.response.RazorpayOrderResponse;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.repository.SubscriptionRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.service.auth.JwtTokenProvider;
import com.possaas.service.payment.PaymentService;

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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Fully fixed integration tests for Subscription entity and APIs.
 */
public class SubscriptionIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    @Autowired
    private SubscriptionPlanRepository planRepository;

    @Autowired
    private TenantRepository tenantRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PaymentService paymentService; // ✅ Mock external API
    
    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    private SubscriptionPlan basicPlan;

    private final String TEST_TENANT = "tenant_test_1";

    @BeforeEach
    void setUp() {
        // 1️⃣ Create a test plan if not exists
        basicPlan = planRepository.findById("BASIC").orElse(null);
        if (basicPlan == null) {
            basicPlan = new SubscriptionPlan();
            basicPlan.setId("BASIC");
            basicPlan.setPlanType(com.possaas.domain.tenant.SubscriptionPlanType.BASIC);
            basicPlan.setMaxBranches(5);
            basicPlan.setMaxUsers(10);
            basicPlan.setMaxProducts(50);
            basicPlan.setMonthlyPrice(BigDecimal.valueOf(500));
            planRepository.save(basicPlan);
        }

        // 2️⃣ Ensure test tenant exists with this plan
        Tenant tenant = tenantRepository.findById(TEST_TENANT).orElse(null);
        if (tenant == null) {
            tenant = new Tenant();
            tenant.setId(TEST_TENANT);
            tenant.setName("Test Tenant " + TEST_TENANT);
            tenant.setSubscriptionPlan(basicPlan);
            tenant.setActive(true);
            tenantRepository.save(tenant);
        }

        // 3️⃣ Set tenant context
        TenantContext.setTenantId(TEST_TENANT);

        // 4️⃣ Mock JWT provider so security filters/interceptors see a valid token
        Mockito.when(jwtTokenProvider.validateToken(Mockito.anyString())).thenReturn(true);
        Mockito.when(jwtTokenProvider.getTenantId(Mockito.anyString())).thenReturn(TEST_TENANT);

        // 5️⃣ Clean up subscriptions for test tenant
        subscriptionRepository.findAll().stream()
                .filter(sub -> TEST_TENANT.equals(sub.getTenantId()))
                .forEach(subscriptionRepository::delete);
    }

    // =============================
    // 1️⃣ Manual subscription creation
    // =============================
    @Test
    void testCreateSubscription() {
        Subscription subscription = new Subscription();
        subscription.setTenantId(TEST_TENANT);
        subscription.setPlan(basicPlan);
        subscription.setStatus(SubscriptionStatus.PENDING_PAYMENT);
        subscription.setStartDate(LocalDateTime.now());
        subscription.setNextBillingDate(LocalDateTime.now().plusMonths(1));

        Subscription saved = subscriptionRepository.save(subscription);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getTenantId()).isEqualTo(TEST_TENANT);
        assertThat(saved.getPlan().getId()).isEqualTo("BASIC");
        assertThat(saved.getStatus()).isEqualTo(SubscriptionStatus.PENDING_PAYMENT);
    }

    // =============================
    // 2️⃣ Subscription API: subscribe
    // =============================
    @Test
    @WithMockUser(roles = {"STORE_ADMIN"})
    void testSubscriptionApiSubscribe() throws Exception {
        // Mock PaymentService to avoid Razorpay API call
        RazorpayOrderResponse fakeResponse = new RazorpayOrderResponse();
        fakeResponse.setId("fake_order_id");
        Mockito.when(paymentService.createRazorpayOrder(Mockito.any()))
               .thenReturn(fakeResponse);

        mockMvc.perform(post("/api/subscription/subscribe/{planId}", "BASIC")
                        .header("Authorization", "Bearer test-token")
                        .header("X-Tenant-ID", TEST_TENANT)
                        .contentType(MediaType.APPLICATION_JSON))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.id").value("fake_order_id"));

        Subscription subscription = subscriptionRepository
                .findByTenantId(TEST_TENANT)
                .orElseThrow();
        assertThat(subscription.getStatus()).isEqualTo(SubscriptionStatus.PENDING_PAYMENT);
    }

    // =============================
    // 3️⃣ Subscription API: activate
    // =============================
    @Test
    @WithMockUser(roles = {"STORE_ADMIN"})
    void testSubscriptionApiActivate() throws Exception {
        // Ensure tenant context
        TenantContext.setTenantId(TEST_TENANT);

        // Pre-create subscription with PENDING_PAYMENT
        Subscription subscription = new Subscription();
        subscription.setTenantId(TEST_TENANT);
        subscription.setPlan(basicPlan);
        subscription.setStatus(SubscriptionStatus.PENDING_PAYMENT);
        subscriptionRepository.save(subscription);

        // Call activate API
        mockMvc.perform(post("/api/subscription/activate/{tenantId}", TEST_TENANT)
                        .header("Authorization", "Bearer test-token")
                        .header("X-Tenant-ID", TEST_TENANT)
                        .contentType(MediaType.APPLICATION_JSON))
               .andExpect(status().isOk())
               .andExpect(content().string("Subscription activated successfully"));

        // Validate DB
        Subscription updated = subscriptionRepository
                .findByTenantId(TEST_TENANT)
                .orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(updated.getStartDate()).isNotNull();
        assertThat(updated.getNextBillingDate()).isNotNull();
    }

    @Test
    @WithMockUser(roles = {"STORE_ADMIN"})
    void testCancelSchedulesAtPeriodEnd() throws Exception {
        TenantContext.setTenantId(TEST_TENANT);

        Subscription subscription = new Subscription();
        subscription.setTenantId(TEST_TENANT);
        subscription.setPlan(basicPlan);
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        subscription.setStartDate(LocalDateTime.now().minusDays(10));
        subscription.setNextBillingDate(LocalDateTime.now().plusDays(15));
        subscriptionRepository.save(subscription);

        mockMvc.perform(put("/api/subscription/cancel")
                        .header("Authorization", "Bearer test-token")
                        .header("X-Tenant-ID", TEST_TENANT)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        Subscription updated = subscriptionRepository.findByTenantId(TEST_TENANT).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(updated.isCancelAtPeriodEnd()).isTrue();
        assertThat(updated.getCancellationRequestedAt()).isNotNull();
        assertThat(updated.getDataRetentionUntil()).isNotNull();
    }

    @Test
    @WithMockUser(roles = {"STORE_ADMIN"})
    void testReactivateCancelledWithinRetention() throws Exception {
        TenantContext.setTenantId(TEST_TENANT);

        Subscription subscription = new Subscription();
        subscription.setTenantId(TEST_TENANT);
        subscription.setPlan(basicPlan);
        subscription.setStatus(SubscriptionStatus.CANCELLED);
        subscription.setBillingCycle(com.possaas.domain.tenant.BillingCycle.MONTHLY);
        subscription.setCancelledAt(LocalDateTime.now().minusDays(2));
        subscription.setDataRetentionUntil(LocalDateTime.now().plusDays(20));
        subscriptionRepository.save(subscription);

        mockMvc.perform(put("/api/subscription/reactivate")
                        .header("Authorization", "Bearer test-token")
                        .header("X-Tenant-ID", TEST_TENANT)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        Subscription updated = subscriptionRepository.findByTenantId(TEST_TENANT).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(updated.getNextBillingDate()).isNotNull();
        assertThat(updated.isCancelAtPeriodEnd()).isFalse();
        assertThat(updated.getDataRetentionUntil()).isNull();
    }

}
