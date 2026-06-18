package com.possaas.domain.order;

import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.repository.SubscriptionPlanRepository;
import java.time.LocalDateTime;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import com.possaas.config.TestContainersConfiguration;

import com.possaas.config.TenantContext;
import com.possaas.domain.tenant.SubscriptionPlanType;
import com.possaas.domain.tenant.Tenant;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.domain.user.UserStatus;
import com.possaas.repository.OrderRepository;

import jakarta.persistence.EntityManager;

@SpringBootTest
@Transactional
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
public class OrderRepositoryUniquenessTest {

    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private SubscriptionPlanRepository subscriptionPlanRepository;

    @Autowired
    private EntityManager entityManager;

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void testDuplicateOrderNumberForSameTenant() {
        String tenantId = "STORE_A";
        String orderNo = "ORD-UNIQUE-1";

        Order order1 = createValidOrder(orderNo, tenantId);
        orderRepository.saveAndFlush(order1);

        Order order2 = createValidOrder(orderNo, tenantId);
        
        assertThrows(DataIntegrityViolationException.class, () -> {
            orderRepository.saveAndFlush(order2);
        });
    }

    @Test
    void testDuplicateOrderNumberDifferentTenants() {
        String orderNo = "ORD-UNIQUE-2";

        Order orderA = createValidOrder(orderNo, "STORE_A");
        orderRepository.saveAndFlush(orderA);

        Order orderB = createValidOrder(orderNo, "STORE_B");
        orderRepository.saveAndFlush(orderB);
    }

    private Order createValidOrder(String orderNumber, String tenantId) {
        TenantContext.setTenantId(tenantId);
        LocalDateTime now = LocalDateTime.now();

        // 1. Setup Tenant (Uses your existing structure)
        Tenant tenant = entityManager.find(Tenant.class, tenantId);
        if (tenant == null) {

            // ✅ Create BASIC subscription plan if not exists
            SubscriptionPlan basicPlan = subscriptionPlanRepository
                    .findById("BASIC")
                    .orElseGet(() -> {
                        SubscriptionPlan plan = new SubscriptionPlan();
                        plan.setId("BASIC");
                        plan.setPlanType(SubscriptionPlanType.BASIC); // ⭐ REQUIRED
                        plan.setMaxBranches(1);
                        plan.setMaxUsers(10);
                        plan.setMaxProducts(100);
                        plan.setMonthlyPrice(BigDecimal.valueOf(999));
                        return subscriptionPlanRepository.save(plan);
                    });

            tenant = new Tenant();
            tenant.setId(tenantId);
            tenant.setName("Store " + tenantId + "_" + System.nanoTime());
            tenant.setSubscriptionPlan(basicPlan); // ✅ FIXED
            tenant.setActive(true);

            ReflectionTestUtils.setField(tenant, "createdAt", now);
            entityManager.persist(tenant);
        }

        // 2. Setup User
        User user = new User();
        user.setTenantId(tenantId);
        user.setUsername("user_" + tenantId + "_" + System.nanoTime());
        user.setEmail("test_" + System.nanoTime() + "@possaas.com");
        user.setPassword("SafePassword123!");
        user.setStatus(UserStatus.ACTIVE);
        user.setRole(Role.ROLE_CASHIER);
        // Force audit fields for User
        ReflectionTestUtils.setField(user, "createdAt", now);
        ReflectionTestUtils.setField(user, "updatedAt", now);
        ReflectionTestUtils.setField(user, "isDeleted", false);
        entityManager.persist(user);

        // 3. Setup Order
        Order order = new Order();
        order.setOrderNumber(orderNumber);
        order.setTenantId(tenantId);
        order.setCashier(user);
        order.setUser(user);
        order.setSubtotal(new BigDecimal("100.00"));
        order.setTax(new BigDecimal("10.00"));
        order.setDiscount(BigDecimal.ZERO);
        order.setTotalAmount(new BigDecimal("110.00"));
        order.setStatus(OrderStatus.COMPLETED);
        setRequiredFinancialFields(order, "100.00", "10.00", "110.00");
        
        // Force audit fields for Order to satisfy PostgreSQL NOT NULL
        ReflectionTestUtils.setField(order, "createdAt", now);
        ReflectionTestUtils.setField(order, "updatedAt", now);
        ReflectionTestUtils.setField(order, "isDeleted", false);

        return order;
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
