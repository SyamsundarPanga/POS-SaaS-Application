package com.possaas.service.superadmin;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.hibernate.Session;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.thymeleaf.context.Context;

import com.possaas.domain.security.RefreshToken;
import com.possaas.domain.superadmin.SuperAdmin;
import com.possaas.domain.superadmin.SuperAdminStatus;
import com.possaas.domain.tenant.Subscription;
import com.possaas.domain.tenant.Tenant;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.dto.request.SuperAdminLoginRequest;
import com.possaas.dto.response.SuperAdminLoginResponse;
import com.possaas.repository.BranchRepository;
import com.possaas.repository.OrderRepository;
import com.possaas.repository.ProductRepository;
import com.possaas.repository.SubscriptionRepository;
import com.possaas.repository.SuperAdminRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.repository.UserRepository;
import com.possaas.service.auth.JwtTokenProvider;
import com.possaas.service.notification.EmailService;
import com.possaas.service.security.RefreshTokenService;

import jakarta.persistence.EntityManager;

@ExtendWith(MockitoExtension.class)
class SuperAdminServiceTest {

    @Mock
    private SuperAdminRepository superAdminRepository;

    @Mock
    private TenantRepository tenantRepository;

    @Mock
    private SubscriptionRepository subscriptionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private BranchRepository branchRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Mock
    private EntityManager entityManager;

    @Mock
    private EmailService emailService;

    @Mock
    private Session session;

    @InjectMocks
    private SuperAdminService superAdminService;

    @BeforeEach
    void setUp() {
        when(entityManager.unwrap(Session.class)).thenReturn(session);
        when(session.getEnabledFilter("tenantFilter")).thenReturn(null);
        ReflectionTestUtils.setField(superAdminService, "fallbackSuperAdminEmail", "superadmin@possaas.com");
    }

    @Test
    @DisplayName("login issues a superadmin refresh token")
    void login_issuesSuperAdminRefreshToken() {
        SuperAdmin superAdmin = new SuperAdmin();
        superAdmin.setId(1L);
        superAdmin.setUsername("superadmin");
        superAdmin.setEmail("superadmin@possaas.com");
        superAdmin.setPassword("encoded-password");
        superAdmin.setFirstName("Super");
        superAdmin.setLastName("Admin");
        superAdmin.setStatus(SuperAdminStatus.ACTIVE);

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setToken("refresh-token");

        SuperAdminLoginRequest request = new SuperAdminLoginRequest();
        request.setEmail(" SuperAdmin@possaas.com ");
        request.setPassword("SuperAdmin@123");

        when(superAdminRepository.findByEmail("superadmin@possaas.com")).thenReturn(Optional.of(superAdmin));
        when(passwordEncoder.matches("SuperAdmin@123", "encoded-password")).thenReturn(true);
        when(jwtTokenProvider.generateToken(any(), eq("SUPERADMIN"))).thenReturn("jwt-token");
        when(refreshTokenService.createSuperAdminRefreshToken(1L)).thenReturn(refreshToken);

        SuperAdminLoginResponse response = superAdminService.login(request);

        verify(refreshTokenService).createSuperAdminRefreshToken(1L);
        verify(superAdminRepository).save(superAdmin);
        org.junit.jupiter.api.Assertions.assertEquals("refresh-token", response.getRefreshToken());
        org.junit.jupiter.api.Assertions.assertEquals("jwt-token", response.getAccessToken());
        org.junit.jupiter.api.Assertions.assertEquals("superadmin@possaas.com", response.getEmail());
    }

    @Test
    @DisplayName("toggleTenantStatus sends email when tenant is deactivated")
    void toggleTenantStatus_sendsEmail_whenTenantIsDeactivated() {
        Tenant tenant = new Tenant();
        tenant.setId("tenant-1");
        tenant.setName("Demo Store");
        tenant.setActive(true);

        User storeAdmin = new User();
        storeAdmin.setUsername("storeadmin");
        storeAdmin.setEmail("storeadmin@example.com");
        storeAdmin.setRole(Role.ROLE_STORE_ADMIN);
        storeAdmin.setTenantId("tenant-1");

        when(tenantRepository.findById("tenant-1")).thenReturn(Optional.of(tenant));
        when(userRepository.findByTenantIdAndRoleAndIsDeletedFalse("tenant-1", Role.ROLE_STORE_ADMIN))
                .thenReturn(List.of(storeAdmin));

        superAdminService.toggleTenantStatus("tenant-1");

        ArgumentCaptor<Tenant> tenantCaptor = ArgumentCaptor.forClass(Tenant.class);
        verify(tenantRepository).save(tenantCaptor.capture());
        org.junit.jupiter.api.Assertions.assertFalse(tenantCaptor.getValue().isActive());

        verify(emailService).sendHtmlEmail(
                eq("storeadmin@example.com"),
                eq("PayPoint account deactivated by superadmin"),
                eq("email/tenant-deactivated"),
                any(Context.class));
    }

    @Test
    @DisplayName("toggleTenantStatus does not send email when tenant is reactivated")
    void toggleTenantStatus_doesNotSendEmail_whenTenantIsReactivated() {
        Tenant tenant = new Tenant();
        tenant.setId("tenant-1");
        tenant.setName("Demo Store");
        tenant.setActive(false);

        when(tenantRepository.findById("tenant-1")).thenReturn(Optional.of(tenant));

        superAdminService.toggleTenantStatus("tenant-1");

        ArgumentCaptor<Tenant> tenantCaptor = ArgumentCaptor.forClass(Tenant.class);
        verify(tenantRepository).save(tenantCaptor.capture());
        org.junit.jupiter.api.Assertions.assertTrue(tenantCaptor.getValue().isActive());

        verify(emailService, never()).sendHtmlEmail(any(), any(), any(), any(Context.class));
    }
}
