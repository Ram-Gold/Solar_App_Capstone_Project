# Light Warm-Neutral Chrome & Color Hierarchy Research

Research supporting the unified light-mode color redesign across the JD Solar `Admin Console`, `Staff Workspace`, `Navbar`, and `Customer Portal`.

---

## 1. Primary-Source UX & Accessibility Findings

### 1.1 Material Design 3 (MD3): Light Tonal Surface Hierarchy
- **Tonal Surface Separation**: MD3 separates navigation containers (`surface-container`) from the main content canvas (`surface`) via subtle tonal shifts rather than heavy shadows or dark-on-light contrast ([MD3 Navigation Rail & Color Roles](https://m3.material.io/components/navigation-rail/specs)).
- **Container & Active Indicator Roles**: Unselected items map to `on-surface-variant` (never faded opacity), while active navigation pills use a distinct light container pill paired with high-contrast `on-secondary-container` / `on-surface` ink so selected items pop without shouting.

### 1.2 Refactoring UI: Warm Neutrals & 3-Tier Light Elevation
- **Reverse the Current Surface Inversion**: In a light-mode workspace, the navigation chrome (top bar + left sidebar) should sit at a slightly deeper warm neutral lightness (~93–95% lightness), the main canvas lighter (~98% lightness), and cards/tables crisp `#FFFFFF` (100% lightness) — creating effortless visual hierarchy without dark sidebars or heavy borders.
- **Unified Temperature & Solid Muted Text**: Avoid low-opacity black text on beige backgrounds (which looks muddy). Hand-pick solid warm umber/taupe inks matched to the surface undertone.

### 1.3 WCAG 2.2 AA Contrast Safeguards on Warm Beige & Amber
- **Normal Text (`>= 4.5:1`)**: On a warm beige/linen navigation bar (`#EFE9DF`), faded grays fail AA. Deep charcoal (`#211B11`, ~13:1) for primary labels and warm umber (`#5E5344`, ~5.6:1) for inactive labels ensure crisp legibility.
- **Accessible Amber CTAs**: White text (`#FFFFFF`) on bright yellow-gold (`#F59E0B` / `#FDB813`) fails WCAG AA (~2.1:1). Darkening primary interactive buttons to **Rich Solar Amber (`#B45309`)** yields **~5.0:1** with white text, while reserving `#FDB813` solely for warm accents/badges paired with dark espresso ink (`#271900`, > 9:1).

---

## 2. Why the Current UI Feels Inconsistent
1. **Inverted & Scrambled Surface Order**: `Navbar` is `#fff8f3`, `OperationsSidebar` is `#ffffff`, canvas is `#fff8f3`, KPI cards are `#f9ecdc`, and `RightSummaryRail` is `#fff2e1` — the sidebar is lighter than the KPI cards, and topbar/sidebar don't form a unified frame.
2. **Competing Accents**: Olive-brown (`#7c5800`), bright gold (`#fdb813`), sky blue (`#006399`), emerald (`#166534`), and crimson (`#ba1a1a`) appear simultaneously on non-status elements (e.g., 4 differently colored KPI icon boxes).
3. **Solution**: Match **Top Navbar + Left Sidebar** to a cohesive light warm-linen chrome (`#EFE9DF` or `#EBE5DA` / `#F4EFE6`), lighten the canvas (`#FAF8F4`), make all cards/tables `#FFFFFF`, and restrict green/amber/red strictly to status pills and critical alerts.
