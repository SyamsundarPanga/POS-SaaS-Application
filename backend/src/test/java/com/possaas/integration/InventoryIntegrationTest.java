package com.possaas.integration;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.possaas.config.TenantContext;
import com.possaas.domain.branch.Branch;
import com.possaas.domain.branch.BranchStatus;
import com.possaas.domain.inventory.Inventory;
import com.possaas.domain.product.Product;
import com.possaas.domain.product.ProductStatus;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionPlanType;
import com.possaas.domain.tenant.Tenant;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.domain.user.UserStatus;
import com.possaas.repository.BranchRepository;
import com.possaas.repository.InventoryRepository;
import com.possaas.repository.ProductRepository;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.repository.UserRepository;
import com.possaas.security.service.UserDetailsImpl;
import com.possaas.service.auth.JwtTokenProvider;

@AutoConfigureMockMvc
@Transactional
class InventoryIntegrationTest extends BaseIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private TenantRepository tenantRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private InventoryRepository inventoryRepository;
    @Autowired private BranchRepository branchRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private SubscriptionPlanRepository subscriptionPlanRepository;
    @Autowired private JwtTokenProvider jwtTokenProvider;

    private static final String TEST_TENANT = "test-tenant";
    private String storeAdminToken;
    private String cashierToken;
    private String superAdminToken;

    @BeforeEach
    void setup() {

        inventoryRepository.deleteAll();
        productRepository.deleteAll();
        userRepository.deleteAll();
        branchRepository.deleteAll();
        tenantRepository.deleteAll();
        subscriptionPlanRepository.deleteAll();

        // ✅ Create BASIC subscription plan
        SubscriptionPlan basicPlan = new SubscriptionPlan();
        basicPlan.setId("BASIC");
        basicPlan.setPlanType(SubscriptionPlanType.BASIC);
        basicPlan.setMaxBranches(1);
        basicPlan.setMaxUsers(10);
        basicPlan.setMaxProducts(100);
        basicPlan.setMonthlyPrice(BigDecimal.valueOf(999));
        basicPlan = subscriptionPlanRepository.save(basicPlan);

        // ✅ Create tenant WITH plan
        Tenant tenant = new Tenant();
        tenant.setId(TEST_TENANT);
        tenant.setName("Test Tenant");
        tenant.setSubscriptionPlan(basicPlan);
        tenant.setActive(true);
        tenantRepository.save(tenant);

        TenantContext.setTenantId(TEST_TENANT);

        Branch branch = new Branch();
        branch.setCode("BR-001");
        branch.setName("Main Branch");
        branch.setStatus(BranchStatus.ACTIVE);
        branch = branchRepository.save(branch);

        Product product = new Product();
        product.setName("Test Laptop");
        product.setSku("LAP-001");
        product.setPrice(new BigDecimal("999.99"));
        product.setStatus(ProductStatus.ACTIVE);
        product.setImageUrl("image.png");
        product.setTenantId(TEST_TENANT);
        product = productRepository.save(product);

        Inventory inventory = new Inventory();
        inventory.setProduct(product);
        inventory.setBranch(branch);
        inventory.setQuantity(50);
        inventory.setTenantId(TEST_TENANT);
        inventoryRepository.save(inventory);

        User storeAdmin = new User();
        storeAdmin.setUsername("inventory-admin");
        storeAdmin.setEmail("inventory-admin@test.com");
        storeAdmin.setPassword("password");
        storeAdmin.setRole(Role.ROLE_STORE_ADMIN);
        storeAdmin.setStatus(UserStatus.ACTIVE);
        storeAdmin = userRepository.save(storeAdmin);

        User cashier = new User();
        cashier.setUsername("inventory-cashier");
        cashier.setEmail("inventory-cashier@test.com");
        cashier.setPassword("password");
        cashier.setRole(Role.ROLE_CASHIER);
        cashier.setStatus(UserStatus.ACTIVE);
        cashier.setBranch(branch);
        cashier = userRepository.save(cashier);

        User superAdmin = new User();
        superAdmin.setUsername("inventory-super-admin");
        superAdmin.setEmail("inventory-super-admin@test.com");
        superAdmin.setPassword("password");
        superAdmin.setRole(Role.ROLE_SUPER_ADMIN);
        superAdmin.setStatus(UserStatus.ACTIVE);
        superAdmin = userRepository.save(superAdmin);

        UserDetailsImpl storeAdminPrincipal = new UserDetailsImpl(
                storeAdmin.getId(),
                "inventory-admin",
                "inventory-admin@test.com",
                "password",
                TEST_TENANT,
                java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_STORE_ADMIN")));
        org.springframework.security.authentication.UsernamePasswordAuthenticationToken storeAdminAuth =
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        storeAdminPrincipal, null, storeAdminPrincipal.getAuthorities());
        storeAdminToken = "Bearer " + jwtTokenProvider.generateToken(storeAdminAuth, TEST_TENANT);

        UserDetailsImpl cashierPrincipal = new UserDetailsImpl(
                cashier.getId(),
                "inventory-cashier",
                "inventory-cashier@test.com",
                "password",
                TEST_TENANT,
                java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_CASHIER")));
        org.springframework.security.authentication.UsernamePasswordAuthenticationToken cashierAuth =
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        cashierPrincipal, null, cashierPrincipal.getAuthorities());
        cashierToken = "Bearer " + jwtTokenProvider.generateToken(cashierAuth, TEST_TENANT);

        UserDetailsImpl superAdminPrincipal = new UserDetailsImpl(
                superAdmin.getId(),
                "inventory-super-admin",
                "inventory-super-admin@test.com",
                "password",
                TEST_TENANT,
                java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_SUPER_ADMIN")));
        org.springframework.security.authentication.UsernamePasswordAuthenticationToken superAdminAuth =
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        superAdminPrincipal, null, superAdminPrincipal.getAuthorities());
        superAdminToken = "Bearer " + jwtTokenProvider.generateToken(superAdminAuth, TEST_TENANT);

        TenantContext.clear();
    }

    @Test
    @DisplayName("INVENTORY-001: Get inventory with product details")
    void shouldGetAllInventoryWithProductDetails() throws Exception {

        mockMvc.perform(get("/api/inventory")
                .header("Authorization", storeAdminToken)
                .header("X-Tenant-ID", TEST_TENANT))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(greaterThan(0))))
                .andExpect(jsonPath("$.content[0].productName").value("Test Laptop"))
                .andExpect(jsonPath("$.content[0].quantity").value(50));
    }

    @Test
    @DisplayName("INVENTORY-Pagination")
    void shouldTestInventoryPagination() throws Exception {

        mockMvc.perform(get("/api/inventory")
                .header("Authorization", storeAdminToken)
                .header("X-Tenant-ID", TEST_TENANT)
                .param("page", "0")
                .param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pageable.pageSize").value(5));
    }

    @Test
    void storeAdmin_canAccessInventory() throws Exception {
        mockMvc.perform(get("/api/inventory")
                .header("Authorization", storeAdminToken)
                .header("X-Tenant-ID", TEST_TENANT))
                .andExpect(status().isOk());
    }

    @Test
    void cashier_canAccessInventory() throws Exception {
        mockMvc.perform(get("/api/inventory")
                .header("Authorization", cashierToken)
                .header("X-Tenant-ID", TEST_TENANT))
                .andExpect(status().isOk());
    }

    @Test
    void unauthorizedRole_cannotAccessInventory() throws Exception {
        mockMvc.perform(get("/api/inventory")
                .header("Authorization", superAdminToken)
                .header("X-Tenant-ID", TEST_TENANT))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("INVENTORY-002-QA-05: Verify tenant isolation")
    void tenantIsolation_shouldReturnOnlyTenantData() throws Exception {

        SubscriptionPlan plan = subscriptionPlanRepository.findById("BASIC").orElseThrow();

        // ✅ Tenant A
        Tenant tenantA = new Tenant();
        tenantA.setId("tenantA");
        tenantA.setName("Tenant A");
        tenantA.setSubscriptionPlan(plan);
        tenantA.setActive(true);
        tenantRepository.save(tenantA);

        // ✅ Tenant B
        Tenant tenantB = new Tenant();
        tenantB.setId("tenantB");
        tenantB.setName("Tenant B");
        tenantB.setSubscriptionPlan(plan);
        tenantB.setActive(true);
        tenantRepository.save(tenantB);

        // Tenant A data
        TenantContext.setTenantId("tenantA");

        Product productA = new Product();
        productA.setName("Product A");
        productA.setSku("A001");
        productA.setPrice(BigDecimal.valueOf(100));
        productA.setStatus(ProductStatus.ACTIVE);
        productA.setImageUrl("a.png");
        productA.setTenantId("tenantA");
        productA = productRepository.save(productA);

        Inventory invA = new Inventory();
        invA.setProduct(productA);
        invA.setQuantity(10);
        invA.setTenantId("tenantA");
        inventoryRepository.save(invA);

        User tenantAAdmin = new User();
        tenantAAdmin.setUsername("tenant-a-admin");
        tenantAAdmin.setEmail("tenant-a-admin@test.com");
        tenantAAdmin.setPassword("password");
        tenantAAdmin.setRole(Role.ROLE_STORE_ADMIN);
        tenantAAdmin.setStatus(UserStatus.ACTIVE);
        tenantAAdmin = userRepository.save(tenantAAdmin);

        TenantContext.clear();

        // Tenant B data
        TenantContext.setTenantId("tenantB");

        Product productB = new Product();
        productB.setName("Product B");
        productB.setSku("B001");
        productB.setPrice(BigDecimal.valueOf(200));
        productB.setStatus(ProductStatus.ACTIVE);
        productB.setImageUrl("b.png");
        productB.setTenantId("tenantB");
        productB = productRepository.save(productB);

        Inventory invB = new Inventory();
        invB.setProduct(productB);
        invB.setQuantity(20);
        invB.setTenantId("tenantB");
        inventoryRepository.save(invB);

        User tenantBAdmin = new User();
        tenantBAdmin.setUsername("tenant-b-admin");
        tenantBAdmin.setEmail("tenant-b-admin@test.com");
        tenantBAdmin.setPassword("password");
        tenantBAdmin.setRole(Role.ROLE_STORE_ADMIN);
        tenantBAdmin.setStatus(UserStatus.ACTIVE);
        tenantBAdmin = userRepository.save(tenantBAdmin);

        TenantContext.clear();

        mockMvc.perform(get("/api/inventory")
                .header("Authorization", "Bearer " + jwtTokenProvider.generateToken(
                        new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                                new UserDetailsImpl(tenantAAdmin.getId(), tenantAAdmin.getUsername(), tenantAAdmin.getEmail(), "password", "tenantA",
                                        java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_STORE_ADMIN"))),
                                null,
                                java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_STORE_ADMIN"))),
                        "tenantA"))
                .header("X-Tenant-ID", "tenantA")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].productName").value("Product A"));
    }
}
