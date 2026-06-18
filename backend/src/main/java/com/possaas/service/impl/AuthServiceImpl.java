package com.possaas.service.impl;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.context.Context;

import com.possaas.config.TenantContext;
import com.possaas.domain.security.PasswordResetOtp;
import com.possaas.domain.security.RefreshToken;
import com.possaas.domain.security.VerificationToken;
import com.possaas.domain.superadmin.SuperAdmin;
import com.possaas.domain.superadmin.SuperAdminStatus;
import com.possaas.domain.tenant.Subscription;
import com.possaas.domain.tenant.SubscriptionPaymentStatus;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionStatus;
import com.possaas.domain.tenant.Tenant;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.domain.user.UserStatus;
import com.possaas.dto.request.LoginRequest;
import com.possaas.dto.request.RegisterTenantRequest;
import com.possaas.dto.response.JwtResponse;
import com.possaas.dto.response.LoginResponse;
import com.possaas.dto.response.RefreshTokenResponse;
import com.possaas.dto.response.VerifyPasswordResetOtpResponse;
import com.possaas.exception.DuplicateResourceException;
import com.possaas.exception.ResourceNotFoundException;
import com.possaas.exception.TokenRefreshException;
import com.possaas.repository.PasswordResetOtpRepository;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.repository.SubscriptionPaymentRepository;
import com.possaas.repository.SubscriptionRepository;
import com.possaas.repository.SuperAdminRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.repository.UserRepository;
import com.possaas.repository.VerificationTokenRepository;
import com.possaas.security.service.SuperAdminDetailsImpl;
import com.possaas.security.service.UserDetailsImpl;
import com.possaas.service.auth.AuthService;
import com.possaas.service.audit.AuditLogService;
import com.possaas.service.auth.JwtTokenProvider;
import com.possaas.service.notification.EmailService;
import com.possaas.service.security.LoginAttemptService;
import com.possaas.service.security.RefreshTokenService;
import com.possaas.service.security.TokenBlacklistService;

@Service
public class AuthServiceImpl implements AuthService {

	private static final Logger logger = LoggerFactory.getLogger(AuthServiceImpl.class);

	@Autowired
	private AuthenticationManager authenticationManager;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private TenantRepository tenantRepository;

	@Autowired
	private PasswordEncoder encoder;

	@Autowired
	private JwtTokenProvider jwtTokenProvider;

	@Autowired
	private RefreshTokenService refreshTokenService;

	@Autowired
	private LoginAttemptService loginAttemptService;

	@Autowired
	private TokenBlacklistService tokenBlacklistService;

	@Autowired
	private SubscriptionPlanRepository subscriptionPlanRepository;

	@Autowired
	private SubscriptionRepository subscriptionRepository;

	@Autowired
	private SubscriptionPaymentRepository subscriptionPaymentRepository;

	@Autowired
	private PasswordResetOtpRepository passwordResetOtpRepository;

	@Autowired
	private EmailService emailService;

	@Autowired
	private SuperAdminRepository superAdminRepository;

	@Value("${app.security.password-reset.otp-expiry-minutes:10}")
	private long otpExpiryMinutes;

	@Value("${app.security.password-reset.token-expiry-minutes:15}")
	private long resetTokenExpiryMinutes;

	@Value("${app.security.password-reset.max-otp-attempts:5}")
	private int maxOtpAttempts;

	private static final SecureRandom SECURE_RANDOM = new SecureRandom();

	// Add a repository for managing verification tokens
	@Autowired
	private VerificationTokenRepository verificationTokenRepository;

	@Autowired
	private AuditLogService auditLogService;

	// Add your frontend URL for the email link
	@Value("${app.frontend.url:http://localhost:3000}")
	private String frontendUrl;

	@Value("${app.superadmin.contact-email:superadmin@possaas.com}")
	private String fallbackSuperAdminEmail;

