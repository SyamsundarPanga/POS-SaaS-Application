-- =====================================================
-- Migration: V28__create_pending_registrations_table.sql
-- Description: Store pre-verification and pre-payment registration attempts
-- Author: Development Team
-- Date: 2026-03-27
-- =====================================================

CREATE TABLE IF NOT EXISTS pending_registrations (
    id BIGSERIAL PRIMARY KEY,
    store_name VARCHAR(100) NOT NULL,
    admin_username VARCHAR(50) NOT NULL,
    admin_email VARCHAR(100) NOT NULL,
    admin_password_hash VARCHAR(255) NOT NULL,
    plan VARCHAR(30) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token VARCHAR(255) NOT NULL UNIQUE,
    verification_token_expires_at TIMESTAMP NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    session_token_expires_at TIMESTAMP NOT NULL,
    payment_status VARCHAR(20),
    payment_amount NUMERIC(12,2),
    razorpay_order_id VARCHAR(100) UNIQUE,
    razorpay_payment_id VARCHAR(100),
    razorpay_signature TEXT,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pending_registrations_email
    ON pending_registrations(LOWER(admin_email));

CREATE INDEX IF NOT EXISTS idx_pending_registrations_username
    ON pending_registrations(LOWER(admin_username));

CREATE INDEX IF NOT EXISTS idx_pending_registrations_store
    ON pending_registrations(LOWER(store_name));

CREATE INDEX IF NOT EXISTS idx_pending_registrations_completed
    ON pending_registrations(completed);

COMMENT ON TABLE pending_registrations IS 'Temporary registration records that must finish email verification and payment before account creation';
