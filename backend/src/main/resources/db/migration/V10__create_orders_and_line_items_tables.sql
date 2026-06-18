-- =====================================================
-- Migration: V10__create_orders_and_line_items_tables.sql
-- Description: Create orders and order_line_items tables
-- Author: Development Team
-- Date: 2026-02-27
-- =====================================================

-- =====================================================
-- 1. ORDERS TABLE
-- =====================================================
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    order_number VARCHAR(100) NOT NULL,
    cashier_id BIGINT NOT NULL,
    user_id BIGINT, -- Nullable for walk-in customers
    branch_id BIGINT,
    shift_id BIGINT,
    
    -- Financial fields
    subtotal NUMERIC(38,2) NOT NULL,
    tax NUMERIC(38,2) NOT NULL,
    discount NUMERIC(38,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(19,4) NOT NULL, -- Higher precision for calculations
    
    -- Status
    status VARCHAR(50) NOT NULL, -- CREATED, COMPLETED, CANCELLED, REFUNDED, RETURNED
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Unique constraint (tenant-scoped)
    CONSTRAINT uk_order_number_tenant UNIQUE (order_number, tenant_id),
    
    -- Foreign keys
    CONSTRAINT fk_order_cashier FOREIGN KEY (cashier_id) 
        REFERENCES users(id),
    CONSTRAINT fk_order_user FOREIGN KEY (user_id) 
        REFERENCES users(id),
    CONSTRAINT fk_order_branch FOREIGN KEY (branch_id) 
        REFERENCES branches(id)
);

-- Indexes
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_tenant_active ON orders(tenant_id, is_deleted);
CREATE INDEX idx_orders_cashier ON orders(cashier_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_branch ON orders(branch_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_order_number ON orders(order_number);

-- =====================================================
-- 2. ORDER LINE ITEMS TABLE
-- =====================================================
CREATE TABLE order_line_items (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INTEGER NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    discount DOUBLE PRECISION NOT NULL DEFAULT 0,
    line_total DOUBLE PRECISION NOT NULL,
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Foreign keys (with cascade delete)
    CONSTRAINT fk_line_item_order FOREIGN KEY (order_id) 
        REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_line_item_product FOREIGN KEY (product_id) 
        REFERENCES products(id)
);

-- Indexes
CREATE INDEX idx_order_line_items_tenant ON order_line_items(tenant_id);
CREATE INDEX idx_order_line_items_order ON order_line_items(order_id);
CREATE INDEX idx_order_line_items_product ON order_line_items(product_id);

-- Comments
COMMENT ON TABLE orders IS 'Customer orders with financial details and status tracking';
COMMENT ON TABLE order_line_items IS 'Individual line items for each order';
COMMENT ON COLUMN orders.user_id IS 'Customer/User ID - nullable for walk-in customers';
COMMENT ON COLUMN orders.discount IS 'Order-level discount amount';
COMMENT ON COLUMN order_line_items.discount IS 'Line item discount amount';