	// ==================================================
	// REGISTER TENANT
	// ==================================================
	@Override
	@Transactional
	public JwtResponse registerTenant(RegisterTenantRequest request) {

		// 1️⃣ Get plan from DB
		SubscriptionPlan plan = subscriptionPlanRepository.findByPlanType(request.getPlan())
				.orElseThrow(() -> new RuntimeException("Subscription plan not found"));

		if (tenantRepository.existsByName(request.getStoreName())) {
			throw new DuplicateResourceException("Store name already exists. Please choose a different store name.");
		}
		// Validate username uniqueness GLOBAL (Across all tenants)
		if (userRepository.existsByUsername(request.getAdminUsername())) {
			logger.warn("Registration failed: Username already exists globally: {}", request.getAdminUsername());
			throw new DuplicateResourceException(
					"Username is already taken by another user. Please choose a different username.");
		}

		// Validate email uniqueness GLOBAL (Across all tenants)
		if (userRepository.existsByEmail(request.getAdminEmail())) {
			logger.warn("Registration failed: Email already exists globally: {}", request.getAdminEmail());
			throw new DuplicateResourceException("Email is already registered in our system. Please use a different email.");
		}

		Tenant tenant = new Tenant();
		tenant.setName(request.getStoreName());
		tenant.setSubscriptionPlan(plan);
		tenant = tenantRepository.save(tenant);

		// 2️⃣ Create subscription record
		Subscription subscription = new Subscription();
		subscription.setTenantId(tenant.getId());
		subscription.setPlan(plan);
		subscription.setStatus(SubscriptionStatus.PENDING_PAYMENT);
		subscription.setStartDate(null);
		subscription.setNextBillingDate(null);

		subscriptionRepository.save(subscription);

		try {
			TenantContext.setTenantId(tenant.getId());

			auditLogService.log("INITIAL_SUBSCRIPTION", "SUBSCRIPTION", tenant.getId(), 
					"Initial subscription created for plan: " + plan.getPlanType(), tenant.getId());

			User admin = new User();
			admin.setUsername(request.getAdminUsername());
			admin.setEmail(request.getAdminEmail());
			admin.setPassword(encoder.encode(request.getAdminPassword()));
			admin.setRole(Role.ROLE_STORE_ADMIN);
			// Fix: Keep user ACTIVE to prevent Spring Security Rollback!
			admin.setStatus(UserStatus.ACTIVE);
			// Fix: But mark their email as unverified
			admin.setEmailVerified(false);
			admin = userRepository.save(admin);

			String token = UUID.randomUUID().toString();
			logger.info("Generated verification token for {}: {}", admin.getEmail(), token);
			createVerificationToken(admin, token);
			sendVerificationEmail(admin.getEmail(), tenant.getName(), token);

			Authentication authentication = authenticationManager.authenticate(
					new UsernamePasswordAuthenticationToken(request.getAdminEmail(), request.getAdminPassword()));

			SecurityContextHolder.getContext().setAuthentication(authentication);

			UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

			String jwt = jwtTokenProvider.generateToken(authentication, tenant.getId());

			RefreshToken refreshToken = refreshTokenService.createRefreshToken(userDetails.getId(), tenant.getId());

			List<String> roles = userDetails.getAuthorities().stream().map(a -> a.getAuthority())
					.collect(Collectors.toList());

			return new JwtResponse(jwt, refreshToken.getToken(), "Bearer", userDetails.getId(),
					userDetails.getUsername(), userDetails.getEmail(), tenant.getId(), tenant.getName(), roles,admin.isEmailVerified());
		} finally {
			TenantContext.clear();
		}
	}

	// ==================================================
	// LOGIN (AUTO TENANT RESOLUTION + JWT)
	// ==================================================
	
