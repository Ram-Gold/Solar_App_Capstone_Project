-- Reference migration: Enforce one lifetime warranty claim per purchased product
-- Apply to live Supabase via supabase_mcp (apply_migration) or SQL Editor.

CREATE OR REPLACE FUNCTION public.submit_warranty_claim(
    p_token uuid,
    p_purchase_id uuid,
    p_category text,
    p_description text,
    p_media_urls text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_customer_id UUID;
    v_purchase_customer_id UUID;
    v_claim_id UUID;
BEGIN
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE access_token = p_token;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid customer access token');
    END IF;

    SELECT customer_id INTO v_purchase_customer_id
    FROM public.customer_purchases
    WHERE id = p_purchase_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Purchase record not found');
    END IF;

    IF v_purchase_customer_id <> v_customer_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Purchase does not belong to this customer');
    END IF;

    -- Enforce one lifetime warranty claim per customer account
    IF EXISTS (
        SELECT 1
        FROM public.warranty_claims wc
        JOIN public.customer_purchases cp ON cp.id = wc.purchase_id
        WHERE cp.customer_id = v_customer_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'A warranty claim has already been filed for your account.'
        );
    END IF;

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
$function$;

CREATE OR REPLACE FUNCTION public.enforce_single_claim_per_purchase()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_customer_id UUID;
BEGIN
    SELECT customer_id INTO v_customer_id
    FROM public.customer_purchases
    WHERE id = NEW.purchase_id;

    IF v_customer_id IS NOT NULL AND EXISTS (
        SELECT 1
        FROM public.warranty_claims wc
        JOIN public.customer_purchases cp ON cp.id = wc.purchase_id
        WHERE cp.customer_id = v_customer_id
    ) THEN
        RAISE EXCEPTION 'A warranty claim has already been filed for your account.'
            USING ERRCODE = '23505';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.warranty_claims
        WHERE purchase_id = NEW.purchase_id
    ) THEN
        RAISE EXCEPTION 'A warranty claim has already been filed for this purchased product.'
            USING ERRCODE = '23505';
    END IF;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_single_claim_per_purchase ON public.warranty_claims;
CREATE TRIGGER trg_enforce_single_claim_per_purchase
    BEFORE INSERT ON public.warranty_claims
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_single_claim_per_purchase();
