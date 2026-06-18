-- =====================================================
-- Migration: V13__create_notifications_table.sql
-- Description: Create notifications table
-- Author: Development Team
-- Date: 2026-02-27
-- =====================================================

CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- LOW_STOCK, PAYMENT_FAILED, SUBSCRIPTION_LIMIT, SYSTEM, ORDER_CONFIRMATION
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    user_id BIGINT,
    action_url VARCHAR(500),
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Indexes
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Comments
COMMENT ON TABLE notifications IS 'System notifications for users';
COMMENT ON COLUMN notifications.type IS 'Notification type for filtering and routing';
COMMENT ON COLUMN notifications.action_url IS 'Optional URL for notification action';

-- =====================================================
-- Notification Preferences Table
-- =====================================================

CREATE TABLE notification_preferences (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    user_id BIGINT NOT NULL,
    low_stock_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    payment_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    subscription_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    system_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Unique constraint (one preference per user)
    CONSTRAINT uk_notification_pref_user UNIQUE (user_id),
    
    -- Foreign key
    CONSTRAINT fk_notification_pref_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_notification_preferences_tenant ON notification_preferences(tenant_id);
CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);

-- Comments
COMMENT ON TABLE notification_preferences IS 'User notification preferences and settings';
COMMENT ON COLUMN notification_preferences.low_stock_alerts IS 'Enable/disable low stock notifications';
COMMENT ON COLUMN notification_preferences.payment_alerts IS 'Enable/disable payment-related notifications';
COMMENT ON COLUMN notification_preferences.subscription_alerts IS 'Enable/disable subscription notifications';
COMMENT ON COLUMN notification_preferences.system_alerts IS 'Enable/disable system notifications';
COMMENT ON COLUMN notification_preferences.email_notifications IS 'Enable/disable email notifications';