	@Override
	@Transactional
	public LoginResponse login(LoginRequest request, String ipAddress) {

		String email = normalizeEmail(request.getEmail());

		// 1) Resolve tenant from the account email
		User user = userRepository.findByEmail(email)
				.orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

		String tenantId = user.getTenantId();

		// 2) Block sign-in while account is in active lockout window
		if (loginAttemptService.isAccountLocked(email, tenantId)) {
			long remainingSeconds = loginAttemptService.getRemainingLockoutTime(email, tenantId);
			throw new LockedException("Account locked due to multiple failed attempts. Try again in "
					+ Math.max(1, remainingSeconds) + " seconds.");
		}

		// 3) Set tenant context before authenticating
		TenantContext.setTenantId(tenantId);

		try {
			assertTenantIsActive(tenantId);
			Subscription subscription = subscriptionRepository.findByTenantId(tenantId).orElse(null);
			assertUserCanAccessPlatform(user, subscription);

			Authentication authentication = authenticationManager
					.authenticate(new UsernamePasswordAuthenticationToken(email, request.getPassword()));

			SecurityContextHolder.getContext().setAuthentication(authentication);

			UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

			String jwt = jwtTokenProvider.generateToken(authentication, tenantId);

			RefreshToken refreshToken = refreshTokenService.createRefreshToken(userDetails.getId(), tenantId);

			loginAttemptService.recordSuccessfulLogin(email, ipAddress, tenantId);

			List<String> roles = userDetails.getAuthorities().stream().map(a -> a.getAuthority())
					.collect(Collectors.toList());

			Tenant tenant = tenantRepository.findById(tenantId)
					.orElseThrow(() -> new RuntimeException("Tenant not found"));
			String accessMode = determineAccessMode(user, subscription);
			String subscriptionStatus = subscription != null && subscription.getStatus() != null
					? subscription.getStatus().name()
					: null;
			LocalDateTime dataRetentionUntil = subscription != null ? subscription.getDataRetentionUntil() : null;

			LoginResponse loginResponse = new LoginResponse(jwt, refreshToken.getToken(), "Bearer", userDetails.getId(),
					userDetails.getUsername(), userDetails.getEmail(), tenantId, tenant.getName(), roles,
					user.isEmailVerified(), accessMode, subscriptionStatus, dataRetentionUntil);
        
            auditLogService.log("USER_LOGIN", "AUTH", user.getId().toString(),
                    "User logged in from IP: " + ipAddress);
            
            return loginResponse;

		} catch (AuthenticationException ex) {
			loginAttemptService.recordFailedLogin(email, ipAddress, tenantId, ex.getClass().getSimpleName());

			// Propagate specific exceptions that should not be masked
			if (ex instanceof LockedException || ex instanceof AuthenticationServiceException || ex instanceof org.springframework.security.authentication.DisabledException) {
				throw ex;
			}

			if (loginAttemptService.isAccountLocked(email, tenantId)) {
				long remainingSeconds = loginAttemptService.getRemainingLockoutTime(email, tenantId);
				throw new LockedException("Account locked due to multiple failed attempts. Try again in " + Math.max(1, remainingSeconds) + " seconds.");
			}

			throw new BadCredentialsException("Invalid credentials");
		} catch (RuntimeException ex) {
			throw new AuthenticationServiceException("Authentication failed", ex);
		} finally {
			TenantContext.clear();
		}
	}

	@Override
	@Transactional
	public void requestPasswordResetOtp(String email) {
		String normalizedEmail = normalizeEmail(email);
		User user = userRepository.findActiveByEmail(normalizedEmail)
				.orElseThrow(() -> new IllegalArgumentException("No registered active account found with this email."));

		passwordResetOtpRepository.markAllActiveAsUsedByEmail(normalizedEmail);

		String otp = generateOtp();
		PasswordResetOtp passwordResetOtp = new PasswordResetOtp();
		passwordResetOtp.setEmail(normalizedEmail);
		passwordResetOtp.setTenantId(user.getTenantId());
		passwordResetOtp.setOtpHash(encoder.encode(otp));
		passwordResetOtp.setExpiresAt(LocalDateTime.now().plusMinutes(otpExpiryMinutes));
		passwordResetOtp.setVerificationAttempts(0);
		passwordResetOtp.setUsed(false);

		passwordResetOtpRepository.save(passwordResetOtp);
		sendPasswordResetOtpEmail(normalizedEmail, otp);
	}

