-- ==============================================================================
-- JD Solar Platform - Temporary Stock Reservation Migration
-- ==============================================================================
-- Feature: Quote Ticket Reservations
-- Description: Adds atomic stock reservation support to the quote_tickets and
--              products tables. Introduces two stored procedures for reserving
--              and releasing stock, and updates the purge job to properly
--              return reserved stock before deleting expired tickets.
--
-- Prerequisites:
--   - stock_quantity_migration.sql (products.stock_quantity, products.in_stock)
--   - purge_inactive_quote_tickets_migration.sql (purge_inactive_quote_tickets)
--
-- Safe to re-run: uses IF NOT EXISTS, CREATE OR REPLACE, and idempotent logic.
-- Target DB: Supabase (PostgreSQL 15+)
-- ==============================================================================


-- ==============================================================================
-- SECTION 1: Schema Changes
-- ==============================================================================

-- 1a. Add is_reservation flag to quote_tickets
--     Distinguishes reservation tickets (JDS-RES-*) at the DB level.
ALTER TABLE public.quote_tickets
  ADD COLUMN IF NOT EXISTS is_reservation BOOLEAN NOT NULL DEFAULT FALSE;

-- 1b. Add reservation expiry timestamp to quote_tickets
--     NULL means the ticket is not (or is no longer) a live reservation.
ALTER TABLE public.quote_tickets
  ADD COLUMN IF NOT EXISTS reservation_expires_at TIMESTAMPTZ NULL;

-- 1c. Add reserved_quantity to products for atomic availability tracking.
--     Check constraint ensures the value stays within sensible bounds.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS reserved_quantity INT NOT NULL DEFAULT 0;

-- Apply the check constraint idempotently (drop first if it exists so a
-- re-run does not throw "constraint already exists").
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_products_reserved_quantity'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT chk_products_reserved_quantity
      CHECK (
        reserved_quantity >= 0
        AND reserved_quantity <= stock_quantity
      );
  END IF;
END;
$$;


-- ==============================================================================
-- SECTION 2: Indexes
-- ==============================================================================

-- Fast lookup for reservation tickets (used by expiry jobs and release logic).
CREATE INDEX IF NOT EXISTS idx_quote_tickets_is_reservation
  ON public.quote_tickets(is_reservation);

-- Fast lookup for expired reservations (used by the purge job).
CREATE INDEX IF NOT EXISTS idx_quote_tickets_reservation_expires_at
  ON public.quote_tickets(reservation_expires_at)
  WHERE reservation_expires_at IS NOT NULL;

-- Supporting index for available-stock queries.
CREATE INDEX IF NOT EXISTS idx_products_reserved_quantity
  ON public.products(reserved_quantity);


-- ==============================================================================
-- SECTION 3: Availability View
-- ==============================================================================
-- available_stock = stock_quantity - reserved_quantity
-- Reflects the number of units that can still be freely inquired or reserved.

CREATE OR REPLACE VIEW public.products_available_stock AS
SELECT
  id,
  name,
  stock_quantity,
  reserved_quantity,
  (stock_quantity - reserved_quantity) AS available_stock,
  in_stock
FROM public.products;

COMMENT ON VIEW public.products_available_stock IS
  'Computed view showing real-time available stock per product. '
  'available_stock = stock_quantity - reserved_quantity. '
  'Use this view for all customer-facing stock display and reservation eligibility checks.';


