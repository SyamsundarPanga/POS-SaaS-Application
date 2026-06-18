package com.possaas.repository;

import com.possaas.domain.security.RefreshToken;
import com.possaas.domain.superadmin.SuperAdmin;
import com.possaas.domain.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    
    Optional<RefreshToken> findByToken(String token);
    
    Optional<RefreshToken> findByUser(User user);

    Optional<RefreshToken> findBySuperAdmin(SuperAdmin superAdmin);
    
    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.user = :user")
    void deleteByUser(User user);

    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.superAdmin = :superAdmin")
    void deleteBySuperAdmin(SuperAdmin superAdmin);
    
    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.expiryDate < CURRENT_TIMESTAMP")
    void deleteExpiredTokens();
}
