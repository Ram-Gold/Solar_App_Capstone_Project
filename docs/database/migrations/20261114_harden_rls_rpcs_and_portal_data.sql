-- JD Solar Platform - Database Security & Portal Data Hardening
-- Target Supabase Project: gkrdwzbxpstpqpvqlwbt (solar-app)
-- Run this script in the Supabase Dashboard SQL Editor.

-- 1. Fix get_user_role() search_path syntax
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
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

  RETURN NULL;
END;
$function$;

-- 2. Drop redundant 3-arg activate_customer_account overload
DROP FUNCTION IF EXISTS public.activate_customer_account(uuid, uuid, text);

-- 3. Update get_customer_portal_data to include voided status and email confirmation metadata
CREATE OR REPLACE FUNCTION public.get_customer_portal_data(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_customer RECORD;
    v_purchases JSONB;
    v_claims JSONB;
BEGIN
    SELECT id, phone_number, full_name, access_token, email, email_confirmed, email_confirmed_at, email_confirmation_status, email_confirmation_sent_at
    INTO v_customer
    FROM public.customers
    WHERE access_token = p_token;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

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
            'is_voided', COALESCE(cp.is_voided, false),
            'void_reason', cp.void_reason,
            'voided_at', cp.voided_at,
            'is_warranty_active', (NOT COALESCE(cp.is_voided, false) AND cp.warranty_expires_at >= CURRENT_DATE),
            'days_remaining', CASE WHEN COALESCE(cp.is_voided, false) THEN 0 ELSE GREATEST(0, (cp.warranty_expires_at - CURRENT_DATE)) END
        ) ORDER BY cp.purchase_date DESC
    ), '[]'::jsonb)
    INTO v_purchases
    FROM public.customer_purchases cp
    JOIN public.products p ON p.id = cp.product_id
    WHERE cp.customer_id = v_customer.id;

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
            'email', v_customer.email,
            'email_confirmed', COALESCE(v_customer.email_confirmed, v_customer.email_confirmed_at IS NOT NULL, false),
            'email_confirmed_at', v_customer.email_confirmed_at,
            'email_confirmation_status', COALESCE(v_customer.email_confirmation_status, CASE WHEN v_customer.email_confirmed_at IS NOT NULL THEN 'confirmed' ELSE 'awaiting_confirmation' END),
            'email_confirmation_sent_at', v_customer.email_confirmation_sent_at,
            'token', v_customer.access_token
        ),
        'purchases', v_purchases,
        'claims', v_claims
    );
END;
$function$;

