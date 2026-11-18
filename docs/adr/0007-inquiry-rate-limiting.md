# 0007. Inquiry Rate Limiting in Postgres

Date: 2026-11-18

## Status

Accepted

## Context

Customers can submit **Inquiries** (**Consultation Inquiries** and **Store Pickups**) without restriction, which risks spamming `quote_tickets` and exhausting **Stock Holds** (`is_reservation = true`). We need a 3-requests-per-hour limit that cannot be bypassed from the browser while still allowing **Staff Workspace** and **Admin Console** operators to log walk-in Inquiries freely.

## Decision

Enforce **Inquiry Rate Limit** server-side in Supabase Postgres (via RPC/trigger on `quote_tickets`):

- **Combined limit**: Maximum 3 total **Inquiries** (`Consultation Inquiry` + `Store Pickup`, including cancelled tickets) per rolling 60-minute window.
- **Identity key**: Client IP extracted from PostgREST `request.headers` (`cf-connecting-ip` / `x-forwarded-for`), falling back to authenticated `user_id` or a client-generated session token.
- **Role exemption**: Authenticated `staff` and `admin` roles are exempt from the rate limit.
- **User feedback**: When the limit is reached, Postgres returns a structured error with the remaining wait time, and the frontend displays a clear message (e.g., `"Limit of 3 inquiries per hour reached. Try again in X minutes."`).

## Alternatives Considered

- **Supabase Edge Function proxy**: Provides verified client IP natively, but requires migrating all client-side `quote_tickets` inserts to an Edge Function endpoint.
- **Frontend-only (`localStorage`)**: Trivial to implement, but easily bypassed by clearing storage or calling the Supabase API directly.
- **Per-email/phone keying**: Effective against repeat submissions with the same contact info, but easily bypassed by guests entering different contact details.

## Consequences

- Rate limiting is enforced uniformly at the database layer without introducing an Edge Function hop.
- Shared-IP environments (e.g., corporate or mobile carrier NAT) share the 3-per-hour bucket when no `user_id` or distinct session fallback is used.
- Requires applying a live Supabase migration via `supabase_mcp` (`apply_migration`) and keeping `docs/database/migrations/` synchronized.
