-- ==============================================================================
-- JD Solar Platform - Inactive Inquiries Cleanup & Retention Policy Migration
-- ==============================================================================
-- Run this in the Supabase Dashboard SQL Editor (https://supabase.com/dashboard)
-- to add the automated stored procedure and performance indexes for purging
-- inactive and obsolete quote tickets from the database.
-- ==============================================================================

-- 1. Create indexes for fast lookup of candidate inquiries by status and date
CREATE INDEX IF NOT EXISTS idx_quote_tickets_status_visit_date 
ON public.quote_tickets(status, visit_date);

CREATE INDEX IF NOT EXISTS idx_quote_tickets_created_at
ON public.quote_tickets(created_at);

-- 2. Stored procedure to safely purge inactive quote tickets
-- Completed or Cancelled older than 7 days
-- Stale Pending older than 14 days
CREATE OR REPLACE FUNCTION public.purge_inactive_quote_tickets()
RETURNS TABLE(purged_count INT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT := 0;
BEGIN
  DELETE FROM public.quote_tickets
  WHERE 
    (
      status IN ('Completed', 'Cancelled')
      AND COALESCE(
        CASE WHEN visit_date ~ '^\d{4}-\d{2}-\d{2}$' THEN visit_date::date ELSE NULL END,
        created_at::date,
        CURRENT_DATE
      ) < CURRENT_DATE - INTERVAL '7 days'
    )
    OR
    (
      status = 'Pending'
      AND COALESCE(
        CASE WHEN visit_date ~ '^\d{4}-\d{2}-\d{2}$' THEN visit_date::date ELSE NULL END,
        created_at::date,
        CURRENT_DATE
      ) < CURRENT_DATE - INTERVAL '14 days'
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count;
END;
$$;

-- 3. Document the cleanup function
COMMENT ON FUNCTION public.purge_inactive_quote_tickets() 
IS 'Purges completed/cancelled inquiries older than 7 days and stale pending inquiries older than 14 days.';
