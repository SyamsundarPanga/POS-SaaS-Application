package com.possaas.domain.inventory;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.possaas.config.TenantContext;
import com.possaas.domain.product.Product;

class InventoryTest {

	private Inventory inventory;
	private final String MOCK_TENANT = "pos-tenant-456";

	@BeforeEach
	void setUp() {
		// Prepare the context so the entity can pull the tenant ID
		TenantContext.setTenantId(MOCK_TENANT);
		inventory = new Inventory();
	}

	@AfterEach
	void tearDown() {
		// Always clear ThreadLocal to prevent test cross-contamination
		TenantContext.clear();
	}


	@Test
	@DisplayName("Should verify field getters and setters for quantity and product relationship")
	void testInventoryFields() {

		// Arrange
		Long expectedProductId = 1001L;
		Integer expectedQuantity = 50;

		Product product = new Product();
		product.setId(expectedProductId);

		// Act
		inventory.setProduct(product);
		inventory.setQuantity(expectedQuantity);

		// Assert
		assertEquals(expectedProductId, inventory.getProduct().getId());
		assertEquals(expectedQuantity, inventory.getQuantity());
	}

	@Test
	@DisplayName("Should assign tenantId from TenantContext when assignTenant is called")
	void testTenantAssignmentInheritance() {
		// Act: This method is inherited from BaseEntity
		inventory.assignTenant();

		// Assert
		assertEquals(MOCK_TENANT, inventory.getTenantId(), "Inventory must be linked to the current tenant");
	}

	@Test
	@DisplayName("Should verify that equals and hashCode include the tenant ID from BaseEntity")
	void testEqualsAndHashCode() {
		// Two inventory records with same ID and Tenant
		Inventory inv1 = new Inventory();
		inv1.setId(1L);
		inv1.setTenantId(MOCK_TENANT);

		Inventory inv2 = new Inventory();
		inv2.setId(1L);
		inv2.setTenantId(MOCK_TENANT);

		assertEquals(inv1, inv2, "Inventory records should be equal if ID and Tenant match");
		assertEquals(inv1.hashCode(), inv2.hashCode());

		// Change the tenant - they should no longer be equal (Critical for SaaS
		// isolation)
		inv2.setTenantId("different-tenant");
		assertNotEquals(inv1, inv2, "Inventory records in different tenants should never be equal");
	}

	@Test
	@DisplayName("Should throw IllegalStateException during tenant assignment if context is empty")
	void testTenantAssignmentFailure() {
		// Arrange
		TenantContext.clear();

		// Act & Assert
		assertThrows(IllegalStateException.class, () -> inventory.assignTenant(),
				"Should fail if no tenant is set in the ThreadLocal context");
	}
}