	@Override
	@Transactional
	public VerifyPasswordResetOtpResponse verifyPasswordResetOtp(String email, String otp) {
		String normalizedEmail = normalizeEmail(email);
		PasswordResetOtp passwordResetOtp = passwordResetOtpRepository
				.findTopByEmailAndUsedFalseOrderByCreatedAtDesc(normalizedEmail)
				.orElseThrow(() -> new IllegalArgumentException("Invalid OTP. Please request a new OTP."));

		if (Boolean.TRUE.equals(passwordResetOtp.getUsed())) {
			throw new IllegalArgumentException("OTP already used. Please request a new OTP.");
		}

		if (passwordResetOtp.getExpiresAt().isBefore(LocalDateTime.now())) {
			throw new IllegalArgumentException("OTP has expired. Please request a new OTP.");
		}

		int attempts = passwordResetOtp.getVerificationAttempts() != null ? passwordResetOtp.getVerificationAttempts()
				: 0;
		if (attempts >= maxOtpAttempts) {
			throw new IllegalArgumentException("Maximum OTP attempts exceeded. Please request a new OTP.");
		}

		if (!encoder.matches(otp, passwordResetOtp.getOtpHash())) {
			passwordResetOtp.setVerificationAttempts(attempts + 1);
			passwordResetOtpRepository.save(passwordResetOtp);
			throw new IllegalArgumentException("Invalid OTP. Please try again.");
		}

		String resetToken = UUID.randomUUID().toString();
		passwordResetOtp.setVerifiedAt(LocalDateTime.now());
		passwordResetOtp.setVerificationAttempts(attempts + 1);
		passwordResetOtp.setResetTokenHash(encoder.encode(resetToken));
		passwordResetOtp.setResetTokenExpiresAt(LocalDateTime.now().plusMinutes(resetTokenExpiryMinutes));
		passwordResetOtpRepository.save(passwordResetOtp);

		return new VerifyPasswordResetOtpResponse("OTP verified successfully.", normalizedEmail, resetToken);
	}

	@Override
	@Transactional
	public void resetPassword(String email, String resetToken, String newPassword, String confirmPassword) {
		String normalizedEmail = normalizeEmail(email);
		validatePasswordResetInput(newPassword, confirmPassword);

		PasswordResetOtp passwordResetOtp = passwordResetOtpRepository
				.findTopByEmailAndUsedFalseOrderByCreatedAtDesc(normalizedEmail)
				.orElseThrow(() -> new IllegalArgumentException("Reset request not found. Please verify OTP again."));

		if (passwordResetOtp.getVerifiedAt() == null) {
			throw new IllegalArgumentException("OTP verification required before resetting password.");
		}

		if (passwordResetOtp.getResetTokenHash() == null || passwordResetOtp.getResetTokenExpiresAt() == null) {
			throw new IllegalArgumentException("Invalid reset token. Please verify OTP again.");
		}

		if (passwordResetOtp.getResetTokenExpiresAt().isBefore(LocalDateTime.now())) {
			throw new IllegalArgumentException("Reset token has expired. Please verify OTP again.");
		}

		if (!encoder.matches(resetToken, passwordResetOtp.getResetTokenHash())) {
			throw new IllegalArgumentException("Invalid reset token. Please verify OTP again.");
		}

		User user = userRepository.findActiveByEmail(normalizedEmail)
				.orElseThrow(() -> new IllegalArgumentException("User account not found."));

		if (encoder.matches(newPassword, user.getPassword())) {
			throw new IllegalArgumentException("New password cannot be the same as current password.");
		}

		user.setPassword(encoder.encode(newPassword));
		userRepository.save(user);

		refreshTokenService.deleteByUserId(user.getId());
		passwordResetOtp.setUsed(true);
		passwordResetOtpRepository.save(passwordResetOtp);
	}

