-- =====================================================
-- Migration: V18__add_razorpay_payment_method.sql
-- Description: Update payment method documentation
-- Author: Development Team
-- Date: 2026-03-08
-- =====================================================

-- Update the comment to reflect the payment methods
COMMENT ON COLUMN payments.method IS 'Payment method: CASH or CARD (Razorpay)';

-- Note: PostgreSQL doesn't enforce enum constraints at the database level
-- The application layer (Java enum) handles the validation
-- This migration is primarily for documentation purposes
