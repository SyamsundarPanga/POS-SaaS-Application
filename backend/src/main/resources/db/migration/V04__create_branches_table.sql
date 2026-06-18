-- =====================================================
-- Migration: V04__create_branches_table.sql
-- Description: Create branches table for multi-branch management
-- Author: Development Team
-- Date: 2026-02-27
-- =====================================================

CREATE TABLE branches (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    address VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, TEMPORARILY_CLOSED
    manager_id BIGINT,
    opening_time TIME,
    closing_time TIME,
    tax_rate NUMERIC(5,2), -- e.g., 8.50 for 8.5%
    is_main_branch BOOLEAN DEFAULT FALSE,
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Unique constraint (tenant-scoped)
    CONSTRAINT uk_branch_tenant_code UNIQUE (tenant_id, code)
);

-- Indexes
CREATE INDEX idx_branches_tenant ON branches(tenant_id);
CREATE INDEX idx_branches_code ON branches(code);
CREATE INDEX idx_branches_status ON branches(status);
CREATE INDEX idx_branches_manager ON branches(manager_id);

-- Add foreign key to users table for branch_id
ALTER TABLE users 
    ADD CONSTRAINT fk_user_branch 
    FOREIGN KEY (branch_id) REFERENCES branches(id);

-- Comments
COMMENT ON TABLE branches IS 'Branch/store locations for multi-branch tenants';
COMMENT ON COLUMN branches.code IS 'Unique branch code per tenant';
COMMENT ON COLUMN branches.tax_rate IS 'Branch-specific tax rate percentage';
COMMENT ON COLUMN branches.is_main_branch IS 'Indicates if this is the main/headquarters branch';

-- =====================================================
-- Branch Settings Table
-- =====================================================

CREATE TABLE branch_settings (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    branch_id BIGINT NOT NULL,
    tax_rate NUMERIC(5,2) DEFAULT 0.00,
    receipt_template TEXT,
    low_stock_threshold INTEGER DEFAULT 10,
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Unique constraint (one settings per branch per tenant)
    CONSTRAINT uk_branch_settings_branch_tenant UNIQUE (branch_id, tenant_id),
    
    -- Foreign key
    CONSTRAINT fk_branch_settings_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

-- =====================================================
-- Branch Opening Hours Table (ElementCollection)
-- =====================================================

CREATE TABLE branch_opening_hours (
    settings_id BIGINT NOT NULL,
    day_of_week VARCHAR(20) NOT NULL,
    hours VARCHAR(100),
    
    PRIMARY KEY (settings_id, day_of_week),
    CONSTRAINT fk_opening_hours_settings FOREIGN KEY (settings_id) REFERENCES branch_settings(id) ON DELETE CASCADE
);

-- =====================================================
-- Branch Payment Methods Table (ElementCollection)
-- =====================================================

CREATE TABLE branch_payment_methods (
    settings_id BIGINT NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    
    CONSTRAINT fk_payment_methods_settings FOREIGN KEY (settings_id) REFERENCES branch_settings(id) ON DELETE CASCADE
);

-- Indexes for branch_settings
CREATE INDEX idx_branch_settings_tenant ON branch_settings(tenant_id);
CREATE INDEX idx_branch_settings_branch ON branch_settings(branch_id);

-- Comments
COMMENT ON TABLE branch_settings IS 'Branch-specific settings and configurations';
COMMENT ON TABLE branch_opening_hours IS 'Branch opening hours by day of week (ElementCollection)';
COMMENT ON TABLE branch_payment_methods IS 'Enabled payment methods per branch (ElementCollection)';
COMMENT ON COLUMN branch_opening_hours.day_of_week IS 'Day of week: MONDAY, TUESDAY, etc.';
COMMENT ON COLUMN branch_opening_hours.hours IS 'Opening hours format: 09:00-17:00';
