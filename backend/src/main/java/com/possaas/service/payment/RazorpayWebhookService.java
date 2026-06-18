package com.possaas.service.payment;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.possaas.domain.order.OrderStatus;
import com.possaas.domain.payment.Payment;
import com.possaas.domain.payment.PaymentStatus;
import com.possaas.domain.payment.PaymentWebhookEvent;
import com.possaas.domain.payment.PaymentWebhookProcessingStatus;
import com.possaas.domain.tenant.Subscription;
import com.possaas.domain.tenant.SubscriptionPayment;
import com.possaas.domain.tenant.SubscriptionPaymentStatus;
import com.possaas.domain.tenant.SubscriptionStatus;
import com.possaas.repository.PaymentRepository;
import com.possaas.repository.PaymentWebhookEventRepository;
import com.possaas.repository.SubscriptionPaymentRepository;
import com.possaas.repository.SubscriptionRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class RazorpayWebhookService {

    private final ObjectMapper objectMapper;
    private final PaymentWebhookEventRepository webhookEventRepository;
    private final PaymentRepository paymentRepository;
    private final SubscriptionPaymentRepository subscriptionPaymentRepository;
    private final SubscriptionRepository subscriptionRepository;

    @Value("${app.razorpay.key.secret}")
    private String razorpaySecret;

    @Transactional
    public String processWebhook(String signature, String payload) {
        String payloadHash = sha256(payload);
        JsonNode root = parse(payload);
        String eventId = text(root, "payload", "payment", "entity", "id");
        String eventType = root.path("event").asText("");

        if (!verifySignature(signature, payload)) {
            saveEvent("invalid_" + System.currentTimeMillis(), eventType, payloadHash,
                    PaymentWebhookProcessingStatus.FAILED);
            return "invalid_signature";
        }
        if (eventId.isBlank()) {
            saveEvent("unknown_" + System.currentTimeMillis(), eventType, payloadHash,
                    PaymentWebhookProcessingStatus.FAILED);
            return "invalid_payload";
        }
        if (webhookEventRepository.existsByEventId(eventId + ":" + eventType)) {
            return "duplicate";
        }

        if ("payment.captured".equals(eventType)) {
            handlePaymentCaptured(root);
        } else if ("payment.failed".equals(eventType)) {
            handlePaymentFailed(root);
        } else if ("payment_intent.succeeded".equals(eventType)) {
            handlePaymentIntentSucceeded(root);
        }

        saveEvent(eventId + ":" + eventType, eventType, payloadHash, PaymentWebhookProcessingStatus.PROCESSED);
        return "processed";
    }

    private void handlePaymentCaptured(JsonNode root) {
        JsonNode paymentNode = root.path("payload").path("payment").path("entity");
        String paymentId = paymentNode.path("id").asText("");
        if (paymentId.isBlank()) {
            return;
        }

        Optional<Payment> paymentOpt = paymentRepository.findByTransactionId(paymentId);
        paymentOpt.ifPresent(payment -> {
            payment.setStatus(PaymentStatus.SUCCESS);
            if (payment.getOrder() != null) {
                payment.getOrder().setStatus(OrderStatus.COMPLETED);
            }
        });

        Optional<SubscriptionPayment> subPayOpt = subscriptionPaymentRepository.findByRazorpayPaymentId(paymentId);
        subPayOpt.ifPresent(sp -> {
            sp.setPaymentStatus(SubscriptionPaymentStatus.SUCCESS);
            subscriptionRepository.findByTenantId(sp.getTenantId()).ifPresent(sub -> {
                sub.setStatus(SubscriptionStatus.ACTIVE);
                sub.setGracePeriodEndDate(null);
                sub.setRetryCount(0);
                sub.setNextRetryAt(null);
                sub.setNextBillingDate(LocalDateTime.now().plusMonths(1));
            });
        });
    }

    private void handlePaymentFailed(JsonNode root) {
        JsonNode paymentNode = root.path("payload").path("payment").path("entity");
        String paymentId = paymentNode.path("id").asText("");
        String orderId = paymentNode.path("order_id").asText("");

        if (!paymentId.isBlank()) {
            paymentRepository.findByTransactionId(paymentId).ifPresent(p -> p.setStatus(PaymentStatus.FAILED));
            subscriptionPaymentRepository.findByRazorpayPaymentId(paymentId).ifPresent(sp -> {
                sp.setPaymentStatus(SubscriptionPaymentStatus.FAILED);
                subscriptionRepository.findByTenantId(sp.getTenantId()).ifPresent(sub -> {
                    sub.setStatus(SubscriptionStatus.PAST_DUE);
                    sub.setGracePeriodEndDate(LocalDateTime.now().plusDays(7));
                    sub.setNextRetryAt(LocalDateTime.now().plusDays(1));
                    sub.setRetryCount(0);
                });
            });
        }

        if (!orderId.isBlank()) {
            subscriptionPaymentRepository.findByRazorpayOrderId(orderId).ifPresent(sp -> {
                sp.setPaymentStatus(SubscriptionPaymentStatus.FAILED);
                subscriptionRepository.findByTenantId(sp.getTenantId()).ifPresent(sub -> {
                    sub.setStatus(SubscriptionStatus.PAST_DUE);
                    sub.setGracePeriodEndDate(LocalDateTime.now().plusDays(7));
                    sub.setNextRetryAt(LocalDateTime.now().plusDays(1));
                    sub.setRetryCount(0);
                });
            });
        }
    }

    private JsonNode parse(String payload) {
        try {
            return objectMapper.readTree(payload);
        } catch (Exception ex) {
            throw new IllegalStateException("Invalid webhook payload");
        }
    }

    private boolean verifySignature(String signature, String payload) {
        try {
            Mac sha256Hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(razorpaySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256Hmac.init(secretKey);
            byte[] hash = sha256Hmac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String expected = HexFormat.of().formatHex(hash);
            return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),
                    (signature == null ? "" : signature).getBytes(StandardCharsets.UTF_8));
        } catch (Exception ex) {
            log.warn("Failed to verify webhook signature", ex);
            return false;
        }
    }

    private String sha256(String payload) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            return "hash_error";
        }
    }

    private void saveEvent(String eventId, String eventType, String payloadHash,
            PaymentWebhookProcessingStatus status) {
        PaymentWebhookEvent event = new PaymentWebhookEvent();
        event.setEventId(eventId);
        event.setEventType(eventType == null || eventType.isBlank() ? "unknown" : eventType);
        event.setPayloadHash(payloadHash);
        event.setProcessingStatus(status);
        event.setProcessedAt(LocalDateTime.now());
        webhookEventRepository.save(event);
    }

    private String text(JsonNode node, String... path) {
        JsonNode curr = node;
        for (String p : path) {
            curr = curr.path(p);
        }
        return curr.asText("");
    }

    private void handlePaymentIntentSucceeded(JsonNode root) {
        JsonNode paymentNode = root.path("payload").path("payment_intent").path("entity");
        String paymentId = paymentNode.path("id").asText("");
        if (paymentId.isBlank()) {
            return;
        }

        // Handle regular POS payments
        Optional<Payment> paymentOpt = paymentRepository.findByTransactionId(paymentId);
        paymentOpt.ifPresent(payment -> {
            payment.setStatus(PaymentStatus.SUCCESS);
            if (payment.getOrder() != null) {
                // Set to COMPLETED since there's no PAID status in OrderStatus enum
                payment.getOrder().setStatus(OrderStatus.COMPLETED);
            }
        });

        // Handle subscription payments
        Optional<SubscriptionPayment> subPayOpt = subscriptionPaymentRepository.findByRazorpayPaymentId(paymentId);
        subPayOpt.ifPresent(sp -> {
            sp.setPaymentStatus(SubscriptionPaymentStatus.SUCCESS);
            subscriptionRepository.findByTenantId(sp.getTenantId()).ifPresent(sub -> {
                sub.setStatus(SubscriptionStatus.ACTIVE);
                sub.setGracePeriodEndDate(null);
                sub.setRetryCount(0);
                sub.setNextRetryAt(null);
                sub.setNextBillingDate(LocalDateTime.now().plusMonths(1));
            });
        });
    }
}