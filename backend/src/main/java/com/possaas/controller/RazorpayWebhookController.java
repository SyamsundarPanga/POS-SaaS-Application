package com.possaas.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.possaas.service.payment.RazorpayWebhookService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/webhooks/razorpay")
@RequiredArgsConstructor
public class RazorpayWebhookController {

    private final RazorpayWebhookService razorpayWebhookService;

    @PostMapping
    public ResponseEntity<Map<String, String>> handleWebhook(
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature,
            @RequestBody String payload) {
        String status = razorpayWebhookService.processWebhook(signature, payload);
        return ResponseEntity.ok(Map.of("status", status));
    }
}
