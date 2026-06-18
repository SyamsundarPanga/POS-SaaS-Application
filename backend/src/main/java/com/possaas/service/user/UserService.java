package com.possaas.service.user;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;

import com.possaas.config.TenantContext;
import com.possaas.domain.branch.Branch;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.domain.user.UserStatus;
import com.possaas.dto.request.CreateUserRequest;
import com.possaas.exception.DuplicateResourceException;
import com.possaas.exception.ResourceNotFoundException;
import com.possaas.exception.UnauthorizedOperationException;
import com.possaas.exception.UserLimitExceededException;
import com.possaas.repository.BranchRepository;
import com.possaas.repository.UserRepository;
import com.possaas.service.auth.JwtTokenProvider;
import com.possaas.service.notification.EmailService;
import com.possaas.service.audit.AuditLogService;
import com.possaas.service.tenant.SubscriptionService;

import jakarta.transaction.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SubscriptionService subscriptionService;
    private final EmailService emailService;
    private final AuditLogService auditLogService;
    private final BranchRepository branchRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final com.possaas.repository.TenantRepository tenantRepository;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       SubscriptionService subscriptionService,
                       BranchRepository branchRepository,
                       JwtTokenProvider jwtTokenProvider,
                       EmailService emailService,
                       AuditLogService auditLogService,
                       com.possaas.repository.TenantRepository tenantRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.subscriptionService = subscriptionService;
        this.emailService = emailService;
        this.branchRepository = branchRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.auditLogService = auditLogService;
        this.tenantRepository = tenantRepository;
    }

    @Transactional
    public User createUser(CreateUserRequest request) {
        String tenantId = TenantContext.getTenantId();
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isBranchManager = authentication != null
                && authentication.getAuthorities().stream()
                        .anyMatch(authority -> "ROLE_BRANCH_MANAGER".equals(authority.getAuthority()));

        Role roleToAssign = request.getRole();
        Long branchIdToAssign = request.getBranchId();

        if (isBranchManager) {
            if (request.getRole() != Role.ROLE_CASHIER && request.getRole() != Role.ROLE_VIEWER) {
                throw new UnauthorizedOperationException("Branch managers can only create cashier or viewer accounts");
            }

            User manager = userRepository.findByUsernameAndTenantId(authentication.getName(), tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("Current manager not found"));

            if (manager.getBranch() == null) {
                throw new UnauthorizedOperationException("Branch manager is not assigned to any branch");
            }

            branchIdToAssign = manager.getBranch().getId();
            roleToAssign = request.getRole();
        }

        if (userRepository.existsByEmailAndTenantId(request.getEmail(), tenantId)) {
            throw new DuplicateResourceException("User with email already exists");
        }

        long currentUserCount = userRepository.countByTenantId(tenantId);
        int maxUsers = subscriptionService.getMaxUsersForCurrentTenant();

        if (currentUserCount >= maxUsers) {
            throw new UserLimitExceededException("User limit exceeded. Upgrade plan.");
        }

        User user = new User();
        user.setTenantId(tenantId);
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setRole(roleToAssign);
        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerified(true);
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        if (branchIdToAssign != null) {
            final Long resolvedBranchId = branchIdToAssign;
            Branch branch = branchRepository
                    .findByIdAndTenantId(resolvedBranchId, tenantId)
                    .orElseThrow(() ->
                            new ResourceNotFoundException(
                                    "Branch not found with ID: " + resolvedBranchId));

            user.setBranch(branch);
        }

        User savedUser = userRepository.save(user);

        auditLogService.log("USER_CREATED", "USER", savedUser.getId().toString(), 
            "Created user: " + savedUser.getUsername() + " with role: " + savedUser.getRole());

        subscriptionService.syncUsageFromDatabase();
        sendStaffAccountCreatedEmail(savedUser);

        return savedUser;
    }

    private void sendStaffAccountCreatedEmail(User user) {
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()) return;
        if (user.getRole() != Role.ROLE_CASHIER && user.getRole() != Role.ROLE_BRANCH_MANAGER) return;

        try {
            Context context = new Context();
            context.setVariable(
                    "name",
                    ((user.getFirstName() != null ? user.getFirstName() : "") + " " +
                     (user.getLastName() != null ? user.getLastName() : "")).trim()
            );
            context.setVariable("role", prettyRole(user.getRole()));
            context.setVariable("branchName", user.getBranch() != null ? user.getBranch().getName() : "Main Branch");
            context.setVariable("email", user.getEmail());
            context.setVariable("loginUrl", frontendUrl + "/login");
            context.setVariable("tenantName", 
                    tenantRepository.findById(user.getTenantId()).map(com.possaas.domain.tenant.Tenant::getName).orElse("POS SaaS System"));

            emailService.sendHtmlEmail(
                    user.getEmail(),
                    "Your PayPoint staff account is ready",
                    "email/staff-account-created",
                    context
            );
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(UserService.class)
                    .warn("Failed to send staff account created email to {}", user.getEmail(), e);
        }
    }

    private String prettyRole(Role role) {
        if (role == null) return "Staff";
        return switch (role) {
            case ROLE_CASHIER -> "Cashier";
            case ROLE_BRANCH_MANAGER -> "Branch Manager";
            case ROLE_STORE_ADMIN -> "Store Admin";
            case ROLE_VIEWER -> "Viewer";
            case ROLE_SUPER_ADMIN -> "Super Admin";
        };
    }

    // =============================
    // READ
    // =============================
    public Page<User> getAllUsers(Pageable pageable, Long branchId) {
        String tenantId = TenantContext.getTenantId();
        return branchId != null
                ? userRepository.findByTenantIdAndBranch_IdAndIsDeletedFalse(tenantId, branchId, pageable)
                : userRepository.findByTenantIdAndIsDeletedFalse(tenantId, pageable);
    }

    public User getUserById(Long id) {
        String tenantId = TenantContext.getTenantId();
        return userRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found with ID: " + id));
    }

    // =============================
    // UPDATE
    // =============================
    @Transactional
    public User updateUser(Long id, com.possaas.dto.request.UpdateUserRequest request) {

        String tenantId = TenantContext.getTenantId();
        User currentUser = getCurrentUserByTenant(tenantId);

        User user = userRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found with ID: " + id));

        validateBranchManagerAccess(currentUser, user);

        if (request.getUsername() != null) {
            user.setUsername(request.getUsername());
        }

        if (request.getEmail() != null) {
            if (userRepository.existsByEmailAndTenantIdAndIdNot(
                    request.getEmail(), tenantId, id)) {
                throw new DuplicateResourceException("Email already exists");
            }
            user.setEmail(request.getEmail());
        }

        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName());
        }

        if (request.getLastName() != null) {
            user.setLastName(request.getLastName());
        }

        if (request.getBranchId() != null) {
            Branch branch = branchRepository
                    .findByIdAndTenantId(request.getBranchId(), tenantId)
                    .orElseThrow(() ->
                            new ResourceNotFoundException(
                                    "Branch not found with ID: " + request.getBranchId()));

            branch.setId(request.getBranchId());
            user.setBranch(branch);
        }

        User updatedUser = userRepository.save(user);
        
        auditLogService.log("USER_UPDATED", "USER", updatedUser.getId().toString(), 
            "Updated user details for: " + updatedUser.getUsername());

        return updatedUser;
    }

    // =============================
    // DELETE / DEACTIVATE
    // =============================
    @Transactional
    public void deleteUser(Long id) {

        String tenantId = TenantContext.getTenantId();

        User user = userRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found with ID: " + id));

        user.setIsDeleted(true);
        user.setStatus(UserStatus.INACTIVE);
        userRepository.save(user);
        
        auditLogService.log("USER_DELETED", "USER", user.getId().toString(), 
            "Soft deleted user: " + user.getUsername());
    }

    @Transactional
    public User deactivateUser(Long id) {

        String tenantId = TenantContext.getTenantId();
        User currentUser = getCurrentUserByTenant(tenantId);

        User user = userRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found with ID: " + id));

        validateBranchManagerAccess(currentUser, user);

        user.setIsDeleted(true);
        user.setStatus(UserStatus.INACTIVE);
        return userRepository.save(user);
    }

    // =============================
    // ROLE / STATUS
    // =============================
    @Transactional
    public User changeUserRole(Long id, com.possaas.domain.user.Role newRole) {

        String tenantId = TenantContext.getTenantId();

        User user = userRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found with ID: " + id));

        user.setRole(newRole);
        User updatedUser = userRepository.save(user);
        
        auditLogService.log("USER_ROLE_CHANGED", "USER", updatedUser.getId().toString(), 
            "Changed role for " + updatedUser.getUsername() + " to " + newRole);
            
        return updatedUser;
    }

    @Transactional
    public User changeUserStatus(Long id, UserStatus newStatus) {

        String tenantId = TenantContext.getTenantId();

        User user = userRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found with ID: " + id));

        user.setStatus(newStatus);
        User updatedUser = userRepository.save(user);
        
        auditLogService.log("USER_STATUS_CHANGED", "USER", updatedUser.getId().toString(), 
            "Changed status for " + updatedUser.getUsername() + " to " + newStatus);
            
        return updatedUser;
    }

    @Transactional
    public User changeEmployeeStatus(Long id, UserStatus newStatus) {
        String tenantId = TenantContext.getTenantId();
        User currentUser = getCurrentUserByTenant(tenantId);

        User user = userRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found with ID: " + id));

        validateBranchManagerAccess(currentUser, user);

        user.setStatus(newStatus);
        if (newStatus == UserStatus.ACTIVE) {
            user.setIsDeleted(false);
        }
        return userRepository.save(user);
    }

    // =============================
    // BRANCH USERS
    // =============================
    public List<User> getUsersByBranch(Long branchId) {
        String tenantId = TenantContext.getTenantId();
        return userRepository.findEmployeesByBranch(tenantId, branchId);
    }
    
    
    /**
     * ✅ Production Ready: Get user by JWT (Flexible Lookup)
     */
    public User getUserByJwt(String jwt) {
        // 1. Token se claims nikaalein
        String identifier = jwtTokenProvider.getEmailFromToken(jwt); // claim "email"
        String tenantId = jwtTokenProvider.getTenantId(jwt);

        // DEBUG: Console check karein ki kya search ho raha hai
        System.out.println("Searching user for identifier: " + identifier + " and tenant: " + tenantId);

        // 2. Flexible Lookup: Pehle Email se dhundein, fir Username se
        return userRepository.findByEmailAndTenantId(identifier, tenantId)
                .orElseGet(() -> userRepository.findByUsernameAndTenantId(identifier, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found in database for tenant: " + tenantId)));
    }

    private User getCurrentUserByTenant(String tenantId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            throw new UnauthorizedOperationException("Authentication required");
        }

        return userRepository.findByUsernameAndTenantId(authentication.getName(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Current user not found"));
    }

    private void validateBranchManagerAccess(User currentUser, User targetUser) {
        if (currentUser.getRole() != Role.ROLE_BRANCH_MANAGER) {
            return;
        }

        if (currentUser.getBranch() == null) {
            throw new UnauthorizedOperationException("Branch manager is not assigned to a branch");
        }

        if (targetUser.getBranch() == null
                || !currentUser.getBranch().getId().equals(targetUser.getBranch().getId())) {
            throw new UnauthorizedOperationException("You can only manage employees in your own branch");
        }

        if (targetUser.getRole() != Role.ROLE_CASHIER && targetUser.getRole() != Role.ROLE_VIEWER) {
            throw new UnauthorizedOperationException("You can only manage cashier/viewer accounts");
        }
    }
}