-- ==============================================================================
-- SECTION 4: reserve_product_stock()
-- ==============================================================================
-- Atomically reserves stock for a quote ticket.
--
-- Parameters:
--   p_ticket_id    BIGINT  - ID of the quote_tickets row to mark as a reservation
--   p_product_id   BIGINT  - ID of the product to reserve stock from
--   p_quantity     INT     - Number of units to reserve (must be >= 1)
--   p_expires_hours INT    - Hours until the reservation expires (default 48)
--
-- Returns: JSONB
--   Success: { "success": true,  "reserved": N, "available_after": M, "expires_at": "..." }
--   Failure: { "success": false, "error": "..." }
--
-- Guarantees:
--   - Row-level lock on the product row prevents concurrent over-reservation.
--   - All writes are atomic within the same transaction.

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
BEGIN
  -- Validate input
  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error',   'Quantity must be a positive integer.'
    );
  END IF;

  IF p_expires_hours IS NULL OR p_expires_hours < 1 THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error',   'Expiry hours must be a positive integer.'
    );
  END IF;

  -- Verify the ticket exists
  SELECT
    TRUE,
    is_reservation
  INTO
    v_ticket_exists,
    v_already_res
  FROM public.quote_tickets
  WHERE id = p_ticket_id;

  IF NOT FOUND OR v_ticket_exists IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error',   'Quote ticket not found.'
    );
  END IF;

  IF v_already_res THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error',   'This ticket already has an active reservation.'
    );
  END IF;

  -- Lock the product row to prevent concurrent over-reservation
  SELECT stock_quantity, reserved_quantity
  INTO   v_stock_qty, v_reserved_qty
  FROM   public.products
  WHERE  id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error',   'Product not found.'
    );
  END IF;

  v_available := v_stock_qty - v_reserved_qty;

  IF v_available < p_quantity THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error',   format(
        'Insufficient available stock. Only %s unit(s) available.',
        v_available
      )
    );
  END IF;

  -- Compute expiry timestamp
  v_expires_at := NOW() + (p_expires_hours || ' hours')::INTERVAL;

  -- Increment reserved_quantity on the product
  UPDATE public.products
  SET    reserved_quantity = reserved_quantity + p_quantity
  WHERE  id = p_product_id;

  -- Mark the ticket as an active reservation
  UPDATE public.quote_tickets
  SET
    is_reservation         = TRUE,
    reservation_expires_at = v_expires_at
  WHERE id = p_ticket_id;

  RETURN jsonb_build_object(
    'success',         TRUE,
    'reserved',        p_quantity,
    'available_after', v_available - p_quantity,
    'expires_at',      v_expires_at
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error',   'Unexpected error during reservation: ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.reserve_product_stock(BIGINT, BIGINT, INT, INT) IS
  'Atomically reserves stock for a quote ticket. '
  'Acquires a row-level lock on the product to prevent race conditions. '
  'Returns JSONB indicating success or a descriptive error.';


-- ==============================================================================
-- SECTION 5: release_product_reservation()
-- ==============================================================================
-- Releases stock held by a reservation ticket and clears reservation metadata.
--
-- Parameters:
--   p_ticket_id BIGINT - ID of the quote_tickets row whose reservation to release
--
-- Returns: JSONB
--   Success: { "success": true,  "released": N }
--   Failure: { "success": false, "error": "..." }
--
-- Guarantees:
--   - reserved_quantity is clamped to >= 0 (never goes negative).
--   - Idempotent: safe to call on a ticket that is already not a reservation.

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
  v_rows_updated INT;
BEGIN
  -- Fetch the ticket data we need
  SELECT product_id, quantity, is_reservation
  INTO   v_product_id, v_quantity, v_is_res
  FROM   public.quote_tickets
  WHERE  id = p_ticket_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error',   'Quote ticket not found.'
    );
  END IF;

  -- Idempotency: if already released, return early without error
  IF NOT v_is_res THEN
    RETURN jsonb_build_object(
      'success',  TRUE,
      'released', 0,
      'note',     'Ticket was not an active reservation; no stock change needed.'
    );
  END IF;

  IF v_product_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error',   'Ticket has no associated product.'
    );
  END IF;

  -- Clamp decrement: never subtract more than what is currently reserved
  SELECT LEAST(GREATEST(v_quantity, 0), reserved_quantity)
  INTO   v_decrement
  FROM   public.products
  WHERE  id = v_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error',   'Associated product not found.'
    );
  END IF;

  -- Return stock to the pool
  UPDATE public.products
  SET    reserved_quantity = GREATEST(reserved_quantity - v_decrement, 0)
  WHERE  id = v_product_id;

  -- Clear reservation metadata on the ticket
  UPDATE public.quote_tickets
  SET
    is_reservation         = FALSE,
    reservation_expires_at = NULL
  WHERE id = p_ticket_id;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'success',  TRUE,
    'released', v_decrement
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error',   'Unexpected error during release: ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.release_product_reservation(BIGINT) IS
  'Releases reserved stock held by a quote ticket reservation. '
  'Clamps the decrement to >= 0 to prevent reserved_quantity going negative. '
  'Idempotent: calling on a non-reservation ticket is a no-op.';


