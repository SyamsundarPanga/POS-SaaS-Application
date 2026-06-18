package com.possaas.service.superadmin;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Collectors;

import org.hibernate.Filter;
import org.hibernate.Session;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.possaas.domain.superadmin.SuperAdmin;
import com.possaas.domain.superadmin.SuperAdminStatus;
import com.possaas.domain.tenant.Subscription;
import com.possaas.domain.tenant.SubscriptionStatus;
import com.possaas.domain.tenant.Tenant;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.dto.request.SuperAdminLoginRequest;
import com.possaas.dto.response.SuperAdminDashboardResponse;
import com.possaas.dto.response.SuperAdminLoginResponse;
import com.possaas.dto.response.TenantOverviewResponse;
import com.possaas.exception.ResourceNotFoundException;
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
import lombok.RequiredArgsConstructor;
import org.thymeleaf.context.Context;

@Service
@RequiredArgsConstructor
public class SuperAdminService {

    private static final Logger logger = LoggerFactory.getLogger(SuperAdminService.class);

    private final SuperAdminRepository superAdminRepository;
    private final TenantRepository tenantRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final BranchRepository branchRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final EntityManager entityManager;
    private final EmailService emailService;

    @Value("${app.superadmin.contact-email:superadmin@possaas.com}")
    private String fallbackSuperAdminEmail;

    /**
     * SuperAdmin Login - No tenant context required
     */
    @Transactional
    public SuperAdminLoginResponse login(SuperAdminLoginRequest request) {
        String email = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase(Locale.ROOT);

        SuperAdmin superAdmin = superAdminRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("SuperAdmin not found"));

        if (superAdmin.getStatus() != SuperAdminStatus.ACTIVE) {
            throw new RuntimeException("SuperAdmin account is not active");
        }

        if (!passwordEncoder.matches(request.getPassword(), superAdmin.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }

        // Update last login
        superAdmin.setLastLogin(LocalDateTime.now());
        superAdminRepository.save(superAdmin);

        // Create SuperAdminDetailsImpl for authentication
        com.possaas.security.service.SuperAdminDetailsImpl superAdminDetails = com.possaas.security.service.SuperAdminDetailsImpl
                .build(superAdmin);

        // Generate JWT token with SuperAdminDetails
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                superAdminDetails, null, superAdminDetails.getAuthorities());

        String jwt = jwtTokenProvider.generateToken(authentication, "SUPERADMIN");

        // Create refresh token
        com.possaas.domain.security.RefreshToken refreshToken = refreshTokenService
                .createSuperAdminRefreshToken(superAdmin.getId());

