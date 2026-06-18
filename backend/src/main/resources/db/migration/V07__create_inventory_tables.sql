-- =====================================================
-- Migration: V07__create_inventory_tables.sql
-- Description: Create inventory, stock_movements, and stock_transfers tables
-- Author: Development Team
-- Date: 2026-02-27
-- =====================================================

-- =====================================================
-- 1. INVENTORY TABLE
-- =====================================================
CREATE TABLE inventory (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    product_id BIGINT NOT NULL,
    branch_id BIGINT,
    quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    reserved_quantity INTEGER DEFAULT 0, -- For pending orders
    available_quantity INTEGER DEFAULT 0, -- quantity - reservedQuantity
    last_restock_date TIMESTAMP,
    last_sale_date TIMESTAMP,
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Unique constraint (one inventory record per product per branch per tenant)
    CONSTRAINT uk_inventory_tenant_branch_product UNIQUE (tenant_id, branch_id, product_id),
    
    -- Foreign keys
    CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) 
        REFERENCES products(id),
    CONSTRAINT fk_inventory_branch FOREIGN KEY (branch_id) 
        REFERENCES branches(id)
);

-- Indexes
CREATE INDEX idx_inventory_tenant ON inventory(tenant_id);
CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_inventory_branch ON inventory(branch_id);
CREATE INDEX idx_inventory_low_stock ON inventory(quantity, low_stock_threshold);

-- =====================================================
-- 2. STOCK MOVEMENTS TABLE
-- =====================================================
CREATE TABLE stock_movements (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    product_id BIGINT NOT NULL,
    branch_id BIGINT,
    movement_type VARCHAR(30) NOT NULL, -- SALE, RETURN, ADJUSTMENT, TRANSFER_IN, TRANSFER_OUT, INITIAL_STOCK, RESTOCK, WRITE_OFF
    quantity INTEGER NOT NULL,
    reference_id BIGINT, -- order_id, transfer_id, adjustment_id
    reference_type VARCHAR(50), -- ORDER, TRANSFER, ADJUSTMENT, RETURN
    notes TEXT,
    performed_by BIGINT, -- User ID who performed the action
    previous_quantity INTEGER,
    new_quantity INTEGER,
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Foreign keys
    CONSTRAINT fk_stock_movement_product FOREIGN KEY (product_id) 
        REFERENCES products(id)
);

-- Indexes
CREATE INDEX idx_stock_movements_tenant ON stock_movements(tenant_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_branch ON stock_movements(branch_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at DESC);

-- =====================================================
-- 3. STOCK TRANSFERS TABLE
-- =====================================================
CREATE TABLE stock_transfers (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    product_id BIGINT NOT NULL,
    source_branch_id BIGINT NOT NULL,
    destination_branch_id BIGINT NOT NULL,
    quantity INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, COMPLETED, CANCELLED
    notes TEXT,
    created_by BIGINT NOT NULL, -- User ID
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Foreign keys
    CONSTRAINT fk_stock_transfer_product FOREIGN KEY (product_id) 
        REFERENCES products(id),
    CONSTRAINT fk_stock_transfer_created_by FOREIGN KEY (created_by) 
        REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_stock_transfers_tenant ON stock_transfers(tenant_id);
CREATE INDEX idx_stock_transfers_source ON stock_transfers(source_branch_id);
CREATE INDEX idx_stock_transfers_destination ON stock_transfers(destination_branch_id);
CREATE INDEX idx_stock_transfers_status ON stock_transfers(status);

-- Comments
COMMENT ON TABLE inventory IS 'Inventory levels per product per branch';
COMMENT ON TABLE stock_movements IS 'Audit trail of all stock movements';
COMMENT ON TABLE stock_transfers IS 'Inter-branch stock transfers';
COMMENT ON COLUMN inventory.available_quantity IS 'Calculated: quantity - reserved_quantity';
