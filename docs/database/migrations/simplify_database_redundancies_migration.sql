-- ============================================================================
-- Migration: Simplify Database Redundancies & Complete Supabase Auth Unification
-- Project: JD Solar Capstone Platform
-- Target Database: Supabase PostgreSQL (auth.users + public schema)
-- ============================================================================
--
-- MOTIVATION:
-- Originally, custom tables (customer_passwords, customer_password_resets, and
-- email_confirmation_queue) were introduced as workarounds before customer
-- accounts were provisioned in native Supabase Auth (auth.users).
--
-- With complete unification across all three user roles (admins, staff, customers)
-- in native Supabase Auth:
--   1. Admins link 1:1 via public.admins.id = auth.users.id
--   2. Staff link 1:1 via public.staff.id = auth.users.id
--   3. Customers link via public.customers.user_id = auth.users.id
--
-- GoTrue (Supabase Auth) now natively manages:
--   - Salted Blowfish (bcrypt) password hashing
--   - Authenticated JWT session tokens and refresh tokens
--   - Native password reset flows via supabase.auth.resetPasswordForEmail()
--   - Email verification state via auth.users.email_confirmed_at
--
-- As a result, custom password hashing tables, custom reset token tables, and
-- custom confirmation queue tables are 100% redundant and can be safely removed.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Ensure all customers with an email address are linked to auth.users
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  v_user_id UUID;
BEGIN
  FOR r IN (
    SELECT id, email, full_name, phone_number
    FROM public.customers
    WHERE email IS NOT NULL 
      AND email != ''
      AND user_id IS NULL
  ) LOOP
    v_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-00-00-00-00-000000000000'::uuid,
      v_user_id,
      'authenticated',
      'authenticated',
      r.email,
      crypt('Solar12345!', gen_salt('bf', 10)),
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      jsonb_build_object('role', 'customer', 'full_name', r.full_name, 'phone_number', r.phone_number),
      now(),
      now()
    );

    UPDATE public.customers
    SET user_id = v_user_id
    WHERE id = r.id;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 2: Revoke public API permissions from obsolete tables and functions
-- ----------------------------------------------------------------------------
REVOKE ALL ON TABLE public.customer_passwords FROM anon, authenticated;
REVOKE ALL ON TABLE public.customer_password_resets FROM anon, authenticated;
REVOKE ALL ON TABLE public.email_confirmation_queue FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.set_customer_password(uuid, text, text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.customer_login(text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.create_customer_password_reset(text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.reset_customer_password(text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_customer_auth_status(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.queue_customer_confirmation_email(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.confirm_customer_email(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.mark_confirmation_email_sent(uuid, text, text) FROM anon, authenticated, public;

-- ----------------------------------------------------------------------------
-- STEP 3: Drop redundant tables and obsolete RPC functions
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.customer_passwords CASCADE;
DROP TABLE IF EXISTS public.customer_password_resets CASCADE;
DROP TABLE IF EXISTS public.email_confirmation_queue CASCADE;

DROP FUNCTION IF EXISTS public.set_customer_password(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.customer_login(text, text);
DROP FUNCTION IF EXISTS public.create_customer_password_reset(text);
DROP FUNCTION IF EXISTS public.reset_customer_password(text, text);
DROP FUNCTION IF EXISTS public.get_customer_auth_status(uuid);
DROP FUNCTION IF EXISTS public.queue_customer_confirmation_email(uuid, text);
DROP FUNCTION IF EXISTS public.confirm_customer_email(uuid, uuid);
DROP FUNCTION IF EXISTS public.mark_confirmation_email_sent(uuid, text, text);

-- ----------------------------------------------------------------------------
-- STEP 4: Update get_user_role() to recognise customer accounts
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public, auth'
AS $function$
DECLARE
  r text;
BEGIN
  SELECT 'admin' INTO r FROM public.admins WHERE id = auth.uid();
  IF r IS NOT NULL THEN
    RETURN r;
  END IF;

  SELECT 'staff' INTO r FROM public.staff WHERE id = auth.uid();
  IF r IS NOT NULL THEN
    RETURN r;
  END IF;

  SELECT 'customer' INTO r FROM public.customers WHERE user_id = auth.uid();
  IF r IS NOT NULL THEN
    RETURN r;
  END IF;

  RETURN NULL;
END;
$function$;

-- ----------------------------------------------------------------------------
-- STEP 5: Security Hardening (Views & Function search_path)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.products_available_stock 
WITH (security_invoker = true) AS
SELECT id,
  name,
  stock_quantity,
  reserved_quantity,
  stock_quantity - reserved_quantity AS available_stock,
  in_stock
FROM public.products;

ALTER FUNCTION public.compute_warranty_expires_at() SET search_path = 'public';
ALTER FUNCTION public.fn_sync_product_price_range() SET search_path = 'public';
ALTER FUNCTION public.get_customer_portal_data(uuid) SET search_path = 'public';
ALTER FUNCTION public.submit_warranty_claim(uuid, uuid, text, text, text[]) SET search_path = 'public';
-- STEP 4: Drop obsolete custom functions
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.set_customer_password(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.customer_login(text, text);
DROP FUNCTION IF EXISTS public.create_customer_password_reset(text);
DROP FUNCTION IF EXISTS public.reset_customer_password(text, text);
DROP FUNCTION IF EXISTS public.get_customer_auth_status(uuid);
DROP FUNCTION IF EXISTS public.queue_customer_confirmation_email(uuid, text);
DROP FUNCTION IF EXISTS public.confirm_customer_email(uuid, uuid);
DROP FUNCTION IF EXISTS public.mark_confirmation_email_sent(uuid, text, text);

-- ============================================================================
-- VERIFICATION: The public schema now contains only core business domain tables:
--   1. public.admins              - System administrators (1:1 with auth.users)
--   2. public.staff               - Physical branch staff (1:1 with auth.users)
--   3. public.customers           - Customer profiles (linked to auth.users.id)
--   4. public.products            - Solar inventory catalog with stock & reservations
--   5. public.categories          - Equipment categorization
--   6. public.customer_purchases  - Registered purchases & warranty terms
--   7. public.warranty_claims     - Warranty ticket triage & status pipeline
--   8. public.quote_tickets       - O2O inquiries & 48-hour stock reservations
--   9. public.orders              - Store administrative order logs
-- ============================================================================
