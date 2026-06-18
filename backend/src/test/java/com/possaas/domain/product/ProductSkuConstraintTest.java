package com.possaas.domain.product;

import com.possaas.config.TenantContext;
import com.possaas.domain.branch.Branch;
import com.possaas.domain.branch.BranchStatus;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionPlanType;
import com.possaas.domain.tenant.Tenant;
import com.possaas.integration.BaseIntegrationTest;
import com.possaas.repository.BranchRepository;
import com.possaas.repository.ProductRepository;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.repository.TenantRepository;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class ProductSkuConstraintTest extends BaseIntegrationTest {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private TenantRepository tenantRepository;

    @Autowired
    private SubscriptionPlanRepository subscriptionPlanRepository;

    @Autowired
    private BranchRepository branchRepository;

    private SubscriptionPlan basicPlan;
    private Branch t1Branch1;
    private Branch t1Branch2;
    private Branch t2Branch1;

    @BeforeEach
    void setupTenants() {

        // Ensure BASIC plan exists
        basicPlan = subscriptionPlanRepository
                .findById("BASIC")
                .orElseGet(() -> {
                    SubscriptionPlan plan = new SubscriptionPlan();
                    plan.setId("BASIC");
                    plan.setPlanType(SubscriptionPlanType.BASIC);
                    plan.setMaxBranches(5);
                    plan.setMaxUsers(10);
                    plan.setMaxProducts(100);
                    plan.setMonthlyPrice(BigDecimal.valueOf(999));
                    return subscriptionPlanRepository.save(plan);
                });

        persistTenant("tenant-1");
        persistTenant("tenant-2");

        // Create Branches
        TenantContext.setTenantId("tenant-1");
        t1Branch1 = persistBranch("B1", "Main Branch");
        t1Branch2 = persistBranch("B2", "Second Branch");

        TenantContext.setTenantId("tenant-2");
        t2Branch1 = persistBranch("B1", "Another Main");
    }

    @AfterEach
    void cleanup() {
        TenantContext.clear();
    }

    private void persistTenant(String tenantId) {
        Tenant tenant = new Tenant();
        tenant.setId(tenantId);
        tenant.setName("Test Tenant " + tenantId);
        tenant.setSubscriptionPlan(basicPlan);
        tenantRepository.saveAndFlush(tenant);
    }

    private Branch persistBranch(String code, String name) {
        Branch branch = new Branch();
        branch.setCode(code);
        branch.setName(name);
        branch.setStatus(BranchStatus.ACTIVE);
        return branchRepository.saveAndFlush(branch);
    }

    private Product buildProduct(String tenantId, Branch branch, String sku) {

        TenantContext.setTenantId(tenantId);

        Product product = new Product();
        product.setName("Test Product");
        product.setSku(sku);
        product.setPrice(new BigDecimal("999.99"));
        product.setStatus(ProductStatus.ACTIVE);
        product.setBranch(branch);

        return product;
    }

    @Test
    @DisplayName("Duplicate SKU in the same tenant AND same branch should be rejected")
    void shouldRejectDuplicateSkuForSameTenantAndBranch() {

        Product p1 = buildProduct("tenant-1", t1Branch1, "SKU-001");
        productRepository.saveAndFlush(p1);

        Product p2 = buildProduct("tenant-1", t1Branch1, "SKU-001");

        assertThrows(
                DataIntegrityViolationException.class,
                () -> productRepository.saveAndFlush(p2),
                "Expected unique constraint violation for duplicate SKU within same tenant and branch");
    }

    @Test
    @DisplayName("Duplicate SKU in the same tenant BUT different branches should be allowed")
    void shouldAllowSameSkuForSameTenantDifferentBranches() {

        Product p1 = buildProduct("tenant-1", t1Branch1, "SKU-002");
        productRepository.saveAndFlush(p1);

        Product p2 = buildProduct("tenant-1", t1Branch2, "SKU-002");

        assertDoesNotThrow(
                () -> productRepository.saveAndFlush(p2),
                "Same SKU should be allowed across different branches inside the same tenant");
    }

    @Test
    @DisplayName("Same SKU across different tenants should be allowed")
    void shouldAllowSameSkuForDifferentTenants() {

        Product p1 = buildProduct("tenant-1", t1Branch1, "SKU-003");
        productRepository.saveAndFlush(p1);

        Product p2 = buildProduct("tenant-2", t2Branch1, "SKU-003");

        assertDoesNotThrow(
                () -> productRepository.saveAndFlush(p2),
                "Same SKU should be allowed for different tenants");
    }
}