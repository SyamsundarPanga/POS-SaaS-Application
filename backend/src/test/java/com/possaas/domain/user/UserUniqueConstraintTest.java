package com.possaas.domain.user;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

import com.possaas.config.TenantContext;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.Tenant;
import com.possaas.integration.BaseIntegrationTest;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.repository.UserRepository;


class UserUniqueConstraintTest extends BaseIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TenantRepository tenantRepository;

    @Autowired
    private SubscriptionPlanRepository subscriptionPlanRepository;

    @BeforeEach
    void setupTenants() {

        // Create BASIC plan if not exists
        SubscriptionPlan basicPlan = subscriptionPlanRepository.findById("BASIC")
                .orElseGet(() -> {
                    SubscriptionPlan plan = new SubscriptionPlan();
                    plan.setId("BASIC");

                    // 👇 FIX 1: use BigDecimal
                    plan.setMonthlyPrice(BigDecimal.valueOf(0.00));

                    // 👇 Only set fields that ACTUALLY exist in your entity
                    plan.setMaxBranches(1);
                    plan.setMaxUsers(5);
                    plan.setMaxProducts(100);

                    return subscriptionPlanRepository.save(plan);
                });

        // Create Tenant 1
        Tenant tenant1 = new Tenant();
        tenant1.setId("tenant_1");
        tenant1.setName("Tenant One");
        tenant1.setSubscriptionPlan(basicPlan);

        // Create Tenant 2
        Tenant tenant2 = new Tenant();
        tenant2.setId("tenant_2");
        tenant2.setName("Tenant Two");
        tenant2.setSubscriptionPlan(basicPlan);

        tenantRepository.save(tenant1);
        tenantRepository.save(tenant2);
    }
    
   
    @AfterEach
    void cleanup() {
        TenantContext.clear();
    }

    private User buildUser(String email, String username) {
        User user = new User();
        user.setEmail(email);
        user.setUsername(username);
        user.setPassword("secret");
        user.setRole(Role.ROLE_CASHIER);
        user.setStatus(UserStatus.ACTIVE);
        return user;
    }

    @Test
    @DisplayName("user Test unique constraint (duplicate email same tenant)")
    void shouldFailWhenDuplicateEmailInSameTenant() {
        TenantContext.setTenantId("tenant_1");

        userRepository.saveAndFlush(
                buildUser("test@possaas.com", "user1"));

        assertThrows(
                DataIntegrityViolationException.class,
                () -> userRepository.saveAndFlush(
                        buildUser("test@possaas.com", "user2")));
    }

    @Test
    @DisplayName("user Test same email different tenants allowed")
    void shouldAllowSameEmailAcrossDifferentTenants() {
        TenantContext.setTenantId("tenant_1");
        userRepository.saveAndFlush(
                buildUser("shared@possaas.com", "user1"));

        TenantContext.setTenantId("tenant_2");
        assertDoesNotThrow(() -> userRepository.saveAndFlush(
                buildUser("shared@possaas.com", "user2")));
    }
}
