package com.possaas.domain.product;

import com.possaas.config.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class ProductTest {

    private Product product;
    private static final String TEST_TENANT = "tenant-pos-prod-01";

    @BeforeEach
    void setUp() {
        TenantContext.setTenantId(TEST_TENANT);
        product = new Product();
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
@DisplayName("Should verify default values for new Product")
void shouldVerifyDefaultValues() {
    assertEquals(ProductStatus.ACTIVE, product.getStatus());
    assertFalse(product.getIsDeleted(), "Product should not be soft-deleted by default");
}



    @Test
    @DisplayName("Should verify basic setters and getters")
    void shouldVerifyBasicFields() {
        product.setName("Barcode Scanner");
        product.setSku("SCAN-001");
        product.setPrice(new BigDecimal("2499.99"));
        product.setImageUrl("https://cdn.pos.com/scan.png");
        product.setDescription("High-speed barcode scanner");

        assertEquals("Barcode Scanner", product.getName());
        assertEquals("SCAN-001", product.getSku());
        assertEquals(new BigDecimal("2499.99"), product.getPrice());
        assertEquals("https://cdn.pos.com/scan.png", product.getImageUrl());
        assertEquals("High-speed barcode scanner", product.getDescription());
    }

    @Test
    @DisplayName("Should assign tenantId from TenantContext during PrePersist")
    void shouldAssignTenantFromContext() {
        product.assignTenant();
        assertEquals(TEST_TENANT, product.getTenantId());
    }

    @Test
    @DisplayName("Should throw exception if TenantContext is missing")
    void shouldFailIfTenantContextIsMissing() {
        TenantContext.clear();

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                product::assignTenant
        );

        assertEquals("TenantId not set in TenantContext", exception.getMessage());
    }

    @Test
    @DisplayName("Should verify equality for same ID and same tenant")
    void shouldBeEqualForSameIdAndTenant() {
        Product p1 = new Product();
        p1.setId(100L);
        p1.setSku("LAPTOP-01");
        p1.setTenantId(TEST_TENANT);

        Product p2 = new Product();
        p2.setId(100L);
        p2.setSku("LAPTOP-01");
        p2.setTenantId(TEST_TENANT);

        assertEquals(p1, p2);
        assertEquals(p1.hashCode(), p2.hashCode());
    }

    @Test
    @DisplayName("Should NOT be equal for same ID but different tenant")
    void shouldNotBeEqualForDifferentTenant() {
        Product p1 = new Product();
        p1.setId(100L);
        p1.setTenantId(TEST_TENANT);

        Product p2 = new Product();
        p2.setId(100L);
        p2.setTenantId("tenant-other");

        assertNotEquals(p1, p2);
    }
}