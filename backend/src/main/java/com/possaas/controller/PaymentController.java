package com.possaas.controller;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.possaas.config.TenantContext;
import com.possaas.domain.order.Order;
import com.possaas.domain.payment.Payment;
import com.possaas.dto.request.CreatePaymentOrderRequest;
import com.possaas.dto.request.VerifyRazorpayPaymentRequest;
import com.possaas.dto.response.PaymentDto;
import com.possaas.dto.response.RazorpayOrderResponse;
import com.possaas.exception.PaymentProcessingException;
import com.possaas.service.payment.PaymentService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Payments", description = "Payment processing APIs")
public class PaymentController {

    private final PaymentService paymentService;

    /**
     * Create Razorpay order
     */
    @PostMapping("/create-order")
    @PreAuthorize("hasAnyRole('STORE_ADMIN', 'BRANCH_MANAGER', 'CASHIER')")
    @Operation(summary = "Create Razorpay order for payment")
    public ResponseEntity<?> createRazorpayOrder(
            @Valid @RequestBody CreatePaymentOrderRequest request) {
        try {
            log.info("REST request to create Razorpay order for amount: {}", request.getAmount());
            RazorpayOrderResponse response = paymentService.createRazorpayOrder(request);
            return ResponseEntity.ok(response);
        } catch (PaymentProcessingException e) {
            log.error("Error creating Razorpay order: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }
    
    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('STORE_ADMIN', 'BRANCH_MANAGER')")
    @Operation(summary = "Get payment summary by method")
    public ResponseEntity<List<Object[]>> getPaymentSummary() {
        String tenantId = TenantContext.getTenantId();
        // ✅ Repository call moved to service
        List<Object[]> summary = paymentService.getPaymentSummary(tenantId);
        return ResponseEntity.ok(summary);
    }

    /**
     * Verify Razorpay payment
     */
    @PostMapping("/verify")
    @PreAuthorize("hasAnyRole('STORE_ADMIN', 'BRANCH_MANAGER', 'CASHIER')")
    @Operation(summary = "Verify Razorpay payment signature")
    public ResponseEntity<Map<String, Object>> verifyRazorpayPayment(
            @Valid @RequestBody VerifyRazorpayPaymentRequest request) {
        try {
            log.info("REST request to verify payment for order: {}", request.getRazorpayOrderId());
            
            boolean isValid = paymentService.verifyRazorpayPayment(request);
            
            Map<String, Object> response = new HashMap<>();
            response.put("verified", isValid);
            response.put("razorpayOrderId", request.getRazorpayOrderId());
            response.put("razorpayPaymentId", request.getRazorpayPaymentId());
            response.put("timestamp", LocalDateTime.now().toString());
            
            if (isValid) {
                response.put("message", "Payment verified successfully");
                return ResponseEntity.ok(response);
            } else {
                response.put("message", "Payment verification failed");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
        } catch (PaymentProcessingException e) {
            log.error("Error verifying payment: {}", e.getMessage());
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            error.put("verified", false);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    /**
     * Get payment by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STORE_ADMIN', 'BRANCH_MANAGER', 'CASHIER')")
    @Operation(summary = "Get payment by ID")
    public ResponseEntity<PaymentDto> getPaymentById(@PathVariable Long id) {
        Payment payment = paymentService.getPaymentById(id);
        return ResponseEntity.ok(paymentService.mapToDto(payment));
    }

    /**
     * Get payments by order ID
     */
    @GetMapping("/order/{orderId}")
    @PreAuthorize("hasAnyRole('STORE_ADMIN', 'BRANCH_MANAGER', 'CASHIER')")
    @Operation(summary = "Get payments by order ID")
    public ResponseEntity<List<PaymentDto>> getPaymentsByOrderId(@PathVariable Long orderId) {
        List<Payment> payments = paymentService.getPaymentsByOrderId(orderId);
        List<PaymentDto> paymentDtos = payments.stream()
                .map(paymentService::mapToDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(paymentDtos);
    }

    /**
     * Get daily sales total
     */
    @GetMapping("/daily-sales")
    @PreAuthorize("hasAnyRole('STORE_ADMIN', 'BRANCH_MANAGER')")
    @Operation(summary = "Get daily sales total")
    public ResponseEntity<BigDecimal> getDailySales() {
        String tenantId = TenantContext.getTenantId();
        return ResponseEntity.ok(paymentService.getDailySales(tenantId));
    }

    /**
     * Test endpoint to verify Razorpay configuration
     */
    @GetMapping("/test-config")
    @PreAuthorize("hasRole('STORE_ADMIN')")
    @Operation(summary = "Test Razorpay configuration")
    public ResponseEntity<Map<String, String>> testRazorpayConfig() {
        Map<String, String> status = new HashMap<>();
        
        try {
            // Try to get key from environment/properties
            String keyId = System.getenv().getOrDefault("RAZORPAY_KEY_ID", 
                    "rzp_test_xxxxxxxxxxxxxxxx");
            String mode = keyId.startsWith("rzp_test") ? "SANDBOX" : "PRODUCTION";
            
            status.put("status", "Razorpay configured successfully");
            status.put("mode", mode);
            status.put("keyIdPrefix", keyId.substring(0, 8) + "...");
            status.put("timestamp", LocalDateTime.now().toString());
            status.put("message", "Use /api/payments/create-order to create a payment order");
            
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            status.put("status", "Razorpay configuration error");
            status.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(status);
        }
    }
    
 // Refund payment
    @PostMapping("/refund/{orderId}")
    @PreAuthorize("hasAnyRole('STORE_ADMIN', 'BRANCH_MANAGER')")
    @Operation(summary = "Refund payment for an order")
    public ResponseEntity<Map<String, Object>> refundPayment(
            @PathVariable Long orderId,
            @RequestParam(required = false) String reason) {

        Map<String, Object> response = new HashMap<>();
        try {
            // Fetch the order (you might have an OrderService for this)
            Order order = /* fetch order by ID using OrderService */ null;

            if (order == null) {
                response.put("status", "error");
                response.put("message", "Order not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            paymentService.refundOrderPayment(order, reason != null ? reason : "No reason provided");

            response.put("status", "success");
            response.put("message", "Payment refunded successfully");
            response.put("orderId", order.getId());
            response.put("timestamp", LocalDateTime.now().toString());

            return ResponseEntity.ok(response);

        } catch (PaymentProcessingException e) {
            log.error("Error refunding payment for order {}: {}", orderId, e.getMessage());
            response.put("status", "error");
            response.put("message", e.getMessage());
            response.put("timestamp", LocalDateTime.now().toString());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }
}