package com.possaas.service.auth;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.context.Context;

import com.possaas.domain.security.PendingRegistration;
import com.possaas.domain.security.VerificationToken;
import com.possaas.domain.tenant.BillingCycle;
import com.possaas.domain.tenant.Subscription;
import com.possaas.domain.tenant.SubscriptionPayment;
import com.possaas.domain.tenant.SubscriptionPaymentStatus;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionStatus;
import com.possaas.domain.tenant.Tenant;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.domain.user.UserStatus;
import com.possaas.dto.request.PendingRegistrationPaymentOrderRequest;
import com.possaas.dto.request.RegisterTenantRequest;
import com.possaas.dto.request.VerifyPendingRegistrationPaymentRequest;
import com.possaas.dto.request.CreatePaymentOrderRequest;
import com.possaas.dto.response.PendingRegistrationResponse;
import com.possaas.dto.response.RazorpayOrderResponse;
import com.possaas.exception.DuplicateResourceException;
import com.possaas.exception.ResourceNotFoundException;
import com.possaas.repository.PendingRegistrationRepository;
import com.possaas.repository.SubscriptionPaymentRepository;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.repository.SubscriptionRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.repository.UserRepository;
import com.possaas.repository.VerificationTokenRepository;
import com.possaas.service.notification.EmailService;
import com.possaas.service.payment.PaymentService;
import com.possaas.util.RazorpaySignatureVerifier;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PendingRegistrationService {

    private final PendingRegistrationRepository pendingRegistrationRepository;
    private final SubscriptionPlanRepository subscriptionPlanRepository;
    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionPaymentRepository subscriptionPaymentRepository;
    private final VerificationTokenRepository verificationTokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final PaymentService paymentService;
    private final RazorpaySignatureVerifier razorpaySignatureVerifier;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    @Transactional
    public PendingRegistrationResponse startRegistration(RegisterTenantRequest request) {
        SubscriptionPlan plan = subscriptionPlanRepository.findByPlanType(request.getPlan())
                .orElseThrow(() -> new ResourceNotFoundException("Subscription plan not found"));

        assertNoLiveAccountConflicts(request);
        clearExistingPendingAttempts(request);

        PendingRegistration pendingRegistration = new PendingRegistration();
        pendingRegistration.setStoreName(request.getStoreName().trim());
        pendingRegistration.setAdminUsername(request.getAdminUsername().trim());
        pendingRegistration.setAdminEmail(normalizeEmail(request.getAdminEmail()));
        pendingRegistration.setAdminPasswordHash(passwordEncoder.encode(request.getAdminPassword()));
        pendingRegistration.setPlan(plan.getPlanType());
        pendingRegistration.setBillingCycle(BillingCycle.MONTHLY);
        pendingRegistration.setVerificationToken(UUID.randomUUID().toString());
        pendingRegistration.setVerificationTokenExpiresAt(LocalDateTime.now().plusHours(24));
        pendingRegistration.setSessionToken(UUID.randomUUID().toString());
        pendingRegistration.setSessionTokenExpiresAt(LocalDateTime.now().plusHours(24));

        PendingRegistration saved = pendingRegistrationRepository.save(pendingRegistration);
        sendVerificationEmail(saved);

        return map(saved, "Verification email sent. Verify your email to continue to payment.");
    }

    @Transactional
    public PendingRegistrationResponse verifyEmailAccount(String token) {
        PendingRegistration pendingRegistration = pendingRegistrationRepository.findByVerificationToken(token)
                .orElse(null);

        if (pendingRegistration != null) {
            if (pendingRegistration.getVerificationTokenExpiresAt().isBefore(LocalDateTime.now())) {
                throw new IllegalArgumentException("Verification token has expired.");
            }

            pendingRegistration.setEmailVerified(true);
            PendingRegistration saved = pendingRegistrationRepository.save(pendingRegistration);
            return map(saved, "Email successfully verified. Continue to payment.");
        }

        VerificationToken verificationToken = verificationTokenRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid verification token."));

        if (verificationToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Verification token has expired.");
        }

        User user = verificationToken.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);
        verificationTokenRepository.delete(verificationToken);

        Tenant tenant = tenantRepository.findById(user.getTenantId())
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found"));
        sendWelcomeEmail(user.getEmail(), tenant.getName());

        return PendingRegistrationResponse.builder()
                .storeName(tenant.getName())
                .adminEmail(user.getEmail())
                .emailVerified(true)
                .completed(true)
                .message("Email successfully verified. You can sign in.")
                .build();
    }

    @Transactional(readOnly = true)
    public PendingRegistrationResponse getStatus(String sessionToken) {
        PendingRegistration pendingRegistration = requirePendingRegistration(sessionToken);
        return map(pendingRegistration, "Pending registration status loaded.");
    }

    @Transactional
    public RazorpayOrderResponse createPaymentOrder(PendingRegistrationPaymentOrderRequest request) {
        PendingRegistration pendingRegistration = requirePendingRegistration(request.getSessionToken());

        if (!pendingRegistration.isEmailVerified()) {
            throw new IllegalStateException("Please verify your email before proceeding with payment.");
        }
        if (pendingRegistration.isCompleted()) {
            throw new IllegalStateException("This registration has already been completed. Please sign in.");
        }

        BillingCycle billingCycle = request.getBillingCycle() != null ? request.getBillingCycle() : BillingCycle.MONTHLY;
        SubscriptionPlan plan = getPlanByType(pendingRegistration.getPlan());
        BigDecimal amount = calculatePlanPrice(plan, billingCycle);

        CreatePaymentOrderRequest orderRequest = CreatePaymentOrderRequest.builder()
                .amount(amount)
                .currency("INR")
                .receipt("REG_" + UUID.randomUUID().toString().replace("-", "").substring(0, 20))
                .build();

        RazorpayOrderResponse order = paymentService.createRazorpayOrder(orderRequest);

        pendingRegistration.setBillingCycle(billingCycle);
        pendingRegistration.setPaymentAmount(amount);
        pendingRegistration.setRazorpayOrderId(order.getId());
        pendingRegistration.setPaymentStatus(SubscriptionPaymentStatus.CREATED);
        pendingRegistrationRepository.save(pendingRegistration);

        return order;
    }

    @Transactional
    public PendingRegistrationResponse verifyPayment(VerifyPendingRegistrationPaymentRequest request) {
        PendingRegistration pendingRegistration = requirePendingRegistration(request.getSessionToken());

        if (!pendingRegistration.isEmailVerified()) {
            throw new IllegalStateException("Please verify your email before proceeding with payment.");
        }
        if (pendingRegistration.isCompleted()) {
            return map(pendingRegistration, "Account already created. Please sign in.");
        }
        if (pendingRegistration.getRazorpayOrderId() == null
                || !pendingRegistration.getRazorpayOrderId().equals(request.getRazorpayOrderId())) {
            throw new IllegalStateException("Payment order mismatch. Please restart the payment process.");
        }

        boolean valid = razorpaySignatureVerifier.verifyPaymentSignature(
                request.getRazorpayOrderId(),
                request.getRazorpayPaymentId(),
                request.getRazorpaySignature());

        pendingRegistration.setRazorpayPaymentId(request.getRazorpayPaymentId());
        pendingRegistration.setRazorpaySignature(request.getRazorpaySignature());

        if (!valid) {
            pendingRegistration.setPaymentStatus(SubscriptionPaymentStatus.FAILED);
            pendingRegistrationRepository.save(pendingRegistration);
            throw new IllegalStateException("Payment verification failed. Please try again.");
        }

        pendingRegistration.setPaymentStatus(SubscriptionPaymentStatus.SUCCESS);
        finalizeAccountCreation(pendingRegistration);
        pendingRegistration.setCompleted(true);
        pendingRegistration.setCompletedAt(LocalDateTime.now());
        PendingRegistration saved = pendingRegistrationRepository.save(pendingRegistration);

        return map(saved, "Account created successfully. Please sign in.");
    }

    private void finalizeAccountCreation(PendingRegistration pendingRegistration) {
        assertNoLiveAccountConflicts(pendingRegistration.getStoreName(),
                pendingRegistration.getAdminUsername(),
                pendingRegistration.getAdminEmail());

        SubscriptionPlan plan = getPlanByType(pendingRegistration.getPlan());
        LocalDateTime start = LocalDateTime.now();
        LocalDateTime end = pendingRegistration.getBillingCycle() == BillingCycle.YEARLY
                ? start.plusYears(1)
                : start.plusMonths(1);

        Tenant tenant = new Tenant();
        tenant.setName(pendingRegistration.getStoreName());
        tenant.setSubscriptionPlan(plan);
        tenant = tenantRepository.save(tenant);

        Subscription subscription = new Subscription();
        subscription.setTenantId(tenant.getId());
        subscription.setPlan(plan);
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        subscription.setBillingCycle(pendingRegistration.getBillingCycle());
        subscription.setStartDate(start);
        subscription.setNextBillingDate(end);
        subscriptionRepository.save(subscription);

        User admin = new User();
        admin.setTenantId(tenant.getId());
        admin.setUsername(pendingRegistration.getAdminUsername());
        admin.setEmail(pendingRegistration.getAdminEmail());
        admin.setPassword(pendingRegistration.getAdminPasswordHash());
        admin.setRole(Role.ROLE_STORE_ADMIN);
        admin.setStatus(UserStatus.ACTIVE);
        admin.setEmailVerified(true);
        admin = userRepository.save(admin);

        SubscriptionPayment subscriptionPayment = new SubscriptionPayment();
        subscriptionPayment.setTenantId(tenant.getId());
        subscriptionPayment.setStoreAdmin(admin);
        subscriptionPayment.setSubscriptionPlan(pendingRegistration.getPlan());
        subscriptionPayment.setBillingCycle(pendingRegistration.getBillingCycle());
        subscriptionPayment.setAmount(resolvePaymentAmount(pendingRegistration, plan));
        subscriptionPayment.setRazorpayOrderId(pendingRegistration.getRazorpayOrderId());
        subscriptionPayment.setRazorpayPaymentId(pendingRegistration.getRazorpayPaymentId());
        subscriptionPayment.setRazorpaySignature(pendingRegistration.getRazorpaySignature());
        subscriptionPayment.setPaymentStatus(SubscriptionPaymentStatus.SUCCESS);
        subscriptionPayment.setStartDate(start);
        subscriptionPayment.setEndDate(end);
        subscriptionPaymentRepository.save(subscriptionPayment);

        sendWelcomeEmail(admin.getEmail(), tenant.getName());
    }

    private PendingRegistration requirePendingRegistration(String sessionToken) {
        PendingRegistration pendingRegistration = pendingRegistrationRepository.findBySessionToken(sessionToken)
                .orElseThrow(() -> new ResourceNotFoundException("Pending registration not found. Please register again."));

        if (!pendingRegistration.isCompleted()
                && pendingRegistration.getSessionTokenExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("Registration session has expired. Please register again.");
        }

        return pendingRegistration;
    }

    private SubscriptionPlan getPlanByType(com.possaas.domain.tenant.SubscriptionPlanType planType) {
        return subscriptionPlanRepository.findByPlanType(planType)
                .orElseThrow(() -> new ResourceNotFoundException("Subscription plan not found: " + planType));
    }

    private BigDecimal calculatePlanPrice(SubscriptionPlan plan, BillingCycle billingCycle) {
        if (billingCycle == BillingCycle.YEARLY) {
            return plan.getMonthlyPrice().multiply(BigDecimal.valueOf(12));
        }
        return plan.getMonthlyPrice();
    }

    private BigDecimal resolvePaymentAmount(PendingRegistration pendingRegistration, SubscriptionPlan plan) {
        if (pendingRegistration.getPaymentAmount() != null) {
            return pendingRegistration.getPaymentAmount();
        }
        return calculatePlanPrice(plan, pendingRegistration.getBillingCycle());
    }

    private void clearExistingPendingAttempts(RegisterTenantRequest request) {
        clearExistingPendingAttempts(request.getStoreName(), request.getAdminUsername(), request.getAdminEmail());
    }

    private void clearExistingPendingAttempts(String storeName, String adminUsername, String adminEmail) {
        Set<PendingRegistration> registrationsToDelete = new LinkedHashSet<>();
        registrationsToDelete.addAll(pendingRegistrationRepository.findByCompletedFalseAndStoreNameIgnoreCase(storeName.trim()));
        registrationsToDelete.addAll(pendingRegistrationRepository.findByCompletedFalseAndAdminUsernameIgnoreCase(adminUsername.trim()));
        registrationsToDelete.addAll(pendingRegistrationRepository.findByCompletedFalseAndAdminEmailIgnoreCase(normalizeEmail(adminEmail)));

        if (!registrationsToDelete.isEmpty()) {
            pendingRegistrationRepository.deleteAll(new ArrayList<>(registrationsToDelete));
        }
    }

    private void assertNoLiveAccountConflicts(RegisterTenantRequest request) {
        assertNoLiveAccountConflicts(request.getStoreName(), request.getAdminUsername(), request.getAdminEmail());
    }

    private void assertNoLiveAccountConflicts(String storeName, String adminUsername, String adminEmail) {
        if (tenantRepository.existsByName(storeName.trim())) {
            throw new DuplicateResourceException("Store name already exists. Please choose a different store name.");
        }

        if (userRepository.existsByUsername(adminUsername.trim())) {
            throw new DuplicateResourceException(
                    "Username is already taken by another user. Please choose a different username.");
        }

        if (userRepository.existsByEmail(normalizeEmail(adminEmail))) {
            throw new DuplicateResourceException(
                    "Email is already registered in our system. Please use a different email.");
        }
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private PendingRegistrationResponse map(PendingRegistration pendingRegistration, String message) {
        return PendingRegistrationResponse.builder()
                .sessionToken(pendingRegistration.getSessionToken())
                .storeName(pendingRegistration.getStoreName())
                .adminEmail(pendingRegistration.getAdminEmail())
                .plan(pendingRegistration.getPlan())
                .billingCycle(pendingRegistration.getBillingCycle())
                .emailVerified(pendingRegistration.isEmailVerified())
                .paymentStatus(pendingRegistration.getPaymentStatus())
                .completed(pendingRegistration.isCompleted())
                .message(message)
                .build();
    }

    private void sendVerificationEmail(PendingRegistration pendingRegistration) {
        Context context = new Context();
        context.setVariable("storeName", pendingRegistration.getStoreName());
        context.setVariable("verificationUrl", frontendUrl + "/verify-email?token=" + pendingRegistration.getVerificationToken());

        emailService.sendHtmlEmail(
                pendingRegistration.getAdminEmail(),
                "Action Required: Verify your " + pendingRegistration.getStoreName() + " account",
                "email/verification-email",
                context);
    }

    private void sendWelcomeEmail(String toEmail, String storeName) {
        Context context = new Context();
        context.setVariable("storeName", storeName);
        context.setVariable("loginUrl", frontendUrl + "/login");

        emailService.sendHtmlEmail(
                toEmail,
                "Welcome to " + storeName + " - Your Workspace is Ready!",
                "email/welcome-email",
                context);
    }
}
