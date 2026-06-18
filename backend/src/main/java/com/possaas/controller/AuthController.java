package com.possaas.controller;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.possaas.dto.request.ForgotPasswordOtpRequest;
import com.possaas.dto.request.LoginRequest;
import com.possaas.dto.request.PendingRegistrationPaymentOrderRequest;
import com.possaas.dto.request.RefreshTokenRequest;
import com.possaas.dto.request.RegisterTenantRequest;
import com.possaas.dto.request.ResetPasswordRequest;
import com.possaas.dto.request.VerifyPendingRegistrationPaymentRequest;
import com.possaas.dto.request.VerifyPasswordResetOtpRequest;
import com.possaas.dto.response.LoginResponse;
import com.possaas.dto.response.PendingRegistrationResponse;
import com.possaas.dto.response.RefreshTokenResponse;
import com.possaas.dto.response.RazorpayOrderResponse;
import com.possaas.dto.response.TokenValidationResponse;
import com.possaas.dto.response.VerifyPasswordResetOtpResponse;
import com.possaas.repository.UserRepository;
import com.possaas.security.service.UserDetailsImpl;
import com.possaas.service.auth.AuthService;
import com.possaas.service.auth.PendingRegistrationService;
import com.possaas.service.security.LoginAttemptService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*", maxAge = 3600)
@Tag(name = "Authentication", description = "Authentication and token management APIs")
public class AuthController {

        private final AuthService authService;
        private final PendingRegistrationService pendingRegistrationService;
        private final LoginAttemptService loginAttemptService;
        private final UserRepository userRepository;

        public AuthController(
                        AuthService authService,
                        PendingRegistrationService pendingRegistrationService,
                        LoginAttemptService loginAttemptService,
                        UserRepository userRepository) {
                this.authService = authService;
                this.pendingRegistrationService = pendingRegistrationService;
                this.loginAttemptService = loginAttemptService;
                this.userRepository = userRepository;
        }

        // REGISTER TENANT
        @PostMapping("/register")
        @Operation(summary = "Start tenant registration", description = "Create a pending registration that must complete email verification and payment before the real tenant and admin user are created")
        @ApiResponses({
                        @ApiResponse(responseCode = "201", description = "Tenant registered successfully"),
                        @ApiResponse(responseCode = "400", description = "Invalid registration data")
        })
        public ResponseEntity<PendingRegistrationResponse> register(
                        @Valid @RequestBody RegisterTenantRequest request) {

                PendingRegistrationResponse response = pendingRegistrationService.startRegistration(request);
                return ResponseEntity.status(HttpStatus.CREATED).body(response);
        }

