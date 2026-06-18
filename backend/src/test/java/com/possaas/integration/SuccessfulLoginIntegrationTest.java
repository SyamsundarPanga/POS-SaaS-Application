package com.possaas.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.util.Optional;

import org.hibernate.Session;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.possaas.config.TenantContext;
import com.possaas.domain.security.RefreshToken;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionPlanType;
import com.possaas.domain.tenant.Tenant;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.domain.user.UserStatus;
import com.possaas.dto.request.LoginRequest;
import com.possaas.dto.response.LoginResponse;
import com.possaas.repository.RefreshTokenRepository;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.repository.UserRepository;
import com.possaas.service.auth.AuthService;
import com.possaas.service.security.RefreshTokenService;

import jakarta.persistence.EntityManager;

@DisplayName("Successful Login Integration Tests")
class SuccessfulLoginIntegrationTest extends BaseIntegrationTest {
	
	@Autowired
	private SubscriptionPlanRepository subscriptionPlanRepository;

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TenantRepository tenantRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private RefreshTokenService refreshTokenService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EntityManager entityManager;

    private Tenant testTenant;
    private String testTenantId;
    private Session session;
    private final String testPassword = "SecurePassword123!";

    @BeforeEach
    void setUp() {

        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
        tenantRepository.deleteAll();
        subscriptionPlanRepository.deleteAll();

        session = entityManager.unwrap(Session.class);

        // ✅ Create BASIC subscription plan first
        SubscriptionPlan basicPlan = new SubscriptionPlan();
        basicPlan.setId("BASIC");
        basicPlan.setPlanType(SubscriptionPlanType.BASIC);
        basicPlan.setMaxBranches(1);
        basicPlan.setMaxUsers(10);
        basicPlan.setMaxProducts(100);
        basicPlan.setMonthlyPrice(BigDecimal.valueOf(0.00));
        basicPlan = subscriptionPlanRepository.save(basicPlan);

        // ✅ Create test tenant with subscription plan
        testTenant = new Tenant();
        testTenant.setName("TestTenant-" + java.util.UUID.randomUUID());
        testTenant.setSubscriptionPlan(basicPlan);   // ✅ FIXED
        testTenant.setActive(true);

        testTenant = tenantRepository.save(testTenant);
        testTenantId = testTenant.getId();
        entityManager.flush();

        // Set tenant context
        TenantContext.setTenantId(testTenantId);
        session.enableFilter("tenantFilter")
                .setParameter("tenantId", testTenantId);
    }
    
    @AfterEach
    void tearDown() {
        TenantContext.clear();
        session.disableFilter("tenantFilter");
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
        tenantRepository.deleteAll();
    }

    @Nested
    @DisplayName("Basic Successful Login")
    class BasicSuccessfulLoginTests {

        @Test
        @DisplayName("Should login successfully with valid email and password")
        void shouldLoginSuccessfullyWithValidCredentials() {
            String email = "cashier@test.com";
            String username = "cashier_user";

            User user = createUser(username, email, Role.ROLE_CASHIER, UserStatus.ACTIVE);
            userRepository.save(user);
            entityManager.flush();

            LoginRequest loginRequest = new LoginRequest();
            loginRequest.setEmail(email);
            loginRequest.setPassword(testPassword);

            LoginResponse response = authService.login(loginRequest, "127.0.0.1");

            assertNotNull(response);
            assertEquals(email, response.getEmail());
            assertEquals(username, response.getUsername());
            assertEquals(testTenantId, response.getTenantId());
            assertNotNull(response.getAccessToken());
            assertNotNull(response.getRefreshToken());
            assertEquals("Bearer", response.getTokenType());
        }

        @Test
        @DisplayName("Should return correct user ID after successful login")
        void shouldReturnCorrectUserIdAfterLogin() {
            String email = "admin@test.com";

            User user = createUser("admin_user", email, Role.ROLE_STORE_ADMIN, UserStatus.ACTIVE);
            User savedUser = userRepository.save(user);
            entityManager.flush();

            LoginRequest loginRequest = new LoginRequest();
            loginRequest.setEmail(email);
            loginRequest.setPassword(testPassword);

            LoginResponse response = authService.login(loginRequest, "127.0.0.1");

            assertNotNull(response.getUserId());
            assertEquals(savedUser.getId(), response.getUserId());
        }

        @Test
        @DisplayName("Should return user roles after successful login")
        void shouldReturnUserRolesAfterLogin() {
            String email = "cashier@test.com";

            User user = createUser("cashier_user", email, Role.ROLE_CASHIER, UserStatus.ACTIVE);
            userRepository.save(user);
            entityManager.flush();

            LoginRequest loginRequest = new LoginRequest();
            loginRequest.setEmail(email);
            loginRequest.setPassword(testPassword);

            LoginResponse response = authService.login(loginRequest, "127.0.0.1");

            assertNotNull(response.getRoles());
            assertTrue(response.getRoles().contains("ROLE_CASHIER"));
        }

        @Test
        @DisplayName("Should generate refresh token after successful login")
        void shouldGenerateRefreshTokenAfterLogin() {
            String email = "user@test.com";

            User user = createUser("test_user", email, Role.ROLE_CASHIER, UserStatus.ACTIVE);
            userRepository.save(user);
            entityManager.flush();

            LoginRequest loginRequest = new LoginRequest();
            loginRequest.setEmail(email);
            loginRequest.setPassword(testPassword);

            LoginResponse response = authService.login(loginRequest, "127.0.0.1");

            assertNotNull(response.getRefreshToken());
            assertTrue(response.getRefreshToken().length() > 0);

            Optional<RefreshToken> savedRefreshToken = refreshTokenRepository.findByToken(response.getRefreshToken());

            assertTrue(savedRefreshToken.isPresent());
            assertEquals(testTenantId, savedRefreshToken.get().getTenantId());
        }
    }

    // ============================================================
    // HELPER METHODS
    // ============================================================

    /**
     * Helper method to create a user with default attributes
     */
    private User createUser(String username, String email, Role role, UserStatus status) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(testPassword));
        user.setRole(role);
        user.setStatus(status);
        user.setIsDeleted(false);
        return user;
    }
}
