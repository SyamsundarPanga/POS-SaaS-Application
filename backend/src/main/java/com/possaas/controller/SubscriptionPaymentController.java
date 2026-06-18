package com.possaas.controller;

import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.possaas.dto.request.CreateSubscriptionOrderRequest;
import com.possaas.dto.request.UpdateSubscriptionPaymentMethodRequest;
import com.possaas.dto.request.VerifySubscriptionPaymentRequest;
import com.possaas.dto.response.RazorpayOrderResponse;
import com.possaas.dto.response.SubscriptionPaymentDto;
import com.possaas.service.subscription.SubscriptionPaymentService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/subscription")
@RequiredArgsConstructor
public class SubscriptionPaymentController {

    private final SubscriptionPaymentService subscriptionPaymentService;

    @PostMapping("/create-order")
    @PreAuthorize("hasRole('STORE_ADMIN')")
    public ResponseEntity<RazorpayOrderResponse> createOrder(
            @Valid @RequestBody CreateSubscriptionOrderRequest request) {
        return ResponseEntity.ok(subscriptionPaymentService.createOrder(request));
    }

    @PostMapping("/verify-payment")
    @PreAuthorize("hasRole('STORE_ADMIN')")
    public ResponseEntity<SubscriptionPaymentDto> verifyPayment(
            @Valid @RequestBody VerifySubscriptionPaymentRequest request) {
        return ResponseEntity.ok(subscriptionPaymentService.verifyPayment(request));
    }

    @PostMapping("/upgrade-plan")
    @PreAuthorize("hasRole('STORE_ADMIN')")
    public ResponseEntity<RazorpayOrderResponse> upgradePlan(
            @Valid @RequestBody CreateSubscriptionOrderRequest request) {
        return ResponseEntity.ok(subscriptionPaymentService.upgradePlan(request));
    }

    @PostMapping("/payment-methods/create-order")
    @PreAuthorize("hasRole('STORE_ADMIN')")
    public ResponseEntity<RazorpayOrderResponse> createPaymentMethodUpdateOrder() {
        return ResponseEntity.ok(subscriptionPaymentService.createPaymentMethodUpdateOrder());
    }

    @PostMapping("/payment-methods/update")
    @PreAuthorize("hasRole('STORE_ADMIN')")
    public ResponseEntity<String> updatePaymentMethod(
            @Valid @RequestBody UpdateSubscriptionPaymentMethodRequest request) {
        subscriptionPaymentService.updatePaymentMethod(request);
        return ResponseEntity.ok("Payment method updated successfully");
    }

    @GetMapping("/payments/history")
    @PreAuthorize("hasRole('STORE_ADMIN')")
    public ResponseEntity<List<SubscriptionPaymentDto>> getPaymentHistory() {
        return ResponseEntity.ok(subscriptionPaymentService.getTenantPaymentHistory());
    }

    @GetMapping("/payments/{paymentId}/invoice")
    @PreAuthorize("hasRole('STORE_ADMIN')")
    public ResponseEntity<byte[]> downloadInvoice(@PathVariable Long paymentId) {
        byte[] invoiceContent = subscriptionPaymentService.generateInvoice(paymentId);
        String filename = "subscription-invoice-" + paymentId + ".pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(invoiceContent);
    }
}
