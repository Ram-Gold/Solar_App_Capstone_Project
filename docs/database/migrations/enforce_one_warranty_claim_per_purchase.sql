-- Reference migration: Enforce one lifetime warranty claim per purchased product
-- Apply to live Supabase via supabase_mcp (apply_migration) or SQL Editor.

CREATE OR REPLACE FUNCTION public.submit_warranty_claim(
    p_token uuid,
    p_purchase_id uuid,
    p_category text,
    p_description text,
    p_media_urls text[] DEFAULT '{}'::text[]
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

    -- Serialize concurrent claim submissions for the same purchased product
    PERFORM pg_advisory_xact_lock(hashtext(p_purchase_id::text));

    -- Enforce one lifetime warranty claim per purchased product (purchase_id)
    IF EXISTS (
        SELECT 1
        FROM public.warranty_claims
        WHERE purchase_id = p_purchase_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'A warranty claim has already been filed for this purchased product.'
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
        COALESCE(p_media_urls, '{}'::text[]),
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
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.purchase_id::text));

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

CREATE OR REPLACE TRIGGER trg_enforce_single_claim_per_purchase
    BEFORE INSERT ON public.warranty_claims
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_single_claim_per_purchase();
