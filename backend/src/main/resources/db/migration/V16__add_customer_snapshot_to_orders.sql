-- =====================================================
-- Migration: V16__add_customer_snapshot_to_orders.sql
-- Description: Persist customer snapshot fields on orders
-- Author: Development Team
-- Date: 2026-03-02
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE orders ADD COLUMN customer_id BIGINT;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'customer_name'
    ) THEN
        ALTER TABLE orders ADD COLUMN customer_name VARCHAR(255);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'customer_email'
    ) THEN
        ALTER TABLE orders ADD COLUMN customer_email VARCHAR(255);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'orders' AND indexname = 'idx_orders_customer_id'
    ) THEN
        CREATE INDEX idx_orders_customer_id ON orders(customer_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'orders' AND indexname = 'idx_orders_customer_email'
    ) THEN
        CREATE INDEX idx_orders_customer_email ON orders(customer_email);
    END IF;
END $$;
