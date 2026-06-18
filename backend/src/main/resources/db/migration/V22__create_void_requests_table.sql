-- =====================================================
-- Migration: V22__create_void_requests_table.sql
-- Description: Store cashier void requests pending manager approval
-- Author: Development Team
-- Date: 2026-03-11
-- =====================================================

CREATE TABLE IF NOT EXISTS void_requests (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    order_id BIGINT NOT NULL,
    requested_by_user_id BIGINT NOT NULL,
    reviewed_by_user_id BIGINT,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    reason TEXT NOT NULL,
    review_comment TEXT,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE void_requests ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100);
ALTER TABLE void_requests ADD COLUMN IF NOT EXISTS order_id BIGINT;
ALTER TABLE void_requests ADD COLUMN IF NOT EXISTS requested_by_user_id BIGINT;
ALTER TABLE void_requests ADD COLUMN IF NOT EXISTS reviewed_by_user_id BIGINT;
ALTER TABLE void_requests ADD COLUMN IF NOT EXISTS status VARCHAR(30);
ALTER TABLE void_requests ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE void_requests ADD COLUMN IF NOT EXISTS review_comment TEXT;
ALTER TABLE void_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE void_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;
ALTER TABLE void_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
ALTER TABLE void_requests ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN;

ALTER TABLE void_requests ALTER COLUMN status SET DEFAULT 'PENDING';
ALTER TABLE void_requests ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE void_requests ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE void_requests ALTER COLUMN is_deleted SET DEFAULT FALSE;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_void_request_order') THEN
        ALTER TABLE void_requests
            ADD CONSTRAINT fk_void_request_order
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_void_request_requested_by') THEN
        ALTER TABLE void_requests
            ADD CONSTRAINT fk_void_request_requested_by
            FOREIGN KEY (requested_by_user_id) REFERENCES users(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_void_request_reviewed_by') THEN
        ALTER TABLE void_requests
            ADD CONSTRAINT fk_void_request_reviewed_by
            FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_void_requests_tenant ON void_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_void_requests_order ON void_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_void_requests_status ON void_requests(status);
CREATE INDEX IF NOT EXISTS idx_void_requests_created_at ON void_requests(created_at DESC);

COMMENT ON TABLE void_requests IS 'Cashier order void requests requiring manager/store-admin approval';
