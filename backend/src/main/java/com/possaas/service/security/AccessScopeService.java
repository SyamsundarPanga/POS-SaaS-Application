package com.possaas.service.security;

import com.possaas.config.TenantContext;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.exception.ResourceNotFoundException;
import com.possaas.repository.UserRepository;
import com.possaas.security.TenantContextHolder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AccessScopeService {

    private final UserRepository userRepository;

    public User getCurrentUser() {
        Long userId = TenantContextHolder.getUserId();
        if (userId == null) {
            throw new IllegalStateException("Authenticated user not found");
        }

        String tenantId = TenantContext.getTenantId();
        return userRepository.findByIdAndTenantId(userId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Current user not found"));
    }

    public boolean isBranchManager(User user) {
        return user.getRole() == Role.ROLE_BRANCH_MANAGER;
    }

    public boolean isBranchScopedUser(User user) {
        return user.getRole() == Role.ROLE_BRANCH_MANAGER
                || user.getRole() == Role.ROLE_CASHIER
                || user.getRole() == Role.ROLE_VIEWER;
    }

    public Long getCurrentBranchIdRequired(User user) {
        if (user.getBranch() == null || user.getBranch().getId() == null) {
            throw new IllegalStateException("User branch is not assigned");
        }
        return user.getBranch().getId();
    }

    public void enforceBranchAccess(User user, Long branchId) {
        if (!isBranchScopedUser(user)) {
            return;
        }
        Long currentBranchId = getCurrentBranchIdRequired(user);
        if (branchId == null || !currentBranchId.equals(branchId)) {
            throw new IllegalArgumentException("User can only access own branch data");
        }
    }
}
