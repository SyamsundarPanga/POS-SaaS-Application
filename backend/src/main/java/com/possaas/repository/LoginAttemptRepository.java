package com.possaas.repository;

import com.possaas.domain.security.LoginAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LoginAttemptRepository extends JpaRepository<LoginAttempt, Long> {

    @Query("""
        SELECT la
        FROM LoginAttempt la
        WHERE la.username = :username
          AND la.tenantId = :tenantId
          AND la.attemptTime > :since
          AND la.successful = false
        ORDER BY la.attemptTime ASC
    """)
    List<LoginAttempt> findFailedAttemptsSince(
            @Param("username") String username,
            @Param("tenantId") String tenantId,
            @Param("since") LocalDateTime since
    );

    @Query("""
        SELECT COUNT(la)
        FROM LoginAttempt la
        WHERE la.username = :username
          AND la.tenantId = :tenantId
          AND la.attemptTime > :since
          AND la.successful = false
    """)
    long countFailedAttemptsSince(
            @Param("username") String username,
            @Param("tenantId") String tenantId,
            @Param("since") LocalDateTime since
    );

    @Query("""
        SELECT la
        FROM LoginAttempt la
        WHERE la.username = :username
          AND la.tenantId = :tenantId
          AND la.successful = false
        ORDER BY la.attemptTime DESC
    """)
    List<LoginAttempt> findRecentAttempts(
            @Param("username") String username,
            @Param("tenantId") String tenantId
    );

    @Query("""
        SELECT COUNT(la)
        FROM LoginAttempt la
        WHERE la.username = :username
          AND la.tenantId = :tenantId
          AND la.successful = false
    """)
    long countRecentFailedAttempts(
            @Param("username") String username,
            @Param("tenantId") String tenantId
    );

    void deleteByUsernameAndTenantIdAndSuccessfulFalse(String username, String tenantId);
}

