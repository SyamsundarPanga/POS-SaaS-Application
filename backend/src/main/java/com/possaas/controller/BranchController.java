package com.possaas.controller;

import com.possaas.domain.branch.BranchStatus;
import com.possaas.dto.request.BranchSettingsRequest;
import com.possaas.dto.request.CreateBranchRequest;
import com.possaas.dto.request.UpdateBranchRequest;
import com.possaas.dto.response.BranchDto;
import com.possaas.dto.response.BranchSettingsResponse;
import com.possaas.service.branch.BranchService;
import com.possaas.service.manager.ManagerBranchSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/branches")
@RequiredArgsConstructor
@Tag(name = "Branches", description = "Branch/Location management APIs")
public class BranchController {

    private final BranchService branchService;
    private final ManagerBranchSettingsService settingsService;

    @PostMapping
    @PreAuthorize("hasRole('ROLE_STORE_ADMIN')")
    @Operation(summary = "Create a new branch")
    public ResponseEntity<BranchDto> createBranch(@Valid @RequestBody CreateBranchRequest request) {
        BranchDto response = branchService.createBranch(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER')")
    @Operation(summary = "Update a branch")
    public ResponseEntity<BranchDto> updateBranch(
            @PathVariable Long id,
            @Valid @RequestBody UpdateBranchRequest request) {
        BranchDto response = branchService.updateBranch(id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER', 'ROLE_CASHIER', 'ROLE_VIEWER')")
    @Operation(summary = "Get branch by ID")
    public ResponseEntity<BranchDto> getBranchById(@PathVariable Long id) {
        BranchDto response = branchService.getBranchById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER', 'ROLE_VIEWER')")
    @Operation(summary = "Get all branches with pagination")
    public Page<BranchDto> getAllBranches(
            @RequestParam(required = false) BranchStatus status,
            Pageable pageable) {
        return branchService.getAllBranches(status, pageable);
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER', 'ROLE_CASHIER', 'ROLE_VIEWER')")
    @Operation(summary = "Get all active branches")
    public ResponseEntity<List<BranchDto>> getActiveBranches() {
        List<BranchDto> response = branchService.getActiveBranches();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER')")
    @Operation(summary = "Get all branches (non-paginated)")
    public ResponseEntity<List<BranchDto>> getAllBranchesList() {
        List<BranchDto> response = branchService.getAllBranchesList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER', 'ROLE_VIEWER')")
    @Operation(summary = "Search branches by name, code, or city")
    public Page<BranchDto> searchBranches(
            @RequestParam("q") String query,
            Pageable pageable) {
        return branchService.searchBranches(query, pageable);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('STORE_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Toggle branch status (Active/Inactive)")
    public ResponseEntity<BranchDto> toggleBranchStatus(
            @PathVariable Long id,
            @RequestParam BranchStatus status) {
        BranchDto response = branchService.toggleBranchStatus(id, status);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_STORE_ADMIN')")
    @Operation(summary = "Delete a branch (soft delete)")
    public ResponseEntity<Void> deleteBranch(@PathVariable Long id) {
        branchService.deleteBranch(id);
        return ResponseEntity.noContent().build();
    }

    // =====================================================
    // BRANCH SETTINGS (Merged from ManagerBranchSettingsController)
    // =====================================================

    /**
     * Get branch settings for current manager's branch
     */
    @GetMapping("/settings")
    @PreAuthorize("hasAnyRole('ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN', 'ROLE_CASHIER')")
    @Operation(summary = "Get branch settings", description = "Get configuration settings for the manager's branch")
    @ApiResponse(responseCode = "200", description = "Settings retrieved successfully")
    public ResponseEntity<BranchSettingsResponse> getSettings(
            @RequestParam(required = false) Long branchId) {
        BranchSettingsResponse response = settingsService.getSettings(branchId);
        return ResponseEntity.ok(response);
    }

    /**
     * Update branch settings
     */
    @PutMapping("/settings")
    @PreAuthorize("hasAnyRole('ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    @Operation(summary = "Update branch settings", description = "Update configuration settings for the manager's branch")
    @ApiResponse(responseCode = "200", description = "Settings updated successfully")
    public ResponseEntity<BranchSettingsResponse> updateSettings(
            @Valid @RequestBody BranchSettingsRequest request) {
        BranchSettingsResponse response = settingsService.updateSettings(request);
        return ResponseEntity.ok(response);
    }
}
