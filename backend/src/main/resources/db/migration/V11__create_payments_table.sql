-- =====================================================
-- Migration: V11__create_payments_table.sql
-- Description: Create payments table for order payments
-- Author: Development Team
-- Date: 2026-02-27
-- =====================================================

CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    order_id BIGINT NOT NULL,
    amount NUMERIC(19,4) NOT NULL, -- Higher precision for calculations
    method VARCHAR(20) NOT NULL, -- CASH, CARD
    status VARCHAR(20) NOT NULL, -- SUCCESS, FAILED, PENDING, REFUNDED
    transaction_id VARCHAR(255),
    amount_tendered NUMERIC(19,4), -- Cash received (e.g., $50)
    change_amount NUMERIC(19,4), -- Calculated change (e.g., $5)
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Foreign keys
    CONSTRAINT fk_payment_order FOREIGN KEY (order_id) 
        REFERENCES orders(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_tenant_created ON payments(tenant_id, created_at);
CREATE INDEX idx_payments_tenant_order ON payments(tenant_id, order_id);
CREATE INDEX idx_payments_method ON payments(method);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);

-- Comments
COMMENT ON TABLE payments IS 'Payment records for orders with Razorpay integration';
COMMENT ON COLUMN payments.method IS 'Payment method: CASH or CARD (Razorpay)';
COMMENT ON COLUMN payments.amount_tendered IS 'Amount given by customer (CASH only)';
COMMENT ON COLUMN payments.change_amount IS 'Change returned to customer (CASH only)';
