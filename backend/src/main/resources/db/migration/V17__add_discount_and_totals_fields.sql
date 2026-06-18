-- =====================================================
-- Migration: V17__add_discount_and_totals_fields.sql
-- Description: Add discount configuration and detailed totals fields
-- =====================================================

ALTER TABLE branch_settings
    ADD COLUMN IF NOT EXISTS discount_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS max_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    ADD COLUMN IF NOT EXISTS require_manager_approval BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20),
    ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(19,4) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS subtotal_before_discount NUMERIC(19,4) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(19,4) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(19,4) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS final_total NUMERIC(19,4) NOT NULL DEFAULT 0.00;

UPDATE orders
SET subtotal_before_discount = COALESCE(subtotal, 0),
    discount_amount = COALESCE(discount, 0),
    taxable_amount = GREATEST(COALESCE(subtotal, 0) - COALESCE(discount, 0), 0),
    tax_amount = COALESCE(tax, 0),
    final_total = COALESCE(total_amount, 0)
WHERE subtotal_before_discount = 0
   OR final_total = 0;

ALTER TABLE order_line_items
    ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(19,4) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS subtotal_before_discount NUMERIC(19,4) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(19,4) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(19,4) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS final_total NUMERIC(19,4) NOT NULL DEFAULT 0.00;

UPDATE order_line_items
SET subtotal_before_discount = COALESCE(line_total, 0),
    taxable_amount = GREATEST(COALESCE(line_total, 0) - COALESCE(discount, 0), 0),
    final_total = COALESCE(line_total, 0)
WHERE subtotal_before_discount = 0
   OR final_total = 0;
