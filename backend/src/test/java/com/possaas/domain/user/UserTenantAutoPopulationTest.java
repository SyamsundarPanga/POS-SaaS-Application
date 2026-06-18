package com.possaas.domain.user;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.InvalidDataAccessApiUsageException;

import com.possaas.config.TenantContext;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.Tenant;
import com.possaas.integration.BaseIntegrationTest;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.repository.UserRepository;

import jakarta.persistence.EntityManager;

class UserTenantAutoPopulationTest extends BaseIntegrationTest {

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private SubscriptionPlanRepository subscriptionPlanRepository;

	@Autowired
	private EntityManager entityManager;

	private static final String TENANT_ID = "tenant-user-001";

	@AfterEach
	void tearDown() {
		TenantContext.clear();
	}

	@Test
	@DisplayName("Should auto-populate tenantId when saving User")
	void shouldAutoPopulateTenantForUser() {

		// 1️⃣ Create BASIC plan first
		SubscriptionPlan basicPlan = subscriptionPlanRepository.findById("BASIC").orElseGet(() -> {
			SubscriptionPlan plan = new SubscriptionPlan();
			plan.setId("BASIC");
			plan.setMaxBranches(1);
			plan.setMaxUsers(5);
			plan.setMaxProducts(100);
			plan.setMonthlyPrice(BigDecimal.valueOf(999));
			return subscriptionPlanRepository.save(plan);
		});

		// 2️⃣ Create tenant and assign plan
		Tenant tenant = new Tenant();
		tenant.setId(TENANT_ID);
		tenant.setName("Test Tenant");
		tenant.setSubscriptionPlan(basicPlan); // ✅ correct

		entityManager.persist(tenant);
		entityManager.flush();

		TenantContext.setTenantId(TENANT_ID);

		User user = new User();
		user.setUsername("admin");
		user.setEmail("admin@possaas.com");
		user.setPassword("secret");
		user.setRole(Role.ROLE_STORE_ADMIN);

		User savedUser = userRepository.save(user);

		assertEquals(TENANT_ID, savedUser.getTenantId());
	}

	@Test
	@DisplayName("Should fail saving User when TenantContext is missing")
	void shouldFailWhenTenantContextIsMissing() {

		User user = new User();
		user.setUsername("cashier");
		user.setEmail("cashier@possaas.com");
		user.setPassword("secret");
		user.setRole(Role.ROLE_CASHIER);

		InvalidDataAccessApiUsageException ex = assertThrows(InvalidDataAccessApiUsageException.class,
				() -> userRepository.saveAndFlush(user));

		assertTrue(ex.getCause() instanceof IllegalStateException);
	}
}
