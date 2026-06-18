package com.possaas.domain.base;

import com.possaas.config.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class BaseEntityTest {

    // Concrete implementation for testing purposes
    private static class TestEntity extends BaseEntity {}

    private TestEntity entity;

    @BeforeEach
    void setUp() {
        entity = new TestEntity();
        TenantContext.clear();
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("Should assign tenantId from TenantContext during PrePersist")
    void shouldAssignTenantIdFromContext() {
        // Arrange
        String expectedTenant = "tenant-xyz";
        TenantContext.setTenantId(expectedTenant);

        // Act
        entity.assignTenant();

        // Assert
        assertEquals(expectedTenant, entity.getTenantId());
    }

    @Test
    @DisplayName("Should throw exception during PrePersist if TenantContext is empty")
    void shouldThrowExceptionWhenContextIsEmpty() {
        // Arrange: Context is already cleared in setUp()

        // Act & Assert
        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> {
            entity.assignTenant();
        });
        
        assertEquals("TenantId not set in TenantContext", exception.getMessage());
    }

    @Test
    @DisplayName("Should not override tenantId if it is already manually set")
    void shouldNotOverrideExistingTenantId() {
        // Arrange
        String manualTenant = "manual-tenant";
        String contextTenant = "context-tenant";
        
        entity.setTenantId(manualTenant);
        TenantContext.setTenantId(contextTenant);

        // Act
        entity.assignTenant();

        // Assert
        assertEquals(manualTenant, entity.getTenantId(), "Should keep the manually set ID");
    }
}