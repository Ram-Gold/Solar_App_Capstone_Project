# ADR 0002: Unified Stock Model and Inventory Operations Seam

## Status
Accepted

## Context
Previously, **Stock Holds** incremented `reserved_quantity` (`reserved_quiapo` / `reserved_cavite`) without deducting from `stock_quantity` (`stock_quiapo` / `stock_cavite`), so `Available = stock_quantity - reserved_quantity` differed from `Physical = stock_quantity`. Meanwhile, inline stock steppers displayed `Available` while mutating `stock_quantity`, and stock mutations were duplicated across `DashboardScreen`, `ProductsScreen`, `RecordSaleModal`, and `customerService` while emitting an unscoped `jds:ops-updated` event that triggered 10 redundant queries per edit.

## Decision
1. **Unified Stock Model (`Physical Stock === Available Stock === stock_quantity`)**:
   - `reserve_product_stock` deducts `p_quantity` directly from `stock_quantity` and the target branch (`stock_quiapo` / `stock_cavite`) while incrementing `reserved_quantity` / `reserved_*` as hold-audit counters.
   - `release_product_reservation` adds the released quantity back to `stock_quantity` and the target branch.
   - `fulfill_reservation_sale` recognizes that `is_reservation = true` tickets already had their held quantity deducted from `stock_quantity` and only deducts any excess (`GREATEST(0, sold - ticket_qty)`).
2. **Inventory Operations Seam (`frontend/src/lib/inventoryOperations.js`)**:
   - Centralizes `setStockLevel`, `adjustStock`, `recordSale`, `bulkArchive`, `bulkDeleteSafe`, branch-sum invariant (`stock_quantity === stock_quiapo + stock_cavite`), and `createDebouncedStockQueue` behind an injected storage adapter.
3. **Scoped Refresh (`notifyOpsUpdated(topic)`)**:
   - Stock mutations emit `'inventory'`, which `OperationsSidebar` ignores so stock edits trigger 0 sidebar queries.

## Consequences
- `reserved_quantity`, `reserved_quiapo`, and `reserved_cavite` remain in `public.products` as audit counters for active holds and must not be subtracted from `stock_quantity` in UI or helpers.
- Inline `+` / `-` stock steppers apply optimistic updates and batch writes over a ~400ms debounce window with flush-on-unmount and baseline rollback on failure.
