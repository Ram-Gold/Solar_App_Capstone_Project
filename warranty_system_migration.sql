-- ==============================================================================
-- JD Force Solar Products Trading - Customer Onboarding, QR & Warranty Migration
-- Run this script in the Supabase Dashboard SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Create Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    access_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone_number);
CREATE INDEX IF NOT EXISTS idx_customers_token ON public.customers(access_token);

-- 2. Create Customer Purchases Table
CREATE TABLE IF NOT EXISTS public.customer_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    serial_number TEXT,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    warranty_months INT NOT NULL DEFAULT 12,
    warranty_expires_at DATE,
    branch_location TEXT NOT NULL DEFAULT 'Cavite',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_purchases_customer ON public.customer_purchases(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_purchases_product ON public.customer_purchases(product_id);

-- Trigger to automatically calculate warranty_expires_at (replaces non-immutable generated column)
CREATE OR REPLACE FUNCTION public.compute_warranty_expires_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.warranty_expires_at IS NULL THEN
        NEW.warranty_expires_at := (NEW.purchase_date + (NEW.warranty_months || ' month')::interval)::date;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_warranty_expires_at ON public.customer_purchases;
CREATE TRIGGER trg_compute_warranty_expires_at
BEFORE INSERT OR UPDATE OF purchase_date, warranty_months ON public.customer_purchases
FOR EACH ROW
EXECUTE FUNCTION public.compute_warranty_expires_at();

-- 3. Create Warranty Claims Table
CREATE TABLE IF NOT EXISTS public.warranty_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES public.customer_purchases(id) ON DELETE CASCADE,
    issue_category TEXT NOT NULL,
    description TEXT NOT NULL,
    media_urls TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_review', 'approved', 'resolved', 'rejected'
    staff_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warranty_claims_purchase ON public.warranty_claims(purchase_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_status ON public.warranty_claims(status);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_claims ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: Allow Authenticated Admins & Staff Full Access
-- Customers
DROP POLICY IF EXISTS "Staff and Admin full access on customers" ON public.customers;
CREATE POLICY "Staff and Admin full access on customers"
    ON public.customers
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow public read of customers
DROP POLICY IF EXISTS "Public token access on customers" ON public.customers;
CREATE POLICY "Public token access on customers"
    ON public.customers
    FOR SELECT
    TO anon
    USING (true);

-- Customer Purchases
DROP POLICY IF EXISTS "Staff and Admin full access on customer_purchases" ON public.customer_purchases;
CREATE POLICY "Staff and Admin full access on customer_purchases"
    ON public.customer_purchases
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on customer_purchases" ON public.customer_purchases;
CREATE POLICY "Public access on customer_purchases"
    ON public.customer_purchases
    FOR SELECT
    TO anon
    USING (true);

-- Warranty Claims
DROP POLICY IF EXISTS "Staff and Admin full access on warranty_claims" ON public.warranty_claims;
CREATE POLICY "Staff and Admin full access on warranty_claims"
    ON public.warranty_claims
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public insert on warranty_claims" ON public.warranty_claims;
CREATE POLICY "Public insert on warranty_claims"
    ON public.warranty_claims
    FOR INSERT
    TO anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public select on warranty_claims" ON public.warranty_claims;
CREATE POLICY "Public select on warranty_claims"
    ON public.warranty_claims
    FOR SELECT
    TO anon
    USING (true);

-- 6. RPC: Fetch Customer Portal Data (Token Protected)
CREATE OR REPLACE FUNCTION public.get_customer_portal_data(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer RECORD;
    v_purchases JSONB;
    v_claims JSONB;
BEGIN
    SELECT id, phone_number, full_name, access_token INTO v_customer
    FROM public.customers
    WHERE access_token = p_token;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Aggregate all purchases with product details
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', cp.id,
            'product_id', cp.product_id,
            'product_name', p.name,
            'product_type', p.type,
            'product_image', p.image_url,
            'watt', p.watt,
            'serial_number', cp.serial_number,
            'purchase_date', cp.purchase_date,
            'warranty_months', cp.warranty_months,
            'warranty_expires_at', cp.warranty_expires_at,
            'branch_location', cp.branch_location,
            'is_warranty_active', (cp.warranty_expires_at >= CURRENT_DATE),
            'days_remaining', GREATEST(0, (cp.warranty_expires_at - CURRENT_DATE))
        ) ORDER BY cp.purchase_date DESC
    ), '[]'::jsonb)
    INTO v_purchases
    FROM public.customer_purchases cp
    JOIN public.products p ON p.id = cp.product_id
    WHERE cp.customer_id = v_customer.id;

    -- Aggregate all warranty claims for these purchases
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', wc.id,
            'purchase_id', wc.purchase_id,
            'product_name', p.name,
            'serial_number', cp.serial_number,
            'issue_category', wc.issue_category,
            'description', wc.description,
            'media_urls', wc.media_urls,
            'status', wc.status,
            'staff_notes', wc.staff_notes,
            'created_at', wc.created_at,
            'updated_at', wc.updated_at
        ) ORDER BY wc.created_at DESC
    ), '[]'::jsonb)
    INTO v_claims
    FROM public.warranty_claims wc
    JOIN public.customer_purchases cp ON cp.id = wc.purchase_id
    JOIN public.products p ON p.id = cp.product_id
    WHERE cp.customer_id = v_customer.id;

    RETURN jsonb_build_object(
        'customer', jsonb_build_object(
            'id', v_customer.id,
            'name', v_customer.full_name,
            'phone', v_customer.phone_number,
            'token', v_customer.access_token
        ),
        'purchases', v_purchases,
        'claims', v_claims
    );
END;
$$;

-- 7. RPC: Submit Warranty Claim with Token Verification
CREATE OR REPLACE FUNCTION public.submit_warranty_claim(
    p_token UUID,
    p_purchase_id UUID,
    p_category TEXT,
    p_description TEXT,
    p_media_urls TEXT[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer_id UUID;
    v_purchase_customer_id UUID;
    v_claim_id UUID;
BEGIN
    -- Verify customer token
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE access_token = p_token;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid customer access token');
    END IF;

    -- Verify the purchase belongs to this customer
    SELECT customer_id INTO v_purchase_customer_id
    FROM public.customer_purchases
    WHERE id = p_purchase_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Purchase record not found');
    END IF;

    IF v_purchase_customer_id <> v_customer_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Purchase does not belong to this customer');
    END IF;

    -- Insert claim
    INSERT INTO public.warranty_claims (
        purchase_id,
        issue_category,
        description,
        media_urls,
        status
    ) VALUES (
        p_purchase_id,
        p_category,
        p_description,
        p_media_urls,
        'pending'
    )
    RETURNING id INTO v_claim_id;

    RETURN jsonb_build_object(
        'success', true,
        'claim_id', v_claim_id,
        'message', 'Warranty claim submitted successfully'
    );
END;
$$;

-- 8. Storage Bucket for Evidence
INSERT INTO storage.buckets (id, name, public)
VALUES ('warranty-evidence', 'warranty-evidence', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Public read on warranty-evidence" ON storage.objects;
CREATE POLICY "Public read on warranty-evidence"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'warranty-evidence');

DROP POLICY IF EXISTS "Public upload on warranty-evidence" ON storage.objects;
CREATE POLICY "Public upload on warranty-evidence"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'warranty-evidence');
