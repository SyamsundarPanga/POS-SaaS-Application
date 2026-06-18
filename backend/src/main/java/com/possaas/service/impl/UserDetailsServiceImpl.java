package com.possaas.service.impl;

import java.util.Objects;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.possaas.config.TenantContext;
import com.possaas.domain.superadmin.SuperAdmin;
import com.possaas.domain.superadmin.SuperAdminStatus;
import com.possaas.domain.tenant.Tenant;
import com.possaas.domain.user.User;
import com.possaas.domain.user.UserStatus;
import com.possaas.repository.SuperAdminRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.repository.UserRepository;
import com.possaas.security.service.SuperAdminDetailsImpl;
import com.possaas.security.service.UserDetailsImpl;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private static final Logger logger = LoggerFactory.getLogger(UserDetailsServiceImpl.class);

    @Autowired
    UserRepository userRepository;

    @Autowired
    SuperAdminRepository superAdminRepository;

    @Autowired
    TenantRepository tenantRepository;

    @Value("${app.superadmin.contact-email:superadmin@possaas.com}")
    private String fallbackSuperAdminEmail;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String usernameOrEmail) throws UsernameNotFoundException {
        String tenantId = TenantContext.getTenantIdOrNull();

        logger.debug("Loading user: {} for tenant: {}", usernameOrEmail, tenantId);

        // Check if this is a SuperAdmin login (tenantId = "SUPERADMIN" or null)
        if (tenantId == null || "SUPERADMIN".equalsIgnoreCase(tenantId)) {
            SuperAdmin superAdmin = superAdminRepository.findByEmail(usernameOrEmail)
                    .orElseGet(() -> superAdminRepository.findByUsername(usernameOrEmail).orElse(null));

            if (superAdmin != null) {
                if (superAdmin.getStatus() != SuperAdminStatus.ACTIVE) {
                    logger.warn("Login blocked: SuperAdmin {} is inactive", usernameOrEmail);
                    throw new RuntimeException("This SuperAdmin account is inactive.");
                }
                logger.debug("SuperAdmin loaded successfully: {}", superAdmin.getUsername());
                return SuperAdminDetailsImpl.build(superAdmin);
            }
        }

        User user = null;

        // If tenant context is set, use tenant-aware queries
        if (tenantId != null && !tenantId.isEmpty() && !"SUPERADMIN".equalsIgnoreCase(tenantId)) {
            user = userRepository.findByUsernameAndTenantId(usernameOrEmail, tenantId)
                    .orElseGet(() -> userRepository.findByEmailAndTenantId(usernameOrEmail, tenantId)
                            .orElse(null));
        }

        // Fallback to non-tenant queries if tenant not set or user not found
        if (user == null) {
            logger.debug("Tenant context not set or user not found with tenant, trying without tenant filter");
            user = userRepository.findByUsername(usernameOrEmail)
                    .orElseGet(() -> userRepository.findByEmail(usernameOrEmail)
                            .orElseThrow(() -> new UsernameNotFoundException(
                                    "User Not Found with username/email: " + usernameOrEmail)));
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            logger.warn("Login blocked: User {} is inactive", usernameOrEmail);
            throw new RuntimeException("This account is inactive. Please contact support.");
        }

        if (user.getTenantId() != null && !user.getTenantId().isBlank()) {
            Tenant tenant = tenantRepository.findById(user.getTenantId())
                    .orElseThrow(() -> new UsernameNotFoundException("Tenant not found for user: " + usernameOrEmail));

            if (!tenant.isActive()) {
                logger.warn("Login blocked: Tenant {} is inactive for user {}", user.getTenantId(), usernameOrEmail);
                throw new RuntimeException(
                        "Your account has been deactivated by superadmin. For more information, contact superadmin at "
                                + resolveSuperAdminContactEmail() + ".");
            }
        }

        // Check if branch is active
        if (user.getBranch() != null && user.getBranch().getStatus() != com.possaas.domain.branch.BranchStatus.ACTIVE) {
            logger.warn("Login blocked: User {}'s branch ({}) is inactive", usernameOrEmail,
                    user.getBranch().getName());
            throw new RuntimeException("Your branch is currently inactive. Please contact support.");
        }

        logger.debug("User loaded successfully: {} (tenant: {})", user.getUsername(), user.getTenantId());
        return UserDetailsImpl.build(user);
    }

    private String resolveSuperAdminContactEmail() {
        return superAdminRepository.findAll().stream()
                .filter(admin -> admin.getStatus() == SuperAdminStatus.ACTIVE)
                .map(SuperAdmin::getEmail)
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(email -> !email.isEmpty())
                .findFirst()
                .orElse(fallbackSuperAdminEmail);
    }
}
