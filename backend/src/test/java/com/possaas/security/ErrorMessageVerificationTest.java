package com.possaas.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.security.Key;
import java.util.Date;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionPlanType;
import com.possaas.domain.tenant.Tenant;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.domain.user.UserStatus;
import com.possaas.integration.BaseIntegrationTest;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.repository.UserRepository;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

@DisplayName("Error Message Verification Tests")
public class ErrorMessageVerificationTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TenantRepository tenantRepository;

    @Autowired
    private SubscriptionPlanRepository subscriptionPlanRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-ms}")
    private long jwtExpirationMs;

    private static final String TENANT_ID = "tenant-test";
    private static final String TEST_PASSWORD = "password123";

    private SubscriptionPlan basicPlan;

    @BeforeEach
    void setUp() {

        // Ensure BASIC plan exists (NOW safe because bean is injected)
        basicPlan = subscriptionPlanRepository.findById("BASIC")
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

        createTestTenant();
        createTestUser();
    }

    private void createTestTenant() {
        if (!tenantRepository.existsById(TENANT_ID)) {
            Tenant tenant = new Tenant();
            tenant.setId(TENANT_ID);
            tenant.setName("Test Tenant");
            tenant.setSubscriptionPlan(basicPlan);
            tenant.setActive(true);
            tenantRepository.save(tenant);
        }
    }

    private void createTestUser() {
        if (userRepository.findByEmail("test@example.com").isEmpty()) {
            User user = new User();
            user.setUsername("testuser");
            user.setEmail("test@example.com");
            user.setPassword(passwordEncoder.encode(TEST_PASSWORD));
            user.setRole(Role.ROLE_CASHIER);
            user.setTenantId(TENANT_ID);
            user.setStatus(UserStatus.ACTIVE);
            userRepository.save(user);
        }
    }

    // ==================== AUTHENTICATION TESTS ====================

    @Test
    @DisplayName("EM-001: Invalid credentials returns clear error message")
    void testInvalidCredentialsErrorMessage() throws Exception {

        String loginJson = "{\"email\":\"wrong@test.com\",\"password\":\"wrongpass\"}";

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Authentication Failed"))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    @DisplayName("EM-002: Expired token returns 403 status")
    void testExpiredTokenErrorMessage() throws Exception {

        Key key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));

        String expiredToken = Jwts.builder()
                .setSubject("testuser")
                .claim("role", Role.ROLE_CASHIER.name())
                .claim("tenantId", TENANT_ID)
                .setIssuedAt(new Date(System.currentTimeMillis() - 1000000))
                .setExpiration(new Date(System.currentTimeMillis() - 500000))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();

        mockMvc.perform(get("/api/products")
                .header("Authorization", "Bearer " + expiredToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("EM-003: Missing token returns 403 status")
    void testMissingTokenErrorMessage() throws Exception {

        mockMvc.perform(get("/api/products"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("EM-004: Access denied returns clear error message")
    void testAccessDeniedErrorMessage() throws Exception {

        Key key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));

        String cashierToken = Jwts.builder()
                .setSubject("testuser")
                .claim("role", Role.ROLE_CASHIER.name())
                .claim("tenantId", TENANT_ID)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();

        String productJson = "{\"name\":\"Product\",\"price\":99.99,\"sku\":\"TESTSKU001\"}";

        mockMvc.perform(post("/api/products")
                .header("Authorization", "Bearer " + cashierToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(productJson))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Access Denied"));
    }

    @Test
    @DisplayName("EM-005: Validation errors return 400")
    void testValidationErrorMessages() throws Exception {

        Key key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));

        String adminToken = Jwts.builder()
                .setSubject("testuser")
                .claim("role", Role.ROLE_STORE_ADMIN.name())
                .claim("tenantId", TENANT_ID)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();

        String invalidProductJson = "{\"name\":\"\",\"price\":-1}";

        mockMvc.perform(post("/api/products")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidProductJson))
                .andExpect(status().isBadRequest());
    }
}