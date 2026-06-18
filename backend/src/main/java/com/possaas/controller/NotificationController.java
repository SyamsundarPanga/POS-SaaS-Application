package com.possaas.controller;

import com.possaas.domain.notification.Notification;
import com.possaas.domain.notification.NotificationPreference;
import com.possaas.service.notification.NotificationService;
import com.possaas.security.service.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<Page<Notification>> getNotifications(
            @AuthenticationPrincipal UserDetailsImpl currentUser,
            @RequestParam(required = false) Boolean unreadOnly,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(notificationService.getNotifications(currentUser.getId(), unreadOnly, pageable));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Long> getUnreadCount(@AuthenticationPrincipal UserDetailsImpl currentUser) {
        return ResponseEntity.ok(notificationService.getUnreadCount(currentUser.getId()));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@AuthenticationPrincipal UserDetailsImpl currentUser,
            @PathVariable Long id) {
        notificationService.markAsRead(id, currentUser.getId());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(@AuthenticationPrincipal UserDetailsImpl currentUser) {
        notificationService.markAllAsRead(currentUser.getId());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@AuthenticationPrincipal UserDetailsImpl currentUser,
            @PathVariable Long id) {
        notificationService.deleteNotification(id, currentUser.getId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/clear-all")
    public ResponseEntity<Void> clearAllNotifications(@AuthenticationPrincipal UserDetailsImpl currentUser) {
        notificationService.clearAllNotifications(currentUser.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/preferences")
    public ResponseEntity<NotificationPreference> getPreferences(@AuthenticationPrincipal UserDetailsImpl currentUser) {
        return ResponseEntity.ok(notificationService.getPreferences(currentUser.getId()));
    }

    @PutMapping("/preferences")
    public ResponseEntity<NotificationPreference> updatePreferences(
            @AuthenticationPrincipal UserDetailsImpl currentUser,
            @RequestBody NotificationPreference preferences) {
        return ResponseEntity.ok(notificationService.updatePreferences(currentUser.getId(), preferences));
    }

}