	// ==================================================
	// REFRESH TOKEN
	// ==================================================
	@Override
	@Transactional
	public RefreshTokenResponse refreshToken(String refreshToken) {

		return refreshTokenService.findByToken(refreshToken).map(refreshTokenService::verifyExpiration)
				.map(token -> {
					if (token.isSuperAdminToken()) {
						SuperAdmin superAdmin = token.getSuperAdmin();
						SuperAdminDetailsImpl details = SuperAdminDetailsImpl.build(superAdmin);

						Authentication authentication = new UsernamePasswordAuthenticationToken(details, null,
								details.getAuthorities());

						String accessToken = jwtTokenProvider.generateToken(authentication, "SUPERADMIN");

						return new RefreshTokenResponse(accessToken, refreshToken);
					}

					User user = token.getUser();
					if (user == null) {
						throw new TokenRefreshException(refreshToken, "Invalid refresh token");
					}

					assertTenantIsActive(user.getTenantId());
					Subscription subscription = subscriptionRepository.findByTenantId(user.getTenantId()).orElse(null);
					assertUserCanAccessPlatform(user, subscription);

					UserDetailsImpl details = UserDetailsImpl.build(user);

					Authentication authentication = new UsernamePasswordAuthenticationToken(details, null,
							details.getAuthorities());

					String accessToken = jwtTokenProvider.generateToken(authentication, user.getTenantId());

					return new RefreshTokenResponse(accessToken, refreshToken);
				}).orElseThrow(() -> new TokenRefreshException(refreshToken, "Invalid refresh token"));
	}

	@Override
	@Transactional
	public void logout(String refreshToken, String accessToken) {
		if (refreshToken != null && !refreshToken.isBlank()) {
			refreshTokenService.revokeToken(refreshToken);
		}

		if (accessToken == null || accessToken.isBlank()) {
			throw new IllegalArgumentException("Access token is required in Authorization header for logout.");
		}

		if (!jwtTokenProvider.validateToken(accessToken)) {
			throw new IllegalArgumentException("Invalid access token.");
		}

		tokenBlacklistService.blacklistToken(accessToken, jwtTokenProvider.getExpiration(accessToken));
        
        auditLogService.log("USER_LOGOUT", "AUTH", null, "User logged out");
	}

	private String normalizeEmail(String email) {
		return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
	}

	private void assertTenantIsActive(String tenantId) {
		if (tenantId == null || tenantId.isBlank() || "SUPERADMIN".equalsIgnoreCase(tenantId)) {
			return;
		}

		Tenant tenant = tenantRepository.findById(tenantId)
				.orElseThrow(() -> new ResourceNotFoundException("Tenant not found"));

		if (!tenant.isActive()) {
			throw new AuthenticationServiceException(
					"Your account has been deactivated by superadmin. For more information, contact superadmin at "
							+ resolveSuperAdminContactEmail() + ".");
		}
	}

	private String resolveSuperAdminContactEmail() {
		try {
			return superAdminRepository.findAll().stream()
					.filter(admin -> admin.getStatus() == SuperAdminStatus.ACTIVE)
					.map(SuperAdmin::getEmail)
					.filter(Objects::nonNull)
					.map(String::trim)
					.filter(email -> !email.isEmpty())
					.findFirst()
					.orElse(fallbackSuperAdminEmail);
		} catch (Exception ex) {
			logger.warn("Unable to resolve superadmin contact email. Falling back to {}", fallbackSuperAdminEmail, ex);
			return fallbackSuperAdminEmail;
		}
	}

