# 0008. Two-Door Hybrid Product Matcher & Inferred Spec Matching

Date: 2026-11-26

## Status

Accepted

## Context

Panelist feedback on the **Product Matcher** (`/match`, Linear **RAM-10**, **RAM-11**, **RAM-12**) highlighted three structural issues:
1. The flow forces a 4-step wizard with 4 fixed location presets that silently overwrite wattage and hide the scoring math.
2. Slider-only controls are slow on mobile and for contractors who already know their target wattage, quantity, and budget.
3. Missing real-world criteria (**Form Factor**: All-in-One vs. Split-Type; **Mounting / Pole**: With Pole vs. Wall / Gate / Existing Post; **Quantity / Bulk Order**) are not represented in `public.products` as dedicated columns, and 28 of 51 solar products (mostly floodlights) have `NULL` pricing in Supabase.

## Decision

1. **Two-Door Hybrid Architecture**: Support both **Guided Assessment** (plain-language site conditions translated into specs) and **Direct Spec Entry** (a single form with dropdowns for location, light style, and mounting, plus direct numeric inputs with quick preset chips for wattage, quantity, and budget, revealed via a Submit button that transitions to the results view with an Edit button) on `/match`, sharing one criteria state and scoring engine (`multiCriteriaMatcher.js`). Update `MultiCriteriaMatchModal.jsx` to use the same dropdown form and Submit flow.
2. **Zero-Migration Client-Side Spec Inference**: Infer **Form Factor** (`integrated` vs. `split`) and **Mounting** (`pole` vs. `wall`) in `multiCriteriaMatcher.js` from existing `public.products` fields (`type`, `name`, `solar_panel`) rather than altering the live Supabase schema.
3. **Transparent Scoring, Strict Positive Criteria & Null-Price Segregation**:
   - Expose `matchPercentage` on every result card and surface the per-factor **Match Breakdown** (location, light style and mounting, wattage, and budget) via a compact on-demand popover/tooltip anchored to the match badge across all result cards (including **Price upon Inquiry** cards) and the quick-match modal, keeping cards uncluttered while preserving scoring transparency on hover, focus, or tap. Unset (`Any`) criteria display a neutral `Any` label rather than `100%`, and unlisted-price items display `Price upon inquiry` for Budget.
   - Treat `0` (and negative values) for numeric **Budget** and **Brightness (watts)** as invalid at input/submit time with inline guidance to enter a positive value (`>= 1`) or leave blank for `Any`; defensively score numeric `budget <= 0` and `powerNeeds <= 0` as `0%` in `multiCriteriaMatcher.js` and trigger **Below-Minimum Budget** when `effectiveUnitBudget <= 0`.
   - Support **Per-Unit** (default) and **Total Project** budget modes with `quantity >= 1`.
   - When `effectiveUnitBudget < lowestUnitPrice` (including `<= 0`), display a **Below-Minimum Budget** banner and rank closest entry-level alternatives by price proximity.
   - Rank priced matches first and surface matching null-price floodlights in a separate **"Price upon Inquiry"** section rather than mixing them into priced rankings.

## Alternatives Considered

- **Single-Screen Workbench Only**: Faster for contractors, but increases attribute paralysis for first-time homeowners who do not know wattage or form factor trade-offs.
- **Keep 4-Step Wizard Only**: Retains guided UX, but fails RAM-12's fast-entry requirement for repeat buyers and contractors.
- **Supabase Schema Migration for `form_factor` / `mounting_type`**: Cleaner long-term data model, but requires live migration + backfilling 51+ catalog rows when existing `type`/`name` strings already encode the distinction reliably.

## Consequences

- Both homeowners and contractors share a single deterministic scoring engine without duplicating matching logic.
- New catalog products added in **Admin Console** or **Staff Workspace** must follow consistent naming conventions (`Integrated`, `Floodlight`, `Road Light`) for accurate inference until optional explicit columns are introduced later.
- Priced products are never unfairly outranked or diluted by `NULL`-price floodlights, while floodlight options remain discoverable in the **Price upon Inquiry** group.