        // LOGIN
        @PostMapping("/login")
        @Operation(summary = "User login", description = """
                        Authenticate user using email, password, and tenantId.
                        Returns access token and refresh token.
                        """)
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Login successful"),
                        @ApiResponse(responseCode = "401", description = "Invalid credentials or tenant"),
                        @ApiResponse(responseCode = "403", description = "Account locked due to multiple failed attempts")
        })
        public ResponseEntity<?> login(
                        @Valid @RequestBody LoginRequest request,
                        HttpServletRequest httpRequest) {

                String ipAddress = loginAttemptService.getClientIP(httpRequest);

                try {
                        LoginResponse response = authService.login(request, ipAddress);
                        return ResponseEntity.ok(response);

                } catch (LockedException ex) {
                        long remainingSeconds = extractRemainingSeconds(ex.getMessage());
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                        .body(Map.of(
                                                        "error", "Account Locked",
                                                        "message", ex.getMessage(),
                                                        "remainingSeconds", remainingSeconds));
                } catch (Exception ex) {
                        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                        .body(Map.of(
                                                        "error", "Authentication Failed",
                                                        "message", ex.getMessage()));
                }
        }

        private long extractRemainingSeconds(String message) {
                if (message == null) {
                        return 0L;
                }
                java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("(\\d+)").matcher(message);
                if (matcher.find()) {
                        return Long.parseLong(matcher.group(1));
                }
                return 0L;
        }

        // REFRESH TOKEN
        @PostMapping("/refresh-token")
        @Operation(summary = "Refresh access token", description = "Generate a new access token using a valid refresh token")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Token refreshed successfully"),
                        @ApiResponse(responseCode = "401", description = "Invalid or expired refresh token")
        })
        public ResponseEntity<RefreshTokenResponse> refreshToken(
                        @Valid @RequestBody RefreshTokenRequest request) {

                RefreshTokenResponse response = authService.refreshToken(request.getRefreshToken());
                return ResponseEntity.ok(response);
        }

        @PostMapping("/forgot-password/request-link")
        @Operation(summary = "Request password reset link", description = "Sends a password reset link to the user's registered email if the account exists")
        public ResponseEntity<Map<String, String>> requestPasswordResetLink(
                        @RequestBody Map<String, String> request) {
                String email = request.get("email");
                authService.requestPasswordResetLink(email);
                return ResponseEntity.ok(Map.of(
                                "message", "Password reset link sent to your registered email."));
        }

        @PostMapping("/forgot-password/reset")
        @Operation(summary = "Reset password", description = "Resets user password after successful OTP verification")
        public ResponseEntity<Map<String, String>> resetPassword(
                        @Valid @RequestBody ResetPasswordRequest request) {

                authService.resetPassword(
                                request.getEmail(),
                                request.getResetToken(),
                                request.getNewPassword(),
                                request.getConfirmPassword());

                return ResponseEntity.ok(Map.of("message", "Password reset successful. Please sign in."));
        }

        // LOGOUT
        @PostMapping("/logout")
        @Operation(summary = "Logout", description = "Invalidate refresh token and logout user")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Logout successful"),
                        @ApiResponse(responseCode = "400", description = "Invalid refresh token")
        })
        public ResponseEntity<Map<String, String>> logout(
                        @Valid @RequestBody RefreshTokenRequest request,
                        HttpServletRequest httpRequest) {

                try {
                        String accessToken = extractBearerToken(httpRequest.getHeader("Authorization"));
                        authService.logout(request.getRefreshToken(), accessToken);
                        return ResponseEntity.ok(Map.of("message", "Logout successful"));
                } catch (IllegalArgumentException ex) {
                        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                        .body(Map.of(
                                                        "error", "Logout Failed",
                                                        "message", ex.getMessage()));
                }
        }

        private String extractBearerToken(String authorizationHeader) {
                if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
                        return authorizationHeader.substring(7);
                }
                return null;
        }

        // VALIDATE TOKEN
        @GetMapping("/validate")
        @Operation(summary = "Validate JWT token", description = "Validate current JWT token and return user details")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Token is valid"),
                        @ApiResponse(responseCode = "401", description = "Invalid or expired token")
        })
        public ResponseEntity<TokenValidationResponse> validate() {

                Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

                if (authentication == null ||
                                !authentication.isAuthenticated() ||
                                "anonymousUser".equals(authentication.getPrincipal())) {

                        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                        .body(new TokenValidationResponse(false, "Invalid token"));
                }

                Object principal = authentication.getPrincipal();
                Long id;
                String username;
                String email;
                String tenantId;
                List<String> roles;

                if (principal instanceof UserDetailsImpl) {
                        UserDetailsImpl user = (UserDetailsImpl) principal;
                        id = user.getId();
                        username = user.getUsername();
                        email = user.getEmail();
                        tenantId = user.getTenantId();
                        roles = user.getAuthorities().stream()
                                        .map(a -> a.getAuthority())
                                        .collect(Collectors.toList());
                } else if (principal instanceof com.possaas.security.service.SuperAdminDetailsImpl) {
                        com.possaas.security.service.SuperAdminDetailsImpl admin = (com.possaas.security.service.SuperAdminDetailsImpl) principal;
                        id = admin.getId();
                        username = admin.getUsername();
                        email = admin.getEmail();
                        tenantId = "SUPERADMIN";
                        roles = admin.getAuthorities().stream()
                                        .map(a -> a.getAuthority())
                                        .collect(Collectors.toList());
                } else {
                        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                        .body(new TokenValidationResponse(false, "Invalid principal type"));
                }

                return ResponseEntity.ok(
                                new TokenValidationResponse(
                                                true,
                                                "Token valid",
                                                new TokenValidationResponse.UserInfo(
                                                                id,
                                                                username,
                                                                email,
                                                                tenantId,
                                                                roles)));
        }

        @PostMapping("/verify-email")
        public ResponseEntity<?> verifyEmail(@RequestBody Map<String, String> body) {
                String token = body.get("token");
                try {
                        return ResponseEntity.ok(pendingRegistrationService.verifyEmailAccount(token));
                } catch (IllegalArgumentException e) {
                        return ResponseEntity.badRequest().body(e.getMessage());
                } catch (Exception e) {
                        return ResponseEntity.internalServerError().body("An error occurred during verification.");
                }
        }

        @GetMapping("/pending-registration/status")
        public ResponseEntity<PendingRegistrationResponse> getPendingRegistrationStatus(
                        @RequestParam String sessionToken) {
                return ResponseEntity.ok(pendingRegistrationService.getStatus(sessionToken));
        }

        @PostMapping("/pending-registration/create-order")
        public ResponseEntity<RazorpayOrderResponse> createPendingRegistrationOrder(
                        @Valid @RequestBody PendingRegistrationPaymentOrderRequest request) {
                return ResponseEntity.ok(pendingRegistrationService.createPaymentOrder(request));
        }

        @PostMapping("/pending-registration/verify-payment")
        public ResponseEntity<PendingRegistrationResponse> verifyPendingRegistrationPayment(
                        @Valid @RequestBody VerifyPendingRegistrationPaymentRequest request) {
                return ResponseEntity.ok(pendingRegistrationService.verifyPayment(request));
        }

        @GetMapping("/email-verification-status")
        public ResponseEntity<?> getEmailVerificationStatus() {
                Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

                if (authentication == null ||
                                !authentication.isAuthenticated() ||
                                "anonymousUser".equals(authentication.getPrincipal())) {
                        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                        .body(Map.of("message", "Unauthorized"));
                }

                UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
                boolean isVerified = userRepository.findById(userDetails.getId())
                                .map(u -> u.isEmailVerified())
                                .orElse(false);

                return ResponseEntity.ok(Map.of(
                                "verified", isVerified,
                                "email", userDetails.getEmail()));
        }
}
