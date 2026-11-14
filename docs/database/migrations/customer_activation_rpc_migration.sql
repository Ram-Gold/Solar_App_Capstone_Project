-- ==============================================================================
-- JD Force Solar Products Trading
-- Customer Account Activation RPC Migration
-- ==============================================================================
-- Allows unauthenticated (anon) first-time customers arriving via QR/email link
-- to securely link their auth.users(id) to public.customers (even if an auth.users
-- row was pre-created by signInWithOtp email verification in non-prod), sets
-- their chosen password safely via pgcrypto, and confirms email_confirmed_at
-- so immediate signInWithPassword succeeds.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.activate_customer_account(
  p_access_token UUID,
  p_user_id UUID DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_customer RECORD;
  v_auth_user RECORD;
  v_target_user_id UUID;
  v_clean_email TEXT;
BEGIN
  v_clean_email := LOWER(TRIM(COALESCE(p_email, '')));
  IF v_clean_email = '' OR position('@' in v_clean_email) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'A valid email address is required.');
  END IF;

  IF p_password IS NOT NULL AND length(p_password) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 8 characters.');
  END IF;

  SELECT id, user_id, email
  INTO v_customer
  FROM public.customers
  WHERE access_token = p_access_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer record not found.');
  END IF;

  IF v_customer.user_id IS NOT NULL THEN
    IF p_user_id IS NULL OR v_customer.user_id <> p_user_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'Customer account is already activated.');
    END IF;
  END IF;

  IF p_user_id IS NOT NULL THEN
    SELECT id, email, raw_user_meta_data
    INTO v_auth_user
    FROM auth.users
    WHERE id = p_user_id;
  END IF;

  IF v_auth_user.id IS NULL THEN
    SELECT id, email, raw_user_meta_data
    INTO v_auth_user
    FROM auth.users
    WHERE LOWER(email) = v_clean_email
    LIMIT 1;
  END IF;

  IF v_auth_user.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication user not found.');
  END IF;

  v_target_user_id := v_auth_user.id;

  IF EXISTS (SELECT 1 FROM public.admins WHERE id = v_target_user_id)
     OR EXISTS (SELECT 1 FROM public.staff WHERE id = v_target_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot link staff or administrator account to customer.');
  END IF;

  IF COALESCE(v_auth_user.raw_user_meta_data->>'access_token', '') <> '' THEN
    IF v_auth_user.raw_user_meta_data->>'access_token' <> p_access_token::TEXT THEN
      RETURN jsonb_build_object('success', false, 'error', 'Token mismatch for customer activation.');
    END IF;
  ELSE
    IF LOWER(COALESCE(v_customer.email, '')) <> v_clean_email OR LOWER(v_auth_user.email) <> v_clean_email THEN
      RETURN jsonb_build_object('success', false, 'error', 'Email mismatch for customer activation.');
    END IF;
  END IF;

  IF p_password IS NOT NULL AND v_customer.user_id IS NULL THEN
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
          'role', 'customer',
          'access_token', p_access_token::TEXT
        ),
        updated_at = NOW()
    WHERE id = v_target_user_id;
  ELSE
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
    WHERE id = v_target_user_id;
  END IF;

  UPDATE public.customers
  SET user_id = v_target_user_id,
      email = v_clean_email
  WHERE id = v_customer.id;

  RETURN jsonb_build_object(
    'success', true,
    'customer_id', v_customer.id,
    'user_id', v_target_user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_customer_account(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_customer_account(UUID, UUID, TEXT, TEXT) TO anon, authenticated;
