package com.possaas.integration;



import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.log;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;

import com.possaas.repository.InventoryRepository;
import com.possaas.repository.ProductRepository;
import com.possaas.repository.TenantRepository;

import lombok.extern.slf4j.Slf4j;

/**
 * Test to verify that inventory seeding does NOT occur when the flag is disabled.
 */
@TestPropertySource(properties = {
    "app.inventory.seeding.enabled=false"
})
@Slf4j
class InventorySeedingDisabledTest extends BaseIntegrationTest {

    @Autowired
    private InventoryRepository inventoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private TenantRepository tenantRepository;

    @Test
    @DisplayName("Should not seed inventory when app.inventory.seeding.enabled is false")
    void shouldNotSeedInventoryWhenFlagIsDisabled() {
        // 1. Check if products exist (assuming your Flyway or other loaders created some)
        long productCount = productRepository.count();
        
        // 2. Verify that despite products existing, no inventory was created
        long inventoryCount = inventoryRepository.count();

        log.info("Products found: {}, Inventory found: {}", productCount, inventoryCount);

        // Assertion: Inventory must be 0 because the flag in @TestPropertySource is false
        assertThat(inventoryCount)
            .as("Inventory should be empty when seeding flag is disabled")
            .isEqualTo(0);
    }
}
