-- ==============================================================================
-- JD Solar Platform - Customer Supabase Auth Unification Migration
-- ==============================================================================
-- Unifies customers into native Supabase Auth (auth.users), mirroring the 1:1
-- foreign key model used by admins and staff.
-- Safe to re-run: uses IF NOT EXISTS and idempotent logic.
-- ==============================================================================

-- 1. Add user_id referencing auth.users(id) to customers table
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Create index on user_id for fast role lookups
CREATE INDEX IF NOT EXISTS idx_customers_user_id
  ON public.customers(user_id);

-- 3. Link existing customers with matching emails in auth.users
UPDATE public.customers c
SET user_id = u.id
FROM auth.users u
WHERE LOWER(c.email) = LOWER(u.email)
  AND c.user_id IS NULL;

-- 4. Document column
COMMENT ON COLUMN public.customers.user_id IS
  'References auth.users(id) for unified Supabase Auth credentials. '
  'Enables native JWT sessions, password resets, and RLS policies for customers.';
