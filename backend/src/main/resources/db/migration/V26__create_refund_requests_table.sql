-- =====================================================
-- Migration: V26__create_refund_requests_table.sql
-- Description: Store cashier refund requests pending manager approval
-- Author: Development Team
-- Date: 2026-03-26
-- =====================================================

CREATE TABLE IF NOT EXISTS refund_requests (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    order_id BIGINT NOT NULL,
    requested_by_user_id BIGINT NOT NULL,
    original_order_status VARCHAR(30) NOT NULL,
    reviewed_by_user_id BIGINT,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    reason TEXT NOT NULL,
    custom_reason TEXT,
    refund_amount NUMERIC(19,2) NOT NULL,
    items_json TEXT NOT NULL,
    review_comment TEXT,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_refund_request_order') THEN
        ALTER TABLE refund_requests
            ADD CONSTRAINT fk_refund_request_order
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_refund_request_requested_by') THEN
        ALTER TABLE refund_requests
            ADD CONSTRAINT fk_refund_request_requested_by
            FOREIGN KEY (requested_by_user_id) REFERENCES users(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_refund_request_reviewed_by') THEN
        ALTER TABLE refund_requests
            ADD CONSTRAINT fk_refund_request_reviewed_by
            FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_refund_requests_tenant ON refund_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_order ON refund_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_created_at ON refund_requests(created_at DESC);

COMMENT ON TABLE refund_requests IS 'Cashier order refund requests requiring manager approval';
