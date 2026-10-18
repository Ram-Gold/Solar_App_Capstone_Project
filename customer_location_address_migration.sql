-- ==============================================================================
-- JD Solar Platform - Customer Granular Location & Address Migration
-- ==============================================================================
-- Run this in the Supabase Dashboard SQL Editor (https://supabase.com/dashboard)
-- to add granular Philippine address tracking (Province, City, Barangay/District,
-- and Street Address) to quote inquiries and customer profiles.
-- ==============================================================================

-- 1. Add granular location and verification columns to quote_tickets table
ALTER TABLE public.quote_tickets
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS barangay TEXT,
ADD COLUMN IF NOT EXISTS street_address TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS facebook TEXT;

-- 2. Create indexes for fast geographic queries, sorting, and reporting
CREATE INDEX IF NOT EXISTS idx_quote_tickets_province_city 
ON public.quote_tickets(province, city);

CREATE INDEX IF NOT EXISTS idx_quote_tickets_barangay 
ON public.quote_tickets(barangay);

-- 3. Add location and verification fields to customers table for complete customer records
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS barangay TEXT,
ADD COLUMN IF NOT EXISTS street_address TEXT,
ADD COLUMN IF NOT EXISTS facebook TEXT;

CREATE INDEX IF NOT EXISTS idx_customers_province_city 
ON public.customers(province, city);

-- 4. Comment on columns for clear documentation
COMMENT ON COLUMN public.quote_tickets.province IS 'Philippine Province or Metro Manila (NCR)';
COMMENT ON COLUMN public.quote_tickets.city IS 'Philippine City or Municipality';
COMMENT ON COLUMN public.quote_tickets.barangay IS 'Philippine Barangay or Manila District';
COMMENT ON COLUMN public.quote_tickets.street_address IS 'House / Unit No., Street name, Subdivision / Village';
COMMENT ON COLUMN public.quote_tickets.delivery_address IS 'Complete formatted Philippine address string';
COMMENT ON COLUMN public.quote_tickets.facebook IS 'Customer Facebook profile URL (https://facebook.com/...)';

COMMENT ON COLUMN public.customers.province IS 'Customer province or NCR region';
COMMENT ON COLUMN public.customers.city IS 'Customer city or municipality';
COMMENT ON COLUMN public.customers.barangay IS 'Customer barangay or Manila district';
COMMENT ON COLUMN public.customers.street_address IS 'Customer house / unit / street address';
COMMENT ON COLUMN public.customers.facebook IS 'Customer Facebook profile URL (https://facebook.com/...)';
