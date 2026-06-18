package com.possaas.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import com.jayway.jsonpath.JsonPath;
import com.possaas.config.TenantContext;
import com.possaas.domain.branch.Branch;
import com.possaas.domain.product.Product;
import com.possaas.domain.product.ProductStatus;
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

/**
 * MULTI-006
 * Verifies tenant data isolation at API level
 */
class TenantDataIsolationIT extends BaseIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired TenantRepository tenantRepository;
    @Autowired UserRepository userRepository;
    @Autowired BranchRepository branchRepository;
    @Autowired ProductRepository productRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired SubscriptionPlanRepository subscriptionPlanRepository;

    private static final String ACME = "acme-retail";
    private static final String BETA = "beta-mart";

    private SubscriptionPlan basicPlan;

    @BeforeEach
    void setup() {

        // ✅ Ensure BASIC plan exists
        basicPlan = subscriptionPlanRepository
                .findById("BASIC")
                .orElseGet(() -> {
                    SubscriptionPlan plan = new SubscriptionPlan();
                    plan.setId("BASIC");
                    plan.setPlanType(SubscriptionPlanType.BASIC);
                    plan.setMaxBranches(1);
                    plan.setMaxUsers(10);
                    plan.setMaxProducts(100);
                    plan.setMonthlyPrice(BigDecimal.valueOf(999));
                    return subscriptionPlanRepository.save(plan);
                });

        seedTenant(ACME);
        seedTenant(BETA);

        seedUserAndProduct(ACME, "acme-admin@test.com");
        seedUserAndProduct(BETA, "beta-admin@test.com");
    }

    @AfterEach
    void cleanup() {
        TenantContext.clear();
    }

    // ================= DATA SEED =================

    private void seedTenant(String id) {
        Tenant t = new Tenant();
        t.setId(id);
        t.setName(id);
        t.setSubscriptionPlan(basicPlan);   // ✅ REQUIRED
        t.setActive(true);
        tenantRepository.save(t);
    }

    private void seedUserAndProduct(String tenantId, String email) {

        TenantContext.setTenantId(tenantId);
        Branch branch = createBranch(tenantId);

        User user = new User();
        user.setUsername(email);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode("Pass@123"));
        user.setRole(Role.ROLE_STORE_ADMIN);
        user.setStatus(UserStatus.ACTIVE);
        user.setBranch(branch);
        userRepository.save(user);

        Product product = new Product();
        product.setName("Product-" + tenantId);
        product.setSku("SKU-" + tenantId);
        product.setPrice(BigDecimal.TEN);
        product.setStatus(ProductStatus.ACTIVE);
        productRepository.save(product);

        TenantContext.clear();
    }

    private Branch createBranch(String tenantId) {
        Branch branch = new Branch();
        branch.setTenantId(tenantId);
        branch.setCode("MAIN-" + tenantId);
        branch.setName("Main " + tenantId);
        return branchRepository.save(branch);
    }

    // ================= LOGIN =================

    private String login(String email, String tenantId) throws Exception {

        String json = """
        {
          "email": "%s",
          "password": "Pass@123",
          "tenantId": "%s"
        }
        """.formatted(email, tenantId);

        String res = mockMvc.perform(
                        post("/api/auth/login")
                                .header("X-Tenant-ID", tenantId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json)
                )
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return JsonPath.read(res, "$.accessToken");
    }

    // ================= QA-04 =================

    @Test
    @DisplayName("Tenant A cannot access Tenant B products")
    void tenantCannotAccessOtherTenantProducts() throws Exception {

        String acmeToken = login("acme-admin@test.com", ACME);

        String response = mockMvc.perform(
                        get("/api/products?page=0&size=10")
                                .header("Authorization", "Bearer " + acmeToken)
                                .header("X-Tenant-ID", ACME)
                )
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        Integer count = JsonPath.read(response, "$.content.length()");

        assertThat(count).isEqualTo(1);
    }

    // ================= QA-05 =================

    @Test
    @DisplayName("Tenant A cannot access Tenant B users")
    void tenantCannotAccessOtherTenantUsers() throws Exception {

        String acmeToken = login("acme-admin@test.com", ACME);

        String response = mockMvc.perform(
                        get("/api/users?page=0&size=10")
                                .header("Authorization", "Bearer " + acmeToken)
                                .header("X-Tenant-ID", ACME)
                )
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        Integer count = JsonPath.read(response, "$.content.length()");

        assertThat(count).isEqualTo(1);
    }
}
