package com.possaas.repository;

import com.possaas.domain.notification.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    Page<Notification> findAllByUserId(Long userId, Pageable pageable);

    Page<Notification> findAllByUserIdAndRead(Long userId, boolean read, Pageable pageable);

    long countByUserIdAndRead(Long userId, boolean read);

    Optional<Notification> findByIdAndUserId(Long id, Long userId);

    void deleteByIdAndUserId(Long id, Long userId);

    long deleteByUserId(Long userId);
}
