# 0004. Staged Inventory Save Changes with Confirmation and Unified Admin Toasts

Status: accepted

## Context

Previously, `ProductsScreen` and `DashboardScreen` persisted `+`/`-` stock stepper clicks automatically after a 400ms debounce (`createDebouncedStockQueue`) with no confirmation, while `+`/`-` sale clicks triggered an immediate per-click confirmation modal. Meanwhile, each admin screen (`ProductsScreen`, `DashboardScreen`, `InquiriesScreen`, `WarrantyClaimsScreen`) rendered its own ad-hoc toast component.

## Decision

1. **Staged Inventory Adjustments + Explicit Save Changes**: Clicking `+`/`-` on Stock or Sales in `ProductsScreen` and `DashboardScreen` stages deltas locally (`pendingAdjustments`) without immediate database writes. Staging a `+1` Sale previews `-1` Stock and `+1` Sales together (and blocks `+1` Sale when staged Stock is `0`). A sticky bar (`Save Changes (N)` and `Discard`) appears when edits are pending; clicking `Save Changes` opens a confirmation modal summarizing all affected products before committing to Supabase.
2. **Inspector Confirmation**: Saving Stock or Sales edits inside `ProductInspectorDrawer` also requires confirmation before persisting.
3. **Unified Toast System**: All admin screens share a single `ToastProvider` / `useToast` hook (`frontend/src/components/ui/toast.jsx`) rendering bottom-right stacked semantic toasts (`success`, `error`, `info`, `warning`).

## Consequences

- Staff can batch multiple stock/sale stepper adjustments and review a summary before committing, eliminating accidental silent mutations.
- Future admin screens should use `useToast()` instead of introducing local toast state.
