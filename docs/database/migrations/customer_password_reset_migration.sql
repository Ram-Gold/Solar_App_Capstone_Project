-- Customer "Forgot Password" migration
-- Adds one-time reset tokens (stored hashed), two RPCs, and raises the
-- minimum customer password length to 8 characters.
-- Run in the Supabase SQL editor after customer_email_confirmation_migration.sql.

-- 1. Reset token table (no client access; only SECURITY DEFINER functions touch it)
CREATE TABLE IF NOT EXISTS public.customer_password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_password_resets_customer
    ON public.customer_password_resets(customer_id, created_at DESC);

ALTER TABLE public.customer_password_resets ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: anon/authenticated cannot read or write this table.
REVOKE ALL ON public.customer_password_resets FROM anon, authenticated;

-- 2. Create a reset token (service_role only; the raw token is emailed, never returned to browsers)
CREATE OR REPLACE FUNCTION public.create_customer_password_reset(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_clean_email TEXT;
    v_customer_id UUID;
    v_recent INT;
    v_token TEXT;
BEGIN
    v_clean_email := LOWER(TRIM(COALESCE(p_email, '')));
    IF v_clean_email = '' THEN
        RETURN NULL;
    END IF;

    SELECT customer_id INTO v_customer_id
    FROM public.customer_passwords
    WHERE LOWER(email) = v_clean_email;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Rate limit: max 3 requests per hour per account
    SELECT COUNT(*) INTO v_recent
    FROM public.customer_password_resets
    WHERE customer_id = v_customer_id
      AND created_at > NOW() - INTERVAL '1 hour';

    IF v_recent >= 3 THEN
        RETURN NULL;
    END IF;

    -- A new request invalidates any outstanding tokens
    UPDATE public.customer_password_resets
    SET used_at = NOW()
    WHERE customer_id = v_customer_id AND used_at IS NULL;

    v_token := encode(extensions.gen_random_bytes(32), 'hex');

    INSERT INTO public.customer_password_resets (customer_id, token_hash, expires_at)
    VALUES (
        v_customer_id,
        encode(sha256(convert_to(v_token, 'UTF8')), 'hex'),
        NOW() + INTERVAL '30 minutes'
    );

    RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.create_customer_password_reset(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_customer_password_reset(TEXT) TO service_role;

-- 3. Redeem a reset token and set the new password (callable from the browser)
CREATE OR REPLACE FUNCTION public.reset_customer_password(p_token TEXT, p_new_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_reset RECORD;
BEGIN
    IF p_new_password IS NULL OR length(p_new_password) < 8 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 8 characters long.');
    END IF;

    SELECT id, customer_id INTO v_reset
    FROM public.customer_password_resets
    WHERE token_hash = encode(sha256(convert_to(COALESCE(p_token, ''), 'UTF8')), 'hex')
      AND used_at IS NULL
      AND expires_at > NOW()
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'This reset link is invalid or has expired.');
    END IF;

    UPDATE public.customer_passwords
    SET password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf', 10)),
        updated_at = NOW()
    WHERE customer_id = v_reset.customer_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'This reset link is invalid or has expired.');
    END IF;

    -- Single use: burn this token and any others for the account
    UPDATE public.customer_password_resets
    SET used_at = NOW()
    WHERE customer_id = v_reset.customer_id AND used_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Password updated successfully.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_customer_password(TEXT, TEXT) TO anon, authenticated;

-- 4. Raise the minimum password length to 8 in set_customer_password (portal flow)
CREATE OR REPLACE FUNCTION public.set_customer_password(
    p_token UUID,
    p_email TEXT,
    p_password TEXT,
    p_current_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_customer RECORD;
    v_existing_cred RECORD;
    v_clean_email TEXT;
    v_new_hash TEXT;
    v_email_changed BOOLEAN := false;
    v_is_confirmed BOOLEAN := false;
BEGIN
    v_clean_email := LOWER(TRIM(p_email));

    IF v_clean_email IS NULL OR v_clean_email = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Valid email address is required.');
    END IF;

    IF p_password IS NULL OR length(p_password) < 8 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 8 characters long.');
    END IF;

    SELECT id, phone_number, full_name, access_token, email, email_confirmed_at
    INTO v_customer
    FROM public.customers
    WHERE access_token = p_token;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid customer access token.');
    END IF;

    SELECT id, customer_id INTO v_existing_cred
    FROM public.customer_passwords
    WHERE email = v_clean_email AND customer_id <> v_customer.id;

    IF FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'This email is already registered to another account.');
    END IF;

    SELECT id, password_hash INTO v_existing_cred
    FROM public.customer_passwords
    WHERE customer_id = v_customer.id;

    IF FOUND AND p_current_password IS NOT NULL AND p_current_password <> '' THEN
        IF v_existing_cred.password_hash <> extensions.crypt(p_current_password, v_existing_cred.password_hash) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Current password does not match.');
        END IF;
    END IF;

    v_new_hash := extensions.crypt(p_password, extensions.gen_salt('bf', 10));

    INSERT INTO public.customer_passwords (customer_id, email, password_hash, updated_at)
    VALUES (v_customer.id, v_clean_email, v_new_hash, NOW())
    ON CONFLICT (customer_id) DO UPDATE SET
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        updated_at = NOW();

    v_email_changed := (v_customer.email IS DISTINCT FROM v_clean_email);
    IF v_email_changed THEN
        UPDATE public.customers
        SET email = v_clean_email,
            email_confirmed_at = NULL
        WHERE id = v_customer.id;

        INSERT INTO public.email_confirmation_queue (
            customer_id, recipient_email, verification_token, status, created_at
        ) VALUES (
            v_customer.id, v_clean_email, gen_random_uuid(), 'queued', NOW()
        );
        v_is_confirmed := false;
    ELSE
        v_is_confirmed := (v_customer.email_confirmed_at IS NOT NULL);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Password saved successfully.',
        'email', v_clean_email,
        'email_changed', v_email_changed,
        'email_confirmed', v_is_confirmed,
        'email_confirmed_at', CASE WHEN v_email_changed THEN NULL ELSE v_customer.email_confirmed_at END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_customer_password(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;
