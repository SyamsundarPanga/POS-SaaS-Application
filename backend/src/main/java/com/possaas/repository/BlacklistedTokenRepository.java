package com.possaas.repository;

import com.possaas.domain.security.BlacklistedToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
public interface BlacklistedTokenRepository extends JpaRepository<BlacklistedToken, Long> {

    boolean existsByToken(String token);

    boolean existsByTokenAndExpiresAtAfter(String token, Instant now);

    long deleteByExpiresAtBefore(Instant now);
}
