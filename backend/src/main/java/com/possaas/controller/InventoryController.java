package com.possaas.controller;

import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.possaas.dto.request.StockAdjustmentRequest;
import com.possaas.dto.request.StockTransferRequest;
import com.possaas.dto.request.UpdateThresholdRequest;
import com.possaas.dto.response.BranchDto;
import com.possaas.dto.response.InventoryDto;
import com.possaas.dto.response.InventoryReportDto;
import com.possaas.dto.response.InventoryValuationResponse;
import com.possaas.dto.response.LowStockAlertDto;
import com.possaas.service.inventory.InventoryService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import java.util.List;
import com.possaas.dto.response.StockTransferResponse;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
@Tag(name = "Inventory", description = "Inventory management APIs")
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN','ROLE_CASHIER','ROLE_BRANCH_MANAGER','ROLE_VIEWER')")
    @Operation(summary = "Get all inventory", description = "Returns paginated inventory list including product details. "
            +
            "Accessible by STORE_ADMIN, CASHIER, BRANCH_MANAGER, and VIEWER roles.", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Inventory fetched successfully", content = @Content(mediaType = "application/json", schema = @Schema(implementation = InventoryDto.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Invalid or missing JWT token"),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    public Page<InventoryDto> getAllInventory(
            @RequestParam(value = "branchId", required = false) Long branchId,
            @Parameter(description = "Pagination parameters (page, size, sort). Example: page=0&size=10&sort=productName,asc", in = ParameterIn.QUERY) @ParameterObject Pageable pageable) {
        return inventoryService.getAllInventory(branchId, pageable);
    }

    @GetMapping("/branch/{branchId}")
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER', 'ROLE_CASHIER', 'ROLE_VIEWER')")
    @Operation(summary = "Get inventory for a specific branch")
    public Page<InventoryDto> getInventoryByBranch(
            @PathVariable Long branchId,
            @ParameterObject Pageable pageable) {
        return inventoryService.getInventoryByBranch(branchId, pageable);
    }

    @GetMapping("/product/{productId}/branch/{branchId}")
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER', 'ROLE_CASHIER', 'ROLE_VIEWER')")
    @Operation(summary = "Get inventory for a specific product at a branch")
    public ResponseEntity<InventoryDto> getInventoryByProductAndBranch(
            @PathVariable Long productId,
            @PathVariable Long branchId) {
        InventoryDto response = inventoryService.getInventoryByProductAndBranch(productId, branchId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/low-stock")
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER')")
    @Operation(summary = "Get low stock alerts across all branches or a specific branch")
    public ResponseEntity<List<LowStockAlertDto>> getLowStockAlerts(
            @RequestParam(value = "branchId", required = false) Long branchId) {
        List<LowStockAlertDto> response = branchId != null
                ? inventoryService.getLowStockAlertsByBranch(branchId)
                : inventoryService.getLowStockAlerts();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/report")
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER')")
    @Operation(summary = "Get inventory report filtered by category")
    public ResponseEntity<List<InventoryReportDto>> getInventoryReportByCategory(
            @RequestParam("categoryId") Long categoryId,
            @RequestParam(value = "branchId", required = false) Long branchId) {
        List<InventoryReportDto> response = inventoryService.getInventoryReportByCategory(categoryId, branchId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/valuation")
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER')")
    @Operation(summary = "Get inventory valuation report")
    public ResponseEntity<InventoryValuationResponse> getInventoryValuation(
            @RequestParam(value = "branchId", required = false) Long branchId) {
        InventoryValuationResponse response = inventoryService.getInventoryValuation(branchId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/low-stock/branch/{branchId}")
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER')")
    @Operation(summary = "Get low stock alerts for a specific branch")
    public ResponseEntity<List<LowStockAlertDto>> getLowStockAlertsByBranch(@PathVariable Long branchId) {
        List<LowStockAlertDto> response = inventoryService.getLowStockAlertsByBranch(branchId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/adjust")
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER', 'ROLE_CASHIER')")
    @Operation(summary = "Adjust stock (add/remove/write-off)")
    public ResponseEntity<InventoryDto> adjustStock(@Valid @RequestBody StockAdjustmentRequest request) {
        InventoryDto response = inventoryService.adjustStock(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/request-adjustment")
    @PreAuthorize("hasRole('ROLE_CASHIER')")
    @Operation(summary = "Request stock adjustment approval")
    public ResponseEntity<Void> requestAdjustment(@Valid @RequestBody StockAdjustmentRequest request) {
        inventoryService.requestAdjustment(request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/transfer")
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER')")
    @Operation(summary = "Transfer stock between branches")
    public ResponseEntity<Void> transferStock(@Valid @RequestBody StockTransferRequest request) {
        inventoryService.transferStock(request);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/threshold")
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER')")
    @Operation(summary = "Update low stock threshold per product/branch")
    public ResponseEntity<InventoryDto> updateLowStockThreshold(
            @Valid @RequestBody UpdateThresholdRequest request) {
        InventoryDto response = inventoryService.updateLowStockThreshold(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/transfers")
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER')")
    @Operation(summary = "Get stock transfer history", description = "Get paginated list of stock transfers for the current branch or all branches (admin)")
    public ResponseEntity<Page<com.possaas.dto.response.StockTransferResponse>> getTransferHistory(
            @RequestParam(required = false) Long branchId,
            @ParameterObject Pageable pageable) {
        Page<com.possaas.dto.response.StockTransferResponse> response = inventoryService.getTransferHistory(branchId, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/transfer/branches")
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER')")
    @Operation(summary = "Get all tenant branches for stock transfer destination")
    public ResponseEntity<List<BranchDto>> getTransferBranches() {
        List<BranchDto> response = inventoryService.getTransferBranches();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/product/{productId}/stock")
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER', 'ROLE_CASHIER', 'ROLE_VIEWER')")
    @Operation(summary = "Get current stock for a product")
    public ResponseEntity<Integer> getCurrentStock(@PathVariable Long productId) {
        Integer stock = inventoryService.getCurrentStock(productId);
        return ResponseEntity.ok(stock);
    }

    @GetMapping("/dead-stock")
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER')")
    @Operation(summary = "Get dead stock items", description = "Get products with no sales in the last N days (default 90 days)")
    public ResponseEntity<List<InventoryDto>> getDeadStockItems(
            @RequestParam(value = "days", defaultValue = "90") int days,
            @RequestParam(value = "branchId", required = false) Long branchId) {
        List<InventoryDto> response = inventoryService.getDeadStockItems(days, branchId);
        return ResponseEntity.ok(response);
    }
}
