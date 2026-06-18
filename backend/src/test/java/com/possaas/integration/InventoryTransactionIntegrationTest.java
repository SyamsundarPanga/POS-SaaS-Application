package com.possaas.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import com.possaas.config.TenantContext;
import com.possaas.domain.inventory.Inventory;
import com.possaas.domain.product.Product;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionPlanType;
import com.possaas.domain.tenant.Tenant;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.domain.user.UserStatus;
import com.possaas.exception.InsufficientStockException;
import com.possaas.repository.InventoryRepository;
import com.possaas.repository.ProductRepository;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.repository.UserRepository;
import com.possaas.security.service.UserDetailsImpl;
import com.possaas.service.inventory.InventoryService;

class InventoryTransactionIntegrationTest extends BaseIntegrationTest {

    @Autowired private InventoryService inventoryService;
    @Autowired private InventoryRepository inventoryRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private TenantRepository tenantRepository;
    @Autowired private SubscriptionPlanRepository subscriptionPlanRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private TestRollbackService testRollbackService;

    @TestConfiguration
    static class TestConfig {
        @Bean
        public TestRollbackService testRollbackService() {
            return new TestRollbackService();
        }
    }

    private Long testProductId;
    private Long testUserId;
    private final String TENANT_ID = "transaction-test-tenant";

    @BeforeEach
    void setUp() {

        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {

            inventoryRepository.deleteAll();
            productRepository.deleteAll();
            userRepository.deleteAll();
            tenantRepository.deleteAll();

            // ✅ CREATE BASIC PLAN (REQUIRED FIX)
            SubscriptionPlan basicPlan = subscriptionPlanRepository
                    .findById("BASIC")
                    .orElseGet(() -> {
                        SubscriptionPlan plan = new SubscriptionPlan();
                        plan.setId("BASIC");
                        plan.setPlanType(SubscriptionPlanType.BASIC);
                        plan.setMaxBranches(1);
                        plan.setMaxUsers(10);
                        plan.setMaxProducts(100);
                        plan.setMonthlyPrice(BigDecimal.valueOf(999));
                        return subscriptionPlanRepository.save(plan);
                    });

            // ✅ ATTACH PLAN TO TENANT (CRITICAL FIX)
            Tenant tenant = new Tenant();
            tenant.setId(TENANT_ID);
            tenant.setName("Transaction Corp");
            tenant.setSubscriptionPlan(basicPlan);
            tenant.setActive(true);
            tenantRepository.save(tenant);

            Product product = new Product();
            product.setName("POS Terminal");
            product.setSku("POS-001");
            product.setPrice(new BigDecimal("500.00"));
            product.setTenantId(TENANT_ID);
            product = productRepository.save(product);
            testProductId = product.getId();

            Inventory inventory = new Inventory();
            inventory.setProduct(product);
            inventory.setQuantity(100);
            inventory.setTenantId(TENANT_ID);
            inventoryRepository.save(inventory);

            User user = new User();
            user.setUsername("txn-admin");
            user.setEmail("txn-admin@test.com");
            user.setPassword("encoded-password");
            user.setRole(Role.ROLE_STORE_ADMIN);
            user.setStatus(UserStatus.ACTIVE);
            user.setTenantId(TENANT_ID);
            testUserId = userRepository.save(user).getId();
        });

        TenantContext.clear();
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    @Test
    @Transactional
    @DisplayName("Verify quantity decreases correctly after deduction")
    void shouldDeductInventorySuccessfully() {
        TenantContext.setTenantId(TENANT_ID);
        setAuthenticatedUser();

        inventoryService.deductInventory(testProductId, 40);

        Inventory updated =
                inventoryRepository.findByProductIdAndTenantId(testProductId, TENANT_ID).get();

        assertThat(updated.getQuantity()).isEqualTo(60);
    }

    @Test
    @Transactional
    @DisplayName("Verify exception thrown when stock is insufficient")
    void shouldThrowExceptionWhenInsufficientStock() {
        TenantContext.setTenantId(TENANT_ID);
        setAuthenticatedUser();

        assertThrows(InsufficientStockException.class,
                () -> inventoryService.deductInventory(testProductId, 150));

        Inventory current =
                inventoryRepository.findByProductIdAndTenantId(testProductId, TENANT_ID).get();

        assertThat(current.getQuantity()).isEqualTo(100);
    }

    @Test
    @DisplayName("Verify rollback: inventory remains unchanged on post-deduction error")
    void shouldRollbackInventoryDeductionOnFailure() {

        TenantContext.setTenantId(TENANT_ID);
        setAuthenticatedUser();

        assertThrows(RuntimeException.class,
                () -> testRollbackService.deductAndThenFail(testProductId, 10));

        Inventory current =
                inventoryRepository.findByProductIdAndTenantId(testProductId, TENANT_ID).get();

        assertThat(current.getQuantity()).isEqualTo(100);
    }

    @Test
    @DisplayName("Verify Pessimistic Locking prevents overselling")
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void shouldPreventOversellingInConcurrentEnvironment() throws InterruptedException {

        int threadCount = 10;
        int qtyPerThread = 10;

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(threadCount);
        TransactionTemplate tt = new TransactionTemplate(transactionManager);

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    TenantContext.setTenantId(TENANT_ID);
                    setAuthenticatedUser();

                    tt.executeWithoutResult(status ->
                            inventoryService.deductInventory(testProductId, qtyPerThread)
                    );

                } finally {
                    latch.countDown();
                    TenantContext.clear();
                    org.springframework.security.core.context.SecurityContextHolder.clearContext();
                }
            });
        }

        latch.await(15, TimeUnit.SECONDS);
        executor.shutdown();

        Inventory finalInventory =
                inventoryRepository.findByProductIdAndTenantId(testProductId, TENANT_ID).get();

        assertThat(finalInventory.getQuantity()).isZero();
    }

    @Service
    public static class TestRollbackService {

        @Autowired
        private InventoryService inventoryService;

        @Transactional(propagation = Propagation.REQUIRES_NEW)
        public void deductAndThenFail(Long productId, Integer qty) {
            inventoryService.deductInventory(productId, qty);
            throw new RuntimeException("Simulated Failure for Rollback Test");
        }
    }

    private void setAuthenticatedUser() {
        UserDetailsImpl principal = new UserDetailsImpl(
                testUserId,
                "txn-admin",
                "txn-admin@test.com",
                "encoded-password",
                TENANT_ID,
                java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_STORE_ADMIN")));

        org.springframework.security.authentication.UsernamePasswordAuthenticationToken auth =
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        principal, null, principal.getAuthorities());

        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