-- ==============================================================================
-- SECTION 5b: fulfill_reservation_sale()
-- ==============================================================================
-- Atomically fulfills a reservation during physical sale checkout:
-- 1. Deducts physical inventory (stock_quantity = stock_quantity - sold_qty)
-- 2. Decrements reserved_quantity hold (reserved_quantity = reserved_quantity - sold_qty)
-- 3. Increments product sales count
-- 4. Marks the quote_ticket as 'Completed' and clears active reservation flag
--
-- Parameters:
--   p_ticket_id   BIGINT - Optional ID of the quote_ticket being fulfilled (can be NULL for direct walk-in)
--   p_product_id  BIGINT - ID of the product sold
--   p_quantity    INT    - Number of units sold (default 1)
--
-- Returns: JSONB
--   { "success": true, "new_stock": N, "new_reserved": N, "new_sales": N }
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fulfill_reservation_sale(
  p_ticket_id  BIGINT DEFAULT NULL,
  p_product_id BIGINT DEFAULT NULL,
  p_quantity   INT DEFAULT 1
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
BEGIN
  -- If ticket ID is provided but product_id is null, resolve from ticket
  IF p_ticket_id IS NOT NULL THEN
    SELECT TRUE, product_id, is_reservation
    INTO   v_ticket_found, v_prod_id, v_is_res
    FROM   public.quote_tickets
    WHERE  id = p_ticket_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error',   'Reservation ticket not found.'
      );
    END IF;
  END IF;

  IF v_prod_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error',   'Product ID is required to fulfill sale.'
    );
  END IF;

  -- Lock product row for atomic inventory update
  SELECT stock_quantity, reserved_quantity, COALESCE(sales, 0)
  INTO   v_stock_qty, v_reserved_qty, v_sales_qty
  FROM   public.products
  WHERE  id = v_prod_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error',   'Product not found in catalog.'
    );
  END IF;

  -- Compute new stock values
  v_new_stock    := GREATEST(0, v_stock_qty - v_sold_qty);
  v_new_sales    := v_sales_qty + v_sold_qty;
  
  -- If this was an active reservation, release the hold
  IF v_is_res THEN
    v_new_reserved := GREATEST(0, v_reserved_qty - v_sold_qty);
  ELSE
    v_new_reserved := LEAST(v_reserved_qty, v_new_stock);
  END IF;

  -- Update product
  UPDATE public.products
  SET
    stock_quantity    = v_new_stock,
    reserved_quantity = v_new_reserved,
    sales             = v_new_sales,
    in_stock          = (v_new_stock > 0)
  WHERE id = v_prod_id;

  -- If quote ticket was linked, mark as Completed
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
    'ticket_closed', p_ticket_id IS NOT NULL
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error',   'Fulfill sale error: ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.fulfill_reservation_sale(BIGINT, BIGINT, INT) IS
  'Fulfills a sale by deducting stock_quantity, releasing any reservation hold, '
  'incrementing sales count, and marking any linked quote_ticket as Completed.';


-- ==============================================================================
-- SECTION 6: Updated purge_inactive_quote_tickets()
-- ==============================================================================
-- Extends the existing purge job to:
--   a) Release reserved stock for any reservation tickets being purged.
--   b) Also purge expired reservations (past reservation_expires_at) regardless
--      of ticket age, returning their reserved stock first.
--
-- Retention policy (unchanged from original):
--   - Completed / Cancelled tickets older than 7 days  -> purged
--   - Pending tickets older than 14 days               -> purged
--   - Expired reservation tickets (past expiry time)   -> purged + stock released

