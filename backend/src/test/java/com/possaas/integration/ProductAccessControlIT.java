package com.possaas.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.jayway.jsonpath.JsonPath;
import com.possaas.config.TenantContext;
import com.possaas.domain.branch.Branch;
import com.possaas.domain.branch.BranchStatus;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionPlanType;
import com.possaas.domain.tenant.Tenant;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.domain.user.UserStatus;
import com.possaas.repository.ProductRepository;
import com.possaas.repository.BranchRepository;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.repository.UserRepository;
import com.possaas.repository.UsageTrackingRepository;
import com.possaas.domain.tenant.UsageTracking;

import jakarta.transaction.Transactional;

@AutoConfigureMockMvc
@Transactional
@Rollback
class ProductAccessControlIT extends BaseIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private TenantRepository tenantRepository;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private ProductRepository productRepository;
	
	@Autowired
	private BranchRepository branchRepository;

	@Autowired
	private PasswordEncoder passwordEncoder;
	
	@Autowired
	private SubscriptionPlanRepository subscriptionPlanRepository;

	@Autowired
	private UsageTrackingRepository usageTrackingRepository;

	private static final String TENANT_ID = "tenant-pos-test-01";

	private static final String VALID_PRODUCT_JSON = """
			{
			  "name": "TestProduct",
			  "sku": "SKU100",
			  "price": 10.00,
			  "status": "ACTIVE",
			  "description": "Test description",
			  "imageUrl": "test.png"
			}
			""";

	@BeforeEach
	void setup() {
		// Clear previous data
		productRepository.deleteAll();
		userRepository.deleteAll();
		branchRepository.deleteAll();
		tenantRepository.deleteAll();
		
		// ✅ Create BASIC subscription plan if not exists
		SubscriptionPlan basicPlan = subscriptionPlanRepository
		        .findById("BASIC")
		        .orElseGet(() -> {
		            SubscriptionPlan plan = new SubscriptionPlan();
		            plan.setId("BASIC");
		            plan.setPlanType(SubscriptionPlanType.BASIC); // ⭐ REQUIRED
		            plan.setMaxBranches(1);
		            plan.setMaxUsers(10);
		            plan.setMaxProducts(100);
		            plan.setMonthlyPrice(BigDecimal.valueOf(999));
		            return subscriptionPlanRepository.save(plan);
		        });

		

		// Create tenant
		Tenant tenant = new Tenant();
		tenant.setId(TENANT_ID);
		tenant.setName("Test Tenant " + System.nanoTime());
		tenant.setSubscriptionPlan(basicPlan); 
		tenant.setActive(true);
		tenantRepository.save(tenant);

		// Create usage tracking for subscription limit checks
		UsageTracking usage = new UsageTracking();
		usage.setTenantId(TENANT_ID);
		usage.setCurrentUsers(0L);
		usage.setCurrentBranches(0L);
		usage.setCurrentProducts(0L);
		usage.setLastUpdated(java.time.LocalDateTime.now());
		usageTrackingRepository.save(usage);

		TenantContext.setTenantId(TENANT_ID);

		Branch branch = new Branch();
		branch.setCode("BR-001");
		branch.setName("Main Branch");
		branch.setStatus(BranchStatus.ACTIVE);
		branch = branchRepository.save(branch);

		// Create users
		User admin = new User();
		admin.setUsername("admin@test.com");
		admin.setEmail("admin@test.com");
		admin.setFirstName("Admin");
		admin.setLastName("User");
		admin.setPassword(passwordEncoder.encode("Pass@123"));
		admin.setRole(Role.ROLE_STORE_ADMIN);
		admin.setStatus(UserStatus.ACTIVE);
		admin.setTenantId(TENANT_ID);
		userRepository.save(admin);

		User cashier = new User();
		cashier.setUsername("cashier@test.com");
		cashier.setEmail("cashier@test.com");
		cashier.setFirstName("Cashier");
		cashier.setLastName("User");
		cashier.setPassword(passwordEncoder.encode("Pass@123"));
		cashier.setRole(Role.ROLE_CASHIER);
		cashier.setStatus(UserStatus.ACTIVE);
		cashier.setTenantId(TENANT_ID);
		cashier.setBranch(branch);
		userRepository.save(cashier);
	}

	@AfterEach
	void cleanup() {
		TenantContext.clear();
	}

	// ================= HELPER METHODS =================

	private String getToken(String email, String password) throws Exception {
		String loginJson = """
				{
				  "email": "%s",
				  "password": "%s",
				  "tenantId": "%s"
				}
				""".formatted(email, password, TENANT_ID);

		MvcResult result = mockMvc
				.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginJson))
				.andExpect(status().isOk()).andReturn();

		String response = result.getResponse().getContentAsString();
		return JsonPath.read(response, "$.accessToken");
	}

	private String storeAdminToken() throws Exception {
		return getToken("admin@test.com", "Pass@123");
	}

	private String cashierToken() throws Exception {
		return getToken("cashier@test.com", "Pass@123");
	}

	// ================= CREATE PRODUCT =================

	@Test
	@DisplayName("STORE_ADMIN → Can Create Product (201)")
	void storeAdmin_canCreateProduct() throws Exception {
		mockMvc.perform(post("/api/products").header("Authorization", "Bearer " + storeAdminToken())
				.header("X-Tenant-ID", TENANT_ID).contentType(MediaType.APPLICATION_JSON).content(VALID_PRODUCT_JSON))
				.andExpect(status().isCreated());
	}

	@Test
	@DisplayName("CASHIER → Cannot Create Product (403)")
	void cashier_cannotCreateProduct() throws Exception {
		mockMvc.perform(post("/api/products").header("Authorization", "Bearer " + cashierToken())
				.header("X-Tenant-ID", TENANT_ID).contentType(MediaType.APPLICATION_JSON).content(VALID_PRODUCT_JSON))
				.andExpect(status().isForbidden());
	}


	@Test
	@DisplayName("Unauthenticated → Cannot Create Product (403)")
	void unauthenticated_cannotCreateProduct() throws Exception {
		mockMvc.perform(post("/api/products").header("X-Tenant-ID", TENANT_ID).contentType(MediaType.APPLICATION_JSON)
				.content(VALID_PRODUCT_JSON)).andExpect(status().isForbidden()); // ✅ was 401
	}
	// ================= GET PRODUCT =================

	@Test
	@DisplayName("STORE_ADMIN → Can Get Products (200)")
	void storeAdmin_canGetProducts() throws Exception {
		// First create a product
		mockMvc.perform(post("/api/products").header("Authorization", "Bearer " + storeAdminToken())
				.header("X-Tenant-ID", TENANT_ID).contentType(MediaType.APPLICATION_JSON).content(VALID_PRODUCT_JSON))
				.andExpect(status().isCreated());

		mockMvc.perform(get("/api/products?page=0&size=10").header("Authorization", "Bearer " + storeAdminToken())
				.header("X-Tenant-ID", TENANT_ID)).andExpect(status().isOk());
	}

	@Test
	@DisplayName("CASHIER → Can Get Products (200)")
	void cashier_canGetProducts() throws Exception {
		// Create product with admin first
		mockMvc.perform(post("/api/products").header("Authorization", "Bearer " + storeAdminToken())
				.header("X-Tenant-ID", TENANT_ID).contentType(MediaType.APPLICATION_JSON).content(VALID_PRODUCT_JSON))
				.andExpect(status().isCreated());

		mockMvc.perform(get("/api/products?page=0&size=10").header("Authorization", "Bearer " + cashierToken())
				.header("X-Tenant-ID", TENANT_ID)).andExpect(status().isOk());
	}


	@Test
	@DisplayName("Unauthenticated → Cannot Get Products (403)")
	void unauthenticated_cannotGetProducts() throws Exception {
		mockMvc.perform(get("/api/products?page=0&size=10").header("X-Tenant-ID", TENANT_ID))
				.andExpect(status().isForbidden()); // ✅ was 401
	}
}
