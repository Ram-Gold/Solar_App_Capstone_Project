-- ==============================================================================
-- JD Force Solar Products Trading
-- Customer Email Confirmation & Queuing Migration
-- ==============================================================================
-- Run this in the Supabase Dashboard SQL Editor (https://supabase.com/dashboard)
-- to enable mandatory customer email tracking, confirmation queuing, and
-- one-click email verification.
-- ==============================================================================

-- 1. Add email and confirmation lifecycle columns to public.customers
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS email_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_confirmation_status TEXT DEFAULT 'queued',
ADD COLUMN IF NOT EXISTS email_verification_token UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS email_confirmation_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_customers_verification_token ON public.customers(email_verification_token);

-- Backfill email on public.customers from public.customer_passwords if already present
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'customer_passwords'
    ) THEN
        UPDATE public.customers c
        SET email = cp.email
        FROM public.customer_passwords cp
        WHERE cp.customer_id = c.id
          AND (c.email IS NULL OR c.email = '');
    END IF;
END $$;

-- 2. Create public.email_confirmation_queue table
CREATE TABLE IF NOT EXISTS public.email_confirmation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT 'JD Force Solar - Account Created & Email Confirmation Required',
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'awaiting_confirmation', 'confirmed', 'failed')),
    verification_token UUID NOT NULL DEFAULT gen_random_uuid(),
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_confirmation_queue_customer ON public.email_confirmation_queue(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_confirmation_queue_status ON public.email_confirmation_queue(status);

-- 3. Enable Row Level Security (RLS) on email_confirmation_queue
ALTER TABLE public.email_confirmation_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff and Admin full access on email_confirmation_queue" ON public.email_confirmation_queue;
CREATE POLICY "Staff and Admin full access on email_confirmation_queue"
    ON public.email_confirmation_queue
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Anon access via RPC only on email_confirmation_queue" ON public.email_confirmation_queue;
CREATE POLICY "Anon access via RPC only on email_confirmation_queue"
    ON public.email_confirmation_queue
    FOR SELECT
    TO anon
    USING (false);

-- 4. RPC: Queue a customer confirmation email
CREATE OR REPLACE FUNCTION public.queue_customer_confirmation_email(
    p_customer_id UUID,
    p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_clean_email TEXT;
    v_new_token UUID;
    v_queue_id UUID;
    v_customer RECORD;
BEGIN
    v_clean_email := LOWER(TRIM(p_email));
    IF v_clean_email IS NULL OR v_clean_email = '' OR position('@' in v_clean_email) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'A valid email address is required.');
    END IF;

    SELECT id, full_name, phone_number, access_token
    INTO v_customer
    FROM public.customers
    WHERE id = p_customer_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Customer record not found.');
    END IF;

    v_new_token := gen_random_uuid();

    -- Update customer email & reset confirmation state to queued
    UPDATE public.customers
    SET email = v_clean_email,
        email_confirmed = false,
        email_confirmation_status = 'queued',
        email_verification_token = v_new_token,
        email_confirmed_at = NULL
    WHERE id = p_customer_id;

    -- Insert queue record
    INSERT INTO public.email_confirmation_queue (
        customer_id,
        recipient_email,
        status,
        verification_token,
        attempts,
        created_at
    ) VALUES (
        p_customer_id,
        v_clean_email,
        'queued',
        v_new_token,
        1,
        NOW()
    )
    RETURNING id INTO v_queue_id;

    RETURN jsonb_build_object(
        'success', true,
        'queue_id', v_queue_id,
        'customer_id', v_customer.id,
        'email', v_clean_email,
        'access_token', v_customer.access_token,
        'verification_token', v_new_token,
        'email_confirmation_status', 'queued',
        'email_confirmed', false
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.queue_customer_confirmation_email(UUID, TEXT) TO anon, authenticated;

-- 5. RPC: Mark confirmation email as dispatched / awaiting confirmation
CREATE OR REPLACE FUNCTION public.mark_confirmation_email_sent(
    p_customer_id UUID,
    p_status TEXT DEFAULT 'awaiting_confirmation',
    p_error TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_effective_status TEXT;
BEGIN
    v_effective_status := COALESCE(NULLIF(TRIM(p_status), ''), 'awaiting_confirmation');
    IF v_effective_status NOT IN ('queued', 'awaiting_confirmation', 'confirmed', 'failed') THEN
        v_effective_status := 'awaiting_confirmation';
    END IF;

    UPDATE public.customers
    SET email_confirmation_status = v_effective_status,
        email_confirmation_sent_at = CASE WHEN v_effective_status = 'awaiting_confirmation' THEN NOW() ELSE email_confirmation_sent_at END
    WHERE id = p_customer_id
      AND COALESCE(email_confirmed, false) = false;

    UPDATE public.email_confirmation_queue
    SET status = v_effective_status,
        sent_at = CASE WHEN v_effective_status = 'awaiting_confirmation' THEN NOW() ELSE sent_at END,
        last_error = p_error
    WHERE customer_id = p_customer_id
      AND status IN ('queued', 'failed');

    RETURN jsonb_build_object(
        'success', true,
        'customer_id', p_customer_id,
        'email_confirmation_status', v_effective_status
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_confirmation_email_sent(UUID, TEXT, TEXT) TO anon, authenticated;

-- 6. RPC: Verify / Confirm Customer Email via Portal Link
CREATE OR REPLACE FUNCTION public.confirm_customer_email(
    p_token UUID,
    p_verification_token UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_customer RECORD;
BEGIN
    SELECT id, full_name, email, phone_number, access_token, email_confirmed, email_verification_token
    INTO v_customer
    FROM public.customers
    WHERE access_token = p_token;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid customer access token.');
    END IF;

    IF p_verification_token IS NOT NULL
       AND v_customer.email_verification_token IS NOT NULL
       AND v_customer.email_verification_token <> p_verification_token THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired email verification link.');
    END IF;

    UPDATE public.customers
    SET email_confirmed = true,
        email_confirmation_status = 'confirmed',
        email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = v_customer.id;

    UPDATE public.email_confirmation_queue
    SET status = 'confirmed',
        confirmed_at = NOW()
    WHERE customer_id = v_customer.id
      AND status <> 'confirmed';

    RETURN jsonb_build_object(
        'success', true,
        'customer_id', v_customer.id,
        'email', v_customer.email,
        'email_confirmed', true,
        'email_confirmation_status', 'confirmed',
        'message', 'Email address verified and confirmed.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_customer_email(UUID, UUID) TO anon, authenticated;

-- 7. Update RPC: Check Customer Auth & Email Confirmation Status by Token
CREATE OR REPLACE FUNCTION public.get_customer_auth_status(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_customer RECORD;
    v_cred RECORD;
    v_effective_email TEXT;
BEGIN
    SELECT id, email, email_confirmed, email_confirmation_status, email_verification_token, email_confirmation_sent_at, email_confirmed_at
    INTO v_customer
    FROM public.customers
    WHERE access_token = p_token;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'has_password', false,
            'email', null,
            'email_confirmed', false,
            'email_confirmation_status', 'queued'
        );
    END IF;

    SELECT email INTO v_cred
    FROM public.customer_passwords
    WHERE customer_id = v_customer.id;

    v_effective_email := COALESCE(v_customer.email, v_cred.email);

    RETURN jsonb_build_object(
        'has_password', FOUND,
        'email', v_effective_email,
        'email_confirmed', COALESCE(v_customer.email_confirmed, false),
        'email_confirmation_status', COALESCE(v_customer.email_confirmation_status, CASE WHEN COALESCE(v_customer.email_confirmed, false) THEN 'confirmed' ELSE 'awaiting_confirmation' END),
        'email_verification_token', v_customer.email_verification_token,
        'email_confirmation_sent_at', v_customer.email_confirmation_sent_at,
        'email_confirmed_at', v_customer.email_confirmed_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_auth_status(UUID) TO anon, authenticated;

-- 8. Update RPC: Set or Change Customer Password (syncs email with public.customers)
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
    v_new_verif_token UUID;
BEGIN
    v_clean_email := LOWER(TRIM(p_email));

    IF v_clean_email IS NULL OR v_clean_email = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Valid email address is required.');
    END IF;

    IF p_password IS NULL OR length(p_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 6 characters long.');
    END IF;

    -- Look up customer by access token
    SELECT id, phone_number, full_name, access_token, email, email_confirmed, email_confirmation_status, email_verification_token
    INTO v_customer
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
        IF v_existing_cred.password_hash <> extensions.crypt(p_current_password, v_existing_cred.password_hash) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Current password does not match.');
        END IF;
    END IF;

    -- Hash new password using blowfish (bcrypt) via pgcrypto
    v_new_hash := extensions.crypt(p_password, extensions.gen_salt('bf', 10));

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

    -- Sync email on public.customers; if email changed or was empty, reset confirmation
    v_email_changed := (v_customer.email IS DISTINCT FROM v_clean_email);
    IF v_email_changed OR COALESCE(v_customer.email_confirmed, false) = false THEN
        v_new_verif_token := CASE WHEN v_email_changed THEN gen_random_uuid() ELSE COALESCE(v_customer.email_verification_token, gen_random_uuid()) END;
        UPDATE public.customers
        SET email = v_clean_email,
            email_confirmed = CASE WHEN v_email_changed THEN false ELSE COALESCE(email_confirmed, false) END,
            email_confirmation_status = CASE WHEN v_email_changed THEN 'queued' ELSE COALESCE(email_confirmation_status, 'queued') END,
            email_verification_token = v_new_verif_token
        WHERE id = v_customer.id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Password saved successfully.',
        'email', v_clean_email,
        'email_changed', v_email_changed,
        'email_confirmed', CASE WHEN v_email_changed THEN false ELSE COALESCE(v_customer.email_confirmed, false) END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_customer_password(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;

