# 0006. One Lifetime Warranty Claim per Purchased Product

Status: accepted

## Context

Customers could previously click `File Claim` multiple times on the same registered purchase (`customer_purchases.id`), and neither `submit_warranty_claim` RPC nor `warranty_claims` enforced a per-purchase limit.

## Decision

We enforce a **strict one-claim-per-purchase** invariant across all layers:
1. **Customer Portal UI (`EquipmentCard`, `CustomerPortalPage`)**: Once any claim exists in `linkedClaims` for a `purchase_id` (regardless of status: active, resolved, declined, or archived), `File Claim` is hidden/blocked and the customer is directed to `Track Status` / `Run Troubleshooting Guide` (or `View Claim` if closed).
2. **Client Service (`submitWarrantyClaim`)**: If `submit_warranty_claim` RPC returns `{ success: false, error }` (e.g., duplicate claim), throw that error immediately instead of falling through to a direct `.insert()`. Also guard direct-insert fallback against existing claims for `purchaseId`.
3. **Live Supabase (`apply_migration`)**: Update `submit_warranty_claim` RPC and add a `BEFORE INSERT` trigger on `public.warranty_claims` to reject new duplicate claims for the same `purchase_id` while leaving existing historical rows intact.

## Consequences

- Customers cannot submit duplicate warranty claims for the same purchased unit, even via concurrent requests or direct API calls.
- Historical test/legacy duplicate rows remain intact without requiring destructive data cleanup.
