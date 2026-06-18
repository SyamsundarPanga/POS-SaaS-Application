-- =====================================================
-- Migration: V12__create_subscriptions_and_invoices_tables.sql
-- Description: Create subscriptions, invoices, and usage_tracking tables
-- Author: Development Team
-- Date: 2026-02-27
-- =====================================================

-- =====================================================
-- 1. SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE subscriptions (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    plan_id VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL, -- PENDING_PAYMENT, ACTIVE, PAST_DUE, EXPIRED, CANCELLED, GRACE_PERIOD
    start_date TIMESTAMP,
    next_billing_date TIMESTAMP,
    grace_period_end_date TIMESTAMP,
    
    -- Unique constraint (one subscription per tenant)
    CONSTRAINT uk_subscription_tenant UNIQUE (tenant_id),
    
    -- Foreign keys
    CONSTRAINT fk_subscription_plan FOREIGN KEY (plan_id) 
        REFERENCES subscription_plan(id)
);

-- Indexes
CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_next_billing ON subscriptions(next_billing_date);

-- =====================================================
-- 2. INVOICES TABLE
-- =====================================================
CREATE TABLE invoices (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(100),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    billing_start DATE,
    billing_end DATE,
    status VARCHAR(30) NOT NULL, -- PENDING, PAID, OVERDUE
    due_date DATE,
    paid_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- =====================================================
-- 3. USAGE TRACKING TABLE
-- =====================================================
CREATE TABLE usage_tracking (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL UNIQUE,
    current_users BIGINT NOT NULL DEFAULT 0,
    current_branches BIGINT NOT NULL DEFAULT 0,
    current_products BIGINT NOT NULL DEFAULT 0,
    version BIGINT, -- Optimistic locking
    last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_usage_tracking_tenant ON usage_tracking(tenant_id);

-- Comments
COMMENT ON TABLE subscriptions IS 'Tenant subscription records with billing dates';
COMMENT ON TABLE invoices IS 'Subscription invoices for billing';
COMMENT ON TABLE usage_tracking IS 'Real-time usage tracking for subscription limits';
COMMENT ON COLUMN usage_tracking.version IS 'Optimistic locking version for concurrent updates';
