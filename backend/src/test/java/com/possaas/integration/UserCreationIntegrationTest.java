package com.possaas.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.possaas.config.TenantContext;
import com.possaas.config.TenantFilterConfig;
import com.possaas.domain.branch.Branch;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionPlanType;
import com.possaas.domain.tenant.Tenant;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.domain.user.UserStatus;
import com.possaas.dto.request.CreateUserRequest;
import com.possaas.repository.BranchRepository;
import com.possaas.repository.ProductRepository;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.repository.UserRepository;
import com.possaas.security.JwtAuthenticationFilter;
import com.possaas.security.TenantFilterInterceptor;
import com.possaas.service.impl.UserDetailsServiceImpl;
import com.possaas.service.tenant.SubscriptionService;

class UserCreationIntegrationTest extends BaseIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private TenantRepository tenantRepository;
    @Autowired private BranchRepository branchRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private SubscriptionPlanRepository subscriptionPlanRepository;

    @MockBean private SubscriptionService subscriptionService;
    @Autowired private PasswordEncoder passwordEncoder;
    @MockBean private UserDetailsServiceImpl userDetailsService;
    @MockBean private TenantFilterConfig tenantFilterConfig;
    @MockBean private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockBean private TenantFilterInterceptor tenantFilterInterceptor;

    private String tenant1Id;
    private String tenant2Id;
    private Long tenant1BranchId;
    private SubscriptionPlan basicPlan;

    @BeforeEach
    void setUp() throws Exception {

        productRepository.deleteAll();
        userRepository.deleteAll();
        tenantRepository.deleteAll();

        // ✅ Create BASIC plan (MANDATORY because plan_id is NOT NULL)
        basicPlan = subscriptionPlanRepository.findById("BASIC")
                .orElseGet(() -> {
                    SubscriptionPlan plan = new SubscriptionPlan();
                    plan.setId("BASIC");
                    plan.setPlanType(SubscriptionPlanType.BASIC);
                    plan.setMaxBranches(1);
                    plan.setMaxUsers(5);
                    plan.setMaxProducts(100);
                    plan.setMonthlyPrice(BigDecimal.valueOf(999));
                    return subscriptionPlanRepository.save(plan);
                });

        // ✅ Tenant 1
        Tenant tenant1 = new Tenant();
        tenant1.setName("Tenant-One-" + UUID.randomUUID());
        tenant1.setActive(true);
        tenant1.setSubscriptionPlan(basicPlan); // ⭐ FIX
        tenant1 = tenantRepository.saveAndFlush(tenant1);
        tenant1Id = tenant1.getId();

        // ✅ Tenant 2
        Tenant tenant2 = new Tenant();
        tenant2.setName("Tenant-Two-" + UUID.randomUUID());
        tenant2.setActive(true);
        tenant2.setSubscriptionPlan(basicPlan); // ⭐ FIX
        tenant2 = tenantRepository.saveAndFlush(tenant2);
        tenant2Id = tenant2.getId();
        tenant1BranchId = createBranch(tenant1Id, "T1-MAIN").getId();
        createBranch(tenant2Id, "T2-MAIN");

        TenantContext.setTenantId(tenant1Id);

        // ==== Security Mock Setup ====
        doAnswer(inv -> {
            ((jakarta.servlet.FilterChain) inv.getArgument(2))
                    .doFilter(inv.getArgument(0), inv.getArgument(1));
            return null;
        }).when(tenantFilterConfig).doFilter(any(), any(), any());

        doAnswer(inv -> {
            ((jakarta.servlet.FilterChain) inv.getArgument(2))
                    .doFilter(inv.getArgument(0), inv.getArgument(1));
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

        UserDetails mockUser =
                org.springframework.security.core.userdetails.User
                        .withUsername("admin")
                        .password("p")
                        .authorities("ROLE_STORE_ADMIN")
                        .build();

        when(userDetailsService.loadUserByUsername(anyString()))
                .thenReturn(mockUser);

        when(subscriptionService.getMaxUsersForCurrentTenant())
                .thenReturn(5);
    }

    // ================= TESTS =================

    @Test
    @WithMockUser(authorities = "ROLE_STORE_ADMIN")
    void shouldCreateUserSuccessfully() throws Exception {

        CreateUserRequest request = validRequest("user1", "user1@test.com");

        mockMvc.perform(post("/api/users")
                        .header("X-Tenant-ID", tenant1Id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.firstName").value("Test"))
                .andExpect(jsonPath("$.lastName").value("User"));

        Optional<User> saved =
                userRepository.findByEmailAndTenantId("user1@test.com", tenant1Id);

        assertThat(saved).isPresent();
    }

    @Test
    @WithMockUser(authorities = "ROLE_STORE_ADMIN")
    void shouldReturn409ForDuplicateEmailSameTenant() throws Exception {

        CreateUserRequest request = validRequest("dup", "dup@test.com");

        mockMvc.perform(post("/api/users")
                        .header("X-Tenant-ID", tenant1Id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/users")
                        .header("X-Tenant-ID", tenant1Id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    // ================= HELPERS =================

    private CreateUserRequest validRequest(String username, String email) {
        CreateUserRequest request = new CreateUserRequest();
        request.setUsername(username);
        request.setEmail(email);
        request.setPassword("Strong@123");
        request.setRole(Role.ROLE_CASHIER);
        request.setBranchId(tenant1BranchId);
        request.setFirstName("Test");
        request.setLastName("User");
        return request;
    }

    private Branch createBranch(String tenantId, String code) {
        Branch branch = new Branch();
        branch.setTenantId(tenantId);
        branch.setCode(code);
        branch.setName(code + "-NAME");
        return branchRepository.saveAndFlush(branch);
    }
}
