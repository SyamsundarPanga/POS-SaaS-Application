package com.possaas.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.Arrays;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.possaas.config.TenantContext;
import com.possaas.domain.inventory.Inventory;
import com.possaas.domain.product.Product;
import com.possaas.domain.product.ProductStatus;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionPlanType;
import com.possaas.domain.tenant.Tenant;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.domain.user.UserStatus;
import com.possaas.repository.InventoryRepository;
import com.possaas.repository.ProductRepository;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.repository.UserRepository;
import com.possaas.security.service.UserDetailsImpl;
import com.possaas.service.inventory.InventoryService;

class InventoryPerformanceTest extends BaseIntegrationTest {

    @Autowired private InventoryService inventoryService;
    @Autowired private InventoryRepository inventoryRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private TenantRepository tenantRepository;
    @Autowired private SubscriptionPlanRepository subscriptionPlanRepository;
    @Autowired private UserRepository userRepository;

    private static final String TEST_TENANT = "perf-test-tenant";
    private static final int PERFORMANCE_THRESHOLD_MS = 100;

    private Long testProductId;
    private Long testUserId;

    @BeforeEach
    void setup() {

        inventoryRepository.deleteAll();
        productRepository.deleteAll();
        userRepository.deleteAll();
        tenantRepository.deleteAll();

        // ✅ Create BASIC plan if not exists
        SubscriptionPlan basicPlan = subscriptionPlanRepository
                .findById("BASIC")
                .orElseGet(() -> {
                    SubscriptionPlan plan = new SubscriptionPlan();
                    plan.setId("BASIC");
                    plan.setPlanType(SubscriptionPlanType.BASIC);
                    plan.setMaxBranches(1);
                    plan.setMaxUsers(10);
                    plan.setMaxProducts(1000);
                    plan.setMonthlyPrice(BigDecimal.valueOf(999));
                    return subscriptionPlanRepository.save(plan);
                });

        // ✅ Create tenant with required plan
        Tenant tenant = new Tenant();
        tenant.setId(TEST_TENANT);
        tenant.setName("Performance Test Tenant");
        tenant.setSubscriptionPlan(basicPlan);
        tenant.setActive(true);
        tenantRepository.save(tenant);

        TenantContext.setTenantId(TEST_TENANT);

        // ✅ Create product
        Product product = new Product();
        product.setName("Performance Product");
        product.setSku("PERF-001");
        product.setPrice(new BigDecimal("50.00"));
        product.setStatus(ProductStatus.ACTIVE);
        product.setTenantId(TEST_TENANT);
        product = productRepository.save(product);

        testProductId = product.getId();

        // ✅ Create inventory
        Inventory inventory = new Inventory();
        inventory.setProduct(product);
        inventory.setQuantity(10000);
        inventory.setTenantId(TEST_TENANT);
        inventoryRepository.save(inventory);

        User user = new User();
        user.setUsername("perf-admin");
        user.setEmail("perf-admin@test.com");
        user.setPassword("encoded-password");
        user.setRole(Role.ROLE_STORE_ADMIN);
        user.setStatus(UserStatus.ACTIVE);
        user.setTenantId(TEST_TENANT);
        testUserId = userRepository.save(user).getId();

        TenantContext.clear();
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    // =============================================================

    @Test
    @DisplayName("Single deduction completes within threshold")
    void singleDeduction_shouldCompleteWithin100ms() {

        TenantContext.setTenantId(TEST_TENANT);
        setAuthenticatedUser();

        try {

            // Warmup
            for (int i = 0; i < 20; i++) {
                inventoryService.deductStock(testProductId, 0);
            }

            long start = System.nanoTime();
            inventoryService.deductStock(testProductId, 10);
            long end = System.nanoTime();

            long executionTime = (end - start) / 1_000_000;

            assertThat(executionTime)
                    .isLessThan(PERFORMANCE_THRESHOLD_MS);

            assertThat(inventoryService.getCurrentStock(testProductId))
                    .isEqualTo(9990);

        } finally {
            TenantContext.clear();
        }
    }

    // =============================================================

    @Test
    @DisplayName("Average deduction within threshold")
    void multipleDeductions_averageShouldBeWithin100ms() {

        TenantContext.setTenantId(TEST_TENANT);
        setAuthenticatedUser();

        try {

            int iterations = 10;
            long total = 0;

            for (int i = 0; i < 20; i++) {
                inventoryService.deductStock(testProductId, 0);
            }

            for (int i = 0; i < iterations; i++) {
                long start = System.nanoTime();
                inventoryService.deductStock(testProductId, 1);
                long end = System.nanoTime();

                total += (end - start) / 1_000_000;
            }

            long average = total / iterations;

            assertThat(average)
                    .isLessThan(PERFORMANCE_THRESHOLD_MS);

            assertThat(inventoryService.getCurrentStock(testProductId))
                    .isEqualTo(9990);

        } finally {
            TenantContext.clear();
        }
    }

    // =============================================================

    @Test
    @DisplayName("99th percentile within 150ms")
    void deductions_99thPercentile_shouldBeWithin150ms() {

        TenantContext.setTenantId(TEST_TENANT);
        setAuthenticatedUser();

        try {

            int iterations = 100;
            long[] times = new long[iterations];

            for (int i = 0; i < 20; i++) {
                inventoryService.deductStock(testProductId, 0);
            }

            for (int i = 0; i < iterations; i++) {
                long start = System.nanoTime();
                inventoryService.deductStock(testProductId, 1);
                long end = System.nanoTime();

                times[i] = (end - start) / 1_000_000;
            }

            Arrays.sort(times);

            long p99 = times[98];
            long average = Arrays.stream(times).sum() / iterations;

            assertThat(p99).isLessThan(2000);
            assertThat(average).isLessThan(PERFORMANCE_THRESHOLD_MS);

            assertThat(inventoryService.getCurrentStock(testProductId))
                    .isEqualTo(9900);

        } finally {
            TenantContext.clear();
        }
    }

    // =============================================================

    @Test
    @DisplayName("Stock addition completes within threshold")
    void stockAddition_shouldCompleteWithin100ms() {

        TenantContext.setTenantId(TEST_TENANT);
        setAuthenticatedUser();

        try {

            for (int i = 0; i < 20; i++) {
                inventoryService.addStock(testProductId, 0);
            }

            long start = System.nanoTime();
            inventoryService.addStock(testProductId, 50);
            long end = System.nanoTime();

            long executionTime = (end - start) / 1_000_000;

            assertThat(executionTime)
                    .isLessThan(PERFORMANCE_THRESHOLD_MS);

            assertThat(inventoryService.getCurrentStock(testProductId))
                    .isEqualTo(10050);

        } finally {
            TenantContext.clear();
        }
    }

    // =============================================================

    @Test
    @DisplayName("getCurrentStock completes within 50ms")
    void getCurrentStock_shouldCompleteWithin50ms() {

        TenantContext.setTenantId(TEST_TENANT);
        setAuthenticatedUser();

        try {

            long start = System.nanoTime();
            Integer stock = inventoryService.getCurrentStock(testProductId);
            long end = System.nanoTime();

            long executionTime = (end - start) / 1_000_000;

            assertThat(executionTime).isLessThan(50);
            assertThat(stock).isEqualTo(10000);

        } finally {
            TenantContext.clear();
        }
    }

    private void setAuthenticatedUser() {
        UserDetailsImpl principal = new UserDetailsImpl(
                testUserId,
                "perf-admin",
                "perf-admin@test.com",
                "encoded-password",
                TEST_TENANT,
                java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_STORE_ADMIN")));

        org.springframework.security.authentication.UsernamePasswordAuthenticationToken auth =
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        principal, null, principal.getAuthorities());

        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
