package com.possaas.domain.product;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.InvalidDataAccessApiUsageException;

import com.possaas.config.TenantContext;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionPlanType;
import com.possaas.domain.tenant.Tenant;
import com.possaas.integration.BaseIntegrationTest;
import com.possaas.repository.ProductRepository;
import com.possaas.repository.SubscriptionPlanRepository;

import jakarta.persistence.EntityManager;

class ProductTenantAutoPopulationTest extends BaseIntegrationTest {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private SubscriptionPlanRepository subscriptionPlanRepository;

    @Autowired
    private EntityManager entityManager;

    private static final String TENANT_ID = "tenant-pos-prod-01";

    private SubscriptionPlan basicPlan;

    @BeforeEach
    void setup() {

        // Ensure BASIC plan exists (avoid duplicate insert)
        basicPlan = subscriptionPlanRepository
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
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("Should auto-populate tenantId when saving Product")
    void shouldAutoPopulateTenantForProduct() {

        // GIVEN: Tenant exists in DB
        Tenant tenant = new Tenant();
        tenant.setId(TENANT_ID);
        tenant.setName("POS Product Tenant");
        tenant.setSubscriptionPlan(basicPlan);

        entityManager.persist(tenant);
        entityManager.flush();

        // AND: TenantContext is set
        TenantContext.setTenantId(TENANT_ID);

        Product product = new Product();
        product.setName("POS Printer");
        product.setSku("PRN-001");
        product.setPrice(BigDecimal.valueOf(15000));

        // WHEN
        Product savedProduct = productRepository.save(product);

        // THEN
        assertNotNull(savedProduct.getTenantId());
        assertEquals(TENANT_ID, savedProduct.getTenantId());
    }

    @Test
    @DisplayName("Should fail saving Product if TenantContext is missing")
    void shouldFailWhenTenantContextIsMissing() {

        Product product = new Product();
        product.setName("Barcode Scanner");
        product.setSku("SCN-001");
        product.setPrice(BigDecimal.valueOf(5000));

        InvalidDataAccessApiUsageException ex = assertThrows(
                InvalidDataAccessApiUsageException.class,
                () -> productRepository.saveAndFlush(product));

        assertTrue(ex.getCause() instanceof IllegalStateException);
        assertEquals(
                "Cannot save entity without tenant context",
                ex.getCause().getMessage());
    }
}