package com.possaas.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

import java.math.BigDecimal;
import java.util.UUID;

import jakarta.servlet.FilterChain;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.possaas.config.TenantContext;
import com.possaas.config.TenantFilterConfig;
import com.possaas.domain.branch.Branch;
import com.possaas.domain.branch.BranchStatus;
import com.possaas.domain.product.Product;
import com.possaas.domain.product.ProductStatus;
import com.possaas.domain.tenant.Tenant;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionPlanType;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.domain.user.UserStatus;
import com.possaas.repository.BranchRepository;
import com.possaas.repository.ProductRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.repository.UserRepository;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.security.JwtAuthenticationFilter;
import com.possaas.security.TenantFilterInterceptor;
import com.possaas.security.service.UserDetailsImpl;
import com.possaas.service.tenant.SubscriptionService;

class ProductIntegrationTest extends BaseIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private ObjectMapper objectMapper;

  @Autowired
  private ProductRepository productRepository;

  @Autowired
  private TenantRepository tenantRepository;

  @Autowired
  private UserRepository userRepository;

  @Autowired
  private BranchRepository branchRepository;

  @Autowired
  private SubscriptionPlanRepository subscriptionPlanRepository;

  @MockBean
  private SubscriptionService subscriptionService;

  @MockBean
  private TenantFilterConfig tenantFilterConfig;

  @MockBean
  private JwtAuthenticationFilter jwtAuthenticationFilter;

  @MockBean
  private TenantFilterInterceptor tenantFilterInterceptor;

  private String tenant1Id;
  private String tenant2Id;
  private UserDetailsImpl storeAdminPrincipalTenant1;
  private UserDetailsImpl storeAdminPrincipalTenant2;
  private UserDetailsImpl cashierPrincipalTenant1;

  @BeforeEach
  void setUp() throws Exception {

    productRepository.deleteAll();
    userRepository.deleteAll();
    branchRepository.deleteAll();
    tenantRepository.deleteAll();

    SubscriptionPlan basicPlan = getOrCreateBasicPlan();

    Tenant tenant1 = new Tenant();
    tenant1.setName("Tenant-1-" + UUID.randomUUID());
    tenant1.setActive(true);
    tenant1.setSubscriptionPlan(basicPlan);
    tenant1Id = tenantRepository.saveAndFlush(tenant1).getId();

    Tenant tenant2 = new Tenant();
    tenant2.setName("Tenant-2-" + UUID.randomUUID());
    tenant2.setActive(true);
    tenant2.setSubscriptionPlan(basicPlan);
    tenant2Id = tenantRepository.saveAndFlush(tenant2).getId();

    TenantContext.setTenantId(tenant1Id);

    Branch branch1 = new Branch();
    branch1.setCode("BR-001");
    branch1.setName("Main Branch");
    branch1.setStatus(BranchStatus.ACTIVE);
    branch1 = branchRepository.save(branch1);

    User storeAdmin = new User();
    storeAdmin.setUsername("store-admin-" + UUID.randomUUID());
    storeAdmin.setEmail("store-admin-" + UUID.randomUUID() + "@test.com");
    storeAdmin.setPassword("pass");
    storeAdmin.setRole(Role.ROLE_STORE_ADMIN);
    storeAdmin.setStatus(UserStatus.ACTIVE);
    storeAdmin = userRepository.save(storeAdmin);

    User cashier = new User();
    cashier.setUsername("cashier-" + UUID.randomUUID());
    cashier.setEmail("cashier-" + UUID.randomUUID() + "@test.com");
    cashier.setPassword("pass");
    cashier.setRole(Role.ROLE_CASHIER);
    cashier.setStatus(UserStatus.ACTIVE);
    cashier.setBranch(branch1);
    cashier = userRepository.save(cashier);

    storeAdminPrincipalTenant1 = new UserDetailsImpl(
        storeAdmin.getId(),
        storeAdmin.getUsername(),
        storeAdmin.getEmail(),
        storeAdmin.getPassword(),
        tenant1Id,
        java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_STORE_ADMIN")));

    cashierPrincipalTenant1 = new UserDetailsImpl(
        cashier.getId(),
        cashier.getUsername(),
        cashier.getEmail(),
        cashier.getPassword(),
        tenant1Id,
        java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_CASHIER")));

    TenantContext.setTenantId(tenant2Id);
    User storeAdminTenant2 = new User();
    storeAdminTenant2.setUsername("store-admin-tenant2-" + UUID.randomUUID());
    storeAdminTenant2.setEmail("store-admin-tenant2-" + UUID.randomUUID() + "@test.com");
    storeAdminTenant2.setPassword("pass");
    storeAdminTenant2.setRole(Role.ROLE_STORE_ADMIN);
    storeAdminTenant2.setStatus(UserStatus.ACTIVE);
    storeAdminTenant2 = userRepository.save(storeAdminTenant2);

    storeAdminPrincipalTenant2 = new UserDetailsImpl(
        storeAdminTenant2.getId(),
        storeAdminTenant2.getUsername(),
        storeAdminTenant2.getEmail(),
        storeAdminTenant2.getPassword(),
        tenant2Id,
        java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_STORE_ADMIN")));

    TenantContext.setTenantId(tenant1Id);

    doAnswer(invocation -> {
      FilterChain filterChain = invocation.getArgument(2);
      filterChain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
      return null;
    }).when(tenantFilterConfig).doFilter(any(), any(), any());

    doAnswer(invocation -> {
      FilterChain filterChain = invocation.getArgument(2);
      filterChain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
      return null;
    }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());

    doAnswer(invocation -> {
      jakarta.servlet.http.HttpServletRequest request = invocation.getArgument(0);
      String tenantIdFromHeader = request.getHeader("X-Tenant-ID");
      if (tenantIdFromHeader != null && !tenantIdFromHeader.isBlank()) {
        TenantContext.setTenantId(tenantIdFromHeader);
      }
      return true;
    }).when(tenantFilterInterceptor).preHandle(any(), any(), any());
  }

  private SubscriptionPlan getOrCreateBasicPlan() {
    return subscriptionPlanRepository.findById("BASIC")
        .orElseGet(() -> {
          SubscriptionPlan plan = new SubscriptionPlan();
          plan.setId("BASIC");
          plan.setPlanType(SubscriptionPlanType.BASIC);
          plan.setMaxBranches(1);
          plan.setMaxUsers(10);
          plan.setMaxProducts(100);
          plan.setMonthlyPrice(BigDecimal.ZERO);
          return subscriptionPlanRepository.save(plan);
        });
  }

  // ================= CREATE PRODUCT TESTS =================

  @Test
  @WithMockUser(authorities = "ROLE_STORE_ADMIN")
  void shouldCreateProduct_success() throws Exception {

    String json = """
        {
          "name":"Laptop",
          "sku":"ABC123",
          "price":50000.50,
          "status":"ACTIVE"
        }
        """;

    mockMvc.perform(post("/api/products")
        .with(user(storeAdminPrincipalTenant1))
        .header("X-Tenant-ID", tenant1Id)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json))
        .andExpect(status().isCreated());

    assertThat(productRepository.findAll()).hasSize(1);
  }

  @Test
  @WithMockUser(authorities = "ROLE_CASHIER")
  void cashierCannotCreateProduct_shouldReturn403() throws Exception {

    String json = """
        {
          "name":"Unauthorized Laptop",
          "sku":"NOAUTH123",
          "price":1000,
          "status":"ACTIVE"
        }
        """;

    mockMvc.perform(post("/api/products")
        .with(user(cashierPrincipalTenant1))
        .header("X-Tenant-ID", tenant1Id)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json))
        .andExpect(status().isForbidden());
  }

  @Test
  @WithMockUser(authorities = "ROLE_STORE_ADMIN")
  void duplicateSku_sameTenant_shouldReturn409() throws Exception {

    Product product = new Product();
    product.setName("Phone");
    product.setSku("DUP123");
    product.setPrice(BigDecimal.TEN);
    product.setStatus(ProductStatus.ACTIVE);
    product.setTenantId(tenant1Id);
    productRepository.save(product);

    String json = """
        {
          "name":"Another Phone",
          "sku":"DUP123",
          "price":2000
        }
        """;

    mockMvc.perform(post("/api/products")
        .with(user(storeAdminPrincipalTenant1))
        .header("X-Tenant-ID", tenant1Id)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json))
        .andExpect(status().isConflict());
  }

  @Test
  @WithMockUser(authorities = "ROLE_STORE_ADMIN")
  void sameSku_differentTenant_shouldCreate() throws Exception {

    Product product = new Product();
    product.setName("Phone");
    product.setSku("XYZ123");
    product.setPrice(BigDecimal.TEN);
    product.setStatus(ProductStatus.ACTIVE);
    product.setTenantId(tenant1Id);
    productRepository.save(product);

    TenantContext.setTenantId(tenant2Id);

    String json = """
        {
          "name":"Tenant2 Phone",
          "sku":"XYZ123",
          "price":1500
        }
        """;

    mockMvc.perform(post("/api/products")
        .with(user(storeAdminPrincipalTenant2))
        .header("X-Tenant-ID", tenant2Id)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json))
        .andExpect(status().isCreated());
  }

  // ================= VALIDATION TESTS =================

  @Test
  @WithMockUser(authorities = "ROLE_STORE_ADMIN")
  void negativePrice_shouldReturn400() throws Exception {

    String json = """
        {
          "name":"Invalid Product",
          "sku":"NEG-001",
          "price":-100,
          "status":"ACTIVE"
        }
        """;

    mockMvc.perform(post("/api/products")
        .with(user(storeAdminPrincipalTenant1))
        .header("X-Tenant-ID", tenant1Id)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json))
        .andExpect(status().isBadRequest());
  }

  @Test
  @WithMockUser(authorities = "ROLE_STORE_ADMIN")
  void zeroPrice_shouldReturn400() throws Exception {

    String json = """
        {
          "name":"Zero Price Product",
          "sku":"ZERO-001",
          "price":0,
          "status":"ACTIVE"
        }
        """;

    mockMvc.perform(post("/api/products")
        .with(user(storeAdminPrincipalTenant1))
        .header("X-Tenant-ID", tenant1Id)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json))
        .andExpect(status().isBadRequest());
  }

  @Test
  @WithMockUser(authorities = "ROLE_STORE_ADMIN")
  void invalidSkuFormat_shouldReturn400() throws Exception {

    String json = """
        {
          "name":"Invalid SKU",
          "sku":"@@@###",
          "price":1000,
          "status":"ACTIVE"
        }
        """;

    mockMvc.perform(post("/api/products")
        .with(user(storeAdminPrincipalTenant1))
        .header("X-Tenant-ID", tenant1Id)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json))
        .andExpect(status().isBadRequest());
  }

  // ================= GET PRODUCTS TESTS =================

  @Test
  @WithMockUser(authorities = "ROLE_STORE_ADMIN")
  void shouldReturnAllProductsWithoutFilter() throws Exception {

    for (int i = 1; i <= 3; i++) {
      Product product = new Product();
      product.setName("AllProduct-" + i);
      product.setSku("ALL-" + i);
      product.setPrice(BigDecimal.TEN);
      product.setStatus(ProductStatus.ACTIVE);
      product.setTenantId(tenant1Id);
      productRepository.save(product);
    }

    mockMvc.perform(get("/api/products")
        .with(user(storeAdminPrincipalTenant1))
        .header("X-Tenant-ID", tenant1Id))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content", hasSize(3)));
  }

  @Test
  @WithMockUser(authorities = "ROLE_STORE_ADMIN")
  void verifyNoCrossTenantLeakage() throws Exception {

    Product t1Product = new Product();
    t1Product.setName("Tenant1 Product");
    t1Product.setSku("T1SKU");
    t1Product.setPrice(BigDecimal.valueOf(100));
    t1Product.setStatus(ProductStatus.ACTIVE);
    t1Product.setTenantId(tenant1Id);

    Product t2Product = new Product();
    t2Product.setName("Tenant2 Product");
    t2Product.setSku("T2SKU");
    t2Product.setPrice(BigDecimal.valueOf(200));
    t2Product.setStatus(ProductStatus.ACTIVE);
    t2Product.setTenantId(tenant2Id);

    productRepository.save(t1Product);
    productRepository.save(t2Product);

    mockMvc.perform(get("/api/products")
        .with(user(storeAdminPrincipalTenant1))
        .header("X-Tenant-ID", tenant1Id))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content", hasSize(1)));
  }

  @Test
  @WithMockUser(authorities = "ROLE_STORE_ADMIN")
  void shouldReturnOnlyActiveProducts() throws Exception {

    Product active = new Product();
    active.setName("Active Item");
    active.setSku("ACT1");
    active.setPrice(BigDecimal.TEN);
    active.setStatus(ProductStatus.ACTIVE);
    active.setTenantId(tenant1Id);

    Product inactive = new Product();
    inactive.setName("Inactive Item");
    inactive.setSku("INA1");
    inactive.setPrice(BigDecimal.ONE);
    inactive.setStatus(ProductStatus.INACTIVE);
    inactive.setTenantId(tenant1Id);

    productRepository.save(active);
    productRepository.save(inactive);

    mockMvc.perform(get("/api/products")
        .with(user(storeAdminPrincipalTenant1))
        .param("status", "ACTIVE")
        .header("X-Tenant-ID", tenant1Id))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content", hasSize(1)));
  }

  @Test
  @WithMockUser(authorities = "ROLE_STORE_ADMIN")
  void shouldReturnOnlyInactiveProducts() throws Exception {

    Product active = new Product();
    active.setName("Active Item");
    active.setSku("ACT2");
    active.setPrice(BigDecimal.TEN);
    active.setStatus(ProductStatus.ACTIVE);
    active.setTenantId(tenant1Id);

    Product inactive = new Product();
    inactive.setName("Inactive Item");
    inactive.setSku("INA2");
    inactive.setPrice(BigDecimal.ONE);
    inactive.setStatus(ProductStatus.INACTIVE);
    inactive.setTenantId(tenant1Id);

    productRepository.save(active);
    productRepository.save(inactive);

    mockMvc.perform(get("/api/products")
        .with(user(storeAdminPrincipalTenant1))
        .param("status", "INACTIVE")
        .header("X-Tenant-ID", tenant1Id))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content", hasSize(1)));
  }

  @Test
  @WithMockUser(authorities = "ROLE_STORE_ADMIN")
  void testPagination_page0_size10() throws Exception {

    for (int i = 1; i <= 15; i++) {
      Product product = new Product();
      product.setName("Product-" + i);
      product.setSku("SKU-" + i);
      product.setPrice(BigDecimal.valueOf(100 + i));
      product.setStatus(ProductStatus.ACTIVE);
      product.setTenantId(tenant1Id);
      productRepository.save(product);
    }

    mockMvc.perform(get("/api/products")
        .with(user(storeAdminPrincipalTenant1))
        .param("page", "0")
        .param("size", "10")
        .header("X-Tenant-ID", tenant1Id))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content.length()").value(10));
  }

  // ================= ROLE ACCESS =================

  @Test
  @WithMockUser(authorities = "ROLE_STORE_ADMIN")
  void storeAdminCanAccessProducts() throws Exception {
    mockMvc.perform(get("/api/products")
        .with(user(storeAdminPrincipalTenant1))
        .header("X-Tenant-ID", tenant1Id))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "ROLE_CASHIER")
  void cashierCanAccessProducts() throws Exception {
    mockMvc.perform(get("/api/products")
        .with(user(cashierPrincipalTenant1))
        .header("X-Tenant-ID", tenant1Id))
        .andExpect(status().isOk());
  }
}
