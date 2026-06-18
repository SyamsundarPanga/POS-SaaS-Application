package com.possaas.service.notification;

import com.possaas.domain.notification.Notification;
import com.possaas.domain.notification.NotificationPreference;
import com.possaas.domain.notification.NotificationType;
import com.possaas.repository.NotificationPreferenceRepository;
import com.possaas.repository.NotificationRepository;
import com.possaas.repository.UserRepository;
import com.possaas.service.audit.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.context.Context;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationPreferenceRepository preferenceRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final AuditLogService auditLogService;
    private final com.possaas.repository.TenantRepository tenantRepository;
    private final com.possaas.repository.OrderRepository orderRepository;

    // =====================================================
    // SEND NOTIFICATION (In-App + Email)
    // =====================================================
    @Transactional
    public void sendNotification(Long userId,
                                 NotificationType type,
                                 String title,
                                 String message,
                                 String actionUrl) {

        // 1️⃣ Save In-App Notification
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setActionUrl(actionUrl);
        notificationRepository.save(notification);

        // 2️⃣ Fetch user
        userRepository.findById(userId).ifPresent(user -> {

            NotificationPreference prefs = preferenceRepository.findByUserId(userId)
                    .orElseGet(() -> createDefaultPreferences(userId));

            // 3️⃣ Email check
            if (shouldSendEmail(type, prefs)) {

                try {
                    Context context = new Context();
                    context.setVariable("name", user.getUsername());
                    context.setVariable("message", message);
                    context.setVariable("tenantName", 
                            tenantRepository.findById(user.getTenantId()).map(com.possaas.domain.tenant.Tenant::getName).orElse("POS SaaS System"));

                    // 🔥 Special handling for Order Confirmation
                    if (type == NotificationType.ORDER_CONFIRMATION) {
                        String orderNumber = extractOrderNumber(title);
                        context.setVariable("orderNumber", orderNumber);
                        context.setVariable("amount", extractAmount(message));
                        
                        // Try to get branch name from order
                        String branchName = "Main Branch";
                        try {
                            branchName = orderRepository.findByOrderNumberAndTenantId(orderNumber, user.getTenantId())
                                .map(order -> order.getBranch() != null ? order.getBranch().getName() : "Main Branch")
                                .orElse("Main Branch");
                        } catch (Exception e) {
                            log.warn("Could not fetch order for notification: {}", orderNumber);
                        }
                        context.setVariable("branchName", branchName);

                        emailService.sendHtmlEmail(
                                user.getEmail(),
                                title,
                                "email/order-confirmation",
                                context
                        );
                    } else {
                        // Generic system template
                        emailService.sendHtmlEmail(
                                user.getEmail(),
                                title,
                                "email/system",
                                context
                        );
                    }

                    log.info("Email notification sent to {}", user.getEmail());

                } catch (Exception e) {
                    log.error("Email sending failed for user {}", userId, e);
                }
            }
        });
    }

    // =====================================================
    // IN-APP ONLY NOTIFICATION
    // =====================================================
    @Transactional
    public void createNotification(Long userId,
                                   NotificationType type,
                                   String title,
                                   String message,
                                   String actionUrl) {
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setActionUrl(actionUrl);
        notificationRepository.save(notification);
    }

    // =====================================================
    // GET NOTIFICATIONS
    // =====================================================
    public Page<Notification> getNotifications(Long userId,
                                               Boolean unreadOnly,
                                               Pageable pageable) {

        if (unreadOnly != null && unreadOnly) {
            return notificationRepository.findAllByUserIdAndRead(userId, false, pageable);
        }
        return notificationRepository.findAllByUserId(userId, pageable);
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndRead(userId, false);
    }

    // =====================================================
    // MARK READ
    // =====================================================
    @Transactional
    public void markAsRead(Long id, Long userId) {
        notificationRepository.findByIdAndUserId(id, userId).ifPresent(n -> {
            boolean wasUnread = !n.isRead();
            n.setRead(true);
            notificationRepository.save(n);
            if (wasUnread && n.getType() == NotificationType.LOW_STOCK) {
                auditLogService.log(
                        "LOW_STOCK_ALERT_RESOLVED",
                        "NOTIFICATION",
                        n.getId().toString(),
                        String.format("Resolved low stock alert notification %d", n.getId()));
            }
        });
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        Page<Notification> unread =
                notificationRepository.findAllByUserIdAndRead(userId, false, Pageable.unpaged());

        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }
    
    @Transactional
    public void deleteNotification(Long id, Long userId) {
        notificationRepository.deleteByIdAndUserId(id, userId);
    }

    @Transactional
    public void clearAllNotifications(Long userId) {
        notificationRepository.deleteByUserId(userId);
    }

    // =====================================================
    // PREFERENCES
    // =====================================================
    public NotificationPreference getPreferences(Long userId) {
        return preferenceRepository.findByUserId(userId)
                .orElseGet(() -> createDefaultPreferences(userId));
    }

    @Transactional
    public NotificationPreference updatePreferences(Long userId,
                                                    NotificationPreference newPrefs) {

        NotificationPreference prefs = preferenceRepository.findByUserId(userId)
                .orElseGet(() -> {
                    NotificationPreference p = new NotificationPreference();
                    p.setUserId(userId);
                    return p;
                });

        prefs.setLowStockAlerts(newPrefs.isLowStockAlerts());
        prefs.setPaymentAlerts(newPrefs.isPaymentAlerts());
        prefs.setSubscriptionAlerts(newPrefs.isSubscriptionAlerts());
        prefs.setSystemAlerts(newPrefs.isSystemAlerts());
        prefs.setEmailNotifications(newPrefs.isEmailNotifications());

        return preferenceRepository.save(prefs);
    }

    // =====================================================
    // DEFAULT PREFERENCES (FIXED)
    // =====================================================
    private NotificationPreference createDefaultPreferences(Long userId) {

        NotificationPreference prefs = new NotificationPreference();
        prefs.setUserId(userId);

        // 🔥 Enable email by default
        prefs.setEmailNotifications(true);
        prefs.setLowStockAlerts(true);
        prefs.setPaymentAlerts(true);
        prefs.setSubscriptionAlerts(true);
        prefs.setSystemAlerts(true);

        return preferenceRepository.save(prefs);
    }

    // =====================================================
    // EMAIL RULE LOGIC
    // =====================================================
    private boolean shouldSendEmail(NotificationType type,
                                    NotificationPreference prefs) {

        if (!prefs.isEmailNotifications())
            return false;

        return switch (type) {
            case LOW_STOCK -> prefs.isLowStockAlerts();
            case PAYMENT_FAILED -> prefs.isPaymentAlerts();
            case SUBSCRIPTION_LIMIT -> prefs.isSubscriptionAlerts();
            case SYSTEM -> prefs.isSystemAlerts();
            case ORDER_CONFIRMATION -> true; // Always allow
        };
    }

    // =====================================================
    // HELPER METHODS
    // =====================================================
    private String extractOrderNumber(String title) {
        if (title == null) return "";
        return title.replace("Order Confirmed: ", "").trim();
    }

    private String extractAmount(String message) {
        if (message == null) return "";
        return message.replaceAll("[^0-9.]", "");
    }
}
