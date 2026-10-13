-- ==============================================================================
-- JD Force Solar Products Trading
-- Customer Authentication & Password Management Migration
-- ==============================================================================
-- Run this in the Supabase Dashboard SQL Editor (https://supabase.com/dashboard)
-- to enable secure customer password and email authentication in PostgreSQL.
-- ==============================================================================

-- 1. Create pgcrypto extension for secure password hashing if not already available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create customer_passwords table
CREATE TABLE IF NOT EXISTS public.customer_passwords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_passwords_email ON public.customer_passwords(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_customer_passwords_customer ON public.customer_passwords(customer_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.customer_passwords ENABLE ROW LEVEL SECURITY;

-- Staff and Admin full access
DROP POLICY IF EXISTS "Staff and Admin full access on customer_passwords" ON public.customer_passwords;
CREATE POLICY "Staff and Admin full access on customer_passwords"
    ON public.customer_passwords
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Public access (select/insert/update controlled via functions/RPC)
DROP POLICY IF EXISTS "Anon public access denied on customer_passwords" ON public.customer_passwords;
CREATE POLICY "Anon public access denied on customer_passwords"
    ON public.customer_passwords
    FOR SELECT
    TO anon
    USING (false);

-- 4. RPC: Set or Change Customer Password (Token or Existing Credential verification)
CREATE OR REPLACE FUNCTION public.set_customer_password(
    p_token UUID,
    p_email TEXT,
    p_password TEXT,
    p_current_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer RECORD;
    v_existing_cred RECORD;
    v_clean_email TEXT;
    v_new_hash TEXT;
BEGIN
    v_clean_email := LOWER(TRIM(p_email));

    IF v_clean_email IS NULL OR v_clean_email = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Valid email address is required.');
    END IF;

    IF p_password IS NULL OR length(p_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 6 characters long.');
    END IF;

    -- Look up customer by access token
    SELECT id, phone_number, full_name, access_token INTO v_customer
    FROM public.customers
    WHERE access_token = p_token;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid customer access token.');
    END IF;

    -- Check if email is already in use by another customer
    SELECT id, customer_id INTO v_existing_cred
    FROM public.customer_passwords
    WHERE email = v_clean_email AND customer_id <> v_customer.id;

    IF FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'This email is already registered to another account.');
    END IF;

    -- Look up current credentials for this customer if any
    SELECT id, password_hash INTO v_existing_cred
    FROM public.customer_passwords
    WHERE customer_id = v_customer.id;

    -- If password already exists and current_password was provided, verify it
    IF FOUND AND p_current_password IS NOT NULL AND p_current_password <> '' THEN
        IF v_existing_cred.password_hash <> crypt(p_current_password, v_existing_cred.password_hash) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Current password does not match.');
        END IF;
    END IF;

    -- Hash new password using blowfish (bcrypt) via pgcrypto
    v_new_hash := crypt(p_password, gen_salt('bf', 10));

    -- Upsert credential
    INSERT INTO public.customer_passwords (
        customer_id,
        email,
        password_hash,
        updated_at
    ) VALUES (
        v_customer.id,
        v_clean_email,
        v_new_hash,
        NOW()
    )
    ON CONFLICT (customer_id) DO UPDATE SET
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        updated_at = NOW();

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Password saved successfully.',
        'email', v_clean_email
    );
END;
$$;

-- 5. RPC: Authenticate Customer by Email & Password
CREATE OR REPLACE FUNCTION public.customer_login(
    p_email TEXT,
    p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cred RECORD;
    v_customer RECORD;
    v_clean_email TEXT;
BEGIN
    v_clean_email := LOWER(TRIM(p_email));

    SELECT cp.id, cp.customer_id, cp.password_hash, cp.email
    INTO v_cred
    FROM public.customer_passwords cp
    WHERE cp.email = v_clean_email;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid email or password.');
    END IF;

    -- Verify password hash
    IF v_cred.password_hash <> crypt(p_password, v_cred.password_hash) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid email or password.');
    END IF;

    -- Fetch customer token & basic info
    SELECT id, phone_number, full_name, access_token
    INTO v_customer
    FROM public.customers
    WHERE id = v_cred.customer_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Customer account record not found.');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'token', v_customer.access_token,
        'customer', jsonb_build_object(
            'id', v_customer.id,
            'name', v_customer.full_name,
            'phone', v_customer.phone_number,
            'email', v_cred.email,
            'token', v_customer.access_token
        )
    );
END;
$$;

-- 6. RPC: Check Customer Auth Status by Token
CREATE OR REPLACE FUNCTION public.get_customer_auth_status(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer RECORD;
    v_cred RECORD;
BEGIN
    SELECT id INTO v_customer
    FROM public.customers
    WHERE access_token = p_token;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('has_password', false, 'email', null);
    END IF;

    SELECT email INTO v_cred
    FROM public.customer_passwords
    WHERE customer_id = v_customer.id;

    IF FOUND THEN
        RETURN jsonb_build_object('has_password', true, 'email', v_cred.email);
    ELSE
        RETURN jsonb_build_object('has_password', false, 'email', null);
    END IF;
END;
$$;
