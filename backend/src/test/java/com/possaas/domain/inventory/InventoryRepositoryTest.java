
package com.possaas.domain.inventory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

import com.possaas.domain.branch.Branch;
import com.possaas.domain.branch.BranchStatus;
import com.possaas.domain.product.Product;
import com.possaas.domain.product.ProductStatus;
import com.possaas.domain.tenant.SubscriptionPlanType;
import com.possaas.domain.tenant.Tenant;
import com.possaas.integration.BaseIntegrationTest;
import com.possaas.repository.BranchRepository;
import com.possaas.repository.InventoryRepository;
import com.possaas.repository.ProductRepository;
import com.possaas.repository.TenantRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.math.BigDecimal;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.repository.SubscriptionPlanRepository;

class InventoryRepositoryTest extends BaseIntegrationTest {

    @PersistenceContext
    private EntityManager entityManager;
    
    @Autowired
    private SubscriptionPlanRepository subscriptionPlanRepository;

    @Autowired
    private InventoryRepository inventoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private TenantRepository tenantRepository;
    
    @Autowired
    private BranchRepository branchRepository;

    
    
    /**
     * INVENTORY-001-QA-01
     * Task: Write unit tests for Inventory entity
     * Requirement: Entity validated
     */
    @Test
    void shouldSaveAndRetrieveInventory() {
        String tenantId = "tenant-123";
        Product product = createTestProduct(tenantId);

        Inventory inventory = new Inventory();
        inventory.setProduct(product);
        inventory.setQuantity(50);
        inventory.setTenantId(tenantId);

        inventoryRepository.save(inventory);

        Inventory found = inventoryRepository.findById(inventory.getId()).orElse(null);
        assertThat(found).isNotNull();
        assertThat(found.getQuantity()).isEqualTo(50);
    }

    /**
     * INVENTORY-001-QA-02
     * Task: Test unique constraint on (tenant_id, product_id)
     * Requirement: Duplicate inventory rejected
     */
    @Test
    void shouldRejectDuplicateProductForSameTenant() {
        String tenantId = "tenant-unique";
        Product product = createTestProduct(tenantId);
        // You'll need a helper to create/ensure a branch exists
        Branch branch = ensureBranchExists(tenantId); 
 
        Inventory inv1 = new Inventory();
        inv1.setProduct(product);
        inv1.setBranch(branch); // Set the branch
        inv1.setQuantity(10);
        inv1.setTenantId(tenantId);
        inventoryRepository.saveAndFlush(inv1);

        Inventory inv2 = new Inventory();
        inv2.setProduct(product);
        inv2.setBranch(branch); // Set the SAME branch
        inv2.setQuantity(20);
        inv2.setTenantId(tenantId);

        assertThatThrownBy(() -> inventoryRepository.saveAndFlush(inv2))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    /**
     * INVENTORY-001-QA-03
     * Task: Test Product-Inventory relationship
     * Requirement: Navigation from Product to Inventory works
     */
    @Test
    void shouldNavigateFromInventoryToProduct() {
        String tenantId = "tenant-nav";
        Product product = createTestProduct(tenantId);

        Inventory inventory = new Inventory();
        inventory.setProduct(product);
        inventory.setQuantity(100);
        inventory.setTenantId(tenantId);

        inventoryRepository.saveAndFlush(inventory);
        entityManager.clear(); // Clear cache to ensure we reload from DB

        Inventory found = inventoryRepository.findById(inventory.getId()).orElseThrow();
        assertThat(found.getProduct().getId()).isEqualTo(product.getId());
    }

    // Helper to satisfy Foreign Key constraints in Postgres
    private Tenant ensureTenantExists(String tenantId) {

        Tenant existing = tenantRepository.findById(tenantId).orElse(null);
        if (existing != null)
            return existing;

        SubscriptionPlan basicPlan = subscriptionPlanRepository.findById("BASIC")
                .orElseGet(() -> {
                    SubscriptionPlan plan = new SubscriptionPlan();
                    plan.setId("BASIC");
                    plan.setMaxBranches(1);
                    plan.setMaxUsers(5);
                    plan.setMaxProducts(100);
                    plan.setMonthlyPrice(BigDecimal.valueOf(999));
                    return subscriptionPlanRepository.save(plan);
                });

        Tenant tenant = new Tenant();
        tenant.setId(tenantId);
        tenant.setName("Business " + tenantId);
        tenant.setSubscriptionPlan(basicPlan);
        tenant.setActive(true);

        return tenantRepository.saveAndFlush(tenant);
    }

    // Helper to satisfy Product Not-Null constraints
    private Product createTestProduct(String tenantId) {
        ensureTenantExists(tenantId);

        Product product = new Product();
        product.setName("Sample Item");
        product.setSku("SKU-" + System.nanoTime());
        product.setPrice(new BigDecimal("29.99"));
        product.setStatus(ProductStatus.ACTIVE);
        product.setTenantId(tenantId);

        return productRepository.saveAndFlush(product);
    }
    
    
    private Branch ensureBranchExists(String tenantId) {
        // Check if a branch already exists for this tenant to avoid duplicate branch codes
        return branchRepository.findAll().stream()
                .filter(b -> b.getTenantId().equals(tenantId))
                .findFirst()
                .orElseGet(() -> {
                    Branch branch = new Branch();
                    branch.setCode("BR-" + System.nanoTime());
                    branch.setName("Main Branch");
                    branch.setStatus(BranchStatus.ACTIVE);
                    branch.setTenantId(tenantId);
                    return branchRepository.saveAndFlush(branch);
                });
    }
}