-- 4. Safe RPCs for customer auth status & email confirmation without exposing customers table to anon
CREATE OR REPLACE FUNCTION public.get_customer_auth_status(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cust RECORD;
  v_has_pwd BOOLEAN;
  v_confirmed BOOLEAN;
BEGIN
  SELECT id, user_id, email, email_confirmed, email_confirmed_at, email_confirmation_status
  INTO v_cust
  FROM public.customers
  WHERE access_token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'found', false,
      'has_password', false,
      'email', null,
      'email_confirmed', false,
      'email_confirmation_status', 'unconfirmed'
    );
  END IF;

  v_has_pwd := v_cust.user_id IS NOT NULL;
  v_confirmed := COALESCE(v_cust.email_confirmed, v_cust.email_confirmed_at IS NOT NULL, false);

  RETURN jsonb_build_object(
    'found', true,
    'has_password', v_has_pwd,
    'email', CASE WHEN v_has_pwd THEN NULL ELSE v_cust.email END,
    'email_confirmed', v_confirmed,
    'email_confirmation_status', COALESCE(v_cust.email_confirmation_status, CASE WHEN v_confirmed THEN 'confirmed' ELSE 'awaiting_confirmation' END)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.confirm_customer_email(p_token uuid, p_verification_token text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cust RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT id, email, email_verification_token, email_confirmed_at
  INTO v_cust
  FROM public.customers
  WHERE access_token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer account not found.');
  END IF;

  IF p_verification_token IS NOT NULL AND p_verification_token <> '1' AND v_cust.email_verification_token IS NOT NULL THEN
    IF v_cust.email_verification_token::text <> p_verification_token THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid verification token.');
    END IF;
  END IF;

  UPDATE public.customers
  SET email_confirmed_at = COALESCE(email_confirmed_at, v_now),
      email_confirmed = true,
      email_confirmation_status = 'confirmed'
  WHERE id = v_cust.id;

  RETURN jsonb_build_object(
    'success', true,
    'email', v_cust.email,
    'email_confirmed_at', COALESCE(v_cust.email_confirmed_at, v_now)
  );
END;
$function$;

-- 5. Secure stock-mutating RPCs so only staff/admin can invoke them
CREATE OR REPLACE FUNCTION public.reserve_product_stock(p_ticket_id bigint, p_product_id bigint, p_quantity integer, p_expires_hours integer DEFAULT 48)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_stock_qty      INT;
  v_reserved_qty   INT;
  v_available      INT;
  v_expires_at     TIMESTAMPTZ;
  v_ticket_exists  BOOLEAN;
  v_already_res    BOOLEAN;
  v_branch         TEXT;
BEGIN
  IF public.get_user_role() NOT IN ('admin', 'staff') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Unauthorized: Staff or Administrator credentials required.');
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Quantity must be a positive integer.');
  END IF;

  SELECT TRUE, is_reservation, store_branch
  INTO v_ticket_exists, v_already_res, v_branch
  FROM public.quote_tickets WHERE id = p_ticket_id;

  IF NOT FOUND OR v_ticket_exists IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Quote ticket not found.');
  END IF;

  IF v_already_res THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'This ticket already has an active reservation.');
  END IF;

  SELECT stock_quantity, reserved_quantity INTO v_stock_qty, v_reserved_qty
  FROM public.products WHERE id = p_product_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Product not found.');
  END IF;

  v_available := v_stock_qty - v_reserved_qty;

  IF v_available < p_quantity THEN
    RETURN jsonb_build_object('success', FALSE, 'error', format('Insufficient available stock. Only %s unit(s) available.', v_available));
  END IF;

  v_expires_at := NOW() + (p_expires_hours || ' hours')::INTERVAL;

  IF LOWER(COALESCE(v_branch, '')) LIKE '%cavite%' THEN
    UPDATE public.products
    SET reserved_quantity = reserved_quantity + p_quantity,
        reserved_cavite   = COALESCE(reserved_cavite, 0) + p_quantity
    WHERE id = p_product_id;
  ELSE
    UPDATE public.products
    SET reserved_quantity = reserved_quantity + p_quantity,
        reserved_quiapo   = COALESCE(reserved_quiapo, 0) + p_quantity
    WHERE id = p_product_id;
  END IF;

  UPDATE public.quote_tickets
  SET is_reservation         = TRUE,
      reservation_expires_at = v_expires_at,
      updated_at             = NOW()
  WHERE id = p_ticket_id;

  RETURN jsonb_build_object(
    'success',         TRUE,
    'reserved',        p_quantity,
    'available_after', v_available - p_quantity,
    'expires_at',      v_expires_at,
    'branch',          COALESCE(v_branch, 'Quiapo')
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_product_reservation(p_ticket_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_product_id BIGINT;
  v_quantity   INT;
  v_is_res     BOOLEAN;
  v_decrement  INT;
  v_branch     TEXT;
BEGIN
  IF public.get_user_role() NOT IN ('admin', 'staff') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Unauthorized: Staff or Administrator credentials required.');
  END IF;

  SELECT product_id, COALESCE(quantity, 1), is_reservation, store_branch
  INTO v_product_id, v_quantity, v_is_res, v_branch
  FROM public.quote_tickets WHERE id = p_ticket_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Quote ticket not found.');
  END IF;

  IF NOT v_is_res OR v_product_id IS NULL THEN
    RETURN jsonb_build_object('success', TRUE, 'released', 0);
  END IF;

  v_decrement := GREATEST(1, v_quantity);

  IF LOWER(COALESCE(v_branch, '')) LIKE '%cavite%' THEN
    UPDATE public.products
    SET reserved_quantity = GREATEST(0, reserved_quantity - v_decrement),
        reserved_cavite   = GREATEST(0, COALESCE(reserved_cavite, 0) - v_decrement)
    WHERE id = v_product_id;
  ELSE
    UPDATE public.products
    SET reserved_quantity = GREATEST(0, reserved_quantity - v_decrement),
        reserved_quiapo   = GREATEST(0, COALESCE(reserved_quiapo, 0) - v_decrement)
    WHERE id = v_product_id;
  END IF;

  UPDATE public.quote_tickets
  SET is_reservation         = FALSE,
      reservation_expires_at = NULL,
      updated_at             = NOW()
  WHERE id = p_ticket_id;

  RETURN jsonb_build_object('success', TRUE, 'released', v_decrement, 'branch', COALESCE(v_branch, 'Quiapo'));
END;
$function$;

CREATE OR REPLACE FUNCTION public.fulfill_reservation_sale(p_ticket_id bigint DEFAULT NULL::bigint, p_product_id bigint DEFAULT NULL::bigint, p_quantity integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_sold_qty     INT := GREATEST(1, COALESCE(p_quantity, 1));
  v_prod_id      BIGINT := p_product_id;
  v_stock_qty    INT;
  v_reserved_qty INT;
  v_sales_qty    INT;
  v_new_stock    INT;
  v_new_reserved INT;
  v_new_sales    INT;
  v_ticket_found BOOLEAN := FALSE;
  v_is_res       BOOLEAN := FALSE;
  v_branch       TEXT;
BEGIN
  IF public.get_user_role() NOT IN ('admin', 'staff') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Unauthorized: Staff or Administrator credentials required.');
  END IF;

  IF p_ticket_id IS NOT NULL THEN
    SELECT TRUE, product_id, is_reservation, store_branch
    INTO   v_ticket_found, v_prod_id, v_is_res, v_branch
    FROM   public.quote_tickets
    WHERE  id = p_ticket_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'Reservation ticket not found.');
    END IF;
  END IF;

  IF v_prod_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Product ID is required to fulfill sale.');
  END IF;

  SELECT stock_quantity, reserved_quantity, COALESCE(sales, 0)
  INTO   v_stock_qty, v_reserved_qty, v_sales_qty
  FROM   public.products
  WHERE  id = v_prod_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Product not found in catalog.');
  END IF;

  v_new_stock    := GREATEST(0, v_stock_qty - v_sold_qty);
  v_new_sales    := v_sales_qty + v_sold_qty;

  IF v_is_res THEN
    v_new_reserved := GREATEST(0, v_reserved_qty - v_sold_qty);
  ELSE
    v_new_reserved := LEAST(v_reserved_qty, v_new_stock);
  END IF;

  IF LOWER(COALESCE(v_branch, '')) LIKE '%cavite%' THEN
    UPDATE public.products
    SET
      stock_quantity    = v_new_stock,
      reserved_quantity = v_new_reserved,
      stock_cavite      = GREATEST(0, COALESCE(stock_cavite, 0) - v_sold_qty),
      reserved_cavite   = CASE WHEN v_is_res THEN GREATEST(0, COALESCE(reserved_cavite, 0) - v_sold_qty) ELSE COALESCE(reserved_cavite, 0) END,
      sales             = v_new_sales,
      in_stock          = (v_new_stock > 0)
    WHERE id = v_prod_id;
  ELSE
    UPDATE public.products
    SET
      stock_quantity    = v_new_stock,
      reserved_quantity = v_new_reserved,
      stock_quiapo      = GREATEST(0, COALESCE(stock_quiapo, 0) - v_sold_qty),
      reserved_quiapo   = CASE WHEN v_is_res THEN GREATEST(0, COALESCE(reserved_quiapo, 0) - v_sold_qty) ELSE COALESCE(reserved_quiapo, 0) END,
      sales             = v_new_sales,
      in_stock          = (v_new_stock > 0)
    WHERE id = v_prod_id;
  END IF;

  IF p_ticket_id IS NOT NULL THEN
    UPDATE public.quote_tickets
    SET
      status                 = 'Completed',
      is_reservation         = FALSE,
      reservation_expires_at = NULL,
      updated_at             = NOW()
    WHERE id = p_ticket_id;
  END IF;

  RETURN jsonb_build_object(
    'success',       TRUE,
    'product_id',    v_prod_id,
    'new_stock',     v_new_stock,
    'new_reserved',  v_new_reserved,
    'new_sales',     v_new_sales,
    'ticket_closed', p_ticket_id IS NOT NULL,
    'branch',        COALESCE(v_branch, 'Quiapo')
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.reserve_product_stock(bigint, bigint, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_product_stock(bigint, bigint, integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.release_product_reservation(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_product_reservation(bigint) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fulfill_reservation_sale(bigint, bigint, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fulfill_reservation_sale(bigint, bigint, integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_customer_auth_status(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_customer_email(uuid, text) TO anon, authenticated;

-- 6. Tighten RLS policies across public tables
DROP POLICY IF EXISTS "Customer can delete own row" ON public.customers;
DROP POLICY IF EXISTS "Public token access on customers" ON public.customers;
DROP POLICY IF EXISTS "Staff and Admin full access on customers" ON public.customers;

CREATE POLICY "Staff and Admin full access on customers"
  ON public.customers FOR ALL TO authenticated
  USING ((SELECT public.get_user_role()) IN ('admin', 'staff'))
  WITH CHECK ((SELECT public.get_user_role()) IN ('admin', 'staff'));

CREATE POLICY "Customers can read own row"
  ON public.customers FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Customers can update own row"
  ON public.customers FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Customers can delete own row"
  ON public.customers FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Public access on customer_purchases" ON public.customer_purchases;
DROP POLICY IF EXISTS "Staff and Admin full access on customer_purchases" ON public.customer_purchases;

CREATE POLICY "Staff and Admin full access on customer_purchases"
  ON public.customer_purchases FOR ALL TO authenticated
  USING ((SELECT public.get_user_role()) IN ('admin', 'staff'))
  WITH CHECK ((SELECT public.get_user_role()) IN ('admin', 'staff'));

CREATE POLICY "Customers can read own purchases"
  ON public.customer_purchases FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = customer_purchases.customer_id
        AND c.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Public insert on warranty_claims" ON public.warranty_claims;
DROP POLICY IF EXISTS "Public select on warranty_claims" ON public.warranty_claims;
DROP POLICY IF EXISTS "Staff and Admin full access on warranty_claims" ON public.warranty_claims;

CREATE POLICY "Staff and Admin full access on warranty_claims"
  ON public.warranty_claims FOR ALL TO authenticated
  USING ((SELECT public.get_user_role()) IN ('admin', 'staff'))
  WITH CHECK ((SELECT public.get_user_role()) IN ('admin', 'staff'));

CREATE POLICY "Customers can read own warranty claims"
  ON public.warranty_claims FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customer_purchases cp
      JOIN public.customers c ON c.id = cp.customer_id
      WHERE cp.id = warranty_claims.purchase_id
        AND c.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Customers can insert own warranty claims"
  ON public.warranty_claims FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customer_purchases cp
      JOIN public.customers c ON c.id = cp.customer_id
      WHERE cp.id = warranty_claims.purchase_id
        AND c.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Public delete access for quote_tickets" ON public.quote_tickets;
DROP POLICY IF EXISTS "Public insert access for quote_tickets" ON public.quote_tickets;
DROP POLICY IF EXISTS "Public read access for quote_tickets" ON public.quote_tickets;
DROP POLICY IF EXISTS "Public update access for quote_tickets" ON public.quote_tickets;

CREATE POLICY "Public insert access for quote_tickets"
  ON public.quote_tickets FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Staff and Admin manage quote_tickets"
  ON public.quote_tickets FOR ALL TO authenticated
  USING ((SELECT public.get_user_role()) IN ('admin', 'staff'))
  WITH CHECK ((SELECT public.get_user_role()) IN ('admin', 'staff'));

DROP POLICY IF EXISTS "Admin can manage products" ON public.products;
DROP POLICY IF EXISTS "Public can read products" ON public.products;

-- 7. Add covering index for quote_tickets.product_id FK
CREATE INDEX IF NOT EXISTS idx_quote_tickets_product_id ON public.quote_tickets (product_id);
