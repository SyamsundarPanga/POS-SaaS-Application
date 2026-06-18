package com.possaas.service.manager;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.possaas.config.TenantContext;
import com.possaas.domain.branch.Branch;
import com.possaas.domain.branch.BranchSettings;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.dto.request.BranchSettingsRequest;
import com.possaas.dto.response.BranchSettingsResponse;
import com.possaas.repository.BranchRepository;
import com.possaas.repository.BranchSettingsRepository;
import com.possaas.repository.InventoryRepository;
import com.possaas.repository.UserRepository;
import com.possaas.service.audit.AuditLogService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ManagerBranchSettingsService {

    private final BranchSettingsRepository settingsRepository;
    private final BranchRepository branchRepository;
    private final UserRepository userRepository;
    private final InventoryRepository inventoryRepository;
    private final AuditLogService auditLogService;

    /**
     * Get target branch ID based on user role and optional override
     */
    private Long getTargetBranchId(Long branchIdOverride) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        String tenantId = TenantContext.getTenantId();
        
        User user = userRepository.findByUsernameAndTenantId(username, tenantId)
                .orElseThrow(() -> new RuntimeException("User not found for tenant: " + tenantId));

        if (branchIdOverride != null) {
            if (user.getRole() == Role.ROLE_STORE_ADMIN) {
                return branchIdOverride;
            } else {
                log.warn("User {} tried to override branch settings without ROLE_STORE_ADMIN", username);
            }
        }

        if (user.getBranch() != null && user.getBranch().getId() != null) {
            return user.getBranch().getId();
        }

        // Fallback for Store Admin or users without assigned branch
        if (user.getRole() == Role.ROLE_STORE_ADMIN) {
            return branchRepository.findByTenantIdAndIsDeletedFalse(tenantId).stream()
                    .findFirst()
                    .map(Branch::getId)
                    .orElseThrow(() -> new RuntimeException("No branches found for this tenant. Please create a branch first."));
        }

        throw new RuntimeException("User is not assigned to any branch. Please contact system administrator.");
    }

    /**
     * Get current user's branch ID (Legacy support)
     */
    private Long getCurrentUserBranchId() {
        return getTargetBranchId(null);
    }

    /**
     * Get branch settings for current manager's branch
     */
    public BranchSettingsResponse getSettings(Long branchIdOverride) {
        String tenantId = TenantContext.getTenantId();
        Long branchId = getTargetBranchId(branchIdOverride);
        
        BranchSettings settings = settingsRepository.findByBranchIdAndTenantId(branchId, tenantId)
                .orElseGet(() -> createDefaultSettings(branchId, tenantId));
        
        Branch branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new RuntimeException("Branch not found"));
        
        return convertToResponse(settings, branch);
    }

    /**
     * Get branch settings for current manager's branch (No override)
     */
    public BranchSettingsResponse getSettings() {
        return getSettings(null);
    }

    /**
     * Update branch settings
     */
    @Transactional
    public BranchSettingsResponse updateSettings(BranchSettingsRequest request) {
        String tenantId = TenantContext.getTenantId();
        Long branchId = getCurrentUserBranchId();
        
        BranchSettings settings = settingsRepository.findByBranchIdAndTenantId(branchId, tenantId)
                .orElseGet(() -> createDefaultSettings(branchId, tenantId));
        
        // Update settings
        if (request.getOpeningHours() != null) {
            settings.setOpeningHours(request.getOpeningHours());
        }
        if (request.getTaxRate() != null) {
            settings.setTaxRate(request.getTaxRate());
        }
        if (request.getReceiptTemplate() != null) {
            settings.setReceiptTemplate(request.getReceiptTemplate());
        }
        if (request.getPaymentMethods() != null) {
            settings.setPaymentMethods(request.getPaymentMethods());
        }
        if (request.getLowStockThreshold() != null) {
            settings.setLowStockThreshold(request.getLowStockThreshold());
            int updatedRows = inventoryRepository.updateLowStockThresholdByBranch(
                    tenantId,
                    branchId,
                    request.getLowStockThreshold());
            log.info("Updated low stock threshold for {} inventory rows in branch {}", updatedRows, branchId);
        }
        if (request.getDiscountEnabled() != null) {
            settings.setDiscountEnabled(request.getDiscountEnabled());
        }
        if (request.getMaxDiscountPercent() != null) {
            settings.setMaxDiscountPercent(request.getMaxDiscountPercent());
        }
        if (request.getRequireManagerApproval() != null) {
            settings.setRequireManagerApproval(request.getRequireManagerApproval());
        }
        
        BranchSettings saved = settingsRepository.save(settings);
        
        Branch branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new RuntimeException("Branch not found"));

        if (request.getTaxRate() != null) {
            auditLogService.log(
                    "TAX_RATE_SET",
                    "BRANCH_SETTINGS",
                    branchId.toString(),
                    String.format("Set branch tax rate to %s for branch %s", request.getTaxRate(), branch.getName()));
        }

        if (request.getLowStockThreshold() != null) {
            auditLogService.log(
                    "LOW_STOCK_THRESHOLD_SET",
                    "BRANCH_SETTINGS",
                    branchId.toString(),
                    String.format("Set branch low stock threshold to %d for branch %s",
                            request.getLowStockThreshold(),
                            branch.getName()));
        }
        
        log.info("Branch settings updated for branch {} by manager", branchId);
        
        return convertToResponse(saved, branch);
    }

    /**
     * Create default settings for a branch
     */
    private BranchSettings createDefaultSettings(Long branchId, String tenantId) {
        BranchSettings settings = new BranchSettings();
        settings.setBranchId(branchId);
        settings.setTaxRate(java.math.BigDecimal.ZERO);
        settings.setLowStockThreshold(10);
        settings.setPaymentMethods(java.util.Arrays.asList("CASH", "CARD", "UPI"));
        settings.setDiscountEnabled(true);
        settings.setMaxDiscountPercent(new java.math.BigDecimal("100.00"));
        settings.setRequireManagerApproval(false);
        return settings;
    }

    /**
     * Convert entity to response DTO
     */
    private BranchSettingsResponse convertToResponse(BranchSettings settings, Branch branch) {
        return BranchSettingsResponse.builder()
                .id(settings.getId())
                .branchId(settings.getBranchId())
                .branchName(branch.getName())
                .openingHours(settings.getOpeningHours())
                .taxRate(settings.getTaxRate())
                .receiptTemplate(settings.getReceiptTemplate())
                .paymentMethods(settings.getPaymentMethods())
                .lowStockThreshold(settings.getLowStockThreshold())
                .discountEnabled(settings.getDiscountEnabled())
                .maxDiscountPercent(settings.getMaxDiscountPercent())
                .requireManagerApproval(settings.getRequireManagerApproval())
                .updatedAt(settings.getUpdatedAt())
                .build();
    }
}
