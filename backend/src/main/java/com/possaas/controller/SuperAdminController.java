package com.possaas.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.possaas.dto.request.SuperAdminLoginRequest;
import com.possaas.dto.response.SuperAdminDashboardResponse;
import com.possaas.dto.response.SuperAdminLoginResponse;
import com.possaas.dto.response.TenantOverviewResponse;
import com.possaas.service.superadmin.SuperAdminService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/superadmin")
@RequiredArgsConstructor
@Tag(name = "SuperAdmin", description = "Platform owner management APIs")
public class SuperAdminController {

    private final SuperAdminService superAdminService;

    @PostMapping("/login")
    @Operation(summary = "SuperAdmin login", description = "Authenticate SuperAdmin without tenant context")
    public ResponseEntity<SuperAdminLoginResponse> login(@Valid @RequestBody SuperAdminLoginRequest request) {
        SuperAdminLoginResponse response = superAdminService.login(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Get SuperAdmin dashboard", description = "Platform-wide statistics and metrics")
    public ResponseEntity<SuperAdminDashboardResponse> getDashboard() {
        SuperAdminDashboardResponse response = superAdminService.getDashboardStats();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/tenants")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Get all tenants", description = "List all tenants with subscription details")
    public ResponseEntity<Page<TenantOverviewResponse>> getAllTenants(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<TenantOverviewResponse> tenants = superAdminService.getAllTenants(pageable);
        return ResponseEntity.ok(tenants);
    }

    @GetMapping("/tenants/{tenantId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Get tenant details", description = "Detailed view of specific tenant")
    public ResponseEntity<TenantOverviewResponse> getTenantById(@PathVariable String tenantId) {
        TenantOverviewResponse tenant = superAdminService.getTenantById(tenantId);
        return ResponseEntity.ok(tenant);
    }

    @PostMapping("/tenants/{tenantId}/toggle-status")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Toggle tenant status", description = "Activate or deactivate a tenant")
    public ResponseEntity<Void> toggleTenantStatus(@PathVariable String tenantId) {
        superAdminService.toggleTenantStatus(tenantId);
        return ResponseEntity.ok().build();
    }
}
