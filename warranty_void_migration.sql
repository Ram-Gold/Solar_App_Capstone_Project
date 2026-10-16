-- ==============================================================================
-- JD Solar Platform - Customer Purchase Warranty Void & Extension Migration
-- ==============================================================================
-- Run this in the Supabase SQL Editor to support warranty voiding, reasons,
-- and warranty management timestamps.
-- ==============================================================================

-- 1. Add is_voided boolean column to customer_purchases (defaults to false)
ALTER TABLE public.customer_purchases
ADD COLUMN IF NOT EXISTS is_voided BOOLEAN DEFAULT FALSE NOT NULL;

-- 2. Add void_reason text column for technician documentation
ALTER TABLE public.customer_purchases
ADD COLUMN IF NOT EXISTS void_reason TEXT DEFAULT NULL;

-- 3. Add voided_at timestamp column
ALTER TABLE public.customer_purchases
ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ DEFAULT NULL;

-- 4. Create an index for fast filtering of active vs voided equipment
CREATE INDEX IF NOT EXISTS idx_customer_purchases_is_voided 
ON public.customer_purchases(is_voided);
