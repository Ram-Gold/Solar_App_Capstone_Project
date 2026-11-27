# RAM-10, RAM-11, and RAM-12: Solar Matcher UI & Implementation Research

**Branch:** `feat/ram-10-11-12-solar-matcher`  
**Related Linear Issues:** [RAM-10](https://linear.app/ram-guinto/issue/RAM-10/feat-product-matcher-replace-pre-suggested-options-with-true-user), [RAM-11](https://linear.app/ram-guinto/issue/RAM-11/feat-product-matcher-expand-user-inputs-form-factor-mountingpole), [RAM-12](https://linear.app/ram-guinto/issue/RAM-12/feat-product-matcher-replace-sliders-with-direct-numerictext-inputs)  
**Prior Repo Research:** [product-matcher-ux-and-factors.md](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/docs/research/product-matcher-ux-and-factors.md), [mock.html](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/.scratch/product-matcher-redesign/mock.html)

---

## 1. Executive Summary

The current Product Matcher ([MatchWizardPage.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/pages/MatchWizardPage.jsx) and [PrototypeGuidedFlow.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/matcher/PrototypeGuidedFlow.jsx)) forces users through a rigid 4-step wizard with 4 fixed location presets, slider-only inputs, and opaque results that hide the underlying scoring math.

To resolve **RAM-10**, **RAM-11**, and **RAM-12**, we recommend:
1. **A Hybrid "Two-Door" + Live Workbench UI** (guided plain-English mode for homeowners/first-time buyers + single-screen direct spec form for contractors/repeat buyers), backed by a single shared criteria state and scoring engine.
2. **Direct Numeric Inputs + Quick-Tap Preset Pills (RAM-12)** replacing all slider-only controls (`inputmode="numeric"` with `tabular-nums`, zero slider-dragging required).
3. **Expanded Real-World Decision Inputs (RAM-11)**: Form Factor (`All-in-One` vs. `Split-Type` vs. `Any`), Mounting/Pole (`With Pole` vs. `Wall / Gate / Existing Post` vs. `Any`), Target Wattage, and Quantity / Bulk Order with total investment range calculation.
4. **Transparent Scoring & "Why This Matched" Breakdown (RAM-10)**: Expose `matchPercentage`, per-factor score bars (`Application`, `Form Factor & Mounting`, `Wattage Fit`, `Budget Fit`), plain-English computation basis, and explicit below-minimum-budget fallback banners.

---

## 2. Linear Requirements Breakdown

| Issue | Priority | Panelist Feedback / Problem | Required Action Items |
| :--- | :--- | :--- | :--- |
| **RAM-10** | Urgent | Current matcher only offers 4 fixed location presets and outputs pre-selected "suggested" units without explaining why Main Road = 500W, Highway = 300W, Subdivision = 150W. | 1. Replace static location-to-unit presets with dynamic filtering and weighted scoring.<br>2. Add a **"Why this matched"** breakdown showing how user inputs (wattage, budget, environment, form factor) scored against specs.<br>3. Handle `budget < minPrice` with clear feedback and closest alternatives. |
| **RAM-11** | Urgent | Missing real-world decision criteria: integrated vs. split unit, with/without pole, target wattage, and bulk quantities for contractors. | 1. **Form Factor / Type**: All-in-one (integrated) vs. Split-type (separate panel + light).<br>2. **Mounting / Pole**: With pole vs. Without pole / Wall-mounted.<br>3. **Target Wattage / Brightness**: e.g., 150W–200W residential vs. 300W–500W street/highway.<br>4. **Quantity / Bulk Order**: Numeric quantity + estimated total range (`min * qty` – `max * qty`). |
| **RAM-12** | High | Dragging sliders for budget and values is slow and tedious on mobile and for contractors (*"kailangan pang islide-islide... ang tagal yan"*). | 1. Convert budget, wattage, and quantity sliders into direct numeric inputs (`inputmode="numeric"`).<br>2. Pair inputs with quick-tap preset pills (budget brackets, common wattages, unit counts). |

---

## 3. Current Codebase Audit (Primary Sources)

### 3.1 Routing & Entrypoints
- [App.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/App.jsx#L29-L74): Mounts `<MatchWizardPage />` at `/match` and hides `<Footer />` on `/match`.
- [Navbar.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/Navbar.jsx#L12-L24), [LandingPage.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/pages/LandingPage.jsx#L184), and [BrowsePage.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/pages/BrowsePage.jsx#L212-L218) link to `/match`.
- `BrowsePage.jsx` still mounts an untriggered `<MultiCriteriaMatchModal />` ([BrowsePage.jsx#L577-L581](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/pages/BrowsePage.jsx#L577-L581)).
- [solarBotEngine.js](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/lib/solarBotEngine.js#L280-L354) routes product-matching queries to `/match` and parses incoming Product Matcher Assessment dossiers.

### 3.2 UI & State Gaps
- **Overwriting User Wattage ([PrototypeGuidedFlow.jsx#L204-L208](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/matcher/PrototypeGuidedFlow.jsx#L204-L208))**: Selecting a Step 1 `LOCATIONS` card (`road`: 500W, `street`: 300W, `home`: 150W, `commercial`: 400W) unconditionally overwrites `powerNeeds`. `LOCATIONS.bracket` is decorative and never passed to `matchSolarProducts`.
- **Unused Presets & Slider-Only Controls ([PrototypeGuidedFlow.jsx#L52-L59](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/matcher/PrototypeGuidedFlow.jsx#L52-L59))**: `POWER_PRESETS` and `BUDGET_PRESETS` are exported in `PrototypeGuidedFlow.jsx` but never rendered; Steps 2 and 3 only render `<input type="range">`.
- **Hidden Scoring Breakdown ([PrototypeGuidedFlow.jsx#L474-L688](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/matcher/PrototypeGuidedFlow.jsx#L474-L688))**: Although `multiCriteriaMatcher.js` returns `matchPercentage`, `breakdown` (`budgetScore`, `locationScore`, `powerScore`), and `compromise`, `PrototypeGuidedFlow.jsx` hides `matchPercentage` and `breakdown` completely (whereas the older [MultiCriteriaMatchModal.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/MultiCriteriaMatchModal.jsx) actually rendered them).
- **Unused Assistant Handoff ([MatchWizardPage.jsx#L43-L64](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/pages/MatchWizardPage.jsx#L43-L64))**: `onConsultAssistant` is passed to `PrototypeGuidedFlow` but currently unused.

### 3.3 Engine & Data Gaps ([multiCriteriaMatcher.js](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/lib/multiCriteriaMatcher.js))
- **Weights & Threshold**: `DEFAULT_CRITERIA_WEIGHTS = { budget: 0.35, location: 0.35, power: 0.30 }`, `DEFAULT_MATCH_THRESHOLD = 0.70`.
- **Missing Criteria**: `evaluateProductMatch()` does not accept or score `formFactor` (`integrated` vs. `split`), `mounting` (`pole` vs. `wall`), or `quantity` (bulk total range).
- **Null-Price Floodlights**: `scoreBudgetFit()` assigns a flat `0.70` neutral score when `min_price`/`max_price` are `NULL` (affecting 28 of 51 solar products, mostly floodlights, as documented in [product-matcher-ux-and-factors.md](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/docs/research/product-matcher-ux-and-factors.md#L67-L79)).
- **Existing Tests**: [multiCriteriaMatcher.test.js](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/lib/__tests__/multiCriteriaMatcher.test.js) has 438 lines of Vitest unit tests for the current engine, which should be extended for form factor, mounting, quantity, and below-minimum-budget handling.

---

## 4. UI Inspiration & Design Direction (via `inspo` MCP)

We queried the `inspo` archive for light-mode, technical, configurator/calculator, and pricing-comparison interfaces (`recommend`, `search_screens`, `find_components`, `get_screen`).

### 4.1 Category Consensus & Visual Tokens
Across 24 technical light-mode reference sites analyzed by `inspo`:
- **Paper Band**: `light` (63% consensus) — clean off-white/warm-stone canvas (`#f8f7f4` / `#ffffff`) with subtle card borders (`#e2dfd7`) instead of heavy drop shadows or dark-mode neon.
- **Typography**: `grotesk-sans` (71% consensus, e.g., `Inter`, `DIN Next Pro`, `GT Pressura`) paired with **`tabular-nums`** for prices, wattages, lumen estimates, and match percentages.
- **Scale & Tone**: Crisp 3:1 display-to-body ratio, sentence-case headings, zero emojis, and industrial consultative clarity (matching `.agents/AGENTS.md`).

### 4.2 Reference Patterns to Adopt

| `inspo` Reference | Macrostructure / Pattern | What We Adopt for JD Solar Matcher |
| :--- | :--- | :--- |
| **`cleanshot-com--pricing`** | **Peer Split Cards** (`feature-stack`) | **Two-Door Entry ("Help Me Choose" vs. "I Know My Specs")**: Two equal-weight peer cards on a light neutral canvas, differentiated by a crisp accent border on selection and clean checkmark/bullet capability lists. |
| **`amie-so--pricing`** | **Clean Toggle + Scannable Spec Rows** | **Per-Unit vs. Total Project Budget Toggle** and **Direct Spec Controls**: Compact pill switches and high-contrast numeric figures (`tabular-nums`) with minimal chrome. |
| **`calendly-com--pricing`** | **Comparison Grid + Highlighted Top Pick** | **Results Comparison Cards**: Equal-width result cards with a single top-edge badge (`Best Overall Match` / `Closest Alternative`) and scannable spec rows—never hiding key specs behind accordions. |
| **`elastic-co`** | **Modular Bento Spec Cards** (`bento-grid`) | **"Why This Matched" Breakdown**: Color-coded compact metric bars/pills (`Application`, `Form Factor`, `Wattage`, `Budget`) and oversized numeric match score (`92% Match`) acting as a visual anchor. |
| **`hardwareoperations-com`** | **Warm Industrial Hardware Palette** | **Surface & Accent Discipline**: Warm stone/off-white ground (`#f8f7f4`), crisp `#18181b` ink, restrained amber/terracotta technical accent (`#d97706` / `#92400e`), and mono/tabular technical labels (`240W · 3,600 lm · IP65`). |

---

## 5. Recommended Implementation Architecture

### 5.1 UI Layout: Hybrid "Two-Door" + Live Workbench (`/match`)

1. **Compact Header + Mode Switcher**:
   - Replaces the tall full-screen wizard lock-in. Users can switch anytime between:
     - **Guided Mode ("Help Me Choose")**: 4–5 plain-English visual choice steps (Site/Height -> Sun Exposure/Form Factor -> Mounting/Pole -> Quantity & Budget) that *translate* answers into specs with a visible rationale (e.g., *"Shaded eaves -> Split-Type recommended so the panel sits in direct sun"*).
     - **Direct Spec Mode ("I Know My Specs")**: Single-screen contractor workbench with all controls visible at once and live-updating results.
2. **RAM-12 Direct Numeric Inputs + Quick-Tap Pills**:
   - Replace `<input type="range">` in Wattage, Budget, and Quantity with:
     - `<input type="number" inputmode="numeric">` with clear unit prefixes/suffixes (`PHP`, `W`, `units`).
     - One-tap preset pills right below each input (e.g., Wattage: `150W`, `200W`, `300W`, `500W`, `Any`; Quantity: `1`, `5`, `10`, `20`; Budget: `Under PHP 2,000`, `PHP 2,000–3,500`, `PHP 3,500+`, `Any`).
   - Track a `wattageManuallyEdited` flag so changing Environment in Guided Mode does **not** clobber a manually entered wattage.
3. **RAM-11 Expanded Inputs**:
   - **Form Factor**: `Any` | `All-in-One (Integrated)` | `Split-Type (Separate Panel)` — with plain-English helper note on sun/shade trade-offs.
   - **Mounting / Pole**: `Any` | `Wall / Gate / Existing Post` | `With Pole / New Pole Package`.
   - **Quantity**: Numeric input (default `1`) that multiplies `min_price` and `max_price` to display **Estimated Project Total** alongside **Unit Price**.
4. **RAM-10 Transparent Results & Fallback Handling**:
   - **Match Header**: Shows active criteria summary chips + inline **"Adjust Specs"** drawer/bar so users can tweak wattage, form factor, or budget without restarting.
   - **Below-Minimum-Budget Banner**: If `unitBudget < catalogBounds.minPrice` (or `totalBudget < catalogBounds.minPrice * quantity`), display a clear alert banner showing the gap (e.g., *"Your PHP 500 budget is below our entry-level solar unit at PHP 1,000. Showing closest entry-level alternatives."*) and rank by price proximity.
   - **Per-Card "Why This Matched" Breakdown**:
     - Overall `matchPercentage` badge (e.g., `91% Match`).
     - 4 compact score bars/pills from `breakdown`: `Environment`, `Form Factor & Mount`, `Wattage Fit`, `Budget Fit` — with short 1-line explanations (e.g., *"300W matches your 300W target"*, *"Split-Type fits shaded mounting"*).
     - Primary CTA: **`Inquire this`** (plus **`Consult Assistant`** passing the full criteria + quantity + form factor dossier to `/chat`).

### 5.2 Engine & Data Mechanics ([multiCriteriaMatcher.js](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/lib/multiCriteriaMatcher.js))

1. **Form Factor & Mounting Inference (Zero DB Migration Required)**:
   - Add `inferFormFactor(product)` inspecting `product.type`, `product.name`, and `product.solar_panel`:
     - `'integrated'` for `"Integrated Solar Street Light"`, `"All-in-One"`, etc.
     - `'split'` for `"Solar Floodlight"`, `"Flood Light"`, `"Road Light"`, or split-panel SKUs.
   - Add `inferMountingOptions(product)`:
     - Floodlights -> `['wall', 'pole']`; Integrated/Road streetlights -> `['pole']`.
2. **Updated Weighted Scoring**:
   - Rebalance weights when optional filters are active (e.g., `budget: 0.30, location: 0.25, power: 0.25, formFactor: 0.12, mounting: 0.08`, normalizing cleanly if `formFactor === 'any'` or `mounting === 'any'`).
   - Return structured `breakdown` (`locationScore`, `formFactorScore`, `mountingScore`, `powerScore`, `budgetScore`) + `reasons[]` array for the UI's "Why this matched" section.
3. **Budget Mode & Quantity**:
   - Accept `budgetMode: 'unit' | 'total'` and `quantity >= 1`. Normalize `effectiveUnitBudget = budgetMode === 'total' ? budget / quantity : budget` before calling `scoreBudgetFit()`, and compute `totalPriceRange = { min: min * qty, max: max * qty }`.
4. **Cleanup**:
   - Wire or deprecate the unused `<MultiCriteriaMatchModal />` in `BrowsePage.jsx` so there are no diverging matcher implementations.

---

## 6. Verification Plan

1. **Unit Tests (`Vitest`)**: Extend [multiCriteriaMatcher.test.js](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/lib/__tests__/multiCriteriaMatcher.test.js) to cover `inferFormFactor`, `inferMountingOptions`, `budgetMode: 'total'` with `quantity > 1`, `belowMinimumBudget` flag + sorting, and `breakdown` / `reasons` output.
2. **Component & Flow Tests**: Test Guided Mode -> Direct Form criteria sync, `inputmode="numeric"` inputs + preset pills (no sliders), manual wattage preservation, and "Why this matched" rendering.
3. **Browser & Responsive Check**: Verify 375px mobile (numeric keypad, no horizontal overflow, readable comparison cards) and 1280px desktop layout, plus `AGENTS.md` compliance (zero emojis, `"Inquire this"` CTA).
