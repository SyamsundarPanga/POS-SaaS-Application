package com.possaas.service.user;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.possaas.config.TenantContext;
import com.possaas.domain.branch.Branch;
import com.possaas.domain.user.Role;
import com.possaas.dto.request.CreateUserRequest;
import com.possaas.repository.BranchRepository;
import com.possaas.repository.UserRepository;
import com.possaas.service.audit.AuditLogService;
import com.possaas.service.auth.JwtTokenProvider;
import com.possaas.service.notification.EmailService;
import com.possaas.service.tenant.SubscriptionService;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private SubscriptionService subscriptionService;

    @Mock
    private EmailService emailService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private BranchRepository branchRepository;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private com.possaas.repository.TenantRepository tenantRepository;

    @InjectMocks
    private UserService userService;

    @BeforeEach
    void setUp() {
        TenantContext.setTenantId("tenant-1");
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("createUser marks admin-created staff accounts as verified")
    void createUser_marksStaffAccountsAsVerified() {
        CreateUserRequest request = new CreateUserRequest();
        request.setUsername("sonu");
        request.setEmail("sonu@gmail.com");
        request.setPassword("Password123!");
        request.setRole(Role.ROLE_BRANCH_MANAGER);
        request.setBranchId(10L);
        request.setFirstName("Sonu");
        request.setLastName("Manager");

        Branch branch = new Branch();
        branch.setId(10L);
        branch.setName("Main Branch");

        when(userRepository.existsByEmailAndTenantId("sonu@gmail.com", "tenant-1")).thenReturn(false);
        when(userRepository.countByTenantId("tenant-1")).thenReturn(0L);
        when(subscriptionService.getMaxUsersForCurrentTenant()).thenReturn(10);
        when(passwordEncoder.encode("Password123!")).thenReturn("encoded-password");
        when(branchRepository.findByIdAndTenantId(10L, "tenant-1")).thenReturn(Optional.of(branch));
        when(userRepository.save(any())).thenAnswer(invocation -> {
            var user = invocation.getArgument(0, com.possaas.domain.user.User.class);
            user.setId(42L);
            return user;
        });
        when(tenantRepository.findById("tenant-1")).thenReturn(Optional.empty());

        var savedUser = userService.createUser(request);

        assertNotNull(savedUser);
        assertTrue(savedUser.isEmailVerified());
        assertNotNull(savedUser.getBranch());
        assertEquals("encoded-password", savedUser.getPassword());
    }
}
