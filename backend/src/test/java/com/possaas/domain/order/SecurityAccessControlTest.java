package com.possaas.domain.order;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.possaas.config.TenantContext;
import com.possaas.domain.branch.Branch;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionPlanType;
import com.possaas.domain.tenant.Tenant;
import com.possaas.domain.tenant.UsageTracking;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.domain.user.UserStatus;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.repository.BranchRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.repository.UsageTrackingRepository;
import com.possaas.repository.UserRepository;
import com.possaas.security.service.UserDetailsImpl;
import com.possaas.service.auth.JwtTokenProvider;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class SecurityAccessControlTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private BranchRepository branchRepository;
    @Autowired private TenantRepository tenantRepository;
    @Autowired private SubscriptionPlanRepository planRepository;
    @Autowired private UsageTrackingRepository usageTrackingRepository;
    
    @MockBean private JwtTokenProvider jwtTokenProvider;

    private UserDetailsImpl adminPrincipal;
    private UserDetailsImpl cashierPrincipal;
    private final String TENANT_ID = "test-tenant";
    private Long branchId;

    @BeforeEach
    void setUp() {
        // 1. Initial Context Setup
        TenantContext.setTenantId(TENANT_ID);
        when(jwtTokenProvider.validateToken(anyString())).thenReturn(true);
        when(jwtTokenProvider.getTenantId(anyString())).thenReturn(TENANT_ID);

        // 2. Seed Subscription Plan (Required by Tenant)
        SubscriptionPlan plan = new SubscriptionPlan();
        plan.setId("PRO");
        plan.setPlanType(SubscriptionPlanType.PRO);
        plan.setMonthlyPrice(BigDecimal.valueOf(99.99));
        plan.setMaxUsers(100); plan.setMaxBranches(10); plan.setMaxProducts(1000);
        planRepository.saveAndFlush(plan);

        // 3. Seed Tenant (Required by User Foreign Key fk_users_tenant)
        Tenant tenant = new Tenant();
        tenant.setId(TENANT_ID);
        tenant.setName("Test Store " + System.currentTimeMillis()); // Unique name
        tenant.setSubscriptionPlan(plan);
        tenant.setActive(true);
        tenantRepository.saveAndFlush(tenant);

        // 4. Seed Usage Tracking (Required by Product Business Logic)
        UsageTracking usage = new UsageTracking();
        usage.setTenantId(TENANT_ID);
        usage.setCurrentProducts(0L);
        usage.setCurrentUsers(2L);
        usage.setCurrentBranches(1L);
        usage.setLastUpdated(LocalDateTime.now());
        usageTrackingRepository.saveAndFlush(usage);
        branchId = createBranch(TENANT_ID).getId();

        // 5. Seed Users
        User admin = createUser(TENANT_ID, Role.ROLE_STORE_ADMIN, "admin_test", "admin@test.com", branchId);
        User cashier = createUser(TENANT_ID, Role.ROLE_CASHIER, "cashier_test", "cashier@test.com", branchId);

        // 6. Setup Security Principals for MockMvc
        adminPrincipal = new UserDetailsImpl(admin.getId(), admin.getUsername(), admin.getEmail(), admin.getPassword(), 
            TENANT_ID, Collections.singletonList(new SimpleGrantedAuthority("ROLE_STORE_ADMIN")));

        cashierPrincipal = new UserDetailsImpl(cashier.getId(), cashier.getUsername(), cashier.getEmail(), cashier.getPassword(), 
            TENANT_ID, Collections.singletonList(new SimpleGrantedAuthority("ROLE_CASHIER")));
    }

    @Test
    void auth007_qa03_userCreation_ShouldRestrictToAdmin() throws Exception {
        String userJson = """
            {
                "username": "new_staff",
                "email": "staff@test.com",
                "password": "Password123!",
                "firstName": "John",
                "lastName": "Doe",
                "role": "ROLE_CASHIER",
                "branchId": %d
            }
            """.formatted(branchId);
        
        when(jwtTokenProvider.getUsername(anyString())).thenReturn("admin_test");
        mockMvc.perform(post("/api/users").with(user(adminPrincipal))
                .header("X-Tenant-ID", TENANT_ID).header("Authorization", "Bearer dummy")
                .contentType(MediaType.APPLICATION_JSON).content(userJson))
                .andExpect(status().is2xxSuccessful());

        when(jwtTokenProvider.getUsername(anyString())).thenReturn("cashier_test");
        mockMvc.perform(post("/api/users").with(user(cashierPrincipal))
                .header("X-Tenant-ID", TENANT_ID).header("Authorization", "Bearer dummy")
                .contentType(MediaType.APPLICATION_JSON).content(userJson))
                .andExpect(status().isForbidden());
    }

    @Test
    void auth007_qa04_productCreation_ShouldRestrictToAdmin() throws Exception {
        String productJson = "{\"name\":\"Scanner\",\"price\":150,\"sku\":\"SCN-001\"}";
        
        when(jwtTokenProvider.getUsername(anyString())).thenReturn("admin_test");
        mockMvc.perform(post("/api/products").with(user(adminPrincipal))
                .header("X-Tenant-ID", TENANT_ID).header("Authorization", "Bearer dummy")
                .contentType(MediaType.APPLICATION_JSON).content(productJson))
                .andExpect(status().isCreated());

        when(jwtTokenProvider.getUsername(anyString())).thenReturn("cashier_test");
        mockMvc.perform(post("/api/products").with(user(cashierPrincipal))
                .header("X-Tenant-ID", TENANT_ID).header("Authorization", "Bearer dummy")
                .contentType(MediaType.APPLICATION_JSON).content(productJson))
                .andExpect(status().isForbidden());
    }

    @Test
    void auth007_qa05_SharedOperationalAccess() throws Exception {
        // Operational endpoints like search (using param 'q') should be allowed for Cashiers
        when(jwtTokenProvider.getUsername(anyString())).thenReturn("cashier_test");
        mockMvc.perform(get("/api/products/search").param("q", "test")
                .with(user(cashierPrincipal))
                .header("X-Tenant-ID", TENANT_ID)
                .header("Authorization", "Bearer dummy"))
                .andExpect(status().isOk());
    }

    private User createUser(String tenantId, Role role, String username, String email, Long userBranchId) {
        User u = new User();
        u.setUsername(username); u.setEmail(email); u.setPassword("Password123!");
        u.setRole(role); u.setStatus(UserStatus.ACTIVE); u.setTenantId(tenantId);
        Branch branch = branchRepository.findByIdAndTenantId(userBranchId, tenantId).orElseThrow();
        u.setBranch(branch);
        return userRepository.saveAndFlush(u);
    }

    private Branch createBranch(String tenantId) {
        Branch branch = new Branch();
        branch.setTenantId(tenantId);
        branch.setCode("MAIN-" + tenantId);
        branch.setName("Main " + tenantId);
        return branchRepository.saveAndFlush(branch);
    }
}
