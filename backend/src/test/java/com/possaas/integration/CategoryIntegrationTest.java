package com.possaas.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.JsonNode;
import com.possaas.config.TenantContext;
import com.possaas.domain.product.CategoryStatus;
import com.possaas.dto.request.CreateCategoryRequest;
import com.possaas.repository.CategoryRepository;
import com.possaas.security.service.UserDetailsImpl;

@DisplayName("Category Integration Tests")
public class CategoryIntegrationTest extends BaseIntegrationTest {

    private static final String TENANT_A = "TENANT_A";
    private static final String TENANT_B = "TENANT_B";

        @Autowired
        private MockMvc mockMvc;

        @Autowired
        private CategoryRepository categoryRepository;
        @Autowired
        private com.fasterxml.jackson.databind.ObjectMapper objectMapper;
        @Autowired
        private com.possaas.repository.TenantRepository tenantRepository;
        @Autowired
        private com.possaas.repository.UserRepository userRepository;
        @Autowired
        private com.possaas.repository.SubscriptionPlanRepository subscriptionPlanRepository;
        @Autowired
        private com.possaas.service.auth.JwtTokenProvider jwtTokenProvider;

        private String adminTokenA;
        private String adminTokenB;
        private com.possaas.domain.tenant.SubscriptionPlan basicPlan;

    @AfterEach
        void clearTenant() {
                TenantContext.clear();
                categoryRepository.deleteAll();
                userRepository.deleteAll();
                tenantRepository.deleteAll();
                subscriptionPlanRepository.deleteAll();
        }

