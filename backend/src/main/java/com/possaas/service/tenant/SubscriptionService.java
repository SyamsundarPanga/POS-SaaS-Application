package com.possaas.service.tenant;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.possaas.config.TenantContext;
import com.possaas.domain.tenant.Subscription;
import com.possaas.domain.tenant.BillingCycle;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionStatus;
import com.possaas.domain.tenant.Tenant;
import com.possaas.domain.tenant.UsageTracking;
import com.possaas.domain.user.User;
import com.possaas.domain.user.Role;
import com.possaas.dto.request.CreatePaymentOrderRequest;
import com.possaas.dto.response.RazorpayOrderResponse;
import com.possaas.dto.response.SubscriptionStatusResponse;
import com.possaas.dto.response.SubscriptionUsageResponse;
import com.possaas.exception.ResourceNotFoundException;
import com.possaas.exception.UserLimitExceededException;
import com.possaas.repository.BranchRepository;
import com.possaas.repository.ProductRepository;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.repository.SubscriptionRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.repository.UsageTrackingRepository;
import com.possaas.repository.UserRepository;
import com.possaas.service.notification.EmailService;
import com.possaas.service.payment.PaymentService;
import com.possaas.service.audit.AuditLogService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SubscriptionService {

	private final TenantRepository tenantRepository;
	private final SubscriptionPlanRepository planRepository;
	private final UsageTrackingRepository usageTrackingRepository;
	private final BranchRepository branchRepository;
	private final ProductRepository productRepository;
	private final UserRepository userRepository;
	private final SubscriptionRepository subscriptionRepository;
	private final PaymentService paymentService;
	private final BillingService billingService;
	private final EmailService emailService;
	private final AuditLogService auditLogService;

	// =============================
	// INTERNAL HELPERS
	// =============================

	private Tenant getCurrentTenant() {
		String tenantId = TenantContext.getTenantId();

		if (tenantId == null) {
			throw new ResourceNotFoundException("Tenant context not set");
		}

		return tenantRepository.findById(tenantId).orElseThrow(() -> new ResourceNotFoundException("Tenant not found"));
	}

	public SubscriptionPlan getCurrentPlan() {
		return getCurrentTenant().getSubscriptionPlan();
	}

	// =============================
	// LIMITS
	// =============================

	public int getMaxUsersForCurrentTenant() {
		return getCurrentPlan().getMaxUsers();
	}

	public int getMaxBranchesForCurrentTenant() {
		return getCurrentPlan().getMaxBranches();
	}

	public int getMaxProductsForCurrentTenant() {
		return getCurrentPlan().getMaxProducts();
	}

	@Transactional
	public void checkBranchLimit(String tenantId) {

		Tenant tenant = getCurrentTenant();

		// ✅ Auto create if missing
		UsageTracking usage = getOrCreateUsage(tenant.getId());

		int maxBranches = tenant.getSubscriptionPlan().getMaxBranches();

		if (usage.getCurrentBranches() >= maxBranches) {
			throw new UserLimitExceededException("Branch limit exceeded. Please upgrade your plan.");
		}

		// increment branch usage
		usage.setCurrentBranches(usage.getCurrentBranches() + 1);
		usage.setLastUpdated(LocalDateTime.now());

		usageTrackingRepository.save(usage);
	}

	@Transactional
	public void checkProductLimit(String tenantId) {

	    Tenant tenant = getCurrentTenant();

	    // ✅ Auto create if missing (same as branch)
	    UsageTracking usage = getOrCreateUsage(tenant.getId());

	    int maxProducts = tenant.getSubscriptionPlan().getMaxProducts();

	    if (usage.getCurrentProducts() >= maxProducts) {
	        throw new UserLimitExceededException("Product limit exceeded. Please upgrade your plan.");
	    }

	    // increment product usage
	    usage.setCurrentProducts(usage.getCurrentProducts() + 1);
	    usage.setLastUpdated(LocalDateTime.now());

	    usageTrackingRepository.save(usage);
	}

	@Transactional
	public void decrementProductUsage() {

		Tenant tenant = getCurrentTenant();

		UsageTracking usage = usageTrackingRepository.findByTenantId(tenant.getId())
				.orElseThrow(() -> new ResourceNotFoundException("Usage not found"));

		if (usage.getCurrentProducts() > 0) {
			usage.setCurrentProducts(usage.getCurrentProducts() - 1);
			usage.setLastUpdated(java.time.LocalDateTime.now());
		}
	}

	@Transactional
	public RazorpayOrderResponse initiateUpgrade(String newPlanId) {

		Tenant tenant = getCurrentTenant();

		Subscription subscription = subscriptionRepository.findByTenantId(tenant.getId())
				.orElseThrow(() -> new RuntimeException("Subscription not found"));

		if (subscription.getStatus() != SubscriptionStatus.ACTIVE) {
			throw new RuntimeException("Subscription must be ACTIVE to upgrade");
		}

		SubscriptionPlan currentPlan = subscription.getPlan();

		SubscriptionPlan newPlan = planRepository.findById(newPlanId)
				.orElseThrow(() -> new ResourceNotFoundException("Plan not found"));

		if (newPlan.getMonthlyPrice().compareTo(currentPlan.getMonthlyPrice()) <= 0) {
			throw new RuntimeException("Downgrade plans are disabled");
		}

		// 🔥 Simple difference calculation
		BigDecimal difference = newPlan.getMonthlyPrice().subtract(currentPlan.getMonthlyPrice());

		CreatePaymentOrderRequest request = CreatePaymentOrderRequest.builder().amount(difference).currency("INR")
				.receipt("UPGRADE_" + tenant.getId()).build();

		RazorpayOrderResponse order = paymentService.createRazorpayOrder(request);

		// Mark subscription as pending upgrade
		subscription.setStatus(SubscriptionStatus.PENDING_PAYMENT);
		subscription.setBillingCycle(BillingCycle.MONTHLY);

		auditLogService.log("SUBSCRIPTION_UPGRADE_INITIATED", "SUBSCRIPTION", tenant.getId(), 
				"Upgrade initiated from " + currentPlan.getId() + " to " + newPlan.getId(), tenant.getId());

		return order;
	}

	@Transactional
	public void activateUpgrade(String tenantId, String newPlanId) {

		Subscription subscription = subscriptionRepository.findByTenantId(tenantId)
				.orElseThrow(() -> new ResourceNotFoundException("Subscription not found"));

		SubscriptionPlan newPlan = planRepository.findById(newPlanId)
				.orElseThrow(() -> new ResourceNotFoundException("Plan not found"));

		subscription.setPlan(newPlan);
		subscription.setStatus(SubscriptionStatus.ACTIVE);
		subscription.setBillingCycle(BillingCycle.MONTHLY);

		auditLogService.log("SUBSCRIPTION_UPGRADE_ACTIVATED", "SUBSCRIPTION", tenantId, 
				"Upgrade activated for plan: " + newPlan.getId(), tenantId);

		// Generate invoice for upgrade
		billingService.generateSubscriptionInvoice(tenantId, newPlan.getMonthlyPrice(), LocalDateTime.now(),
				subscription.getNextBillingDate());
	}

	@Transactional
	public SubscriptionUsageResponse getUsageStatistics() {

	    Tenant tenant = getCurrentTenant();
	    String tenantId = tenant.getId();

	    // 🔥 1️⃣ Get real counts from database
	    long totalUsers = userRepository.countByTenantId(tenantId);
	    long totalBranches = branchRepository.countByTenantId(tenantId);
	    long totalProducts = productRepository.countByTenantId(tenantId);

	    // 🔥 2️⃣ Get or create usage record
	    UsageTracking usage = getOrCreateUsage(tenantId);

	    // 🔥 3️⃣ Sync usage table with real values
	    usage.setCurrentUsers(totalUsers);
	    usage.setCurrentBranches(totalBranches);
	    usage.setCurrentProducts(totalProducts);
	    usage.setLastUpdated(LocalDateTime.now());

	    usageTrackingRepository.save(usage);

	    int maxUsers = tenant.getSubscriptionPlan().getMaxUsers();
	    int maxBranches = tenant.getSubscriptionPlan().getMaxBranches();
	    int maxProducts = tenant.getSubscriptionPlan().getMaxProducts();

	    return SubscriptionUsageResponse.builder()
	            .maxUsers(maxUsers)
	            .maxBranches(maxBranches)
	            .maxProducts(maxProducts)
	            .currentUsers(totalUsers)
	            .currentBranches(totalBranches)
	            .currentProducts(totalProducts)
	            .userLimitReached(totalUsers >= maxUsers)
	            .branchLimitReached(totalBranches >= maxBranches)
	            .productLimitReached(totalProducts >= maxProducts)
	            .build();
	}

	@Transactional
	public void checkUserLimitAndIncrement() {

	    Tenant tenant = getCurrentTenant();
	    String tenantId = tenant.getId();

	    // 🔥 1️⃣ Get real user count from DB
	    long totalUsers =
	            userRepository.countByTenantId(tenantId);

	    int maxUsers = tenant.getSubscriptionPlan().getMaxUsers();

	    // 🔥 2️⃣ Validate using real count
	    if (totalUsers >= maxUsers) {
	        throw new UserLimitExceededException(
	                "User limit exceeded. Please upgrade your plan.");
	    }

	    // 🔥 3️⃣ Sync usage table (optional, for dashboard)
	    UsageTracking usage = getOrCreateUsage(tenantId);
	    usage.setCurrentUsers(totalUsers);
	    usage.setLastUpdated(LocalDateTime.now());

	    usageTrackingRepository.save(usage);
	}
	
	

	public List<SubscriptionPlan> getAllPlans() {
		return planRepository.findAll();
	}

	public boolean canDowngrade(String newPlanId) {

		Tenant tenant = getCurrentTenant();
		SubscriptionPlan newPlan = planRepository.findById(newPlanId)
				.orElseThrow(() -> new ResourceNotFoundException("Plan not found"));

//        UsageTracking usage = usageTrackingRepository
//                .findByTenantId(tenant.getId())
//                .orElseThrow(() -> new ResourceNotFoundException("Usage not found"));
		UsageTracking usage = getOrCreateUsage(tenant.getId());

		return usage.getCurrentUsers() <= newPlan.getMaxUsers()
				&& usage.getCurrentBranches() <= newPlan.getMaxBranches()
				&& usage.getCurrentProducts() <= newPlan.getMaxProducts();
	}

	@Transactional
	public void syncUsageFromDatabase() {

	    Tenant tenant = getCurrentTenant();
	    String tenantId = tenant.getId();

	    long users = userRepository.countByTenantId(tenantId);
	    long branches = branchRepository.countByTenantId(tenantId);
	    long products = productRepository.countByTenantId(tenantId);

	    UsageTracking usage = getOrCreateUsage(tenantId);

	    usage.setCurrentUsers(users);
	    usage.setCurrentBranches(branches);
	    usage.setCurrentProducts(products);
	    usage.setLastUpdated(LocalDateTime.now());

	    usageTrackingRepository.save(usage); // 🔥 THIS WAS MISSING
	}

	public void validateSubscriptionActive() {

		String tenantId = TenantContext.getTenantId();

		if (tenantId == null) {
			throw new RuntimeException("Tenant context not set");
		}

		Subscription subscription = subscriptionRepository.findByTenantId(tenantId)
				.orElseThrow(() -> new RuntimeException("Subscription not found"));

		LocalDateTime now = LocalDateTime.now();
		boolean inGrace = subscription.getGracePeriodEndDate() != null
				&& !now.isAfter(subscription.getGracePeriodEndDate());
		// Backward-compatible guard for legacy records that may have been marked
		// CANCELLED immediately before period-end scheduling behavior.
		boolean cancelledButStillActive = subscription.getStatus() == SubscriptionStatus.CANCELLED
				&& subscription.getNextBillingDate() != null
				&& !now.isAfter(subscription.getNextBillingDate());
		boolean valid = subscription.getStatus() == SubscriptionStatus.ACTIVE
				|| subscription.getStatus() == SubscriptionStatus.GRACE_PERIOD
				|| (subscription.getStatus() == SubscriptionStatus.PAST_DUE && inGrace)
				|| cancelledButStillActive;

		if (!valid) {
			throw new RuntimeException("Subscription is not active. Please renew to continue.");
		}
	}

	// =============================
	// INTERNAL USAGE HELPER
	// =============================

	private UsageTracking getOrCreateUsage(String tenantId) {

		return usageTrackingRepository.findByTenantId(tenantId).orElseGet(() -> {

			UsageTracking usage = new UsageTracking();
			usage.setTenantId(tenantId);
			usage.setCurrentUsers(0L);
			usage.setCurrentBranches(0L);
			usage.setCurrentProducts(0L);
			usage.setLastUpdated(LocalDateTime.now());

			return usageTrackingRepository.save(usage);
		});
	}

	@Transactional
	public RazorpayOrderResponse initiateSubscription(String planId) {

		Tenant tenant = getCurrentTenant();

		SubscriptionPlan plan = planRepository.findById(planId)
				.orElseThrow(() -> new ResourceNotFoundException("Plan not found"));

		// 1️⃣ Create Razorpay Order
		CreatePaymentOrderRequest request = CreatePaymentOrderRequest.builder().amount(plan.getMonthlyPrice())
				.currency("INR").receipt("SUB_" + tenant.getId())
				// .description("Subscription payment for plan: " + plan.getId())
				.build();

		RazorpayOrderResponse order = paymentService.createRazorpayOrder(request);

		// 2️⃣ Create or Update Subscription
		Subscription subscription = subscriptionRepository.findByTenantId(tenant.getId()).orElse(new Subscription());

		subscription.setTenantId(tenant.getId());
		subscription.setPlan(plan);

		// ✅ Correct status
		subscription.setStatus(SubscriptionStatus.PENDING_PAYMENT);

		subscription.setStartDate(null);
		subscription.setNextBillingDate(null);

		subscriptionRepository.save(subscription);

		auditLogService.log("SUBSCRIPTION_INITIATED", "SUBSCRIPTION", tenant.getId(), 
				"New subscription initiated for plan: " + plan.getId(), tenant.getId());

		return order;
	}

	@Transactional
	public void activateSubscription(String tenantId) {

		Subscription subscription = subscriptionRepository.findByTenantId(tenantId)
				.orElseThrow(() -> new ResourceNotFoundException("Subscription not found"));

		subscription.setStatus(SubscriptionStatus.ACTIVE);
		subscription.setStartDate(LocalDateTime.now());
		subscription.setNextBillingDate(LocalDateTime.now().plusMonths(1));

		subscriptionRepository.save(subscription);

		auditLogService.log("SUBSCRIPTION_ACTIVATED", "SUBSCRIPTION", tenantId, 
				"Subscription activated for plan: " + subscription.getPlan().getId(), tenantId);

		// ✅ Generate first invoice using correct price
		billingService.generateSubscriptionInvoice(tenantId, subscription.getPlan().getMonthlyPrice(),
				subscription.getStartDate(), subscription.getNextBillingDate());
	}

	@Transactional
	public void cancelSubscription() {

		String tenantId = TenantContext.getTenantId();

		Subscription subscription = subscriptionRepository.findByTenantId(tenantId)
				.orElseThrow(() -> new RuntimeException("Subscription not found"));

		if (subscription.getStatus() != SubscriptionStatus.ACTIVE
				&& subscription.getStatus() != SubscriptionStatus.GRACE_PERIOD
				&& subscription.getStatus() != SubscriptionStatus.PAST_DUE) {
			throw new RuntimeException("Only active or grace-period subscription can be cancelled");
		}

		LocalDateTime now = LocalDateTime.now();
		LocalDateTime billingEnd = subscription.getNextBillingDate() != null
				? subscription.getNextBillingDate()
				: now.plusMonths(1);
		if (subscription.getNextBillingDate() == null) {
			subscription.setNextBillingDate(billingEnd);
		}

		// TC-082: schedule cancellation at billing cycle end while access remains active.
		subscription.setCancelAtPeriodEnd(true);
		subscription.setCancellationRequestedAt(now);
		subscription.setCancelledAt(billingEnd);
		subscription.setDataRetentionUntil(billingEnd.plusDays(30));
		subscriptionRepository.save(subscription);

		auditLogService.log("SUBSCRIPTION_CANCELLED", "SUBSCRIPTION", tenantId, 
				"Subscription cancellation scheduled for " + billingEnd.toLocalDate(), tenantId);

		// ✅ Send Cancellation Email
		sendCancellationEmail(tenantId, subscription, billingEnd);
	}

	@Transactional
	public int processScheduledCancellations() {
		LocalDateTime now = LocalDateTime.now();
		List<Subscription> scheduled = subscriptionRepository
				.findByCancelAtPeriodEndTrueAndNextBillingDateBefore(now);
		for (Subscription subscription : scheduled) {
			finalizeCancellation(subscription, now);
			subscriptionRepository.save(subscription);
		}
		return scheduled.size();
	}

	private void finalizeCancellation(Subscription subscription, LocalDateTime now) {
		subscription.setStatus(SubscriptionStatus.CANCELLED);
		subscription.setCancelAtPeriodEnd(false);
		subscription.setCancelledAt(now);
		subscription.setDataRetentionUntil(now.plusDays(30));
		subscription.setNextBillingDate(null);
		subscription.setNextPlan(null);
		subscription.setDowngradeEffectiveDate(null);
		subscription.setGracePeriodEndDate(null);
		subscription.setRetryCount(0);
		subscription.setNextRetryAt(null);
	}

	private void sendCancellationEmail(String tenantId, Subscription subscription, LocalDateTime billingEnd) {
		try {
			User admin = userRepository.findByTenantIdAndRoleAndIsDeletedFalse(tenantId, Role.ROLE_STORE_ADMIN)
					.stream().findFirst().orElse(null);
			if (admin == null) return;

			org.thymeleaf.context.Context context = new org.thymeleaf.context.Context();
			context.setVariable("name", resolveUserDisplayName(admin));
			context.setVariable("plan", subscription.getPlan().getId());
			context.setVariable("expiryDate", billingEnd.toLocalDate().toString());
			
			emailService.sendHtmlEmail(
					admin.getEmail(),
					"Subscription Cancellation Scheduled",
					"email/subscription-cancelled",
					context
			);
		} catch (Exception e) {
			// Fail silently for emails during cancelling
		}
	}

	@Transactional
	public void processOverdueSubscriptions() {
		LocalDateTime now = LocalDateTime.now();

		// 1️⃣ Mark Expired as PAST_DUE (Start Grace Period)
		List<Subscription> expired = subscriptionRepository.findByStatusAndNextBillingDateBefore(
				SubscriptionStatus.ACTIVE, now);
		
		for (Subscription sub : expired) {
			if (sub.isCancelAtPeriodEnd()) {
				continue;
			}
			sub.setStatus(SubscriptionStatus.PAST_DUE);
			sub.setGracePeriodEndDate(sub.getNextBillingDate().plusDays(7));
			subscriptionRepository.save(sub);
			
			// Notify user about grace period
			notifyGracePeriod(sub);
		}

		// 2️⃣ Handle Grace Period Expiry (downgrade path disabled)
		List<Subscription> graceEnded = subscriptionRepository.findByStatusAndGracePeriodEndDateBefore(
				SubscriptionStatus.PAST_DUE, now);

		for (Subscription sub : graceEnded) {
			finalizeCancellation(sub, now);
			subscriptionRepository.save(sub);
		}
	}

	@Transactional
	public void processSubscriptionReminders() {
		LocalDateTime now = LocalDateTime.now();
		LocalDateTime threeDaysFromNow = now.plusDays(3);

		// Find subscriptions expiring in exact 3, 2, or 1 days
		// For simplicity, we can just find all between now and 3 days and send reminders
		// But usually we want to send once per day. 
		// Here we'll just check if it's within the 3-day window and status is ACTIVE.
		List<Subscription> nearingExpiry = subscriptionRepository.findByStatusAndNextBillingDateBefore(
				SubscriptionStatus.ACTIVE, threeDaysFromNow);

		for (Subscription sub : nearingExpiry) {
			if (sub.getNextBillingDate().isAfter(now)) {
				sendReminderEmail(sub);
			}
		}
	}

	private void sendReminderEmail(Subscription sub) {
		try {
			User admin = userRepository.findByTenantIdAndRoleAndIsDeletedFalse(sub.getTenantId(), Role.ROLE_STORE_ADMIN)
					.stream().findFirst().orElse(null);
			if (admin == null) return;

			org.thymeleaf.context.Context context = new org.thymeleaf.context.Context();
			context.setVariable("name", resolveUserDisplayName(admin));
			context.setVariable("expiryDate", sub.getNextBillingDate().toLocalDate().toString());
			
			emailService.sendHtmlEmail(
					admin.getEmail(),
					"Subscription Renewal Reminder",
					"email/subscription-reminder",
					context
			);
		} catch (Exception ignored) {}
	}

	private void notifyGracePeriod(Subscription sub) {
		// Similar to reminder, send email about 7-day grace
	}

	private void notifyAutoDowngrade(Subscription sub) {
		// Downgrade flow intentionally disabled.
	}

	private String resolveUserDisplayName(User user) {
		String firstName = user.getFirstName();
		String lastName = user.getLastName();
		String fullName = ((firstName == null ? "" : firstName.trim()) + " " + (lastName == null ? "" : lastName.trim())).trim();
		if (!fullName.isEmpty()) {
			return fullName;
		}
		return Objects.requireNonNullElse(user.getUsername(), "Store Admin");
	}

	@Transactional
	public void reactivateSubscription() {
		String tenantId = TenantContext.getTenantId();
		if (tenantId == null) {
			throw new RuntimeException("Tenant context not set");
		}

		Subscription subscription = subscriptionRepository.findByTenantId(tenantId)
				.orElseThrow(() -> new RuntimeException("Subscription not found"));

		// If cancellation was only scheduled, just revert the schedule.
		if (subscription.isCancelAtPeriodEnd() && subscription.getStatus() != SubscriptionStatus.CANCELLED) {
			subscription.setCancelAtPeriodEnd(false);
			subscription.setCancellationRequestedAt(null);
			subscription.setCancelledAt(null);
			subscription.setDataRetentionUntil(null);
			subscriptionRepository.save(subscription);

			auditLogService.log("SUBSCRIPTION_REACTIVATED", "SUBSCRIPTION", tenantId, 
					"Subscription reactivation scheduled (scheduled cancellation reverted)", tenantId);
			return;
		}

		if (subscription.getStatus() != SubscriptionStatus.CANCELLED) {
			throw new RuntimeException("Only cancelled subscriptions can be reactivated");
		}

		LocalDateTime now = LocalDateTime.now();
		if (subscription.getDataRetentionUntil() != null && now.isAfter(subscription.getDataRetentionUntil())) {
			throw new RuntimeException("Reactivation window has expired. Please subscribe again.");
		}

		throw new RuntimeException("Cancelled subscriptions require a new payment to reactivate.");
	}

	@Transactional(readOnly = true)
	public SubscriptionStatusResponse getCurrentSubscriptionStatus() {
		String tenantId = TenantContext.getTenantId();
		if (tenantId == null) {
			throw new RuntimeException("Tenant context not set");
		}
		Subscription subscription = subscriptionRepository.findByTenantId(tenantId)
				.orElseThrow(() -> new RuntimeException("Subscription not found"));
		return SubscriptionStatusResponse.builder()
				.status(subscription.getStatus())
				.nextBillingDate(subscription.getNextBillingDate())
				.gracePeriodEndDate(subscription.getGracePeriodEndDate())
				.cancelAtPeriodEnd(subscription.isCancelAtPeriodEnd())
				.cancelledAt(subscription.getCancelledAt())
				.dataRetentionUntil(subscription.getDataRetentionUntil())
				.retryCount(subscription.getRetryCount())
				.nextRetryAt(subscription.getNextRetryAt())
				.paymentMethodLast4(subscription.getPaymentMethodLast4())
				.paymentMethodBrand(subscription.getPaymentMethodBrand())
				.build();
	}
}
