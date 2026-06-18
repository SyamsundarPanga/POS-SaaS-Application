-- =====================================================
-- Migration: V07__update_product_unique_constraints.sql
-- Description: Change unique constraint to support branch-level SKU
-- =====================================================

-- Drop old constraints
ALTER TABLE products
DROP CONSTRAINT IF EXISTS uk_product_tenant_sku;

ALTER TABLE products
DROP CONSTRAINT IF EXISTS uk_product_tenant_barcode;


-- Add new constraints including branch
ALTER TABLE products
ADD CONSTRAINT uk_product_tenant_branch_sku
UNIQUE (tenant_id, branch_id, sku);

ALTER TABLE products
ADD CONSTRAINT uk_product_tenant_branch_barcode
UNIQUE (tenant_id, branch_id, barcode);



