package com.possaas.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import com.possaas.domain.inventory.Inventory;
import com.possaas.domain.product.Product;
import com.possaas.domain.product.ProductStatus;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionPlanType;
import com.possaas.domain.tenant.Tenant;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.domain.user.UserStatus;
import com.possaas.dto.response.InventoryDto;
import com.possaas.repository.InventoryRepository;
import com.possaas.repository.ProductRepository;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.repository.UserRepository;
import com.possaas.security.TenantContextHolder;
import com.possaas.security.service.UserDetailsImpl;
import com.possaas.service.inventory.InventoryService;

public class InventorySecurityQAIT extends BaseIntegrationTest {

    @Autowired private InventoryService inventoryService;
    @Autowired private InventoryRepository inventoryRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private TenantRepository tenantRepository;
    @Autowired private SubscriptionPlanRepository subscriptionPlanRepository;
    @Autowired private UserRepository userRepository;

    private SubscriptionPlan basicPlan;

    @BeforeEach
    void setup() {
        inventoryRepository.deleteAll();
        productRepository.deleteAll();
        userRepository.deleteAll();
        tenantRepository.deleteAll();

        // ✅ Create BASIC plan properly AFTER injection
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
    }

    @AfterEach
    void tearDown() {
        TenantContextHolder.clear();
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    /**
     * MULTI-006-QA-07: Tenant A cannot access Tenant B's inventory
     */
    @Test
    @DisplayName("QA-07: Data Isolation - Tenant A sees 0 items from Tenant B")
    void testTenantDataIsolation() {

        Tenant tA = createAndSaveTenant("TenantA_" + UUID.randomUUID());
        Tenant tB = createAndSaveTenant("TenantB_" + UUID.randomUUID());

        // Create data for Tenant B
        TenantContextHolder.setTenant(tB.getId());

        Product productB = new Product();
        productB.setName("Tenant B Secret Item");
        productB.setSku("SKU-B-" + UUID.randomUUID());
        productB.setPrice(new BigDecimal("49.99"));
        productB.setStatus(ProductStatus.ACTIVE);
        productB.setTenantId(tB.getId());
        productRepository.save(productB);

        Inventory inventoryB = new Inventory();
        inventoryB.setProduct(productB);
        inventoryB.setQuantity(100);
        inventoryB.setTenantId(tB.getId());
        inventoryRepository.save(inventoryB);

        // Switch to Tenant A
        TenantContextHolder.setTenant(tA.getId());
        User tenantAUser = createAdminUser(tA.getId(), "tenant-a-admin");
        setAuthenticatedUser(tenantAUser);

        Page<InventoryDto> result =
                inventoryService.getAllInventory(null, PageRequest.of(0, 10));

        assertThat(result.getContent())
                .as("Security Leak: Tenant A can see products from Tenant B!")
                .isEmpty();
    }

    /**
     * MULTI-006-QA-09: ThreadLocal isolation under concurrency
     */
    @Test
    @DisplayName("QA-09: Concurrency - Verify ThreadLocal isolation under load")
    void testConcurrentThreadLocalIsolation() throws InterruptedException {

        int threadPoolSize = 10;
        int totalRequests = 50;

        ExecutorService executor = Executors.newFixedThreadPool(threadPoolSize);
        CountDownLatch latch = new CountDownLatch(1);
        AtomicInteger successCount = new AtomicInteger(0);

        for (int i = 0; i < totalRequests; i++) {
            final String assignedTenantId = "TENANT_VIRTUAL_" + i;

            executor.submit(() -> {
                try {
                    latch.await();
                    TenantContextHolder.setTenant(assignedTenantId);
                    Thread.sleep(10);

                    if (assignedTenantId.equals(TenantContextHolder.getTenant())) {
                        successCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    Thread.currentThread().interrupt();
                } finally {
                    TenantContextHolder.clear();
                }
            });
        }

        latch.countDown();
        executor.shutdown();
        executor.awaitTermination(10, TimeUnit.SECONDS);

        assertThat(successCount.get()).isEqualTo(totalRequests);
    }

    private Tenant createAndSaveTenant(String name) {
        Tenant tenant = new Tenant();
        tenant.setName(name);
        tenant.setActive(true);
        tenant.setSubscriptionPlan(basicPlan);
        return tenantRepository.save(tenant);
    }

    private User createAdminUser(String tenantId, String username) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(username + "@test.com");
        user.setPassword("encoded-password");
        user.setRole(Role.ROLE_STORE_ADMIN);
        user.setStatus(UserStatus.ACTIVE);
        user.setTenantId(tenantId);
        return userRepository.save(user);
    }

    private void setAuthenticatedUser(User user) {
        UserDetailsImpl principal = new UserDetailsImpl(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getPassword(),
                user.getTenantId(),
                java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_STORE_ADMIN")));

        org.springframework.security.authentication.UsernamePasswordAuthenticationToken auth =
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        principal, null, principal.getAuthorities());

        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
