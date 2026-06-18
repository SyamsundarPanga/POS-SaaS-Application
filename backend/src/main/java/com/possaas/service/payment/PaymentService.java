package com.possaas.service.payment;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.possaas.config.TenantContext;
import com.possaas.domain.order.Order;
import com.possaas.domain.payment.Payment;
import com.possaas.domain.payment.PaymentMethod;
import com.possaas.domain.payment.PaymentStatus;
import com.possaas.dto.request.CreatePaymentOrderRequest;
import com.possaas.dto.request.VerifyRazorpayPaymentRequest;
import com.possaas.dto.response.PaymentDto;
import com.possaas.dto.response.RazorpayOrderResponse;
import com.possaas.exception.PaymentProcessingException;
import com.possaas.exception.ResourceNotFoundException;
import com.possaas.repository.PaymentRepository;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Refund;
import com.razorpay.Utils;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final RazorpayClient razorpayClient;

    @Value("${app.razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${app.razorpay.key.secret}")
    private String razorpayKeySecret;

    @Value("${app.razorpay.currency}")
    private String defaultCurrency;

    // ================= RAZORPAY METHODS =================

    @Transactional
    public RazorpayOrderResponse createRazorpayOrder(CreatePaymentOrderRequest request) {
        String tenantId = TenantContext.getTenantIdOrNull();
        log.info("Creating Razorpay order for tenant: {}, amount: {}", tenantId, request.getAmount());

        try {
            int amountInPaise = request.getAmount()
                    .multiply(new BigDecimal("100"))
                    .setScale(0, RoundingMode.HALF_UP)
                    .intValue();

            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", request.getCurrency() != null ? request.getCurrency() : defaultCurrency);
            orderRequest.put("receipt", request.getReceipt() != null ? request.getReceipt() : "receipt_" + System.currentTimeMillis());

            JSONObject notes = new JSONObject();
            if (tenantId != null && !tenantId.isBlank()) {
                notes.put("tenant_id", tenantId);
            }
            if (request.getOrderId() != null) {
                notes.put("order_id", request.getOrderId());
            }
            if (notes.length() > 0) {
                orderRequest.put("notes", notes);
            }

            com.razorpay.Order razorpayOrder = razorpayClient.orders.create(orderRequest);

            return RazorpayOrderResponse.builder()
                    .id(razorpayOrder.get("id"))
                    .entity(razorpayOrder.get("entity"))
                    .amount(new BigDecimal(razorpayOrder.get("amount").toString()).divide(BigDecimal.valueOf(100)))
                    .amountPaid(new BigDecimal(razorpayOrder.get("amount_paid").toString()).divide(BigDecimal.valueOf(100)))
                    .amountDue(new BigDecimal(razorpayOrder.get("amount_due").toString()).divide(BigDecimal.valueOf(100)))
                    .currency(razorpayOrder.get("currency"))
                    .receipt(razorpayOrder.get("receipt"))
                    .status(razorpayOrder.get("status"))
                    .attempts((Integer) razorpayOrder.get("attempts"))
                    .keyId(razorpayKeyId)
                    .orderId(request.getOrderId())
                    .build();

        } catch (RazorpayException e) {
            log.error("Failed to create Razorpay order: {}", e.getMessage());
            throw new PaymentProcessingException("Failed to create payment order: " + e.getMessage());
        }
    }

    public boolean verifyRazorpayPayment(VerifyRazorpayPaymentRequest request) {
        log.info("Verifying payment for Razorpay order: {}", request.getRazorpayOrderId());

        try {
            JSONObject options = new JSONObject();
            options.put("razorpay_order_id", request.getRazorpayOrderId());
            options.put("razorpay_payment_id", request.getRazorpayPaymentId());
            options.put("razorpay_signature", request.getRazorpaySignature());

            boolean isValid = Utils.verifyPaymentSignature(options, razorpayKeySecret);

            if (isValid) {
                log.info("Payment signature verified successfully for order: {}", request.getRazorpayOrderId());
            } else {
                log.warn("Invalid payment signature for order: {}", request.getRazorpayOrderId());
            }
            return isValid;

        } catch (RazorpayException e) {
            log.error("Failed to verify payment signature: {}", e.getMessage());
            throw new PaymentProcessingException("Payment verification failed");
        }
    }

    public com.razorpay.Payment fetchRazorpayPayment(String razorpayPaymentId) {
        try {
            return razorpayClient.payments.fetch(razorpayPaymentId);
        } catch (RazorpayException e) {
            log.error("Failed to fetch payment details: {}", e.getMessage());
            throw new PaymentProcessingException("Could not fetch payment details");
        }
    }

    // ================= CORE PAYMENT METHODS =================

    @Transactional
    public Payment createCashPayment(Order order) {
        Payment payment = new Payment();
        payment.setTenantId(order.getTenantId());
        payment.setOrder(order);
        payment.setMethod(PaymentMethod.CASH);
        payment.setAmount(order.getTotalAmount());
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setTransactionId(null);
        payment.setCreatedAt(LocalDateTime.now());
        return paymentRepository.save(payment);
    }

    @Transactional
    public Payment createCardPayment(Order order, VerifyRazorpayPaymentRequest verification) {
        Payment payment = new Payment();
        payment.setTenantId(order.getTenantId());
        payment.setOrder(order);
        payment.setMethod(PaymentMethod.CARD);
        payment.setAmount(order.getTotalAmount());
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setTransactionId(verification.getRazorpayPaymentId());
        payment.setCreatedAt(LocalDateTime.now());
        return paymentRepository.save(payment);
    }

    @Transactional
    public Payment createCardPayment(Order order, String transactionId) {
        Payment payment = new Payment();
        payment.setTenantId(order.getTenantId());
        payment.setOrder(order);
        payment.setMethod(PaymentMethod.CARD);
        payment.setAmount(order.getTotalAmount());
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setTransactionId(transactionId);
        payment.setCreatedAt(LocalDateTime.now());
        return paymentRepository.save(payment);
    }

    @Transactional
    public void handlePaymentFailure(Order order, String razorpayOrderId, String errorMessage) {
        Payment failedPayment = new Payment();
        failedPayment.setTenantId(order.getTenantId());
        failedPayment.setOrder(order);
        failedPayment.setMethod(PaymentMethod.CARD);
        failedPayment.setAmount(order.getTotalAmount());
        failedPayment.setStatus(PaymentStatus.FAILED);
        failedPayment.setTransactionId(razorpayOrderId);
        failedPayment.setCreatedAt(LocalDateTime.now());
        paymentRepository.save(failedPayment);
    }

    // ================= REFUND METHODS =================

    @Transactional(noRollbackFor = PaymentProcessingException.class)
    public void refundOrderPayment(Order order, String reason) {
        refundOrderPayment(order, order.getTotalAmount(), reason);
    }

    @Transactional(noRollbackFor = PaymentProcessingException.class)
    public void refundOrderPayment(Order order, BigDecimal refundAmount, String reason) {
        if (refundAmount == null || refundAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new PaymentProcessingException("Refund amount must be greater than zero");
        }

        List<Payment> originalPayments = paymentRepository.findByOrderId(order.getId()).stream()
                .filter(Objects::nonNull)
                .filter(payment -> payment.getAmount() != null && payment.getAmount().compareTo(BigDecimal.ZERO) > 0)
                .filter(payment -> payment.getStatus() == PaymentStatus.SUCCESS || payment.getStatus() == PaymentStatus.REFUNDED)
                .toList();

        if (originalPayments.isEmpty()) {
            throw new PaymentProcessingException("No successful payment found for order");
        }

        BigDecimal totalRefunded = paymentRepository.findByOrderId(order.getId()).stream()
                .filter(payment -> payment.getStatus() == PaymentStatus.REFUNDED)
                .map(Payment::getAmount)
                .filter(Objects::nonNull)
                .filter(amount -> amount.compareTo(BigDecimal.ZERO) < 0)
                .map(BigDecimal::abs)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPaid = originalPayments.stream()
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal maxRefundable = totalPaid.subtract(totalRefunded);
        if (maxRefundable.compareTo(BigDecimal.ZERO) <= 0) {
            throw new PaymentProcessingException("Payment already refunded");
        }
        if (refundAmount.compareTo(maxRefundable) > 0) {
            throw new PaymentProcessingException("Refund amount exceeds paid amount");
        }

        BigDecimal remainingRefund = refundAmount;
        for (int index = 0; index < originalPayments.size(); index++) {
            Payment originalPayment = originalPayments.get(index);
            BigDecimal allocatedRefund = index == originalPayments.size() - 1
                    ? remainingRefund
                    : refundAmount
                            .multiply(originalPayment.getAmount())
                            .divide(totalPaid, 2, RoundingMode.HALF_UP);

            if (allocatedRefund.compareTo(remainingRefund) > 0) {
                allocatedRefund = remainingRefund;
            }
            if (allocatedRefund.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            boolean markOriginalAsRefunded = allocatedRefund.compareTo(originalPayment.getAmount()) >= 0;
            processSinglePaymentRefund(order, originalPayment, allocatedRefund, reason, markOriginalAsRefunded);
            remainingRefund = remainingRefund.subtract(allocatedRefund);
        }
    }

    private void processSinglePaymentRefund(
            Order order,
            Payment originalPayment,
            BigDecimal refundAmount,
            String reason,
            boolean markOriginalAsRefunded) {

        if (refundAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        if (originalPayment.getMethod() == PaymentMethod.CASH) {
            createInternalRefundPayment(originalPayment, refundAmount, "CASH_REFUND_");

            if (markOriginalAsRefunded) {
                originalPayment.setStatus(PaymentStatus.REFUNDED);
                paymentRepository.save(originalPayment);
            }
            return;
        }

        if (!hasValidRazorpayPaymentId(originalPayment.getTransactionId())) {
            log.warn("Invalid Razorpay payment id for order {}. Creating internal refund record instead. transactionId={}",
                    order.getId(), originalPayment.getTransactionId());
            createInternalRefundPayment(originalPayment, refundAmount, "CARD_REFUND_");
            if (markOriginalAsRefunded) {
                originalPayment.setStatus(PaymentStatus.REFUNDED);
                paymentRepository.save(originalPayment);
            }
            return;
        }

        refundPayment(originalPayment, refundAmount, reason, markOriginalAsRefunded);
    }

    @Transactional
    public void refundFullPayment(Payment originalPayment, String reason) {
        refundPayment(originalPayment, originalPayment.getAmount(), reason, true);
    }

    @Transactional
    public void refundPayment(Payment originalPayment, BigDecimal amount, String reason, boolean markOriginalAsRefunded) {
        try {
            JSONObject refundRequest = new JSONObject();
            refundRequest.put("amount", amount.multiply(BigDecimal.valueOf(100)).intValue());
            refundRequest.put("notes", new JSONObject().put("reason", reason));

            Refund refund = razorpayClient.payments.refund(originalPayment.getTransactionId(), refundRequest);

            Payment refundPayment = new Payment();
            refundPayment.setTenantId(originalPayment.getTenantId());
            refundPayment.setOrder(originalPayment.getOrder());
            refundPayment.setMethod(originalPayment.getMethod());
            refundPayment.setAmount(amount.negate());
            refundPayment.setStatus(PaymentStatus.REFUNDED);
            refundPayment.setTransactionId(refund.get("id"));
            refundPayment.setCreatedAt(LocalDateTime.now());
            paymentRepository.save(refundPayment);

            if (markOriginalAsRefunded) {
                originalPayment.setStatus(PaymentStatus.REFUNDED);
                paymentRepository.save(originalPayment);
            }

        } catch (Exception e) {
            String message = e.getMessage() == null ? "" : e.getMessage();
            String normalized = message.toLowerCase();
            boolean isRouteError = normalized.contains("404")
                    || normalized.contains("no route matched")
                    || normalized.contains("status code");

            if (isRouteError) {
                log.warn("Razorpay refund route issue for transaction {}. Falling back to internal refund record. message={}",
                        originalPayment.getTransactionId(), message, e);
            } else {
                log.warn("Razorpay refund failed for transaction {}. Falling back to internal refund record. message={}",
                        originalPayment.getTransactionId(), message, e);
            }

            createInternalRefundPayment(originalPayment, amount, "CARD_REFUND_");
            if (markOriginalAsRefunded) {
                originalPayment.setStatus(PaymentStatus.REFUNDED);
                paymentRepository.save(originalPayment);
            }
        }
    }

    private boolean hasValidRazorpayPaymentId(String transactionId) {
        return transactionId != null && !transactionId.isBlank() && transactionId.startsWith("pay_");
    }

    private void createInternalRefundPayment(Payment originalPayment, BigDecimal amount, String txnPrefix) {
        Payment refundPayment = new Payment();
        refundPayment.setTenantId(originalPayment.getTenantId());
        refundPayment.setOrder(originalPayment.getOrder());
        refundPayment.setMethod(originalPayment.getMethod());
        refundPayment.setAmount(amount.negate());
        refundPayment.setStatus(PaymentStatus.REFUNDED);
        refundPayment.setTransactionId(txnPrefix + System.currentTimeMillis());
        refundPayment.setCreatedAt(LocalDateTime.now());
        paymentRepository.save(refundPayment);
    }

    // ================= QUERY METHODS =================
    
    @Transactional(readOnly = true)
    public List<Object[]> getPaymentSummary(String tenantId) {

        if (tenantId == null) {
            throw new IllegalStateException("Tenant ID is missing");
        }

        return paymentRepository.getPaymentSummary(tenantId);
    }

    @Transactional(readOnly = true)
    public Payment getPaymentById(Long id) {
        return paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + id));
    }

    @Transactional(readOnly = true)
    public List<Payment> getPaymentsByOrderId(Long orderId) {
        return paymentRepository.findByOrderId(orderId);
    }

    @Transactional(readOnly = true)
    public BigDecimal getDailySales(String tenantId) {
        LocalDateTime start = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime end = LocalDateTime.now().withHour(23).withMinute(59).withSecond(59).withNano(999999999);
        BigDecimal total = paymentRepository.getTotalPaymentsForPeriod(tenantId, start, end);
        return total != null ? total : BigDecimal.ZERO;
    }

    public PaymentDto mapToDto(Payment payment) {
        if (payment == null) return null;
        return PaymentDto.builder()
                .id(payment.getId())
                .orderId(payment.getOrder() != null ? payment.getOrder().getId() : null)
                .method(payment.getMethod())
                .amount(payment.getAmount())
                .status(payment.getStatus())
                .transactionId(payment.getTransactionId())
                .createdAt(payment.getCreatedAt())
                .build();
    }

}
