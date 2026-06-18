-- =====================================================
-- Migration: V24__subscription_lifecycle_and_payment_webhook.sql
-- Description: Add subscription lifecycle/payment method fields and webhook idempotency table
-- Author: Development Team
-- Date: 2026-03-12
-- =====================================================

ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS data_retention_until TIMESTAMP,
    ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS payment_method_token VARCHAR(255),
    ADD COLUMN IF NOT EXISTS payment_method_last4 VARCHAR(4),
    ADD COLUMN IF NOT EXISTS payment_method_brand VARCHAR(50);

CREATE TABLE IF NOT EXISTS payment_webhook_events (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(120) NOT NULL UNIQUE,
    event_type VARCHAR(120) NOT NULL,
    payload_hash VARCHAR(128) NOT NULL,
    processing_status VARCHAR(20) NOT NULL,
    processed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_type
    ON payment_webhook_events(event_type);