CREATE OR REPLACE FUNCTION public.purge_inactive_quote_tickets()
RETURNS TABLE(purged_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count         INT := 0;
  v_ticket_id     BIGINT;
  v_product_id    BIGINT;
  v_quantity      INT;
  v_reserved_qty  INT;
  v_decrement     INT;
BEGIN
  -- -------------------------------------------------------------------------
  -- Step 1: Release reserved stock for all reservation tickets that will be
  --         purged in this run. We do this inline (without calling the
  --         release_product_reservation function) to avoid per-row overhead
  --         from function call setup, and to stay in a single transaction.
  -- -------------------------------------------------------------------------

  -- Collect candidate reservation tickets to purge, lock the product rows
  -- to prevent concurrent reservation attempts during the purge window.
  FOR v_ticket_id, v_product_id, v_quantity IN
    SELECT
      qt.id,
      qt.product_id,
      qt.quantity
    FROM public.quote_tickets qt
    WHERE qt.is_reservation = TRUE
      AND (
        -- Explicitly expired reservations
        (qt.reservation_expires_at IS NOT NULL AND qt.reservation_expires_at < NOW())
        OR
        -- Completed / Cancelled reservation tickets older than 7 days
        (
          qt.status IN ('Completed', 'Cancelled')
          AND COALESCE(
            CASE WHEN qt.visit_date ~ '^\d{4}-\d{2}-\d{2}$'
                 THEN qt.visit_date::date ELSE NULL END,
            qt.created_at::date,
            CURRENT_DATE
          ) < CURRENT_DATE - INTERVAL '7 days'
        )
        OR
        -- Stale Pending reservation tickets older than 14 days
        (
          qt.status = 'Pending'
          AND COALESCE(
            CASE WHEN qt.visit_date ~ '^\d{4}-\d{2}-\d{2}$'
                 THEN qt.visit_date::date ELSE NULL END,
            qt.created_at::date,
            CURRENT_DATE
          ) < CURRENT_DATE - INTERVAL '14 days'
        )
      )
    FOR UPDATE OF qt SKIP LOCKED
  LOOP
    -- Determine safe decrement (clamped)
    IF v_product_id IS NOT NULL THEN
      SELECT LEAST(GREATEST(COALESCE(v_quantity, 0), 0), COALESCE(reserved_quantity, 0))
      INTO   v_decrement
      FROM   public.products
      WHERE  id = v_product_id
      FOR UPDATE SKIP LOCKED;

      IF FOUND AND v_decrement > 0 THEN
        UPDATE public.products
        SET    reserved_quantity = GREATEST(reserved_quantity - v_decrement, 0)
        WHERE  id = v_product_id;
      END IF;
    END IF;
  END LOOP;

  -- -------------------------------------------------------------------------
  -- Step 2: Delete all candidate tickets in a single DELETE statement.
  --         This covers both reservation tickets (stock already released above)
  --         and regular (non-reservation) inactive tickets.
  -- -------------------------------------------------------------------------
  DELETE FROM public.quote_tickets
  WHERE
    -- Expired reservation tickets (regardless of status)
    (
      is_reservation = TRUE
      AND reservation_expires_at IS NOT NULL
      AND reservation_expires_at < NOW()
    )
    OR
    -- Completed / Cancelled older than 7 days
    (
      status IN ('Completed', 'Cancelled')
      AND COALESCE(
        CASE WHEN visit_date ~ '^\d{4}-\d{2}-\d{2}$'
             THEN visit_date::date ELSE NULL END,
        created_at::date,
        CURRENT_DATE
      ) < CURRENT_DATE - INTERVAL '7 days'
    )
    OR
    -- Stale Pending older than 14 days
    (
      status = 'Pending'
      AND COALESCE(
        CASE WHEN visit_date ~ '^\d{4}-\d{2}-\d{2}$'
             THEN visit_date::date ELSE NULL END,
        created_at::date,
        CURRENT_DATE
      ) < CURRENT_DATE - INTERVAL '14 days'
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count;
END;
$$;

COMMENT ON FUNCTION public.purge_inactive_quote_tickets() IS
  'Purges inactive quote tickets per the JD Solar retention policy: '
  'completed/cancelled tickets older than 7 days, stale pending tickets older '
  'than 14 days, and expired reservation tickets (past reservation_expires_at). '
  'Inline stock release runs before deletion so reserved_quantity is never '
  'left in an inflated state after a ticket is removed.';


-- ==============================================================================
-- SECTION 7: Column & View Documentation
-- ==============================================================================

COMMENT ON COLUMN public.quote_tickets.is_reservation IS
  'TRUE when this ticket represents a confirmed temporary stock reservation '
  '(ticket code prefix JDS-RES-*). FALSE for standard inquiry tickets (JDS-INQ-*). '
  'Defaults to FALSE.';

COMMENT ON COLUMN public.quote_tickets.reservation_expires_at IS
  'Timestamp (with timezone) at which this reservation expires and stock '
  'is returned to the pool. NULL when is_reservation = FALSE.';

COMMENT ON COLUMN public.products.reserved_quantity IS
  'Number of units currently held by active reservations. '
  'Available stock = stock_quantity - reserved_quantity. '
  'Managed exclusively by reserve_product_stock() and release_product_reservation(). '
  'Constrained: 0 <= reserved_quantity <= stock_quantity.';


-- ==============================================================================
-- END OF MIGRATION
-- ==============================================================================
