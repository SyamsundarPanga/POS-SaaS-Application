package com.possaas.service.security;

import com.possaas.config.TenantContext;
import com.possaas.domain.security.LoginAttempt;
import com.possaas.repository.LoginAttemptRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class LoginAttemptService {

    private static final Logger logger =
            LoggerFactory.getLogger(LoginAttemptService.class);

    @Value("${app.security.max-login-attempts:5}")
    private int maxLoginAttempts;

    @Value("${app.security.lockout-duration-seconds:30}")
    private int lockoutDurationSeconds;

    private final LoginAttemptRepository repository;

    public LoginAttemptService(LoginAttemptRepository repository) {
        this.repository = repository;
    }

    // ============================
    // SUCCESSFUL LOGIN
    // ============================
    @Transactional
    public void recordSuccessfulLogin(
            String username,
            String ipAddress,
            String tenantId) {

        LoginAttempt attempt = new LoginAttempt();
        attempt.setUsername(username);
        attempt.setIpAddress(ipAddress);
        attempt.setSuccessful(true);
        attempt.setTenantId(tenantId);

        repository.save(attempt);

        // Delete ONLY failed attempts
        repository.deleteByUsernameAndTenantIdAndSuccessfulFalse(username, tenantId);

        logger.info(
                "Successful login recorded | user={} tenant={} ip={}",
                username, tenantId, ipAddress
        );
    }
    // ============================
    // FAILED LOGIN
    // ============================
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailedLogin(
            String username,
            String ipAddress,
            String tenantId,
            String reason) {

        LoginAttempt attempt = new LoginAttempt();
        attempt.setUsername(username);
        attempt.setIpAddress(ipAddress);
        attempt.setSuccessful(false);
        attempt.setFailureReason(reason);
        attempt.setTenantId(tenantId);

        repository.save(attempt);

        logger.warn(
                "Failed login | user={} tenant={} ip={} reason={}",
                username, tenantId, ipAddress, reason
        );
    }
    // ============================
    // ACCOUNT LOCK CHECK
    // ============================
    public boolean isAccountLocked(String username, String tenantId) {

        // SET TENANT CONTEXT
        TenantContext.setTenantId(tenantId);

        try {

            LocalDateTime threshold =
                    LocalDateTime.now().minusSeconds(lockoutDurationSeconds);

            long failedAttempts =
                    repository.countFailedAttemptsSince(username, tenantId, threshold);

            logger.info(
                    "Failed login attempts in last {} seconds = {} | user={} tenant={}",
                    lockoutDurationSeconds,
                    failedAttempts,
                    username,
                    tenantId
            );

            if (failedAttempts >= maxLoginAttempts) {

                logger.warn(
                        "Account LOCKED | user={} tenant={} attempts={}",
                        username,
                        tenantId,
                        failedAttempts
                );

                return true;
            }

            return false;

        } finally {

            TenantContext.clear();

        }
    }

    // ============================
    // REMAINING LOCKOUT TIME
    // ============================
    public long getRemainingLockoutTime(
            String username,
            String tenantId) {

        LocalDateTime threshold =
                LocalDateTime.now().minusSeconds(lockoutDurationSeconds);

        List<LoginAttempt> attempts =
                repository.findFailedAttemptsSince(
                        username,
                        tenantId,
                        threshold
                );

        if (attempts.isEmpty()) {
            return 0;
        }

        if (attempts.size() < maxLoginAttempts) {
            return 0;
        }

        // Lock timer starts from the latest failed attempt that caused lockout.
        LocalDateTime latestAttempt =
                attempts.get(attempts.size() - 1).getAttemptTime();

        LocalDateTime unlockTime =
                latestAttempt.plusSeconds(lockoutDurationSeconds);

        long remaining =
                Duration.between(
                        LocalDateTime.now(),
                        unlockTime
                ).toSeconds();

        return Math.max(0, remaining);
    }

    // ============================
    // CLIENT IP
    // ============================
    public String getClientIP(HttpServletRequest request) {

        String forwarded =
                request.getHeader("X-Forwarded-For");

        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0];
        }

        return request.getRemoteAddr();
    }
}
