package com.possaas.service.subscription;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;

import com.possaas.config.TenantContext;
import com.possaas.domain.tenant.BillingCycle;
import com.possaas.domain.tenant.Subscription;
import com.possaas.domain.tenant.SubscriptionPayment;
import com.possaas.domain.tenant.SubscriptionPaymentStatus;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionPlanType;
import com.possaas.domain.tenant.SubscriptionStatus;
import com.possaas.domain.tenant.Tenant;
import com.possaas.domain.notification.NotificationType;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.dto.request.CreatePaymentOrderRequest;
import com.possaas.dto.request.CreateSubscriptionOrderRequest;
import com.possaas.dto.request.DowngradePlanRequest;
import com.possaas.dto.request.UpdateSubscriptionPaymentMethodRequest;
import com.possaas.dto.request.VerifySubscriptionPaymentRequest;
import com.possaas.dto.response.RazorpayOrderResponse;
import com.possaas.dto.response.SubscriptionPaymentDto;
import com.possaas.exception.ResourceNotFoundException;
import com.possaas.exception.PaymentProcessingException;
import com.possaas.repository.SubscriptionPaymentRepository;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.repository.SubscriptionRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.repository.UserRepository;
import com.possaas.service.notification.EmailService;
import com.possaas.service.notification.NotificationService;
import com.possaas.service.payment.PaymentService;
import com.possaas.util.RazorpaySignatureVerifier;
import org.thymeleaf.context.Context;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SubscriptionPaymentService {

    private final SubscriptionPlanRepository subscriptionPlanRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionPaymentRepository subscriptionPaymentRepository;
    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final PaymentService paymentService;
    private final RazorpaySignatureVerifier razorpaySignatureVerifier;
    private final EmailService emailService;
    private final NotificationService notificationService;

    @Transactional
    public RazorpayOrderResponse createOrder(CreateSubscriptionOrderRequest request) {
        String tenantId = requireTenantId();
        User storeAdmin = requireStoreAdmin();

        SubscriptionPlan targetPlan = getPlanByType(request.getPlan());
        BigDecimal amount = calculatePlanPrice(targetPlan, request.getBillingCycle());
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Cannot create payment order for free plan");
        }

        CreatePaymentOrderRequest orderRequest = CreatePaymentOrderRequest.builder()
                .amount(amount)
                .currency("INR")
                .receipt(buildReceipt("SUB"))
                .build();

        RazorpayOrderResponse razorpayOrder = paymentService.createRazorpayOrder(orderRequest);

        SubscriptionPayment payment = new SubscriptionPayment();
        payment.setTenantId(tenantId);
        payment.setStoreAdmin(storeAdmin);
        payment.setSubscriptionPlan(request.getPlan());
        payment.setBillingCycle(request.getBillingCycle());
        payment.setAmount(amount);
        payment.setRazorpayOrderId(razorpayOrder.getId());
        payment.setPaymentStatus(SubscriptionPaymentStatus.CREATED);
        subscriptionPaymentRepository.save(payment);

        return razorpayOrder;
    }

    @Transactional
    public SubscriptionPaymentDto verifyPayment(VerifySubscriptionPaymentRequest request) {
        String tenantId = requireTenantId();
        User storeAdmin = requireStoreAdmin();
        SubscriptionPayment payment = subscriptionPaymentRepository.findByRazorpayOrderId(request.getRazorpayOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Subscription payment not found"));

        if (!payment.getTenantId().equals(tenantId)) {
            throw new IllegalStateException("Payment does not belong to current tenant");
        }
        if (payment.getSubscriptionPlan() != request.getPlan() || payment.getBillingCycle() != request.getBillingCycle()) {
            throw new IllegalStateException("Plan or billing cycle mismatch with created order");
        }

        boolean valid = razorpaySignatureVerifier.verifyPaymentSignature(
                request.getRazorpayOrderId(),
                request.getRazorpayPaymentId(),
                request.getRazorpaySignature());

        if (!valid) {
            payment.setPaymentStatus(SubscriptionPaymentStatus.FAILED);
            payment.setRazorpayPaymentId(request.getRazorpayPaymentId());
            payment.setRazorpaySignature(request.getRazorpaySignature());
            subscriptionPaymentRepository.save(payment);
            markSubscriptionPastDue(tenantId, "Card declined");
            notifyPaymentFailure(tenantId, storeAdmin.getEmail(), "Card declined");
            return mapPayment(payment);
        }

        payment.setPaymentStatus(SubscriptionPaymentStatus.SUCCESS);
        payment.setRazorpayPaymentId(request.getRazorpayPaymentId());
        payment.setRazorpaySignature(request.getRazorpaySignature());

        Subscription subscription = subscriptionRepository.findByTenantId(payment.getTenantId()).orElse(new Subscription());
        SubscriptionPlan newPlan = getPlanByType(request.getPlan());

        LocalDateTime start = LocalDateTime.now();
        LocalDateTime end = request.getBillingCycle() == BillingCycle.YEARLY ? start.plusYears(1) : start.plusMonths(1);

        if (subscription.getId() != null && subscription.getStatus() == SubscriptionStatus.ACTIVE
                && newPlan.getMonthlyPrice().compareTo(subscription.getPlan().getMonthlyPrice()) > 0) {
            // Upgrade during active cycle should keep current validity window.
            start = subscription.getStartDate() != null ? subscription.getStartDate() : start;
            end = subscription.getNextBillingDate() != null ? subscription.getNextBillingDate() : end;
        }

        subscription.setTenantId(payment.getTenantId());
        subscription.setPlan(newPlan);
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        subscription.setBillingCycle(request.getBillingCycle());
        subscription.setStartDate(start);
        subscription.setNextBillingDate(end);
        subscription.setNextPlan(null);
        subscription.setDowngradeEffectiveDate(null);
        subscriptionRepository.save(subscription);
        syncTenantPlan(subscription.getTenantId(), newPlan);

        payment.setStartDate(start);
        payment.setEndDate(end);
        return mapPayment(subscriptionPaymentRepository.save(payment));
    }

    @Transactional
    public RazorpayOrderResponse createPaymentMethodUpdateOrder() {
        requireStoreAdmin();
        CreatePaymentOrderRequest orderRequest = CreatePaymentOrderRequest.builder()
                .amount(BigDecimal.ONE)
                .currency("INR")
                .receipt(buildReceipt("PMT"))
                .build();
        return paymentService.createRazorpayOrder(orderRequest);
    }

    @Transactional
    public void updatePaymentMethod(UpdateSubscriptionPaymentMethodRequest request) {
        String tenantId = requireTenantId();
        requireStoreAdmin();
        Subscription subscription = subscriptionRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Subscription not found"));

        boolean valid = razorpaySignatureVerifier.verifyPaymentSignature(
                request.getRazorpayOrderId(),
                request.getRazorpayPaymentId(),
                request.getRazorpaySignature());
        if (!valid) {
            throw new IllegalStateException("Payment method tokenization verification failed");
        }

        // Store only gateway tokenized reference and masked metadata.
        subscription.setPaymentMethodToken(request.getRazorpayPaymentId());
        subscription.setPaymentMethodLast4(request.getLast4());
        subscription.setPaymentMethodBrand(request.getBrand());
        subscriptionRepository.save(subscription);
    }

    @Transactional
    public RazorpayOrderResponse upgradePlan(CreateSubscriptionOrderRequest request) {
        String tenantId = requireTenantId();
        User storeAdmin = requireStoreAdmin();
        Subscription subscription = subscriptionRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Active subscription not found"));

        if (subscription.getStatus() != SubscriptionStatus.ACTIVE) {
            throw new IllegalStateException("Subscription must be active to upgrade");
        }

        SubscriptionPlan targetPlan = getPlanByType(request.getPlan());
        SubscriptionPlan currentPlan = subscription.getPlan();
        if (targetPlan.getMonthlyPrice().compareTo(currentPlan.getMonthlyPrice()) <= 0) {
            throw new IllegalArgumentException("Target plan must be higher than current plan");
        }

        BigDecimal diffPerMonth = targetPlan.getMonthlyPrice().subtract(currentPlan.getMonthlyPrice());
        long totalCycleDays = subscription.getBillingCycle() == BillingCycle.YEARLY ? 365 : 30;
        long remainingDays = Math.max(1, ChronoUnit.DAYS.between(LocalDateTime.now(), subscription.getNextBillingDate()));
        BigDecimal proratedAmount = diffPerMonth
                .multiply(BigDecimal.valueOf(remainingDays))
                .divide(BigDecimal.valueOf(totalCycleDays), 2, RoundingMode.HALF_UP);
        if (proratedAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new PaymentProcessingException("Upgrade amount is zero. No payable difference found.");
        }

        CreatePaymentOrderRequest orderRequest = CreatePaymentOrderRequest.builder()
                .amount(proratedAmount)
                .currency("INR")
                .receipt(buildReceipt("UPG"))
                .build();
        RazorpayOrderResponse razorpayOrder = paymentService.createRazorpayOrder(orderRequest);

        SubscriptionPayment payment = new SubscriptionPayment();
        payment.setTenantId(tenantId);
        payment.setStoreAdmin(storeAdmin);
        payment.setSubscriptionPlan(request.getPlan());
        payment.setBillingCycle(subscription.getBillingCycle());
        payment.setAmount(proratedAmount);
        payment.setRazorpayOrderId(razorpayOrder.getId());
        payment.setPaymentStatus(SubscriptionPaymentStatus.CREATED);
        subscriptionPaymentRepository.save(payment);

        return razorpayOrder;
    }

    @Transactional
    public void downgradePlan(DowngradePlanRequest request) {
        throw new IllegalStateException("Plan downgrades are disabled for this subscription model");
    }

    @Transactional
    public void applyPendingDowngrades() {
        // Downgrade flow intentionally disabled.
    }

    @Transactional(readOnly = true)
    public List<SubscriptionPaymentDto> getAllSubscriptionPayments() {
        return subscriptionPaymentRepository.findAll().stream()
                .map(this::mapPayment)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SubscriptionPaymentDto> getTenantPaymentHistory() {
        String tenantId = requireTenantId();
        requireStoreAdmin();
        return subscriptionPaymentRepository.findByTenantIdOrderByCreatedAtDesc(tenantId).stream()
                .map(this::mapPayment)
                .toList();
    }

    @Transactional(readOnly = true)
    public byte[] generateInvoice(Long paymentId) {
        String tenantId = requireTenantId();
        requireStoreAdmin();

        SubscriptionPayment payment = subscriptionPaymentRepository.findByIdAndTenantId(paymentId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Subscription payment not found"));

        boolean invoiceAllowed = payment.getPaymentStatus() == SubscriptionPaymentStatus.SUCCESS;
        if (!invoiceAllowed) {
            throw new IllegalStateException("Invoice is available only for successful subscription payments");
        }

        return buildInvoicePdf(payment);
    }

    private byte[] buildInvoicePdf(SubscriptionPayment payment) {
        String invoiceNumber = "INV-SUB-" + payment.getId();

        try (PDDocument document = new PDDocument(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                float margin = 50f;
                float y = page.getMediaBox().getHeight() - margin;
                float leading = 18f;

                y = writeText(content, "PayPoint Subscription Invoice", margin, y, PDType1Font.HELVETICA_BOLD, 20);
                y -= 6f;
                y = writeText(content, "Invoice Number: " + invoiceNumber, margin, y, PDType1Font.HELVETICA, 12);
                y = writeText(content, "Generated At: " + LocalDateTime.now(), margin, y, PDType1Font.HELVETICA, 11);
                y -= 12f;

                y = writeText(content, "Payment Summary", margin, y, PDType1Font.HELVETICA_BOLD, 14);
                y = writeText(content, "Payment Date: " + payment.getCreatedAt(), margin, y - 2f, PDType1Font.HELVETICA, 11);
                y = writeText(content, "Status: " + payment.getPaymentStatus(), margin, y, PDType1Font.HELVETICA, 11);
                y = writeText(content, "Amount (INR): " + payment.getAmount(), margin, y, PDType1Font.HELVETICA, 11);
                y = writeText(content, "Plan: " + payment.getSubscriptionPlan(), margin, y, PDType1Font.HELVETICA, 11);
                y = writeText(content, "Billing Cycle: " + payment.getBillingCycle(), margin, y, PDType1Font.HELVETICA, 11);
                y -= 12f;

                y = writeText(content, "Merchant / Tenant Details", margin, y, PDType1Font.HELVETICA_BOLD, 14);
                y = writeText(content, "Tenant ID: " + payment.getTenantId(), margin, y - 2f, PDType1Font.HELVETICA, 11);
                y = writeText(content, "Store Admin Email: " + (payment.getStoreAdmin() != null ? payment.getStoreAdmin().getEmail() : ""), margin, y, PDType1Font.HELVETICA, 11);
                y -= 12f;

                y = writeText(content, "Gateway Reference", margin, y, PDType1Font.HELVETICA_BOLD, 14);
                y = writeText(content, "Razorpay Order ID: " + payment.getRazorpayOrderId(), margin, y - 2f, PDType1Font.HELVETICA, 11);
                y = writeText(content, "Razorpay Payment ID: " + (payment.getRazorpayPaymentId() != null ? payment.getRazorpayPaymentId() : "N/A"), margin, y, PDType1Font.HELVETICA, 11);

                if (payment.getStartDate() != null || payment.getEndDate() != null) {
                    y -= 12f;
                    y = writeText(content, "Subscription Window", margin, y, PDType1Font.HELVETICA_BOLD, 14);
                    y = writeText(content, "Start: " + (payment.getStartDate() != null ? payment.getStartDate() : "N/A"), margin, y - 2f, PDType1Font.HELVETICA, 11);
                    y = writeText(content, "End: " + (payment.getEndDate() != null ? payment.getEndDate() : "N/A"), margin, y, PDType1Font.HELVETICA, 11);
                }

                y -= leading;
                writeText(content, "This is a system-generated invoice for subscription payment records.", margin, y, PDType1Font.HELVETICA_OBLIQUE, 10);
            }

            document.save(outputStream);
            return outputStream.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to generate invoice PDF");
        }
    }

    private float writeText(PDPageContentStream content, String text, float x, float y, PDType1Font font, float fontSize)
            throws IOException {
        content.beginText();
        content.setFont(font, fontSize);
        content.newLineAtOffset(x, y);
        content.showText(text);
        content.endText();
        return y - (fontSize + 4f);
    }

    private String requireTenantId() {
        String tenantId = TenantContext.getTenantId();
        if (tenantId == null || tenantId.isBlank()) {
            throw new IllegalStateException("Tenant context not set");
        }
        return tenantId;
    }

    private User requireStoreAdmin() {
        String tenantId = requireTenantId();
        String principal = org.springframework.security.core.context.SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();

        User user = userRepository.findByEmailAndTenantId(principal, tenantId)
                .or(() -> userRepository.findByUsernameAndTenantId(principal, tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
        if (user.getRole() != Role.ROLE_STORE_ADMIN) {
            throw new IllegalStateException("Only store admin can perform this action");
        }
        if (!user.isEmailVerified()) {
            throw new IllegalStateException("Please verify your email before proceeding with subscription payment.");
        }
        return user;
    }

    private SubscriptionPlan getPlanByType(SubscriptionPlanType planType) {
        return subscriptionPlanRepository.findByPlanType(planType)
                .orElseThrow(() -> new ResourceNotFoundException("Subscription plan not found: " + planType));
    }

    private void syncTenantPlan(String tenantId, SubscriptionPlan plan) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found"));
        tenant.setSubscriptionPlan(plan);
        tenantRepository.save(tenant);
    }

    private BigDecimal calculatePlanPrice(SubscriptionPlan plan, BillingCycle billingCycle) {
        if (billingCycle == BillingCycle.YEARLY) {
            return plan.getMonthlyPrice().multiply(BigDecimal.valueOf(12));
        }
        return plan.getMonthlyPrice();
    }

    private String buildReceipt(String prefix) {
        // Razorpay receipt max length is 40 chars.
        return prefix + "_" + UUID.randomUUID().toString().replace("-", "").substring(0, 20);
    }

    private void markSubscriptionPastDue(String tenantId, String reason) {
        Subscription subscription = subscriptionRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Subscription not found"));
        subscription.setStatus(SubscriptionStatus.PAST_DUE);
        subscription.setGracePeriodEndDate(LocalDateTime.now().plusDays(7));
        subscription.setRetryCount(0);
        subscription.setNextRetryAt(LocalDateTime.now().plusDays(1));
        subscriptionRepository.save(subscription);
    }

    private void notifyPaymentFailure(String tenantId, String adminEmail, String reason) {
        try {
            User admin = userRepository.findByEmailAndTenantId(adminEmail, tenantId).orElse(null);
            if (admin != null) {
                notificationService.sendNotification(
                        admin.getId(),
                        NotificationType.PAYMENT_FAILED,
                        "Subscription payment failed",
                        "Payment failed for your subscription. Reason: " + reason,
                        "/settings");
            }

            Context context = new Context();
            context.setVariable("name", "Store Admin");
            context.setVariable("orderNumber", "SUBSCRIPTION");
            context.setVariable("reason", reason);
            context.setVariable("retryUrl", "https://dashboard.paypoint.local/settings");
            emailService.sendHtmlEmail(
                    adminEmail,
                    "Subscription payment failed",
                    "email/payment-failed",
                    context);
        } catch (Exception ignored) {
            // Notification failures should not block transaction updates.
        }
    }

    private SubscriptionPaymentDto mapPayment(SubscriptionPayment payment) {
        return SubscriptionPaymentDto.builder()
                .id(payment.getId())
                .tenantId(payment.getTenantId())
                .storeAdminId(payment.getStoreAdmin() != null ? payment.getStoreAdmin().getId() : null)
                .subscriptionPlan(payment.getSubscriptionPlan())
                .billingCycle(payment.getBillingCycle())
                .amount(payment.getAmount())
                .razorpayOrderId(payment.getRazorpayOrderId())
                .razorpayPaymentId(payment.getRazorpayPaymentId())
                .razorpaySignature(payment.getRazorpaySignature())
                .paymentStatus(payment.getPaymentStatus())
                .startDate(payment.getStartDate())
                .endDate(payment.getEndDate())
                .createdAt(payment.getCreatedAt())
                .updatedAt(payment.getUpdatedAt())
                .build();
    }

}
