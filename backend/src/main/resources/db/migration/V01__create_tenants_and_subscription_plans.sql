-- =====================================================
-- Migration: V01__create_tenants_and_subscription_plans.sql
-- Description: Create tenants and subscription_plan tables (Foundation)
-- Author: Development Team
-- Date: 2026-02-27
-- =====================================================

-- =====================================================
-- 1. SUBSCRIPTION PLANS TABLE (Must be created first)
-- =====================================================
CREATE TABLE subscription_plan (
    id VARCHAR(50) PRIMARY KEY, -- BASIC, PRO, ADVANCE
    plan_type VARCHAR(50) NOT NULL,
    max_branches INTEGER NOT NULL,
    max_users INTEGER NOT NULL,
    max_products INTEGER NOT NULL,
    monthly_price NUMERIC(12,2) NOT NULL
);

-- Comments
COMMENT ON TABLE subscription_plan IS 'Subscription plan definitions with feature limits and pricing';
COMMENT ON COLUMN subscription_plan.id IS 'Plan identifier (BASIC, PRO, ADVANCE)';
COMMENT ON COLUMN subscription_plan.monthly_price IS 'Monthly subscription price in currency';

-- =====================================================
-- 2. TENANTS TABLE
-- =====================================================
CREATE TABLE tenants (
    id VARCHAR(100) PRIMARY KEY, -- UUID
    name VARCHAR(255) NOT NULL UNIQUE,
    plan_id VARCHAR(50) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_tenant_plan FOREIGN KEY (plan_id) 
        REFERENCES subscription_plan(id)
);

-- Indexes
CREATE INDEX idx_tenants_plan ON tenants(plan_id);
CREATE INDEX idx_tenants_active ON tenants(active);

-- Comments
COMMENT ON TABLE tenants IS 'Multi-tenant organizations with subscription plans';
COMMENT ON COLUMN tenants.id IS 'Tenant UUID identifier';
COMMENT ON COLUMN tenants.plan_id IS 'Current subscription plan';

-- =====================================================
-- 3. SEED SUBSCRIPTION PLANS
-- =====================================================
INSERT INTO subscription_plan (id, plan_type, max_branches, max_users, max_products, monthly_price)
VALUES
    ('BASIC', 'BASIC', 10, 50, 1000, 1299.00),
    ('PRO', 'PRO', 100, 500, 9000, 2999.00),
    ('ADVANCE', 'ADVANCE', 400, 5000, 50000, 4999.00);