    @Test
    @DisplayName("Create category successfully")
    void createCategorySuccessfully() throws Exception {
        setupAuth();
        TenantContext.setTenantId(TENANT_A);

        CreateCategoryRequest request = new CreateCategoryRequest();
        request.setName("Furniture");
        request.setStatus(CategoryStatus.ACTIVE);

        MvcResult result = mockMvc.perform(post("/api/categories")
                        .header("X-Tenant-ID", TENANT_A)
                        .header("Authorization", adminTokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode responseJson = objectMapper.readTree(result.getResponse().getContentAsString());
        Long categoryId = responseJson.has("id") ? responseJson.get("id").asLong() : null;

        assertNotNull(categoryId);
        assertThat(categoryRepository.findById(categoryId))
                .isPresent()
                .get()
                .extracting("name")
                .isEqualTo("Furniture");
    }

    @Test
    @DisplayName("Prevent duplicate category per tenant")
    void preventDuplicateCategoryPerTenant() throws Exception {
        setupAuth();
        TenantContext.setTenantId(TENANT_A);

        CreateCategoryRequest request = new CreateCategoryRequest();
        request.setName("Electronics");
        request.setStatus(CategoryStatus.ACTIVE);

        // First creation
        mockMvc.perform(post("/api/categories")
                        .header("X-Tenant-ID", TENANT_A)
                        .header("Authorization", adminTokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        // Duplicate creation
        mockMvc.perform(post("/api/categories")
                        .header("X-Tenant-ID", TENANT_A)
                        .header("Authorization", adminTokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("Allow same category name for different tenants")
    void allowSameCategoryNameForDifferentTenants() throws Exception {
        setupAuth();
        CreateCategoryRequest request = new CreateCategoryRequest();
        request.setName("Books");
        request.setStatus(CategoryStatus.ACTIVE);

        // Tenant A
        mockMvc.perform(post("/api/categories")
                        .header("X-Tenant-ID", TENANT_A)
                        .header("Authorization", adminTokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        // Tenant B
        mockMvc.perform(post("/api/categories")
                        .header("X-Tenant-ID", TENANT_B)
                        .header("Authorization", adminTokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("Get category by ID")
    void getCategoryById() throws Exception {
        setupAuth();
        TenantContext.setTenantId(TENANT_A);

        CreateCategoryRequest request = new CreateCategoryRequest();
        request.setName("Stationery");
        request.setStatus(CategoryStatus.ACTIVE);

        MvcResult result = mockMvc.perform(post("/api/categories")
                        .header("X-Tenant-ID", TENANT_A)
                        .header("Authorization", adminTokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode responseJson = objectMapper.readTree(result.getResponse().getContentAsString());
        Long categoryId = responseJson.has("id") ? responseJson.get("id").asLong() : null;

        mockMvc.perform(get("/api/categories/{id}", categoryId)
                        .header("X-Tenant-ID", TENANT_A)
                        .header("Authorization", adminTokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Stationery"));
    }

    @Test
    @DisplayName("Soft delete category")
    void softDeleteCategory() throws Exception {
        setupAuth();
        TenantContext.setTenantId(TENANT_A);

        CreateCategoryRequest request = new CreateCategoryRequest();
        request.setName("Toys");
        request.setStatus(CategoryStatus.ACTIVE);

        MvcResult result = mockMvc.perform(post("/api/categories")
                        .header("X-Tenant-ID", TENANT_A)
                        .header("Authorization", adminTokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode responseJson = objectMapper.readTree(result.getResponse().getContentAsString());
        Long categoryId = responseJson.has("id") ? responseJson.get("id").asLong() : null;

        mockMvc.perform(delete("/api/categories/{id}", categoryId)
                        .header("X-Tenant-ID", TENANT_A)
                        .header("Authorization", adminTokenA))
                .andExpect(status().isNoContent());

        assertThat(categoryRepository.findById(categoryId))
                .isPresent()
                .get()
                .extracting("isDeleted")
                .isEqualTo(true);
    }

    @Test
    @DisplayName("Prevent cross-tenant access")
    void shouldNotAccessOtherTenantCategory() throws Exception {
        setupAuth();
        // Create category in TENANT_A
        TenantContext.setTenantId(TENANT_A);
        CreateCategoryRequest request = new CreateCategoryRequest();
        request.setName("Furniture");
        request.setStatus(CategoryStatus.ACTIVE);

        MvcResult result = mockMvc.perform(post("/api/categories")
                        .header("X-Tenant-ID", TENANT_A)
                        .header("Authorization", adminTokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode responseJson = objectMapper.readTree(result.getResponse().getContentAsString());
        Long categoryId = responseJson.has("id") ? responseJson.get("id").asLong() : null;
        assertNotNull(categoryId);

        // Try to access from TENANT_B
        mockMvc.perform(get("/api/categories/{id}", categoryId)
                        .header("X-Tenant-ID", TENANT_B)
                        .header("Authorization", adminTokenB))
                .andExpect(status().isNotFound());
    }

    // ================== AUTH SETUP ==================
    private void setupAuth() {
        categoryRepository.deleteAll();
        userRepository.deleteAll();
        tenantRepository.deleteAll();
        subscriptionPlanRepository.deleteAll();

        // Create BASIC plan
        basicPlan = new com.possaas.domain.tenant.SubscriptionPlan();
        basicPlan.setId("BASIC");
        basicPlan.setPlanType(com.possaas.domain.tenant.SubscriptionPlanType.BASIC);
        basicPlan.setMaxBranches(1);
        basicPlan.setMaxUsers(10);
        basicPlan.setMaxProducts(1000);
        basicPlan.setMonthlyPrice(java.math.BigDecimal.ZERO);
        subscriptionPlanRepository.save(basicPlan);

        // Create tenants
        com.possaas.domain.tenant.Tenant tenantA = new com.possaas.domain.tenant.Tenant();
        tenantA.setId(TENANT_A);
        tenantA.setName("Tenant A");
        tenantA.setSubscriptionPlan(basicPlan);
        tenantRepository.save(tenantA);

        com.possaas.domain.tenant.Tenant tenantB = new com.possaas.domain.tenant.Tenant();
        tenantB.setId(TENANT_B);
        tenantB.setName("Tenant B");
        tenantB.setSubscriptionPlan(basicPlan);
        tenantRepository.save(tenantB);

        // Create admin users
        com.possaas.domain.user.User adminA = new com.possaas.domain.user.User();
        adminA.setUsername("adminA");
        adminA.setEmail("adminA@test.com");
        adminA.setPassword("encoded_password");
        adminA.setStatus(com.possaas.domain.user.UserStatus.ACTIVE);
        adminA.setRole(com.possaas.domain.user.Role.ROLE_STORE_ADMIN);
        adminA.setTenantId(TENANT_A);
        userRepository.save(adminA);

        com.possaas.domain.user.User adminB = new com.possaas.domain.user.User();
        adminB.setUsername("adminB");
        adminB.setEmail("adminB@test.com");
        adminB.setPassword("encoded_password");
        adminB.setStatus(com.possaas.domain.user.UserStatus.ACTIVE);
        adminB.setRole(com.possaas.domain.user.Role.ROLE_STORE_ADMIN);
        adminB.setTenantId(TENANT_B);
        userRepository.save(adminB);

        // Generate JWT tokens
        UserDetailsImpl principalA = new UserDetailsImpl(
                adminA.getId(),
                adminA.getUsername(),
                adminA.getEmail(),
                adminA.getPassword(),
                TENANT_A,
                java.util.Collections.singletonList(
                        new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_STORE_ADMIN")));

        UserDetailsImpl principalB = new UserDetailsImpl(
                adminB.getId(),
                adminB.getUsername(),
                adminB.getEmail(),
                adminB.getPassword(),
                TENANT_B,
                java.util.Collections.singletonList(
                        new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_STORE_ADMIN")));

        org.springframework.security.authentication.UsernamePasswordAuthenticationToken authA =
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        principalA,
                        null,
                        principalA.getAuthorities());
        org.springframework.security.authentication.UsernamePasswordAuthenticationToken authB =
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        principalB,
                        null,
                        principalB.getAuthorities());

        adminTokenA = "Bearer " + jwtTokenProvider.generateToken(authA, TENANT_A);
        adminTokenB = "Bearer " + jwtTokenProvider.generateToken(authB, TENANT_B);
    }
}
