-- =====================================================
-- Migration: V06__create_products_table.sql
-- Description: Create products table for product catalog
-- Author: Development Team
-- Date: 2026-02-27
-- =====================================================

CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    cost_price NUMERIC(10,2), -- For profit margin calculation
    image_url VARCHAR(500),
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE
    category_id BIGINT,
    branch_id BIGINT,
    barcode VARCHAR(100),
    unit VARCHAR(50) DEFAULT 'PCS', -- Unit of measurement (PCS, KG, L, etc.)
    min_stock_level INTEGER DEFAULT 10,
    max_stock_level INTEGER,
    reorder_point INTEGER,
    tax_rate NUMERIC(5,2), -- Product-specific tax rate
    is_taxable BOOLEAN DEFAULT TRUE,
    allow_decimal_quantity BOOLEAN DEFAULT FALSE,
    tags TEXT, -- Comma-separated tags for search
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Unique constraints (tenant-scoped)
    CONSTRAINT uk_product_tenant_sku UNIQUE (tenant_id, sku),
    CONSTRAINT uk_product_tenant_barcode UNIQUE (tenant_id, barcode),
    
    -- Foreign keys
    CONSTRAINT fk_product_category FOREIGN KEY (category_id) 
        REFERENCES categories(id),
    CONSTRAINT fk_product_branch FOREIGN KEY (branch_id) 
        REFERENCES branches(id)
);

-- Indexes
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_branch ON products(branch_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_barcode ON products(barcode);

-- Comments
COMMENT ON TABLE products IS 'Product catalog with pricing and inventory settings';
COMMENT ON COLUMN products.sku IS 'Stock Keeping Unit - unique per tenant';
COMMENT ON COLUMN products.cost_price IS 'Cost price for profit margin calculation';
COMMENT ON COLUMN products.min_stock_level IS 'Low stock threshold for alerts';