	private String determineAccessMode(User user, Subscription subscription) {
		if (!user.isEmailVerified()) {
			return "NO_ACCESS";
		}

		if (!hasSuccessfulSubscriptionPayment(user.getTenantId())) {
			return "NO_ACCESS";
		}

		if (subscription == null || subscription.getStatus() == null) {
			return user.getRole() == Role.ROLE_STORE_ADMIN ? "BILLING_ONLY" : "NO_ACCESS";
		}

		SubscriptionStatus status = subscription.getStatus();
		LocalDateTime now = LocalDateTime.now();
		boolean graceActive = subscription.getGracePeriodEndDate() != null && !now.isAfter(subscription.getGracePeriodEndDate());
		boolean retentionActive = subscription.getDataRetentionUntil() != null && !now.isAfter(subscription.getDataRetentionUntil());

		if (status == SubscriptionStatus.ACTIVE || status == SubscriptionStatus.GRACE_PERIOD) {
			return "FULL_ACCESS";
		}
		if (status == SubscriptionStatus.PAST_DUE && graceActive) {
			return "FULL_ACCESS";
		}

		if (user.getRole() == Role.ROLE_STORE_ADMIN) {
			if (status == SubscriptionStatus.CANCELLED && !retentionActive) {
				return "NO_ACCESS";
			}
			return "BILLING_ONLY";
		}

		return "NO_ACCESS";
	}

	private void assertUserCanAccessPlatform(User user, Subscription subscription) {
		if (!user.isEmailVerified()) {
			throw new AuthenticationServiceException(
					"Your email is not verified. Please verify your email and complete payment before signing in.");
		}

		if (!hasSuccessfulSubscriptionPayment(user.getTenantId())) {
			throw new AuthenticationServiceException(
					"Your subscription payment is pending. Please complete payment before signing in.");
		}

		if (subscription != null && subscription.getStatus() == SubscriptionStatus.PENDING_PAYMENT) {
			throw new AuthenticationServiceException(
					"Your subscription payment is pending. Please complete payment before signing in.");
		}
	}

	private boolean hasSuccessfulSubscriptionPayment(String tenantId) {
		return subscriptionPaymentRepository.existsByTenantIdAndPaymentStatus(
				tenantId,
				SubscriptionPaymentStatus.SUCCESS);
	}

	private String generateOtp() {
		int otpNumber = 100000 + SECURE_RANDOM.nextInt(900000);
		return String.valueOf(otpNumber);
	}

	private void sendPasswordResetOtpEmail(String toEmail, String otp) {
		Context context = new Context();
		context.setVariable("otp", otp);
		context.setVariable("expiryMinutes", otpExpiryMinutes);

		emailService.sendHtmlEmail(toEmail, "PayPoint Password Reset OTP", "email/password-reset-otp", context);
	}

	private void validatePasswordResetInput(String newPassword, String confirmPassword) {
		if (!newPassword.equals(confirmPassword)) {
			throw new IllegalArgumentException("New password and confirm password do not match.");
		}

		String passwordPattern = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#])[A-Za-z\\d@$!%*?&#]{8,64}$";
		if (!newPassword.matches(passwordPattern)) {
			throw new IllegalArgumentException(
					"Password must be 8-64 characters with uppercase, lowercase, number, and special character.");
		}
	}

	// ==================================================
	// VERIFY EMAIL AND ACTIVATE ACCOUNT
	// ==================================================

	@Override
	@Transactional
	public void verifyEmailAccount(String token) {
		VerificationToken verificationToken = verificationTokenRepository.findByToken(token)
				.orElseThrow(() -> new IllegalArgumentException("Invalid verification token."));

		if (verificationToken.getExpiryDate().isBefore(LocalDateTime.now())) {
			throw new IllegalArgumentException("Verification token has expired.");
		}

		// Activate the user's email
		User user = verificationToken.getUser();
		user.setEmailVerified(true); // FLIP THE NEW FLAG
		userRepository.save(user);

		// Delete the token
		verificationTokenRepository.delete(verificationToken);

		// Send the Welcome Email
		Tenant tenant = tenantRepository.findById(user.getTenantId())
				.orElseThrow(() -> new RuntimeException("Tenant not found"));
		sendWelcomeEmail(user.getEmail(), tenant.getName());
	}

