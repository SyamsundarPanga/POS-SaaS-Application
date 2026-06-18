package com.possaas.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.possaas.config.TenantContext;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.dto.response.RazorpayOrderResponse;
import com.possaas.dto.response.SubscriptionLimitsResponse;
import com.possaas.dto.response.SubscriptionPlanResponse;
import com.possaas.dto.response.SubscriptionStatusResponse;
import com.possaas.dto.response.SubscriptionUsageResponse;
import com.possaas.service.tenant.SubscriptionService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/subscription")
@RequiredArgsConstructor
public class SubscriptionPlanController {

    private final SubscriptionService subscriptionService;

    @GetMapping("/current")
    @PreAuthorize("hasRole('STORE_ADMIN')")
    public ResponseEntity<SubscriptionPlanResponse> getCurrentPlan() {
        SubscriptionPlan plan = subscriptionService.getCurrentPlan();

        SubscriptionPlanResponse response = SubscriptionPlanResponse.builder()
                .id(plan.getId())
                .planType(plan.getPlanType())
                .maxBranches(plan.getMaxBranches())
                .maxUsers(plan.getMaxUsers())
                .maxProducts(plan.getMaxProducts())
                .monthlyPrice(plan.getMonthlyPrice())
                .build();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/limits")
    @PreAuthorize("hasRole('STORE_ADMIN')")
    public ResponseEntity<SubscriptionLimitsResponse> getLimits() {
        SubscriptionLimitsResponse response = new SubscriptionLimitsResponse(
                subscriptionService.getMaxUsersForCurrentTenant(),
                subscriptionService.getMaxBranchesForCurrentTenant(),
                subscriptionService.getMaxProductsForCurrentTenant());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/usage")
    @PreAuthorize("hasRole('STORE_ADMIN')")
    public ResponseEntity<SubscriptionUsageResponse> getUsageStatistics() {
        return ResponseEntity.ok(subscriptionService.getUsageStatistics());
    }

    @PostMapping("/upgrade/{planId}")
    @PreAuthorize("hasRole('STORE_ADMIN')")
    public ResponseEntity<RazorpayOrderResponse> upgrade(@PathVariable String planId) {
        RazorpayOrderResponse response = subscriptionService.initiateUpgrade(planId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/plans")
    @PreAuthorize("hasRole('STORE_ADMIN')")
    public ResponseEntity<List<SubscriptionPlanResponse>> getAllPlans() {
        List<SubscriptionPlanResponse> plans = subscriptionService.getAllPlans().stream()
                .map(plan -> SubscriptionPlanResponse.builder()
                        .id(plan.getId())
                        .planType(plan.getPlanType())
                        .maxBranches(plan.getMaxBranches())
                        .maxUsers(plan.getMaxUsers())
                        .maxProducts(plan.getMaxProducts())
                        .monthlyPrice(plan.getMonthlyPrice())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(plans);
    }

    @PostMapping("/refresh-usage")
    @PreAuthorize("hasRole('STORE_ADMIN')")
    public ResponseEntity<String> refreshUsage() {
        subscriptionService.syncUsageFromDatabase();
        return ResponseEntity.ok("Usage refreshed successfully.");
    }

    @PostMapping("/subscribe/{planId}")
    @PreAuthorize("hasRole('STORE_ADMIN')")
    public ResponseEntity<RazorpayOrderResponse> subscribe(@PathVariable String planId) {
        RazorpayOrderResponse response = subscriptionService.initiateSubscription(planId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/activate/{tenantId}")
    public ResponseEntity<String> activateSubscription(@PathVariable String tenantId) {
        subscriptionService.activateSubscription(tenantId);
        return ResponseEntity.ok("Subscription activated successfully");
    }

    @PutMapping("/cancel")
    @PreAuthorize("hasRole('STORE_ADMIN')")
    public ResponseEntity<String> cancelSubscription() {
        subscriptionService.cancelSubscription();
        return ResponseEntity.ok("Subscription cancellation scheduled for end of current billing cycle");
    }

    @PutMapping("/reactivate")
    @PreAuthorize("hasRole('STORE_ADMIN')")
    public ResponseEntity<String> reactivateSubscription() {
        subscriptionService.reactivateSubscription();
        return ResponseEntity.ok("Subscription reactivated successfully");
    }

    @GetMapping("/status")
    @PreAuthorize("hasRole('STORE_ADMIN')")
    public ResponseEntity<SubscriptionStatusResponse> getSubscriptionStatus() {
        return ResponseEntity.ok(subscriptionService.getCurrentSubscriptionStatus());
    }

    @PostMapping("/upgrade/activate/{planId}")
    @PreAuthorize("hasRole('ROLE_STORE_ADMIN')")
    public ResponseEntity<String> activateUpgrade(@PathVariable String planId) {
        String tenantId = TenantContext.getTenantId();
        subscriptionService.activateUpgrade(tenantId, planId);
        return ResponseEntity.ok("Upgrade activated successfully");
    }
}
