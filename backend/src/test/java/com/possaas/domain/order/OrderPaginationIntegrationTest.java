package com.possaas.domain.order;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import com.possaas.config.TenantContext;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionPlanType;
import com.possaas.domain.tenant.Tenant;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.domain.user.UserStatus;
import com.possaas.repository.*;
import com.possaas.security.service.UserDetailsImpl;
import com.possaas.service.auth.JwtTokenProvider;

import jakarta.persistence.EntityManager;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class OrderPaginationIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private OrderRepository orderRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private TenantRepository tenantRepository;
    @Autowired private SubscriptionPlanRepository planRepository;
    @Autowired private EntityManager entityManager;

    @MockBean private JwtTokenProvider jwtTokenProvider;

    private UserDetailsImpl adminPrincipal;
    private UserDetailsImpl cashierPrincipal;
    private final String TENANT_A = "tenant-a";
    private final String TENANT_B = "tenant-b";

    @BeforeEach
    void setUp() {
        // 1. Setup Mocks to satisfy the JWT Filter / Interceptor
        when(jwtTokenProvider.validateToken(anyString())).thenReturn(true);
        // We'll set the specific username expectation inside the test or use a generic one
        when(jwtTokenProvider.getTenantId(anyString())).thenReturn(TENANT_A);

        // 2. Seed Plan
        SubscriptionPlan plan = new SubscriptionPlan();
        plan.setId("BASIC");
        plan.setPlanType(SubscriptionPlanType.BASIC);
        plan.setMaxUsers(10); plan.setMaxBranches(5); plan.setMaxProducts(100);
        plan.setMonthlyPrice(BigDecimal.valueOf(29.99));
        planRepository.saveAndFlush(plan);

        // 3. Seed Tenants
        createTenant(TENANT_A, plan);
        createTenant(TENANT_B, plan);

        // 4. Seed Users
        User admin = createUser(TENANT_A, Role.ROLE_STORE_ADMIN, "admin_a");
        User cashier = createUser(TENANT_A, Role.ROLE_CASHIER, "cashier_a");
        
        adminPrincipal = createPrincipal(admin, TENANT_A, "ROLE_STORE_ADMIN");
        cashierPrincipal = createPrincipal(cashier, TENANT_A, "ROLE_CASHIER");

        // 5. Seed Orders for Tenant A (15 orders)
        seedOrders(TENANT_A, cashier, 15);
        
        // Seed Orders for Tenant B (to test leakage)
        User userB = createUser(TENANT_B, Role.ROLE_CASHIER, "user_b");
        seedOrders(TENANT_B, userB, 5);

        entityManager.flush();
        entityManager.clear();
    }

    @Test
    void qa01_qa04_shouldGetAllOrdersForTenantAndVerifyRoles() throws Exception {
        // Mock the username return to match seeded admin
        when(jwtTokenProvider.getUsername(anyString())).thenReturn("admin_a");

        // Test ADMIN access (QA-04)
        mockMvc.perform(get("/api/orders")
                .with(user(adminPrincipal))
                .header("Authorization", "Bearer token")
                .header("X-Tenant-ID", TENANT_A))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(15))); // QA-01

        // Test CASHIER access (QA-04)
        when(jwtTokenProvider.getUsername(anyString())).thenReturn("cashier_a");
        mockMvc.perform(get("/api/orders")
                .with(user(cashierPrincipal))
                .header("Authorization", "Bearer token")
                .header("X-Tenant-ID", TENANT_A))
                .andExpect(status().isOk());
    }

    @Test
    void qa02_shouldTestPaginationFirstPage() throws Exception {
        when(jwtTokenProvider.getUsername(anyString())).thenReturn("admin_a");

        // page 0, size 10 (QA-02)
        mockMvc.perform(get("/api/orders")
                .param("page", "0")
                .param("size", "10")
                .with(user(adminPrincipal))
                .header("Authorization", "Bearer token")
                .header("X-Tenant-ID", TENANT_A))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(10)))
                .andExpect(jsonPath("$.totalElements").value(15));
    }

    @Test
    void qa03_shouldTestPaginationSecondPage() throws Exception {
        when(jwtTokenProvider.getUsername(anyString())).thenReturn("admin_a");

        // page 1, size 10 (QA-03)
        mockMvc.perform(get("/api/orders")
                .param("page", "1")
                .param("size", "10")
                .with(user(adminPrincipal))
                .header("Authorization", "Bearer token")
                .header("X-Tenant-ID", TENANT_A))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(5)));
    }

    @Test
    void qa05_shouldVerifyNoCrossTenantDataLeakage() throws Exception {
        when(jwtTokenProvider.getUsername(anyString())).thenReturn("admin_a");

        // Verify Tenant A sees exactly 15 (Leakage protection QA-05)
        mockMvc.perform(get("/api/orders")
                .with(user(adminPrincipal))
                .header("Authorization", "Bearer token")
                .header("X-Tenant-ID", TENANT_A))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(15));
    }

    @Test
    void qa06_shouldVerifyDescendingSortByCreatedAt() throws Exception {
        when(jwtTokenProvider.getUsername(anyString())).thenReturn("admin_a");

        // Check newest first (QA-06)
        mockMvc.perform(get("/api/orders")
                .param("sort", "createdAt,desc")
                .with(user(adminPrincipal))
                .header("Authorization", "Bearer token")
                .header("X-Tenant-ID", TENANT_A))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].orderNumber").value("ORD-BATCH-14"));
    }

    // --- Helper Methods ---

    private void createTenant(String id, SubscriptionPlan plan) {
        Tenant t = new Tenant();
        t.setId(id); t.setName(id); t.setSubscriptionPlan(plan); t.setActive(true);
        tenantRepository.saveAndFlush(t);
    }

    private User createUser(String tenantId, Role role, String name) {
        User u = new User();
        u.setUsername(name); u.setEmail(name + "@test.com"); u.setPassword("pass");
        u.setRole(role); u.setStatus(UserStatus.ACTIVE); u.setTenantId(tenantId);
        return userRepository.saveAndFlush(u);
    }

    private UserDetailsImpl createPrincipal(User u, String tenantId, String authority) {
        return new UserDetailsImpl(u.getId(), u.getUsername(), u.getEmail(), "pass", 
            tenantId, Collections.singletonList(new SimpleGrantedAuthority(authority)));
    }

    private void seedOrders(String tenantId, User user, int count) {
        TenantContext.setTenantId(tenantId);
        for (int i = 0; i < count; i++) {
            Order o = new Order();
            o.setOrderNumber("ORD-BATCH-" + i);
            o.setTenantId(tenantId);
            o.setCashier(user);
            o.setUser(user);
            o.setStatus(OrderStatus.COMPLETED);
            o.setSubtotal(BigDecimal.TEN);
            o.setTax(BigDecimal.ONE);
            o.setDiscount(BigDecimal.ZERO);
            o.setTotalAmount(BigDecimal.valueOf(11));
            setRequiredFinancialFields(o, BigDecimal.TEN, BigDecimal.ONE, BigDecimal.valueOf(11));
            // Add minute offset to test sorting
            o.setCreatedAt(LocalDateTime.now().plusMinutes(i));
            orderRepository.save(o);
        }
    }

    private void setRequiredFinancialFields(Order order, BigDecimal subtotal, BigDecimal tax, BigDecimal finalTotal) {
        ReflectionTestUtils.setField(order, "discountAmount", BigDecimal.ZERO);
        ReflectionTestUtils.setField(order, "discountPercent", BigDecimal.ZERO);
        ReflectionTestUtils.setField(order, "discountType", "FIXED");
        ReflectionTestUtils.setField(order, "subtotalBeforeDiscount", subtotal);
        ReflectionTestUtils.setField(order, "taxableAmount", subtotal);
        ReflectionTestUtils.setField(order, "taxAmount", tax);
        ReflectionTestUtils.setField(order, "finalTotal", finalTotal);
    }
}
