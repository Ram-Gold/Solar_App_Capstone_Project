-- ==============================================================================
-- JD Solar Platform - Products Structured Numeric Price Range Migration
-- ==============================================================================
-- Purpose:
-- Replaces loose freeform string price filtering with dedicated numeric bounds
-- (min_price and max_price), allowing indexed range queries while maintaining
-- backward compatibility with existing price_range text displays.
--
-- Unpriced industrial products (78 items) remain explicitly NULL.
-- ==============================================================================

-- 1. Add structured numeric columns
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS min_price NUMERIC(12, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS max_price NUMERIC(12, 2) DEFAULT NULL;

COMMENT ON COLUMN public.products.min_price IS 'Lower bound procurement or starting unit price in PHP';
COMMENT ON COLUMN public.products.max_price IS 'Upper bound procurement or maximum kit unit price in PHP';

-- 2. Populate numeric columns from existing price_range string representations
-- Format: '1000-2000' -> min_price = 1000, max_price = 2000
UPDATE public.products
SET
  min_price = CAST((regexp_matches(price_range, '^([0-9]+)'))[1] AS NUMERIC),
  max_price = CAST((regexp_matches(price_range, '-([0-9]+)$'))[1] AS NUMERIC)
WHERE price_range IS NOT NULL 
  AND price_range ~ '^[0-9]+-[0-9]+$';

-- Format: '3000+' -> min_price = 3000, max_price = 4500
UPDATE public.products
SET
  min_price = CAST((regexp_matches(price_range, '^([0-9]+)'))[1] AS NUMERIC),
  max_price = CAST((regexp_matches(price_range, '^([0-9]+)'))[1] AS NUMERIC) * 1.5
WHERE price_range IS NOT NULL 
  AND price_range ~ '^[0-9]+\+$';

-- Format: '5,000 - 8,000' (comma formatted)
UPDATE public.products
SET
  min_price = CAST(replace(split_part(price_range, '-', 1), ',', '') AS NUMERIC),
  max_price = CAST(replace(split_part(price_range, '-', 2), ',', '') AS NUMERIC)
WHERE price_range IS NOT NULL 
  AND price_range LIKE '%-%'
  AND min_price IS NULL
  AND replace(split_part(price_range, '-', 1), ',', '') ~ '^[0-9]+$'
  AND replace(split_part(price_range, '-', 2), ',', '') ~ '^[0-9]+$';

-- Note: 78 unpriced industrial catalog items retain min_price = NULL and max_price = NULL.

-- 3. Create bidirectional synchronization trigger
-- Ensures that when staff or admin updates min_price or max_price, price_range is automatically formatted.
CREATE OR REPLACE FUNCTION public.fn_sync_product_price_range()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.min_price IS NOT NULL AND NEW.max_price IS NOT NULL THEN
    IF NEW.min_price = NEW.max_price THEN
      NEW.price_range := to_char(NEW.min_price, 'FM999,999,999');
    ELSE
      NEW.price_range := to_char(LEAST(NEW.min_price, NEW.max_price), 'FM999,999,999') || '-' || to_char(GREATEST(NEW.min_price, NEW.max_price), 'FM999,999,999');
    END IF;
  ELSIF NEW.min_price IS NOT NULL AND NEW.max_price IS NULL THEN
    NEW.price_range := to_char(NEW.min_price, 'FM999,999,999') || '+';
  ELSIF NEW.min_price IS NULL AND NEW.max_price IS NOT NULL THEN
    NEW.price_range := 'Up to ' || to_char(NEW.max_price, 'FM999,999,999');
  ELSE
    -- If both are cleared, price_range is cleared (remains unpriced)
    NEW.price_range := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_product_price_range ON public.products;
CREATE TRIGGER trg_sync_product_price_range
BEFORE INSERT OR UPDATE OF min_price, max_price ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_product_price_range();

-- 4. High-performance index for price-bounded queries
CREATE INDEX IF NOT EXISTS idx_products_min_max_price 
ON public.products (min_price, max_price);
