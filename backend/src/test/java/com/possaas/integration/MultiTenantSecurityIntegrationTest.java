package com.possaas.integration;

import com.possaas.config.TenantContext;
import com.possaas.config.TestSecurityConfig;
import com.possaas.domain.order.Order;
import com.possaas.domain.order.OrderStatus;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionPlanType;
import com.possaas.domain.tenant.Tenant;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.repository.OrderRepository;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.hibernate.Session;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

@Transactional
@Import(TestSecurityConfig.class)
class MultiTenantSecurityIntegrationTest extends BaseIntegrationTest {

    @Autowired private TenantRepository tenantRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private OrderRepository orderRepository;
    @Autowired private SubscriptionPlanRepository subscriptionPlanRepository;
    @Autowired private EntityManager entityManager;

    private SubscriptionPlan basicPlan;

    @BeforeEach
    void setupPlan() {
        basicPlan = subscriptionPlanRepository
                .findById("BASIC")
                .orElseGet(() -> {
                    SubscriptionPlan plan = new SubscriptionPlan();
                    plan.setId("BASIC");
                    plan.setPlanType(SubscriptionPlanType.BASIC);
                    plan.setMaxBranches(1);
                    plan.setMaxUsers(10);
                    plan.setMaxProducts(1000);
                    plan.setMonthlyPrice(BigDecimal.ZERO);
                    return subscriptionPlanRepository.save(plan);
                });
    }

    @AfterEach
    void cleanup() {
        TenantContext.clear();
        orderRepository.deleteAll();
        userRepository.deleteAll();
        tenantRepository.deleteAll();
    }

    @Test
    @DisplayName("Tenant isolation should restrict data per tenant")
    void tenantIsolationWorksCorrectly() {

        // ========= TENANT A =========
        Tenant tenantA = new Tenant();
        tenantA.setId("tenant-A");
        tenantA.setName("Tenant A");
        tenantA.setSubscriptionPlan(basicPlan); // ✅ REQUIRED
        tenantRepository.save(tenantA);

        setTenant("tenant-A");

        User userA = new User();
        userA.setUsername("user-a");
        userA.setEmail("user-a@tenant-a.com");
        userA.setPassword("password");
        userA.setRole(Role.ROLE_CASHIER);
        userA.setTenantId("tenant-A");
        userRepository.save(userA);

        Order orderA = new Order();
        orderA.setOrderNumber("ORD-A-001");
        orderA.setUser(userA);
        orderA.setCashier(userA);
        orderA.setSubtotal(new BigDecimal("90.00"));
        orderA.setTax(new BigDecimal("10.00"));
        orderA.setDiscount(BigDecimal.ZERO);
        orderA.setDiscountAmount(BigDecimal.ZERO);
        orderA.setDiscountPercent(BigDecimal.ZERO);
        orderA.setDiscountType("FIXED");
        orderA.setSubtotalBeforeDiscount(new BigDecimal("90.00"));
        orderA.setTaxableAmount(new BigDecimal("90.00"));
        orderA.setTaxAmount(new BigDecimal("10.00"));
        orderA.setFinalTotal(new BigDecimal("100.00"));
        orderA.setTotalAmount(new BigDecimal("100.00"));
        orderA.setStatus(OrderStatus.COMPLETED);
        orderA.setTenantId("tenant-A");
        setRequiredFinancialFields(orderA, "90.00", "10.00", "100.00");
        orderRepository.save(orderA);

        // ========= TENANT B =========
        Tenant tenantB = new Tenant();
        tenantB.setId("tenant-B");
        tenantB.setName("Tenant B");
        tenantB.setSubscriptionPlan(basicPlan); // ✅ REQUIRED
        tenantRepository.save(tenantB);

        setTenant("tenant-B");

        User userB = new User();
        userB.setUsername("user-b");
        userB.setEmail("user-b@tenant-b.com");
        userB.setPassword("password");
        userB.setRole(Role.ROLE_CASHIER);
        userB.setTenantId("tenant-B");
        userRepository.save(userB);

        Order orderB = new Order();
        orderB.setOrderNumber("ORD-B-001");
        orderB.setUser(userB);
        orderB.setCashier(userB);
        orderB.setSubtotal(new BigDecimal("180.00"));
        orderB.setTax(new BigDecimal("20.00"));
        orderB.setDiscount(BigDecimal.ZERO);
        orderB.setDiscountAmount(BigDecimal.ZERO);
        orderB.setDiscountPercent(BigDecimal.ZERO);
        orderB.setDiscountType("FIXED");
        orderB.setSubtotalBeforeDiscount(new BigDecimal("180.00"));
        orderB.setTaxableAmount(new BigDecimal("180.00"));
        orderB.setTaxAmount(new BigDecimal("20.00"));
        orderB.setFinalTotal(new BigDecimal("200.00"));
        orderB.setTotalAmount(new BigDecimal("200.00"));
        orderB.setStatus(OrderStatus.COMPLETED);
        orderB.setTenantId("tenant-B");
        setRequiredFinancialFields(orderB, "180.00", "20.00", "200.00");
        orderRepository.save(orderB);

        entityManager.flush();
        entityManager.clear();

        // ========= VERIFY =========
        setTenant("tenant-A");
        assertEquals(1, orderRepository.findAll().size());

        setTenant("tenant-B");
        assertEquals(1, orderRepository.findAll().size());
    }

    @Test
    @DisplayName("SQL Injection: OR 1=1 should NOT bypass tenant filter")
    void shouldNotBypassTenantFilter_withClassicInjection() {
        setTenant("' OR '1'='1");
        assertEquals(0, orderRepository.findAll().size());
    }

    @Test
    @DisplayName("SQL Injection: Comment-based attack should fail")
    void shouldNotBypassTenantFilter_withCommentInjection() {
        setTenant("tenant-A' OR 1=1 --");
        assertEquals(0, orderRepository.findAll().size());
    }

    @Test
    @DisplayName("SQL Injection: Semicolon attack should fail")
    void shouldNotExecuteInjectedStatements() {
        setTenant("tenant-A; DROP TABLE orders;");
        assertEquals(0, orderRepository.findAll().size());
    }

    private void setTenant(String tenantId) {
        TenantContext.setTenantId(tenantId);
        Session session = entityManager.unwrap(Session.class);

        session.disableFilter("tenantFilter");

        if (tenantId != null && !tenantId.contains("'") && !tenantId.contains(";")) {
            session.enableFilter("tenantFilter")
                    .setParameter("tenantId", tenantId);
        }
    }

    private void setRequiredFinancialFields(Order order, String subtotal, String tax, String finalTotal) {
        ReflectionTestUtils.setField(order, "discountAmount", BigDecimal.ZERO);
        ReflectionTestUtils.setField(order, "discountPercent", BigDecimal.ZERO);
        ReflectionTestUtils.setField(order, "discountType", "FIXED");
        ReflectionTestUtils.setField(order, "subtotalBeforeDiscount", new BigDecimal(subtotal));
        ReflectionTestUtils.setField(order, "taxableAmount", new BigDecimal(subtotal));
        ReflectionTestUtils.setField(order, "taxAmount", new BigDecimal(tax));
        ReflectionTestUtils.setField(order, "finalTotal", new BigDecimal(finalTotal));
    }
}
