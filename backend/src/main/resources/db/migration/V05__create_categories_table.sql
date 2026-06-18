-- =====================================================
-- Migration: V05__create_categories_table.sql
-- Description: Create categories table with self-referencing hierarchy
-- Author: Development Team
-- Date: 2026-02-27
-- =====================================================

CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    image_url VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    branch_id BIGINT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE
    parent_id BIGINT, -- Self-referencing for subcategories
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Unique constraint (tenant-scoped)
    CONSTRAINT uk_category_tenant_name UNIQUE (tenant_id, name),
    
    -- Foreign keys
    CONSTRAINT fk_category_branch FOREIGN KEY (branch_id) 
        REFERENCES branches(id),
    CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) 
        REFERENCES categories(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_categories_tenant ON categories(tenant_id);
CREATE INDEX idx_categories_branch ON categories(branch_id);
CREATE INDEX idx_categories_name ON categories(name);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_status ON categories(status);

-- Comments
COMMENT ON TABLE categories IS 'Product categories with hierarchical structure';
COMMENT ON COLUMN categories.parent_id IS 'Parent category for subcategories (self-referencing)';
COMMENT ON COLUMN categories.display_order IS 'Display order for sorting categories';
