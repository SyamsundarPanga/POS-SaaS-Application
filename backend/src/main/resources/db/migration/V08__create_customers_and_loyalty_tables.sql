-- =====================================================
-- Migration: V08__create_customers_and_loyalty_tables.sql
-- Description: Create customers and loyalty_transactions tables
-- Author: Development Team
-- Date: 2026-02-27
-- =====================================================

-- =====================================================
-- 1. CUSTOMERS TABLE
-- =====================================================
CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(20),
    gender VARCHAR(10), -- MALE, FEMALE, OTHER
    date_of_birth DATE,
    address VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(50),
    
    -- Loyalty Program Fields
    loyalty_points INTEGER NOT NULL DEFAULT 0,
    total_points_earned INTEGER NOT NULL DEFAULT 0,
    total_points_redeemed INTEGER NOT NULL DEFAULT 0,
    loyalty_tier VARCHAR(20) NOT NULL DEFAULT 'BRONZE', -- BRONZE, SILVER, GOLD, PLATINUM, DIAMOND
    tier_updated_at TIMESTAMP,
    
    -- Purchase Statistics
    total_purchases INTEGER NOT NULL DEFAULT 0,
    total_spent NUMERIC(12,2) NOT NULL DEFAULT 0,
    average_order_value NUMERIC(10,2) DEFAULT 0,
    last_purchase_date TIMESTAMP,
    first_purchase_date TIMESTAMP,
    
    -- Customer Status
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, BLOCKED, DELETED
    notes VARCHAR(500),
    
    -- Marketing Preferences
    email_marketing_consent BOOLEAN DEFAULT FALSE,
    sms_marketing_consent BOOLEAN DEFAULT FALSE,
    
    -- Referral
    referred_by_customer_id BIGINT,
    referral_code VARCHAR(20) UNIQUE,
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Unique constraints (tenant-scoped)
    CONSTRAINT uk_customer_tenant_email UNIQUE (tenant_id, email),
    CONSTRAINT uk_customer_tenant_phone UNIQUE (tenant_id, phone)
);

-- Indexes
CREATE INDEX idx_customer_tenant_email ON customers(tenant_id, email);
CREATE INDEX idx_customer_tenant_phone ON customers(tenant_id, phone);
CREATE INDEX idx_customer_tenant_status ON customers(tenant_id, status);
CREATE INDEX idx_customer_loyalty_tier ON customers(tenant_id, loyalty_tier);
CREATE INDEX idx_customer_referral_code ON customers(referral_code);

-- =====================================================
-- 2. LOYALTY TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE loyalty_transactions (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    customer_id BIGINT NOT NULL,
    order_id BIGINT,
    transaction_type VARCHAR(20) NOT NULL, -- EARNED, REDEEMED, EXPIRED, ADJUSTED, BONUS, REFUNDED, TRANSFERRED
    points INTEGER NOT NULL,
    order_amount NUMERIC(10,2),
    points_before INTEGER NOT NULL,
    points_after INTEGER NOT NULL,
    tier_before VARCHAR(20),
    tier_after VARCHAR(20),
    description VARCHAR(500),
    reference_type VARCHAR(50), -- ORDER, MANUAL_ADJUSTMENT, REFERRAL, BIRTHDAY_BONUS, etc.
    reference_id BIGINT,
    performed_by BIGINT, -- User ID who performed the transaction (for manual adjustments)
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Foreign keys
    CONSTRAINT fk_loyalty_customer FOREIGN KEY (customer_id) 
        REFERENCES customers(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_loyalty_customer ON loyalty_transactions(tenant_id, customer_id);
CREATE INDEX idx_loyalty_order ON loyalty_transactions(tenant_id, order_id);
CREATE INDEX idx_loyalty_type ON loyalty_transactions(tenant_id, transaction_type);
CREATE INDEX idx_loyalty_created ON loyalty_transactions(created_at DESC);

-- Comments
COMMENT ON TABLE customers IS 'Customer profiles with loyalty program integration';
COMMENT ON TABLE loyalty_transactions IS 'Audit trail of all loyalty point transactions';
COMMENT ON COLUMN customers.loyalty_tier IS 'Customer loyalty tier based on points';
COMMENT ON COLUMN customers.total_spent IS 'Lifetime customer value';
