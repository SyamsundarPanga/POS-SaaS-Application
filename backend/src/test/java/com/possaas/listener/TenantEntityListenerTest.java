package com.possaas.listener;

import com.possaas.config.TenantContext;
import com.possaas.domain.base.BaseEntity;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.*;

class TenantEntityListenerTest {

    private TenantEntityListener listener;

    @BeforeEach
    void setUp() {
        listener = new TenantEntityListener();
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    // ------------------------------------------------
    // 1️⃣ Non-BaseEntity → should be ignored safely
    // ------------------------------------------------
    @Test
    void prePersist_shouldIgnoreNonBaseEntity() {
        Object randomObject = new Object();

        assertDoesNotThrow(() -> listener.prePersist(randomObject));
    }

    // ------------------------------------------------
    // 2️⃣ Tenant already set → do NOT override
    // ------------------------------------------------
    @Test
    void prePersist_shouldNotOverrideExistingTenant() {
        TestEntity entity = new TestEntity();
        entity.setTenantId("tenant-admin");

        try (MockedStatic<TenantContext> mocked = Mockito.mockStatic(TenantContext.class)) {
            mocked.when(TenantContext::getTenantIdOrNull)
                  .thenReturn("tenant-context");

            listener.prePersist(entity);

            assertEquals("tenant-admin", entity.getTenantId(),
                    "Tenant ID must not be overridden");
        }
    }

    // ------------------------------------------------
    // 3️⃣ Tenant missing, context exists → auto-populate
    // ------------------------------------------------
    @Test
    void prePersist_shouldSetTenantFromContext() {
        TestEntity entity = new TestEntity();

        try (MockedStatic<TenantContext> mocked = Mockito.mockStatic(TenantContext.class)) {
            mocked.when(TenantContext::getTenantIdOrNull)
                  .thenReturn("tenant-a");

            listener.prePersist(entity);

            assertEquals("tenant-a", entity.getTenantId(),
                    "Tenant ID should be set from context");
        }
    }

    // ------------------------------------------------
    // 4️⃣ Tenant missing + context missing → throw exception
    // ------------------------------------------------
    @Test
    void prePersist_shouldThrowExceptionWhenTenantContextMissing() {
        TestEntity entity = new TestEntity();

        try (MockedStatic<TenantContext> mocked = Mockito.mockStatic(TenantContext.class)) {
            mocked.when(TenantContext::getTenantIdOrNull)
                  .thenReturn(null);

            IllegalStateException ex = assertThrows(
                    IllegalStateException.class,
                    () -> listener.prePersist(entity)
            );

            assertTrue(
                    ex.getMessage().contains("Cannot save entity without tenant context"),
                    "Exception message should explain tenant context issue"
            );
        }
    }

    // ------------------------------------------------
    // 🧪 Test helper entity
    // ------------------------------------------------
    static class TestEntity extends BaseEntity {
        // no extra fields needed
    }
}