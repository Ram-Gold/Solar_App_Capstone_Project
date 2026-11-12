-- ==============================================================================
-- JD Force Solar Products Trading
-- Customer Email Confirmation & Queuing Migration (Normalized Schema)
-- ==============================================================================
-- Run this in the Supabase Dashboard SQL Editor (https://supabase.com/dashboard)
-- to normalize public.customers (keeping only email and email_confirmed_at) and
-- slim down public.email_confirmation_queue to 7 core dispatch columns.
-- ==============================================================================

-- 1. Ensure email and email_confirmed_at exist on public.customers
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(LOWER(email));

-- Backfill email_confirmed_at from legacy email_confirmed boolean if present
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'email_confirmed'
    ) THEN
        UPDATE public.customers
        SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
        WHERE email_confirmed = TRUE
          AND email_confirmed_at IS NULL;
    END IF;
END $$;

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

-- Drop redundant email confirmation columns & index from public.customers
DROP INDEX IF EXISTS public.idx_customers_verification_token;

ALTER TABLE public.customers
DROP COLUMN IF EXISTS email_confirmed,
DROP COLUMN IF EXISTS email_confirmation_status,
DROP COLUMN IF EXISTS email_verification_token,
DROP COLUMN IF EXISTS email_confirmation_sent_at;

-- 2. Create or normalize public.email_confirmation_queue (7 core columns)
CREATE TABLE IF NOT EXISTS public.email_confirmation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    verification_token UUID NOT NULL DEFAULT gen_random_uuid(),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'awaiting_confirmation', 'confirmed', 'failed')),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop redundant columns from public.email_confirmation_queue if upgrading from earlier migration
ALTER TABLE public.email_confirmation_queue
DROP COLUMN IF EXISTS subject,
DROP COLUMN IF EXISTS attempts,
DROP COLUMN IF EXISTS last_error,
DROP COLUMN IF EXISTS confirmed_at;

CREATE INDEX IF NOT EXISTS idx_email_confirmation_queue_customer ON public.email_confirmation_queue(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_confirmation_queue_status ON public.email_confirmation_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_confirmation_queue_token ON public.email_confirmation_queue(verification_token);

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

    -- Update customer email & reset confirmation timestamp to NULL (unconfirmed)
    UPDATE public.customers
    SET email = v_clean_email,
        email_confirmed_at = NULL
    WHERE id = p_customer_id;

    -- Insert queue record with 7 core columns
    INSERT INTO public.email_confirmation_queue (
        customer_id,
        recipient_email,
        verification_token,
        status,
        created_at
    ) VALUES (
        p_customer_id,
        v_clean_email,
        v_new_token,
        'queued',
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
        'email_confirmed', false,
        'email_confirmed_at', NULL
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
    v_sent_at TIMESTAMPTZ;
BEGIN
    v_effective_status := COALESCE(NULLIF(TRIM(p_status), ''), 'awaiting_confirmation');
    IF v_effective_status NOT IN ('queued', 'awaiting_confirmation', 'confirmed', 'failed') THEN
        v_effective_status := 'awaiting_confirmation';
    END IF;

    v_sent_at := CASE WHEN v_effective_status = 'awaiting_confirmation' THEN NOW() ELSE NULL END;

    UPDATE public.email_confirmation_queue
    SET status = v_effective_status,
        sent_at = COALESCE(v_sent_at, sent_at)
    WHERE customer_id = p_customer_id
      AND status IN ('queued', 'failed');

    RETURN jsonb_build_object(
        'success', true,
        'customer_id', p_customer_id,
        'email_confirmation_status', v_effective_status,
        'sent_at', v_sent_at
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
    v_latest_queue RECORD;
    v_confirmed_ts TIMESTAMPTZ;
BEGIN
    SELECT id, full_name, email, phone_number, access_token, email_confirmed_at
    INTO v_customer
    FROM public.customers
    WHERE access_token = p_token;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid customer access token.');
    END IF;

    -- Fetch latest verification token from email_confirmation_queue if present
    SELECT id, verification_token, status
    INTO v_latest_queue
    FROM public.email_confirmation_queue
    WHERE customer_id = v_customer.id
    ORDER BY created_at DESC
    LIMIT 1;

    IF p_verification_token IS NOT NULL
       AND v_latest_queue.verification_token IS NOT NULL
       AND v_latest_queue.verification_token <> p_verification_token THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired email verification link.');
    END IF;

    v_confirmed_ts := COALESCE(v_customer.email_confirmed_at, NOW());

    UPDATE public.customers
    SET email_confirmed_at = v_confirmed_ts
    WHERE id = v_customer.id;

    UPDATE public.email_confirmation_queue
    SET status = 'confirmed'
    WHERE customer_id = v_customer.id
      AND status <> 'confirmed';

    RETURN jsonb_build_object(
        'success', true,
        'customer_id', v_customer.id,
        'email', v_customer.email,
        'email_confirmed', true,
        'email_confirmed_at', v_confirmed_ts,
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
    v_queue RECORD;
    v_has_password BOOLEAN := false;
    v_effective_email TEXT;
    v_is_confirmed BOOLEAN;
BEGIN
    SELECT id, email, email_confirmed_at
    INTO v_customer
    FROM public.customers
    WHERE access_token = p_token;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'has_password', false,
            'email', null,
            'email_confirmed', false,
            'email_confirmed_at', null,
            'email_confirmation_status', 'queued'
        );
    END IF;

    SELECT email INTO v_cred
    FROM public.customer_passwords
    WHERE customer_id = v_customer.id;
    v_has_password := FOUND;

    SELECT verification_token, status, sent_at
    INTO v_queue
    FROM public.email_confirmation_queue
    WHERE customer_id = v_customer.id
    ORDER BY created_at DESC
    LIMIT 1;

    v_effective_email := COALESCE(v_customer.email, v_cred.email);
    v_is_confirmed := (v_customer.email_confirmed_at IS NOT NULL);

    RETURN jsonb_build_object(
        'has_password', v_has_password,
        'email', v_effective_email,
        'email_confirmed', v_is_confirmed,
        'email_confirmed_at', v_customer.email_confirmed_at,
        'email_confirmation_status', CASE
            WHEN v_is_confirmed THEN 'confirmed'
            ELSE COALESCE(v_queue.status, 'awaiting_confirmation')
        END,
        'email_verification_token', v_queue.verification_token,
        'email_confirmation_sent_at', v_queue.sent_at
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
    v_is_confirmed BOOLEAN := false;
BEGIN
    v_clean_email := LOWER(TRIM(p_email));

    IF v_clean_email IS NULL OR v_clean_email = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Valid email address is required.');
    END IF;

    IF p_password IS NULL OR length(p_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 6 characters long.');
    END IF;

    -- Look up customer by access token
    SELECT id, phone_number, full_name, access_token, email, email_confirmed_at
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

    -- Sync email on public.customers; if email changed, reset email_confirmed_at to NULL
    v_email_changed := (v_customer.email IS DISTINCT FROM v_clean_email);
    IF v_email_changed THEN
        UPDATE public.customers
        SET email = v_clean_email,
            email_confirmed_at = NULL
        WHERE id = v_customer.id;

        INSERT INTO public.email_confirmation_queue (
            customer_id,
            recipient_email,
            verification_token,
            status,
            created_at
        ) VALUES (
            v_customer.id,
            v_clean_email,
            gen_random_uuid(),
            'queued',
            NOW()
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
