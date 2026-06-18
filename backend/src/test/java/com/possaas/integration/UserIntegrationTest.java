package com.possaas.integration;

import static org.hamcrest.CoreMatchers.everyItem;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionPlanType;
import com.possaas.domain.tenant.Tenant;
import com.possaas.domain.branch.Branch;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.UserStatus;
import com.possaas.repository.BranchRepository;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.repository.UserRepository;
import com.possaas.security.service.UserDetailsImpl;
import com.possaas.service.auth.JwtTokenProvider;

import jakarta.transaction.Transactional;

@Transactional
class UserIntegrationTest extends BaseIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private TenantRepository tenantRepository;
    @Autowired private BranchRepository branchRepository;
    @Autowired private SubscriptionPlanRepository subscriptionPlanRepository;
    @Autowired private JwtTokenProvider jwtTokenProvider;
    @Autowired private PasswordEncoder passwordEncoder;

    private String tenantAId;
    private String tenantBId;

    private String tokenTenantA;
    private String tokenTenantB;
    private String cashierTokenTenantA;

    private SubscriptionPlan basicPlan;
    private Map<String, Long> branchIdsByTenant;

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
                    plan.setMaxUsers(50);
                    plan.setMaxProducts(500);
                    plan.setMonthlyPrice(BigDecimal.ZERO);
                    return subscriptionPlanRepository.save(plan);
                });

        tenantAId = "tenantA_" + UUID.randomUUID();
        tenantBId = "tenantB_" + UUID.randomUUID();

        // ================= TENANTS =================
        Tenant tenantA = new Tenant();
        tenantA.setId(tenantAId);
        tenantA.setName("Store A");
        tenantA.setSubscriptionPlan(basicPlan);   // ✅ FIX
        tenantRepository.save(tenantA);

        Tenant tenantB = new Tenant();
        tenantB.setId(tenantBId);
        tenantB.setName("Store B");
        tenantB.setSubscriptionPlan(basicPlan);   // ✅ FIX
        tenantRepository.save(tenantB);

        Branch branchA = createBranch(tenantAId, "A-MAIN");
        Branch branchB = createBranch(tenantBId, "B-MAIN");
        branchIdsByTenant = Map.of(
                tenantAId, branchA.getId(),
                tenantBId, branchB.getId());

        // ================= TENANT A USERS =================
        var adminA = createUser("adminA", "admin@" + tenantAId + ".com",
                Role.ROLE_STORE_ADMIN, tenantAId);

        var cashierA = createUser("cashierA", "cashier@" + tenantAId + ".com",
                Role.ROLE_CASHIER, tenantAId);

        createUser("userA1", "userA1@" + tenantAId + ".com",
                Role.ROLE_STORE_ADMIN, tenantAId);

        createUser("userA2", "userA2@" + tenantAId + ".com",
                Role.ROLE_STORE_ADMIN, tenantAId);

        // ================= TENANT B USERS =================
        createUser("adminB", "admin@" + tenantBId + ".com",
                Role.ROLE_STORE_ADMIN, tenantBId);

        createUser("userB1", "userB1@" + tenantBId + ".com",
                Role.ROLE_STORE_ADMIN, tenantBId);

        // ================= TOKENS =================
        tokenTenantA = generateToken(adminA.getEmail(), tenantAId, "ROLE_STORE_ADMIN");
        tokenTenantB = generateToken("admin@" + tenantBId + ".com", tenantBId, "ROLE_STORE_ADMIN");
        cashierTokenTenantA = generateToken(cashierA.getEmail(), tenantAId, "ROLE_CASHIER");
    }

    private com.possaas.domain.user.User createUser(
            String username,
            String email,
            Role role,
            String tenantId) {

        var user = new com.possaas.domain.user.User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode("password"));
        user.setRole(role);
        user.setStatus(UserStatus.ACTIVE);
        user.setTenantId(tenantId);
        Branch branch = branchRepository.findByIdAndTenantId(branchIdsByTenant.get(tenantId), tenantId)
                .orElseThrow();
        user.setBranch(branch);
        return userRepository.save(user);
    }

    private Branch createBranch(String tenantId, String code) {
        Branch branch = new Branch();
        branch.setTenantId(tenantId);
        branch.setCode(code);
        branch.setName(code + "-NAME");
        return branchRepository.save(branch);
    }

    private String generateToken(String email, String tenantId, String role) {

        var userDetails = new UserDetailsImpl(
                1L,
                email,
                email,
                "password",
                tenantId,
                List.of(new SimpleGrantedAuthority(role)));

        var auth = new UsernamePasswordAuthenticationToken(
                userDetails,
                null,
                userDetails.getAuthorities());

        return jwtTokenProvider.generateToken(auth, tenantId);
    }

    // ===================== TESTS =========================

    @Test
    void shouldReturnUsersForTenantAOnly() throws Exception {
        mockMvc.perform(get("/api/users")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenTenantA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(4)))
                .andExpect(jsonPath("$.content[*].tenantId")
                        .value(everyItem(is(tenantAId))));
    }

    @Test
    void adminShouldCreateUserSuccessfully() throws Exception {

        String requestBody = """
                {
                  "username": "newuser",
                  "email": "newuser@%s.com",
                  "password": "Strong@123",
                  "role": "ROLE_CASHIER",
                  "branchId": %d,
                  "firstName": "New",
                  "lastName": "User"
                }
                """.formatted(tenantAId, branchIdsByTenant.get(tenantAId));

        mockMvc.perform(post("/api/users")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenTenantA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("newuser"))
                .andExpect(jsonPath("$.role").value("ROLE_CASHIER"));
    }
}