        return SuperAdminLoginResponse.builder()
                .accessToken(jwt)
                .refreshToken(refreshToken.getToken())
                .tokenType("Bearer")
                .id(superAdmin.getId())
                .username(superAdmin.getUsername())
                .email(superAdmin.getEmail())
                .firstName(superAdmin.getFirstName())
                .lastName(superAdmin.getLastName())
                .role("ROLE_SUPER_ADMIN")
                .build();
    }

    /**
     * Get platform-wide dashboard statistics
     */
    @Transactional(readOnly = true)
    public SuperAdminDashboardResponse getDashboardStats() {

        // Disable tenant filter for SuperAdmin queries
        Session session = entityManager.unwrap(Session.class);
        Filter filter = session.getEnabledFilter("tenantFilter");
        if (filter != null) {
            session.disableFilter("tenantFilter");
        }

        try {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime startOfMonth = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
            LocalDateTime startOfDay = now.withHour(0).withMinute(0).withSecond(0).withNano(0);

            long totalTenants = tenantRepository.count();
            long activeTenants = tenantRepository.countByActive(true);

            // Subscription counts
            long basicCount = subscriptionRepository.countByPlan_PlanType(
                    com.possaas.domain.tenant.SubscriptionPlanType.BASIC);
            long proCount = subscriptionRepository.countByPlan_PlanType(
                    com.possaas.domain.tenant.SubscriptionPlanType.PRO);
            long advanceCount = subscriptionRepository.countByPlan_PlanType(
                    com.possaas.domain.tenant.SubscriptionPlanType.ADVANCE);

            // Revenue calculation
            BigDecimal totalRevenue = subscriptionRepository.findAll().stream()
                    .filter(s -> s.getStatus() == SubscriptionStatus.ACTIVE)
                    .map(s -> s.getPlan().getMonthlyPrice())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Usage metrics
            long totalUsers = userRepository.count();
            long totalBranches = branchRepository.count();
            long totalProducts = productRepository.count();
            long totalOrders = orderRepository.count();

            // Recent activity
            long tenantsThisMonth = tenantRepository.countByCreatedAtAfter(startOfMonth);
            long tenantsToday = tenantRepository.countByCreatedAtAfter(startOfDay);
            BigDecimal todayRevenue = orderRepository.calculatePlatformTotalSales(startOfDay);
            long todayOrdersCount = orderRepository.countPlatformTodayOrders(startOfDay);

            return SuperAdminDashboardResponse.builder()
                    .totalTenants(totalTenants)
                    .activeTenants(activeTenants)
                    .inactiveTenants(totalTenants - activeTenants)
                    .basicPlanCount(basicCount)
                    .proPlanCount(proCount)
                    .advancePlanCount(advanceCount)
                    .totalMonthlyRevenue(totalRevenue)
                    .projectedAnnualRevenue(totalRevenue.multiply(BigDecimal.valueOf(12)))
                    .totalUsers(totalUsers)
                    .totalBranches(totalBranches)
                    .totalProducts(totalProducts)
                    .totalOrders(totalOrders)
                    .tenantsCreatedThisMonth(tenantsThisMonth)
                    .tenantsCreatedToday(tenantsToday)
                    .todayRevenue(todayRevenue)
                    .todayOrders(todayOrdersCount)
                    .build();
        } finally {
            // Re-enable filter if it was enabled before
            if (filter != null) {
                session.enableFilter("tenantFilter");
            }
        }
    }

    /**
     * Get all tenants with their subscription details
     */
    @Transactional(readOnly = true)
    public Page<TenantOverviewResponse> getAllTenants(Pageable pageable) {

        // Disable tenant filter for SuperAdmin queries
        Session session = entityManager.unwrap(Session.class);
        Filter filter = session.getEnabledFilter("tenantFilter");
        if (filter != null) {
            session.disableFilter("tenantFilter");
        }

        try {
            Page<Tenant> tenants = tenantRepository.findAll(pageable);

            return tenants.map(tenant -> {
                Subscription subscription = subscriptionRepository
                        .findByTenantIdAndStatus(tenant.getId(), SubscriptionStatus.ACTIVE)
                        .orElse(null);

                long userCount = userRepository.countByTenantId(tenant.getId());
                long branchCount = branchRepository.countByTenantId(tenant.getId());
                long productCount = productRepository.countByTenantId(tenant.getId());
                long orderCount = orderRepository.countByTenantId(tenant.getId());
                BigDecimal revenue = orderRepository.sumTotalAmountByTenantId(tenant.getId());

                return TenantOverviewResponse.builder()
                        .tenantId(tenant.getId())
                        .tenantName(tenant.getName())
                        .active(tenant.isActive())
                        .planType(subscription != null ? subscription.getPlan().getPlanType().name() : "NONE")
                        .subscriptionStatus(subscription != null ? subscription.getStatus() : null)
                        .subscriptionStartDate(subscription != null ? subscription.getStartDate() : null)
                        .nextBillingDate(subscription != null ? subscription.getNextBillingDate() : null)
                        .monthlyPrice(subscription != null ? subscription.getPlan().getMonthlyPrice() : BigDecimal.ZERO)
                        .currentUsers(userCount)
                        .maxUsers(subscription != null ? subscription.getPlan().getMaxUsers() : 0)
                        .currentBranches(branchCount)
                        .maxBranches(subscription != null ? subscription.getPlan().getMaxBranches() : 0)
                        .currentProducts(productCount)
                        .maxProducts(subscription != null ? subscription.getPlan().getMaxProducts() : 0)
                        .createdAt(tenant.getCreatedAt())
                        .totalOrders(orderCount)
                        .totalRevenue(revenue != null ? revenue : BigDecimal.ZERO)
                        .build();
            });
        } finally {
            // Re-enable filter if it was enabled before
            if (filter != null) {
                session.enableFilter("tenantFilter");
            }
        }
    }

    /**
     * Get specific tenant details
     */
    @Transactional(readOnly = true)
    public TenantOverviewResponse getTenantById(String tenantId) {

        // Disable tenant filter for SuperAdmin queries
        Session session = entityManager.unwrap(Session.class);
        Filter filter = session.getEnabledFilter("tenantFilter");
        if (filter != null) {
            session.disableFilter("tenantFilter");
        }

        try {
            Tenant tenant = tenantRepository.findById(tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("Tenant not found"));

            Subscription subscription = subscriptionRepository
                    .findByTenantIdAndStatus(tenantId, SubscriptionStatus.ACTIVE)
                    .orElse(null);

            long userCount = userRepository.countByTenantId(tenantId);
            long branchCount = branchRepository.countByTenantId(tenantId);
            long productCount = productRepository.countByTenantId(tenantId);
            long orderCount = orderRepository.countByTenantId(tenantId);
            BigDecimal revenue = orderRepository.sumTotalAmountByTenantId(tenantId);

            return TenantOverviewResponse.builder()
                    .tenantId(tenant.getId())
                    .tenantName(tenant.getName())
                    .active(tenant.isActive())
                    .planType(subscription != null ? subscription.getPlan().getPlanType().name() : "NONE")
                    .subscriptionStatus(subscription != null ? subscription.getStatus() : null)
                    .subscriptionStartDate(subscription != null ? subscription.getStartDate() : null)
                    .nextBillingDate(subscription != null ? subscription.getNextBillingDate() : null)
                    .monthlyPrice(subscription != null ? subscription.getPlan().getMonthlyPrice() : BigDecimal.ZERO)
                    .currentUsers(userCount)
                    .maxUsers(subscription != null ? subscription.getPlan().getMaxUsers() : 0)
                    .currentBranches(branchCount)
                    .maxBranches(subscription != null ? subscription.getPlan().getMaxBranches() : 0)
                    .currentProducts(productCount)
                    .maxProducts(subscription != null ? subscription.getPlan().getMaxProducts() : 0)
                    .createdAt(tenant.getCreatedAt())
                    .totalOrders(orderCount)
                    .totalRevenue(revenue != null ? revenue : BigDecimal.ZERO)
                    .build();
        } finally {
            // Re-enable filter if it was enabled before
            if (filter != null) {
                session.enableFilter("tenantFilter");
            }
        }
    }

    @Transactional
    public void toggleTenantStatus(String tenantId) {
        // Disable tenant filter for SuperAdmin queries
        Session session = entityManager.unwrap(Session.class);
        Filter filter = session.getEnabledFilter("tenantFilter");
        if (filter != null) {
            session.disableFilter("tenantFilter");
        }

        try {
            Tenant tenant = tenantRepository.findById(tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("Tenant not found"));

            boolean wasActive = tenant.isActive();
            tenant.setActive(!wasActive);
            tenantRepository.save(tenant);

            if (wasActive && !tenant.isActive()) {
                sendTenantDeactivationEmails(tenant);
            }
        } finally {
            if (filter != null) {
                session.enableFilter("tenantFilter");
            }
        }
    }

    private void sendTenantDeactivationEmails(Tenant tenant) {
        List<User> storeAdmins = userRepository.findByTenantIdAndRoleAndIsDeletedFalse(
                tenant.getId(),
                Role.ROLE_STORE_ADMIN);
        String superAdminEmail = resolveSuperAdminContactEmail();

        if (storeAdmins.isEmpty()) {
            logger.info("Skipping tenant deactivation email for tenant {} because no store admin was found", tenant.getId());
            return;
        }

        for (User admin : storeAdmins) {
            if (admin.getEmail() == null || admin.getEmail().isBlank()) {
                continue;
            }

            try {
                Context context = new Context();
                context.setVariable("name", resolveDisplayName(admin));
                context.setVariable("tenantName", tenant.getName());
                context.setVariable("superAdminEmail", superAdminEmail);

                emailService.sendHtmlEmail(
                        admin.getEmail(),
                        "PayPoint account deactivated by superadmin",
                        "email/tenant-deactivated",
                        context);
            } catch (Exception ex) {
                logger.warn(
                        "Failed to send tenant deactivation email to {} for tenant {}",
                        admin.getEmail(),
                        tenant.getId(),
                        ex);
            }
        }
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

    private String resolveDisplayName(User user) {
        String fullName = ((user.getFirstName() == null ? "" : user.getFirstName().trim()) + " "
                + (user.getLastName() == null ? "" : user.getLastName().trim())).trim();
        if (!fullName.isEmpty()) {
            return fullName;
        }
        return Objects.requireNonNullElse(user.getUsername(), "Store Admin");
    }
}
