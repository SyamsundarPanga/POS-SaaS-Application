package com.possaas.integration;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.possaas.domain.product.Product;
import com.possaas.domain.product.ProductStatus;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionPlanType;
import com.possaas.domain.tenant.Tenant;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.domain.user.UserStatus;
import com.possaas.repository.ProductRepository;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.repository.UserRepository;
import com.possaas.security.service.UserDetailsImpl;
import com.possaas.service.auth.JwtTokenProvider;

@Transactional
class GlobalTenantIsolationTest extends BaseIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ProductRepository productRepository;
    @Autowired private TenantRepository tenantRepository;
    @Autowired private SubscriptionPlanRepository subscriptionPlanRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtTokenProvider jwtTokenProvider;

    private SubscriptionPlan basicPlan;
    private String tokenTenantA;
    private String tokenTenantB;

    @BeforeEach
    void setupData() {

        productRepository.deleteAll();
        userRepository.deleteAll();
        tenantRepository.deleteAll();

        // ✅ Ensure BASIC plan exists
        basicPlan = subscriptionPlanRepository
                .findById("BASIC")
                .orElseGet(() -> {
                    SubscriptionPlan plan = new SubscriptionPlan();
                    plan.setId("BASIC");
                    plan.setPlanType(SubscriptionPlanType.BASIC);
                    plan.setMaxBranches(1);
                    plan.setMaxUsers(10);
                    plan.setMaxProducts(100);
                    plan.setMonthlyPrice(BigDecimal.ZERO);
                    return subscriptionPlanRepository.save(plan);
                });

        // Seed Tenant A
        Tenant t1 = createTenant("tenant-a", "Business A");
        User userA = createUser("user-tenant-a", "tenant-a", "tenant-a@test.com");
        createProduct("Product A", "SKU-A", t1.getId());

        // Seed Tenant B
        Tenant t2 = createTenant("tenant-b", "Business B");
        User userB = createUser("user-tenant-b", "tenant-b", "tenant-b@test.com");
        createProduct("Product B", "SKU-B", t2.getId());

        tokenTenantA = "Bearer " + generateTokenForTenant(userA);
        tokenTenantB = "Bearer " + generateTokenForTenant(userB);
    }

    @Test
    @WithMockUser(roles = "STORE_ADMIN")
    @DisplayName("MULTI-007-QA-05: Verify endpoint isolation across different tenants")
    void shouldOnlySeeOwnedData() throws Exception {

        // Tenant A
        mockMvc.perform(get("/api/products")
                .header("Authorization", tokenTenantA)
                .header("X-Tenant-ID", "tenant-a"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].name").value("Product A"));

        // Tenant B
        mockMvc.perform(get("/api/products")
                .header("Authorization", tokenTenantB)
                .header("X-Tenant-ID", "tenant-b"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].name").value("Product B"));
    }

    private Tenant createTenant(String id, String name) {
        Tenant t = new Tenant();
        t.setId(id);
        t.setName(name);
        t.setSubscriptionPlan(basicPlan);   // ✅ REQUIRED FIX
        t.setActive(true);
        return tenantRepository.save(t);
    }

    private void createProduct(String name, String sku, String tenantId) {
        Product p = new Product();
        p.setName(name);
        p.setSku(sku);
        p.setPrice(BigDecimal.TEN);
        p.setStatus(ProductStatus.ACTIVE);
        p.setTenantId(tenantId);
        productRepository.save(p);
    }

    private User createUser(String username, String tenantId, String email) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword("password");
        user.setRole(Role.ROLE_STORE_ADMIN);
        user.setStatus(UserStatus.ACTIVE);
        user.setTenantId(tenantId);
        return userRepository.save(user);
    }

    private String generateTokenForTenant(User user) {
        UserDetailsImpl principal = new UserDetailsImpl(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                "password",
                user.getTenantId(),
                java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_STORE_ADMIN")));

        org.springframework.security.authentication.UsernamePasswordAuthenticationToken auth =
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        principal, null, principal.getAuthorities());

        return jwtTokenProvider.generateToken(auth, user.getTenantId());
    }
}
