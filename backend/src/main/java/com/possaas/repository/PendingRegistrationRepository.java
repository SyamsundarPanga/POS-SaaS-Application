package com.possaas.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.possaas.domain.security.PendingRegistration;

@Repository
public interface PendingRegistrationRepository extends JpaRepository<PendingRegistration, Long> {

    Optional<PendingRegistration> findBySessionToken(String sessionToken);

    Optional<PendingRegistration> findByVerificationToken(String verificationToken);

    List<PendingRegistration> findByCompletedFalseAndAdminEmailIgnoreCase(String adminEmail);

    List<PendingRegistration> findByCompletedFalseAndAdminUsernameIgnoreCase(String adminUsername);

    List<PendingRegistration> findByCompletedFalseAndStoreNameIgnoreCase(String storeName);
}
