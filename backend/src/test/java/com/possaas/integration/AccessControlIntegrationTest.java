package com.possaas.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType; // ✅ Use Spring's MediaType
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.jayway.jsonpath.JsonPath;
import com.possaas.config.TenantContext;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionPlanType;
import com.possaas.domain.tenant.Tenant;
import com.possaas.domain.tenant.UsageTracking;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.domain.user.UserStatus;
import com.possaas.repository.ProductRepository;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.repository.UsageTrackingRepository;
import com.possaas.repository.UserRepository;

import jakarta.transaction.Transactional;

@AutoConfigureMockMvc
@Transactional
@Rollback
class AccessControlIntegrationTest extends BaseIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private UserRepository userRepository;
    @Autowired private TenantRepository tenantRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private SubscriptionPlanRepository subscriptionPlanRepository;
    @Autowired private UsageTrackingRepository usageTrackingRepository;

    private String productJson;
    private final String TENANT_ID = "test-tenant";

    @BeforeEach
    void setup() {
        // Cleanup
        productRepository.deleteAll();
        userRepository.deleteAll();
        usageTrackingRepository.deleteAll();
        tenantRepository.deleteAll();
        subscriptionPlanRepository.deleteAll();

        // 1. Create BASIC subscription plan
        SubscriptionPlan basicPlan = new SubscriptionPlan();
        basicPlan.setId("BASIC");
        basicPlan.setPlanType(SubscriptionPlanType.BASIC);
        basicPlan.setMaxBranches(1);
        basicPlan.setMaxUsers(10);
        basicPlan.setMaxProducts(100);
        basicPlan.setMonthlyPrice(BigDecimal.valueOf(999));
        subscriptionPlanRepository.saveAndFlush(basicPlan);

        // 2. Create Tenant
        Tenant tenant = new Tenant();
        tenant.setId(TENANT_ID);
        tenant.setName("Test Tenant");
        tenant.setSubscriptionPlan(basicPlan);
        tenant.setActive(true);
        tenantRepository.saveAndFlush(tenant);

        // 3. Create single usage tracking record (FIXED DUPLICATE VARIABLE)
        UsageTracking tracking = new UsageTracking();
        tracking.setTenantId(TENANT_ID);
        tracking.setCurrentUsers(0L);
        tracking.setCurrentBranches(0L);
        tracking.setCurrentProducts(0L);
        tracking.setLastUpdated(LocalDateTime.now());
        usageTrackingRepository.saveAndFlush(tracking);

        TenantContext.setTenantId(TENANT_ID);

        productJson = """
            {
              "name": "Pen",
              "sku": "PEN101",
              "price": 10.50,
              "imageUrl": "img.png",
              "description": "Blue pen"
            }
            """;

        // 4. Create ADMIN user
        User admin = new User();
        admin.setUsername("admin@test.com");
        admin.setEmail("admin@test.com");
        admin.setFirstName("Admin");
        admin.setLastName("User");
        admin.setPassword(passwordEncoder.encode("Pass@123"));
        admin.setRole(Role.ROLE_STORE_ADMIN);
        admin.setStatus(UserStatus.ACTIVE);
        admin.setTenantId(TENANT_ID);
        userRepository.saveAndFlush(admin);

        // 5. Create CASHIER user
        User cashier = new User();
        cashier.setUsername("cashier@test.com");
        cashier.setEmail("cashier@test.com");
        cashier.setFirstName("Cashier");
        cashier.setLastName("User");
        cashier.setPassword(passwordEncoder.encode("Pass@123"));
        cashier.setRole(Role.ROLE_CASHIER);
        cashier.setStatus(UserStatus.ACTIVE);
        cashier.setTenantId(TENANT_ID);
        userRepository.saveAndFlush(cashier);
    }

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }

    private String getToken(String email, String password) throws Exception {
        String loginJson = """
            {
              "email": "%s",
              "password": "%s"
            }
            """.formatted(email, password);

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson))
                .andExpect(status().isOk())
                .andReturn();

        return JsonPath.read(result.getResponse().getContentAsString(), "$.accessToken");
    }

    private String adminToken() throws Exception { return getToken("admin@test.com", "Pass@123"); }
    private String cashierToken() throws Exception { return getToken("cashier@test.com", "Pass@123"); }

    @Test
    void adminCanCreateProduct() throws Exception {
        mockMvc.perform(post("/api/products")
                .header("Authorization", "Bearer " + adminToken())
                .header("X-Tenant-ID", TENANT_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(productJson))
                .andExpect(status().isCreated());
    }

    @Test
    void cashierCannotCreateProduct() throws Exception {
        mockMvc.perform(post("/api/products")
                .header("Authorization", "Bearer " + cashierToken())
                .header("X-Tenant-ID", TENANT_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(productJson))
                .andExpect(status().isForbidden());
    }
}