package com.possaas.security;

import com.possaas.config.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

class TenantContextTest {

	@AfterEach
	void tearDown() {
		TenantContext.clear();
	}

	// -----------------------------
	// Basic Set & Get
	// -----------------------------

	@Test
	void shouldSetAndGetTenantId() {
		TenantContext.setTenantId("acme-retail");

		String tenantId = TenantContext.getTenantId();

		assertEquals("acme-retail", tenantId);
	}

	@Test
	void shouldClearTenantId() {
		TenantContext.setTenantId("beta-mart");

		TenantContext.clear();

		assertNull(TenantContext.getTenantIdOrNull());
	}

	// -----------------------------
	// Thread Isolation
	// -----------------------------

	@Test
	void shouldIsolateTenantAcrossThreads() throws InterruptedException {
		CountDownLatch latch = new CountDownLatch(2);

		AtomicReference<String> t1 = new AtomicReference<>();
		AtomicReference<String> t2 = new AtomicReference<>();

		Runnable r1 = () -> {
			try {
				TenantContext.setTenantId("tenant-A");
				t1.set(TenantContext.getTenantId());
			} finally {
				TenantContext.clear();
				latch.countDown();
			}
		};

		Runnable r2 = () -> {
			try {
				TenantContext.setTenantId("tenant-B");
				t2.set(TenantContext.getTenantId());
			} finally {
				TenantContext.clear();
				latch.countDown();
			}
		};

		new Thread(r1).start();
		new Thread(r2).start();

		latch.await();

		assertEquals("tenant-A", t1.get());
		assertEquals("tenant-B", t2.get());
		assertNotEquals(t1.get(), t2.get());
	}

	// -----------------------------
	// Missing Tenant Scenarios
	// -----------------------------

	@Test
	void shouldReturnNullWhenTenantNotSet_safeMethod() {
		assertNull(TenantContext.getTenantIdOrNull());
	}

	@Test
	void shouldThrowExceptionWhenTenantRequiredButNotSet() {
		IllegalStateException ex = assertThrows(IllegalStateException.class, TenantContext::getTenantId);

		assertEquals("Tenant ID is not set in TenantContext", ex.getMessage());
	}

	
	@Test
	void shouldThrowIllegalStateExceptionWhenTenantContextIsNull() {
		// Given: No tenant has been set (context is null)
		assertNull(TenantContext.getTenantIdOrNull(), "Context should be null initially");

		// When & Then: getTenantId() should throw IllegalStateException
		IllegalStateException exception = assertThrows(IllegalStateException.class, () -> TenantContext.getTenantId(),
				"Expected IllegalStateException when tenant context is null");

		// Verify exception message
		assertEquals("Tenant ID is not set in TenantContext", exception.getMessage());

		// Verify safe method still returns null
		assertNull(TenantContext.getTenantIdOrNull(), "Safe method should return null when context is empty");
	}
}