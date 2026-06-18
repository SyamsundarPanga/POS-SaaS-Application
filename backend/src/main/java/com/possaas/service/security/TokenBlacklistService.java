package com.possaas.service.security;

import com.possaas.domain.security.BlacklistedToken;
import com.possaas.repository.BlacklistedTokenRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class TokenBlacklistService {

    @Autowired
    private BlacklistedTokenRepository blacklistedTokenRepository;

    @Transactional
    public void blacklistToken(String token, Instant expiresAt) {
        if (token == null || token.isBlank() || expiresAt == null) {
            return;
        }

        if (blacklistedTokenRepository.existsByToken(token)) {
            return;
        }

        BlacklistedToken blacklistedToken = new BlacklistedToken();
        blacklistedToken.setToken(token);
        blacklistedToken.setExpiresAt(expiresAt);
        blacklistedTokenRepository.save(blacklistedToken);
    }

    @Transactional(readOnly = true)
    public boolean isBlacklisted(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        return blacklistedTokenRepository.existsByTokenAndExpiresAtAfter(token, Instant.now());
    }

    @Transactional
    public void purgeExpiredTokens() {
        blacklistedTokenRepository.deleteByExpiresAtBefore(Instant.now());
    }
}
