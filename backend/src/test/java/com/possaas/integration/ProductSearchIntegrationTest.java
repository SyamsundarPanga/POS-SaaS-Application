package com.possaas.integration;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import com.possaas.config.TenantContext;
import com.possaas.domain.product.Product;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionPlanType;
import com.possaas.domain.tenant.Tenant;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.domain.user.UserStatus;
import com.possaas.repository.ProductRepository;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.repository.UserRepository;
import com.possaas.security.service.UserDetailsImpl;
import com.possaas.service.auth.JwtTokenProvider;

/**
 * PRODUCT-004: Product Search Integration Suite
 * FIXED: Adds required SubscriptionPlan to avoid NOT NULL constraint error.
 */
class ProductSearchIntegrationTest extends BaseIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ProductRepository productRepository;
    @Autowired private TenantRepository tenantRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtTokenProvider jwtTokenProvider;
    @Autowired private SubscriptionPlanRepository subscriptionPlanRepository;

    private final String TEST_TENANT = "search-test-tenant";
    private String authToken;

    private SubscriptionPlan basicPlan;

    @BeforeEach
    void setUp() {

        TenantContext.setTenantId(TEST_TENANT);
        try {
            productRepository.deleteAll();
            userRepository.deleteAll();
            tenantRepository.deleteAll();

            // ✅ Ensure BASIC plan exists
            basicPlan = subscriptionPlanRepository
                    .findById("BASIC")
                    .orElseGet(() -> {
                        SubscriptionPlan plan = new SubscriptionPlan();
                        plan.setId("BASIC");
                        plan.setPlanType(SubscriptionPlanType.BASIC);
                        plan.setMaxBranches(1);
                        plan.setMaxUsers(10);
                        plan.setMaxProducts(1000);
                        plan.setMonthlyPrice(BigDecimal.ZERO);
                        return subscriptionPlanRepository.save(plan);
                    });

            // ✅ Create Tenant WITH plan
            Tenant tenant = new Tenant();
            tenant.setId(TEST_TENANT);
            tenant.setName("Search Test Business");
            tenant.setSubscriptionPlan(basicPlan); // 🔥 REQUIRED
            tenantRepository.save(tenant);

            // ✅ Create User
            User dbUser = new User();
            dbUser.setUsername("admin");
            dbUser.setEmail("admin@test.com");
            dbUser.setPassword("encoded_password");
            dbUser.setStatus(UserStatus.ACTIVE);
            dbUser.setRole(Role.ROLE_STORE_ADMIN);
            dbUser.setTenantId(TEST_TENANT);
            userRepository.save(dbUser);

            // ✅ Seed Products
            saveProduct("Gaming Laptop", "LAP-999");
            saveProduct("Office Mouse", "MSE-123");

        } finally {
            TenantContext.clear();
        }

        // ✅ Generate JWT
        UserDetailsImpl principal = new UserDetailsImpl(
                1L,
                "admin",
                "admin@test.com",
                "",
                TEST_TENANT,
                Collections.singletonList(
                        new SimpleGrantedAuthority("ROLE_STORE_ADMIN")));

        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(
                        principal,
                        null,
                        principal.getAuthorities());

        authToken = "Bearer " + jwtTokenProvider.generateToken(auth, TEST_TENANT);
    }

    @Test
    @DisplayName("QA-01: Find products with partial name match")
    void shouldFindProductByPartialName() throws Exception {
        mockMvc.perform(get("/api/products/search")
                .param("q", "lap")
                .header("X-Tenant-ID", TEST_TENANT)
                .header("Authorization", authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].name").value("Gaming Laptop"));
    }

    @Test
    @DisplayName("QA-02 & QA-04: SKU search is case-insensitive")
    void shouldFindProductBySkuCaseInsensitive() throws Exception {
        mockMvc.perform(get("/api/products/search")
                .param("q", "lap-999")
                .header("X-Tenant-ID", TEST_TENANT)
                .header("Authorization", authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].sku").value("LAP-999"));
    }

    @Test
    @DisplayName("QA-03: Return empty array when no matches found")
    void shouldReturnEmptyPageWhenNoMatchesFound() throws Exception {
        mockMvc.perform(get("/api/products/search")
                .param("q", "keyboard")
                .header("X-Tenant-ID", TEST_TENANT)
                .header("Authorization", authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)));
    }

    @Test
    @DisplayName("QA-06: Verify tenant isolation in search")
    void shouldNotReturnProductsFromDifferentTenant() throws Exception {

        String OTHER_TENANT = "isolated-tenant";

        TenantContext.setTenantId(OTHER_TENANT);
        try {

            Tenant otherTenant = new Tenant();
            otherTenant.setId(OTHER_TENANT);
            otherTenant.setName("Isolated Business");
            otherTenant.setSubscriptionPlan(basicPlan); // 🔥 REQUIRED
            tenantRepository.save(otherTenant);

            Product otherProduct = new Product();
            otherProduct.setName("Hidden Laptop");
            otherProduct.setSku("HID-001");
            otherProduct.setPrice(BigDecimal.TEN);
            otherProduct.setTenantId(OTHER_TENANT);
            productRepository.save(otherProduct);

        } finally {
            TenantContext.clear();
        }

        mockMvc.perform(get("/api/products/search")
                .param("q", "Hidden")
                .header("X-Tenant-ID", TEST_TENANT)
                .header("Authorization", authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)));
    }

    @Test
    @DisplayName("QA-05: Performance test - search with 1000+ products should return <500ms")
    void shouldSearchWithin500msWithLargeDataset() throws Exception {

        TenantContext.setTenantId(TEST_TENANT);
        try {
            for (int i = 1; i <= 1000; i++) {
                saveProduct("Test Product " + i, "SKU-" + i);
            }
            saveProduct("Performance Laptop", "PERF-999");
        } finally {
            TenantContext.clear();
        }

        long start = System.currentTimeMillis();

        mockMvc.perform(get("/api/products/search")
                .param("q", "perf")
                .header("X-Tenant-ID", TEST_TENANT)
                .header("Authorization", authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].name").value("Performance Laptop"));

        long duration = System.currentTimeMillis() - start;

        assertTrue(duration < 500,
                "Search took too long: " + duration + "ms (expected < 500ms)");

        System.out.println("Search execution time: " + duration + "ms");
    }

    private void saveProduct(String name, String sku) {
        Product p = new Product();
        p.setName(name);
        p.setSku(sku);
        p.setPrice(BigDecimal.TEN);
        p.setTenantId(TEST_TENANT);
        productRepository.save(p);
    }
}