	private void createVerificationToken(User user, String token) {
		VerificationToken myToken = new VerificationToken();
		myToken.setToken(token);
		myToken.setUser(user);
		// Set expiry for 24 hours from now
		myToken.setExpiryDate(LocalDateTime.now().plusHours(24));
		verificationTokenRepository.save(myToken);
	}

	private void sendVerificationEmail(String toEmail, String storeName, String token) {
		Context context = new Context();
		context.setVariable("storeName", storeName);

		// Constructs the link the user will click: e.g.,
		// http://localhost:3000/verify-email?token=abc-123
		String verificationUrl = frontendUrl + "/verify-email?token=" + token;
		context.setVariable("verificationUrl", verificationUrl);

		emailService.sendHtmlEmail(toEmail, "Action Required: Verify your " + storeName + " account",
				"email/verification-email", // You must create this Thymeleaf HTML template
				context);
	}

	private void sendWelcomeEmail(String toEmail, String storeName) {
		Context context = new Context();
		context.setVariable("storeName", storeName);
		context.setVariable("loginUrl", frontendUrl + "/login");

		emailService.sendHtmlEmail(toEmail, "Welcome to " + storeName + " - Your Workspace is Ready!",
				"email/welcome-email", // You must create this Thymeleaf HTML template
				context);
	}

	@Override
	@Transactional
	public void requestPasswordResetLink(String email) {
	    String normalizedEmail = normalizeEmail(email);
	    
	    // 1. Verify user exists and is active
	    User user = userRepository.findActiveByEmail(normalizedEmail)
	            .orElseThrow(() -> new IllegalArgumentException("No registered active account found with this email."));

	    // 2. Invalidate any existing/old reset requests for this email
	    passwordResetOtpRepository.markAllActiveAsUsedByEmail(normalizedEmail);

	    // 3. Generate a unique reset token
	    String resetToken = UUID.randomUUID().toString();
	    
	    // 4. Reuse PasswordResetOtp entity to store the link token
	    PasswordResetOtp passwordResetLink = new PasswordResetOtp();
	    passwordResetLink.setEmail(normalizedEmail);
	    passwordResetLink.setTenantId(user.getTenantId());
	    
	    // FIX: Provide placeholders for NOT NULL columns to prevent PSQLException
	    // Since we are using a link, we don't need a real OTP, but the DB requires a value
	    passwordResetLink.setOtpHash("LINK_BASED_AUTH"); 
	    passwordResetLink.setExpiresAt(LocalDateTime.now().plusMinutes(30)); 
	    
	    // Set the actual Link Token data
	    passwordResetLink.setResetTokenHash(encoder.encode(resetToken));
	    passwordResetLink.setResetTokenExpiresAt(LocalDateTime.now().plusMinutes(30)); // Link valid for 30 mins
	    
	    passwordResetLink.setUsed(false);
	    passwordResetLink.setVerificationAttempts(0); // Initialize to 0
	    passwordResetLink.setVerifiedAt(LocalDateTime.now()); // Link acts as the "verified" step

	    passwordResetOtpRepository.save(passwordResetLink);

	    // 5. Send the HTML Email with the link
	    sendPasswordResetLinkEmail(normalizedEmail, resetToken);
	}
	
	private void sendPasswordResetLinkEmail(String toEmail, String token) {
	    Context context = new Context();
	    // Construct link: http://localhost:3000/reset-password?token=uuid&email=user@example.com
	    // Uses the frontendUrl configured in your application properties
	    String resetUrl = frontendUrl + "/reset-password?token=" + token + "&email=" + toEmail;
	    
	    context.setVariable("resetUrl", resetUrl);
	    context.setVariable("expiryMinutes", 30);

	    emailService.sendHtmlEmail(
	            toEmail, 
	            "PayPoint Password Reset Link", 
	            "email/password-reset-link", 
	            context
	    );
	}
}






