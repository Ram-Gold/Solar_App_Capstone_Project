# Branch-Scoped Stock Holds & Inquiry Fulfillment Contract

---
status: accepted
---

`quote_tickets` stores both Consultation Inquiries (`JDS-INQ-*`) and Store Pickups (`JDS-RES-*`), which caused branch-stock drift when reservations were activated before branch updates, completed without releasing holds, or fulfilled via walk-in sales without passing branch context.

We decided that **Stock Holds** are strictly branch-scoped (`reserved_quiapo` / `reserved_cavite`) and auto-release whenever an Inquiry becomes `Completed`, `Cancelled`, or is deleted/purged, while physical stock deduction and warranty QR issuance happen exclusively through `Register Sale & QR` (`fulfill_reservation_sale` with explicit `p_branch` and `p_quantity`).

## Considered Options
- **Deduct physical stock automatically when marking a Store Pickup `Completed` in `InquiriesScreen`**: Rejected because counter sales require customer binding, serial assignment, and QR warranty pass generation, and staff may mark a ticket `Completed` after handling a walk-in or settled case out-of-band.
- **Keep global `stock_quantity - reserved_quantity` checks on holds**: Rejected because reserving a unit in Cavite when Quiapo holds the only physical stock allows overselling Cavite inventory.

## Consequences
- `reserve_product_stock` and `fulfill_reservation_sale` in Supabase validate and mutate branch-specific columns (`stock_quiapo`/`reserved_quiapo` vs. `stock_cavite`/`reserved_cavite`).
- `InquiriesScreen` persists `store_branch` before reserving, syncs hold quantity changes, auto-releases holds on `Completed` / `Cancelled` / `Delete` / `Purge`, and provides a one-click `Fulfill via Register Sale & QR` shortcut.
- `RightSummaryRail` and `InquiriesScreen` compute **Inquiry Fulfillment** as `Completed / (Pending + Confirmed + Completed)` and **Store Pickups** as active (`Pending` or `Confirmed`) pickups only, refreshed live via `jds:ops-updated`.
