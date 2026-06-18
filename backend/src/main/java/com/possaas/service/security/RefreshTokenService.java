package com.possaas.service.security;

import com.possaas.domain.security.RefreshToken;
import com.possaas.domain.superadmin.SuperAdmin;
import com.possaas.domain.user.User;
import com.possaas.exception.TokenRefreshException;
import com.possaas.repository.RefreshTokenRepository;
import com.possaas.repository.SuperAdminRepository;
import com.possaas.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class RefreshTokenService {

	@Value("${app.jwt.refresh-expiration-ms:604800000}") // 7 days default
	private Long refreshTokenDurationMs;

	@Autowired
	private RefreshTokenRepository refreshTokenRepository;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private SuperAdminRepository superAdminRepository;

	/**
	 * Find refresh token by token string
	 */
	public Optional<RefreshToken> findByToken(String token) {
		return refreshTokenRepository.findByToken(token);
	}

	/**
	 * Create a new refresh token for a user
	 */
	@Transactional
	public RefreshToken createRefreshToken(Long userId, String tenantId) {

		User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));

		return upsertUserRefreshToken(user, tenantId);
	}

	@Transactional
	public RefreshToken createSuperAdminRefreshToken(Long superAdminId) {

		SuperAdmin superAdmin = superAdminRepository.findById(superAdminId)
				.orElseThrow(() -> new RuntimeException("SuperAdmin not found"));

		return upsertSuperAdminRefreshToken(superAdmin);
	}

	private RefreshToken upsertUserRefreshToken(User user, String tenantId) {

		Optional<RefreshToken> existingToken = refreshTokenRepository.findByUser(user);
		String newTokenValue = UUID.randomUUID().toString();
		Instant newExpiry = Instant.now().plusMillis(refreshTokenDurationMs);

		if (existingToken.isPresent()) {

			RefreshToken token = existingToken.get();
			token.setToken(newTokenValue);
			token.setExpiryDate(newExpiry);
			token.setRevoked(false);
			token.setTenantId(tenantId);
			token.setUser(user);
			token.setSuperAdmin(null);

			return refreshTokenRepository.save(token);
		}

		RefreshToken refreshToken = new RefreshToken();
		refreshToken.setUser(user);
		refreshToken.setTenantId(tenantId);
		refreshToken.setExpiryDate(newExpiry);
		refreshToken.setToken(newTokenValue);
		refreshToken.setRevoked(false);

		return refreshTokenRepository.save(refreshToken);
	}

	private RefreshToken upsertSuperAdminRefreshToken(SuperAdmin superAdmin) {

		Optional<RefreshToken> existingToken = refreshTokenRepository.findBySuperAdmin(superAdmin);
		String newTokenValue = UUID.randomUUID().toString();
		Instant newExpiry = Instant.now().plusMillis(refreshTokenDurationMs);

		if (existingToken.isPresent()) {
			RefreshToken token = existingToken.get();
			token.setToken(newTokenValue);
			token.setExpiryDate(newExpiry);
			token.setRevoked(false);
			token.setTenantId("SUPERADMIN");
			token.setUser(null);
			token.setSuperAdmin(superAdmin);

			return refreshTokenRepository.save(token);
		}

		RefreshToken refreshToken = new RefreshToken();
		refreshToken.setUser(null);
		refreshToken.setSuperAdmin(superAdmin);
		refreshToken.setTenantId("SUPERADMIN");
		refreshToken.setExpiryDate(newExpiry);
		refreshToken.setToken(newTokenValue);
		refreshToken.setRevoked(false);

		return refreshTokenRepository.save(refreshToken);
	}

	/**
	 * Verify if refresh token is expired
	 */
	public RefreshToken verifyExpiration(RefreshToken token) {
		if (token.getExpiryDate().compareTo(Instant.now()) < 0) {
			refreshTokenRepository.delete(token);
			throw new TokenRefreshException(token.getToken(), "Refresh token has expired. Please login again.");
		}

		if (token.isRevoked()) {
			throw new TokenRefreshException(token.getToken(), "Refresh token has been revoked. Please login again.");
		}

		return token;
	}

	/**
	 * Revoke a refresh token
	 */
	@Transactional
	public void revokeToken(String token) {
		refreshTokenRepository.findByToken(token).ifPresent(rt -> {
			rt.setRevoked(true);
			refreshTokenRepository.save(rt);
		});
	}

	/**
	 * Delete refresh token by user
	 */
	@Transactional
	public void deleteByUserId(Long userId) {
		userRepository.findById(userId).ifPresent(user -> refreshTokenRepository.deleteByUser(user));
	}

	@Transactional
	public void deleteBySuperAdminId(Long superAdminId) {
		superAdminRepository.findById(superAdminId)
				.ifPresent(superAdmin -> refreshTokenRepository.deleteBySuperAdmin(superAdmin));
	}

	/**
	 * Clean up expired tokens (should be run periodically)
	 */
	@Transactional
	public void deleteExpiredTokens() {
		refreshTokenRepository.deleteExpiredTokens();
	}
}
