-- ==============================================================================
-- JD Solar Platform - Branch Inventory & Staff Reservation Hold Workflow
-- ==============================================================================
-- Description:
--   1. Adds branch-specific inventory columns (stock_quiapo, stock_cavite,
--      reserved_quiapo, reserved_cavite) to the products table.
--   2. Updates reserve_product_stock, release_product_reservation, and
--      fulfill_reservation_sale to track holds per showroom branch.
--   3. Maintains backward compatibility with existing single-stock columns.
--
-- Safe to re-run: idempotent using IF NOT EXISTS and CREATE OR REPLACE.
-- Target DB: Supabase (PostgreSQL 15+)
-- ==============================================================================

-- 1. Add branch-specific stock and reservation columns to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_quiapo INT NULL,
  ADD COLUMN IF NOT EXISTS stock_cavite INT NULL,
  ADD COLUMN IF NOT EXISTS reserved_quiapo INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reserved_cavite INT NOT NULL DEFAULT 0;

-- 2. Populate stock_quiapo with existing stock_quantity if null
UPDATE public.products
SET stock_quiapo = COALESCE(stock_quantity, 10),
    stock_cavite = COALESCE(stock_cavite, 0)
WHERE stock_quiapo IS NULL;

-- 3. Update view products_available_stock to include branch breakdowns
CREATE OR REPLACE VIEW public.products_available_stock AS
SELECT
  id,
  name,
  stock_quantity,
  reserved_quantity,
  (stock_quantity - reserved_quantity) AS available_stock,
  COALESCE(stock_quiapo, stock_quantity) AS stock_quiapo,
  COALESCE(reserved_quiapo, 0) AS reserved_quiapo,
  (COALESCE(stock_quiapo, stock_quantity) - COALESCE(reserved_quiapo, 0)) AS available_quiapo,
  COALESCE(stock_cavite, 0) AS stock_cavite,
  COALESCE(reserved_cavite, 0) AS reserved_cavite,
  (COALESCE(stock_cavite, 0) - COALESCE(reserved_cavite, 0)) AS available_cavite,
  in_stock
FROM public.products;

-- 4. reserve_product_stock() with branch awareness
CREATE OR REPLACE FUNCTION public.reserve_product_stock(
  p_ticket_id    BIGINT,
  p_product_id   BIGINT,
  p_quantity     INT,
  p_expires_hours INT DEFAULT 48
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_stock_qty      INT;
  v_reserved_qty   INT;
  v_available      INT;
  v_expires_at     TIMESTAMPTZ;
  v_ticket_exists  BOOLEAN;
  v_already_res    BOOLEAN;
  v_branch         TEXT;
BEGIN
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
$$;

-- 5. release_product_reservation() with branch awareness
CREATE OR REPLACE FUNCTION public.release_product_reservation(
  p_ticket_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_product_id   BIGINT;
  v_quantity     INT;
  v_is_res       BOOLEAN;
  v_decrement    INT;
  v_branch       TEXT;
BEGIN
  SELECT product_id, quantity, is_reservation, store_branch 
  INTO v_product_id, v_quantity, v_is_res, v_branch
  FROM public.quote_tickets WHERE id = p_ticket_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Quote ticket not found.');
  END IF;

  IF NOT v_is_res THEN
    RETURN jsonb_build_object('success', TRUE, 'released', 0, 'note', 'Ticket was not an active reservation; no stock change needed.');
  END IF;

  IF v_product_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Ticket has no associated product.');
  END IF;

  SELECT LEAST(GREATEST(v_quantity, 0), reserved_quantity) INTO v_decrement
  FROM public.products WHERE id = v_product_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Associated product not found.');
  END IF;

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
$$;

-- 6. fulfill_reservation_sale() with branch awareness
CREATE OR REPLACE FUNCTION public.fulfill_reservation_sale(
  p_ticket_id  BIGINT DEFAULT NULL,
  p_product_id BIGINT DEFAULT NULL,
  p_quantity   INT    DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
    'success',      TRUE,
    'product_id',   v_prod_id,
    'new_stock',    v_new_stock,
    'new_reserved', v_new_reserved,
    'new_sales',    v_new_sales,
    'ticket_closed', p_ticket_id IS NOT NULL,
    'branch',       COALESCE(v_branch, 'Quiapo')
  );
END;
$$;
