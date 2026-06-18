package com.possaas.service.branch;

import com.possaas.config.TenantContext;
import com.possaas.domain.branch.Branch;
import com.possaas.domain.branch.BranchStatus;
import com.possaas.dto.request.CreateBranchRequest;
import com.possaas.dto.request.UpdateBranchRequest;
import com.possaas.dto.response.BranchDto;
import com.possaas.exception.DuplicateResourceException;
import com.possaas.exception.ResourceNotFoundException;
import com.possaas.repository.BranchRepository;
import com.possaas.repository.UserRepository;
import com.possaas.service.audit.AuditLogService;
import com.possaas.service.tenant.SubscriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BranchService {

    private final BranchRepository branchRepository;
    private final UserRepository userRepository;
    private final SubscriptionService subscriptionService;
    private final AuditLogService auditLogService;

    @Transactional
    public BranchDto createBranch(CreateBranchRequest request) {

        String tenantId = TenantContext.getTenantId();

        if (tenantId == null) {
            throw new RuntimeException("Tenant not resolved from JWT token");
        }

        subscriptionService.checkBranchLimit(tenantId);

        if (branchRepository.existsByCodeAndTenantId(request.getCode(), tenantId)) {
            throw new DuplicateResourceException(
                    "Branch with code '" + request.getCode() + "' already exists");
        }
        if (Boolean.TRUE.equals(request.getIsMainBranch())
                && branchRepository.existsByTenantIdAndIsMainBranchTrue(tenantId)) {
            throw new IllegalStateException("Head branch already exists. Only one head branch is allowed.");
        }

        Branch branch = new Branch();

        branch.setTenantId(tenantId);
        branch.setIsDeleted(false);

        branch.setCode(request.getCode());
        branch.setName(request.getName());
        branch.setAddress(request.getAddress());
        branch.setCity(request.getCity());
        branch.setState(request.getState());
        branch.setZipCode(request.getZipCode());
        branch.setCountry(request.getCountry());
        branch.setPhone(request.getPhone());
        branch.setEmail(request.getEmail());

        branch.setStatus(
                request.getStatus() != null ? request.getStatus() : BranchStatus.ACTIVE);

        branch.setManagerId(request.getManagerId());

        branch.setOpeningTime(request.getOpeningTime());
        branch.setClosingTime(request.getClosingTime());

        branch.setTaxRate(
                request.getTaxRate() != null ? request.getTaxRate() : BigDecimal.valueOf(18.00));

        branch.setIsMainBranch(
                request.getIsMainBranch() != null ? request.getIsMainBranch() : false);

        Branch saved = branchRepository.save(branch);
        auditLogService.log(
                "BRANCH_CREATED",
                "BRANCH",
                saved.getId().toString(),
                String.format("Created branch %s (%s)", saved.getName(), saved.getCode()));

        log.info("Created branch: {} for tenant: {}", saved.getName(), tenantId);

        return mapToDto(saved);
    }

    @Transactional
    public BranchDto updateBranch(Long id, UpdateBranchRequest request) {
        String tenantId = TenantContext.getTenantId();

        Branch branch = branchRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found with ID: " + id));

        if (request.getName() != null) {
            branch.setName(request.getName());
        }
        if (request.getAddress() != null) {
            branch.setAddress(request.getAddress());
        }
        if (request.getCity() != null) {
            branch.setCity(request.getCity());
        }
        if (request.getState() != null) {
            branch.setState(request.getState());
        }
        if (request.getZipCode() != null) {
            branch.setZipCode(request.getZipCode());
        }
        if (request.getCountry() != null) {
            branch.setCountry(request.getCountry());
        }
        if (request.getPhone() != null) {
            branch.setPhone(request.getPhone());
        }
        if (request.getEmail() != null) {
            branch.setEmail(request.getEmail());
        }
        if (request.getStatus() != null) {
            branch.setStatus(request.getStatus());
        }
        if (request.getManagerId() != null) {
            branch.setManagerId(request.getManagerId());
        }
        if (request.getOpeningTime() != null) {
            branch.setOpeningTime(request.getOpeningTime());
        }
        if (request.getClosingTime() != null) {
            branch.setClosingTime(request.getClosingTime());
        }
        if (request.getTaxRate() != null) {
            branch.setTaxRate(request.getTaxRate());
        }
        if (request.getIsMainBranch() != null) {
            if (Boolean.TRUE.equals(request.getIsMainBranch())
                    && !Boolean.TRUE.equals(branch.getIsMainBranch())
                    && branchRepository.existsByTenantIdAndIsMainBranchTrue(tenantId)) {
                throw new IllegalStateException("Another head branch already exists. Unselect it first.");
            }
            branch.setIsMainBranch(request.getIsMainBranch());
        }

        Branch updated = branchRepository.save(branch);
        auditLogService.log(
                "BRANCH_UPDATED",
                "BRANCH",
                updated.getId().toString(),
                String.format("Updated branch %s (%s)", updated.getName(), updated.getCode()));
        log.info("Updated branch: {} for tenant: {}", updated.getName(), tenantId);

        return mapToDto(updated);
    }

    @Transactional(readOnly = true)
    public BranchDto getBranchById(Long id) {
        String tenantId = TenantContext.getTenantId();

        Branch branch = branchRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found with ID: " + id));

        return mapToDto(branch);
    }

    @Transactional(readOnly = true)
    public Page<BranchDto> getAllBranches(BranchStatus status, Pageable pageable) {
        Page<Branch> branches;

        if (status != null) {
            branches = branchRepository.findByStatus(status, pageable);
        } else {
            branches = branchRepository.findAll(pageable);
        }

        return branches.map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public List<BranchDto> getActiveBranches() {
        String tenantId = TenantContext.getTenantId();
        List<Branch> branches = branchRepository.findByStatusAndTenantId(BranchStatus.ACTIVE, tenantId);
        return branches.stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BranchDto> getAllBranchesList() {
        String tenantId = TenantContext.getTenantId();
        List<Branch> branches = branchRepository.findByTenantIdAndIsDeletedFalse(tenantId);
        return branches.stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<BranchDto> searchBranches(String query, Pageable pageable) {
        String tenantId = TenantContext.getTenantId();
        Page<Branch> branches = branchRepository.searchBranches(tenantId, query, pageable);
        return branches.map(this::mapToDto);
    }

    @Transactional
    public BranchDto toggleBranchStatus(Long id, BranchStatus status) {
        String tenantId = TenantContext.getTenantId();

        Branch branch = branchRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found with ID: " + id));

        branch.setStatus(status);
        Branch updated = branchRepository.save(branch);
        auditLogService.log(
                "BRANCH_UPDATED",
                "BRANCH",
                updated.getId().toString(),
                String.format("Updated branch status to %s for %s", status, updated.getName()));

        log.info("Updated branch status: {} to {} for tenant: {}", branch.getName(), status, tenantId);
        return mapToDto(updated);
    }

    @Transactional
    public void deleteBranch(Long id) {
        String tenantId = TenantContext.getTenantId();

        Branch branch = branchRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found with ID: " + id));

        branch.setIsDeleted(true);
        branch.setStatus(BranchStatus.INACTIVE);
        branchRepository.save(branch);
        auditLogService.log(
                "BRANCH_DELETED",
                "BRANCH",
                branch.getId().toString(),
                String.format("Deleted branch %s (%s)", branch.getName(), branch.getCode()));

        log.info("Deleted branch: {} for tenant: {}", branch.getName(), tenantId);
    }

    private BranchDto mapToDto(Branch branch) {
        BranchDto dto = new BranchDto();
        dto.setId(branch.getId());
        dto.setCode(branch.getCode());
        dto.setName(branch.getName());
        dto.setAddress(branch.getAddress());
        dto.setCity(branch.getCity());
        dto.setState(branch.getState());
        dto.setZipCode(branch.getZipCode());
        dto.setCountry(branch.getCountry());
        dto.setPhone(branch.getPhone());
        dto.setEmail(branch.getEmail());
        dto.setStatus(branch.getStatus());
        dto.setManagerId(branch.getManagerId());
        dto.setOpeningTime(branch.getOpeningTime());
        dto.setClosingTime(branch.getClosingTime());
        dto.setTaxRate(branch.getTaxRate());
        dto.setIsMainBranch(branch.getIsMainBranch());
        dto.setTenantId(branch.getTenantId());
        dto.setCreatedAt(branch.getCreatedAt());
        dto.setUpdatedAt(branch.getUpdatedAt());

        // TODO: Add computed fields (employeeCount, productCount, totalSales)
        // These would require additional queries or be computed in specific endpoints

        return dto;
    }
}
