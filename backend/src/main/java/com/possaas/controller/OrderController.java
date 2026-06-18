package com.possaas.controller;

import java.time.LocalDateTime;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import com.possaas.dto.request.CreateOrderRequest;
import com.possaas.dto.request.RefundRequest;
import com.possaas.dto.request.ValidateDiscountRequest;
import com.possaas.dto.request.VoidRequestDecisionRequest;
import com.possaas.dto.response.OrderDetailDto;
import com.possaas.dto.response.OrderDto;
import com.possaas.dto.response.OrderSummaryDto;
import com.possaas.dto.response.ValidateDiscountResponse;
import com.possaas.security.service.UserDetailsImpl;
import com.possaas.service.order.OrderService;
import com.possaas.service.manager.ManagerOrderService;

import java.time.LocalDate;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Tag(name = "Order Controller", description = "APIs, for managing point-of-sale orders")
public class OrderController {

    private final OrderService orderService;
    private final ManagerOrderService managerOrderService;

    @PostMapping
    @PreAuthorize("hasAnyRole('STORE_ADMIN', 'BRANCH_MANAGER', 'CASHIER')")
    @Operation(summary = "Create a new order", description = "Processes a checkout and generates an order with line items.")
    @ApiResponse(responseCode = "201", description = "Order created successfully")
    public ResponseEntity<OrderDto> createOrder(
            @Valid @RequestBody CreateOrderRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        OrderDto response = orderService.createOrder(request, request.getCustomerId(), userDetails.getId());
        // return ResponseEntity.ok(response);
        return ResponseEntity.status(201).body(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('STORE_ADMIN', 'BRANCH_MANAGER', 'CASHIER')")
    @Operation(summary = "Get paginated orders", description = "Retrives a summary list of order with optional date range filtering.")
    public ResponseEntity<Page<OrderSummaryDto>> getAllOrders(
            @Parameter(description = "Start date filter(ISO format: YYYY-MM-DDTHH:mm:ss", example = "2026-02-01T00:00:00") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,

            @Parameter(description = "End date filter (ISO format: YYYY-MM-DDTHH:mm:ss)", example = "2026-02-28T23:59:59") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(required = false) Long branchId,
            Pageable pageable) {

        // Returns the optimized Summary Page
        Page<OrderSummaryDto> orders = orderService.getAllOrders(startDate, endDate, branchId, pageable);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STORE_ADMIN', 'BRANCH_MANAGER', 'CASHIER')")
    @Operation(summary = "Get order details by ID", description = "Fetch full details including line items and payment info for a specific order.")
    @ApiResponse(responseCode = "200", description = "Order found")
    @ApiResponse(responseCode = "404", description = "Order not fount")
    public ResponseEntity<OrderDetailDto> getOrderById(@PathVariable Long id) {
        OrderDetailDto order = orderService.getOrderById(id);
        return ResponseEntity.ok(order);
    }

    /**
     * Split payment endpoint - Process order with multiple payment methods
     */
    @PostMapping("/split-payment")
    @PreAuthorize("hasAnyRole('ROLE_CASHIER', 'ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    @Operation(summary = "Process split payment order", description = "Create an order with multiple payment methods (e.g., partial cash + partial card)")
    @ApiResponse(responseCode = "201", description = "Order created with split payments")
    public ResponseEntity<OrderDto> createSplitPaymentOrder(
            @Valid @RequestBody com.possaas.dto.request.SplitPaymentRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        OrderDto response = orderService.createSplitPaymentOrder(request, userDetails.getId());
        return ResponseEntity.status(201).body(response);
    }

    /**
     * Void transaction endpoint - Requires manager approval
     */
    @PostMapping("/{id}/void")
    @PreAuthorize("hasAnyRole('ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    @Operation(summary = "Void transaction", description = "Void/cancel a transaction (requires manager approval)")
    @ApiResponse(responseCode = "200", description = "Transaction voided successfully")
    public ResponseEntity<OrderDto> voidTransaction(
            @PathVariable Long id,
            @Valid @RequestBody com.possaas.dto.request.VoidTransactionRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        OrderDto response = orderService.voidTransaction(id, request, userDetails.getId());
        return ResponseEntity.ok(response);
    }

    /**
     * Get orders for the authenticated cashier
     */
    @GetMapping("/my-orders")
    @PreAuthorize("hasAnyAuthority('ROLE_CASHIER', 'ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    @Operation(summary = "Get current cashier's orders", description = "Retrieves order history for the logged-in cashier.")
    public ResponseEntity<Page<OrderSummaryDto>> getMyOrders(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            Pageable pageable) {
        Page<OrderSummaryDto> orders = orderService.getMyOrders(userDetails.getId(), startDate, endDate, pageable);
        return ResponseEntity.ok(orders);
    }

    /**
     * Export orders for the authenticated cashier
     */
    @GetMapping("/my-orders/export")
    @PreAuthorize("hasAnyAuthority('ROLE_CASHIER', 'ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    @Operation(summary = "Export current cashier's orders to CSV or PDF")
    public ResponseEntity<Resource> exportMyOrders(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        Resource resource = orderService.exportMyOrders(
                userDetails.getId(), format, status, startDate, endDate);

        String filename = "my_orders_" + LocalDate.now() + "." + format;
        String contentType;
        if ("pdf".equalsIgnoreCase(format)) {
            contentType = "application/pdf";
        } else if ("csv".equalsIgnoreCase(format)) {
            contentType = "text/csv";
        } else {
            contentType = "application/octet-stream";
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(resource);
    }

    /**
     * Process refund - can be partial or full
     */
    @PostMapping("/refund")
    @PreAuthorize("hasAnyAuthority('ROLE_CASHIER', 'ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    @Operation(summary = "Process order refund", description = "Refund specific items or whole order")
    public ResponseEntity<OrderDto> processRefund(
            @Valid @RequestBody com.possaas.dto.request.RefundRequest request) {
        OrderDto response = orderService.processRefund(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refund-request")
    @PreAuthorize("hasRole('CASHIER')")
    @Operation(summary = "Request refund approval", description = "Creates manager approval request for refunding a completed order")
    public ResponseEntity<Map<String, String>> requestRefundApproval(
            @Valid @RequestBody com.possaas.dto.request.RefundRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        orderService.requestRefundApproval(request, userDetails.getId());
        return ResponseEntity.ok(Map.of("message", "Refund request sent to manager for approval"));
    }

    @PostMapping("/validate-discount")
    @PreAuthorize("hasAnyAuthority('ROLE_CASHIER', 'ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    @Operation(summary = "Validate discount request", description = "Validates if discount is allowed for branch rules")
    public ResponseEntity<ValidateDiscountResponse> validateDiscount(
            @Valid @RequestBody ValidateDiscountRequest request) {
        return ResponseEntity.ok(orderService.validateDiscount(request));
    }

    /**
     * Cashier endpoint: create void approval request
     */
    @PostMapping("/void-request")
    @PreAuthorize("hasRole('CASHIER')")
    @Operation(summary = "Request void approval", description = "Creates manager approval request for voiding a completed order in same shift")
    public ResponseEntity<Map<String, String>> requestVoidApproval(
            @Valid @RequestBody com.possaas.dto.request.VoidTransactionRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        orderService.requestVoidApproval(request.getOrderId(), request, userDetails.getId());
        return ResponseEntity.ok(Map.of("message", "Void request sent to manager for approval"));
    }

    @PostMapping("/void-requests/{id}/approve")
    @PreAuthorize("hasRole('BRANCH_MANAGER')")
    @Operation(summary = "Approve void request", description = "Approves pending void request and restores inventory")
    public ResponseEntity<OrderDto> approveVoidRequest(
            @PathVariable Long id,
            @RequestBody(required = false) VoidRequestDecisionRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        String comment = request != null ? request.getComment() : null;
        return ResponseEntity.ok(orderService.approveVoidRequest(id, userDetails.getId(), comment));
    }

    @PostMapping("/void-requests/{id}/decline")
    @PreAuthorize("hasRole('BRANCH_MANAGER')")
    @Operation(summary = "Decline void request", description = "Declines pending void request")
    public ResponseEntity<Map<String, String>> declineVoidRequest(
            @PathVariable Long id,
            @RequestBody(required = false) VoidRequestDecisionRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        String comment = request != null ? request.getComment() : null;
        orderService.declineVoidRequest(id, userDetails.getId(), comment);
        return ResponseEntity.ok(Map.of("message", "Void request declined"));
    }

    @PostMapping("/refund-requests/{id}/approve")
    @PreAuthorize("hasRole('BRANCH_MANAGER')")
    @Operation(summary = "Approve refund request", description = "Approves pending refund request and processes inventory/payment updates")
    public ResponseEntity<OrderDto> approveRefundRequest(
            @PathVariable Long id,
            @RequestBody(required = false) VoidRequestDecisionRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        String comment = request != null ? request.getComment() : null;
        return ResponseEntity.ok(orderService.approveRefundRequest(id, userDetails.getId(), comment));
    }

    @PostMapping("/refund-requests/{id}/decline")
    @PreAuthorize("hasRole('BRANCH_MANAGER')")
    @Operation(summary = "Decline refund request", description = "Declines pending refund request")
    public ResponseEntity<Map<String, String>> declineRefundRequest(
            @PathVariable Long id,
            @RequestBody(required = false) VoidRequestDecisionRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        String comment = request != null ? request.getComment() : null;
        orderService.declineRefundRequest(id, userDetails.getId(), comment);
        return ResponseEntity.ok(Map.of("message", "Refund request declined"));
    }

    /**
     * Email receipt endpoint - body based
     */
    @PostMapping("/email-receipt")
    @PreAuthorize("hasAnyRole('ROLE_CASHIER', 'ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    @Operation(summary = "Email receipt (Body based)", description = "Send receipt via email using request body")
    public ResponseEntity<Void> emailReceiptBody(
            @RequestBody java.util.Map<String, Object> payload) {
        Long orderId = Long.valueOf(payload.get("orderId").toString());
        String email = payload.get("email").toString();
        orderService.emailReceipt(orderId, email);
        return ResponseEntity.ok().build();
    }

    // =====================================================
    // MANAGER ORDERS (Merged from ManagerOrderController)
    // =====================================================

    /**
     * Get orders for manager's branch with filters
     */
    @GetMapping("/manager")
    @PreAuthorize("hasAnyRole('BRANCH_MANAGER', 'STORE_ADMIN')")
    @Operation(summary = "Get orders for branch with filters")
    public ResponseEntity<Page<OrderSummaryDto>> getManagerOrders(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String paymentMethod,
            @RequestParam(required = false) Long cashierId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Pageable pageable) {

        return ResponseEntity.ok(managerOrderService.getOrders(
                search, status, paymentMethod, cashierId, startDate, endDate, pageable));
    }

    /**
     * Export orders to CSV/Excel
     */
    @GetMapping("/manager/export")
    @PreAuthorize("hasAnyRole('BRANCH_MANAGER', 'STORE_ADMIN')")
    @Operation(summary = "Export orders to CSV or Excel")
    public ResponseEntity<Resource> exportOrders(
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String paymentMethod,
            @RequestParam(required = false) Long cashierId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        Resource resource = managerOrderService.exportOrders(
                format, status, paymentMethod, cashierId, startDate, endDate);

        String filename = "orders_" + LocalDate.now() + "." + format;
        String contentType;
        if ("pdf".equalsIgnoreCase(format)) {
            contentType = "application/pdf";
        } else if ("csv".equalsIgnoreCase(format)) {
            contentType = "text/csv";
        } else {
            contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(resource);
    }

    /**
     * Process refund (manager version)
     */
    @PostMapping("/manager/{id}/refund")
    @PreAuthorize("hasAnyRole('BRANCH_MANAGER', 'STORE_ADMIN')")
    @Operation(summary = "Process order refund (manager)")
    public ResponseEntity<OrderDto> processManagerRefund(
            @PathVariable Long id,
            @Valid @RequestBody RefundRequest request) {

        return ResponseEntity.ok(managerOrderService.processRefund(id, request));
    }
}
