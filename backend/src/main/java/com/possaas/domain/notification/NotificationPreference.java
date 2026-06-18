package com.possaas.domain.notification;

import com.possaas.domain.base.AuditableEntity;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Entity
@Table(name = "notification_preferences")
@Data
@EqualsAndHashCode(callSuper = true)
public class NotificationPreference extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "low_stock_alerts")
    private boolean lowStockAlerts = true;

    @Column(name = "payment_alerts")
    private boolean paymentAlerts = true;

    @Column(name = "subscription_alerts")
    private boolean subscriptionAlerts = true;

    @Column(name = "system_alerts")
    private boolean systemAlerts = true;

    @Column(name = "email_notifications")
    private boolean emailNotifications = true;
}
