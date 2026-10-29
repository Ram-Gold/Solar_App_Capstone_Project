-- ==============================================================================
-- JD Solar Platform - Stock Quantity & Low Stock Prioritization Migration
-- ==============================================================================
-- Run this in the Supabase SQL Editor to add explicit stock quantity tracking.
-- ==============================================================================

-- 1. Add stock_quantity column to products table if it doesn't exist
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 10;

-- 2. Synchronize existing in_stock boolean with stock_quantity
-- Out of stock products get 0 units
UPDATE public.products
SET stock_quantity = 0
WHERE in_stock = false AND (stock_quantity IS NULL OR stock_quantity > 0);

-- In stock products get at least 15 units if currently null or zero
UPDATE public.products
SET stock_quantity = 15
WHERE in_stock = true AND (stock_quantity IS NULL OR stock_quantity = 0);

-- 3. Create index for fast inventory querying and sorting
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON public.products(stock_quantity);
