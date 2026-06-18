package com.possaas.integration;

import com.possaas.config.TenantContext;
import com.possaas.domain.product.Product;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionPlanType;
import com.possaas.domain.tenant.Tenant;
import com.possaas.repository.ProductRepository;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.repository.TenantRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class TenantEntityIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private TenantRepository tenantRepository;

    @Autowired
    private SubscriptionPlanRepository subscriptionPlanRepository;

    private SubscriptionPlan basicPlan;

    @BeforeEach
    void setupPlan() {
        basicPlan = subscriptionPlanRepository.findById("BASIC")
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
    }

    @AfterEach
    void cleanup() {
        TenantContext.clear();
    }

    // =====================================================

    @Test
    @DisplayName("Entity auto-populates tenant_id from TenantContext")
    void entitySavesWithCorrectTenantIdFromContext() {

        String uniqueId = "tenant-" + System.currentTimeMillis();

        Tenant tenant = new Tenant();
        tenant.setId(uniqueId);
        tenant.setName("Test Tenant " + uniqueId);
        tenant.setSubscriptionPlan(basicPlan);   // ✅ FIX
        tenant.setActive(true);

        tenantRepository.saveAndFlush(tenant);

        TenantContext.setTenantId(uniqueId);

        Product product = new Product();
        product.setName("Laptop");
        product.setSku("SKU-" + uniqueId);
        product.setPrice(BigDecimal.valueOf(75000));

        Product saved = productRepository.save(product);

        assertThat(saved.getTenantId()).isEqualTo(uniqueId);
    }

    // =====================================================

    @Test
    @DisplayName("Manually set tenant_id is respected (admin override)")
    void manuallySetTenantIdIsRespected() {

        Tenant tenantAdmin = new Tenant();
        tenantAdmin.setId("tenant-ADMIN");
        tenantAdmin.setName("Admin Tenant");
        tenantAdmin.setSubscriptionPlan(basicPlan);  // ✅ FIX
        tenantAdmin.setActive(true);

        tenantRepository.saveAndFlush(tenantAdmin);

        TenantContext.setTenantId("tenant-001");

        Product product = new Product();
        product.setName("Admin Product");
        product.setSku("SKU-ADMIN");
        product.setPrice(BigDecimal.valueOf(99999));
        product.setTenantId("tenant-ADMIN");

        Product saved = productRepository.save(product);

        assertThat(saved.getTenantId()).isEqualTo("tenant-ADMIN");
    }
}