# Product Matcher UX, Matching Factors, and Quiz-vs-Form Research

Research and codebase/database audit conducted to inform the redesign of JD Solar's Product Matcher ([MatchWizardPage.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/pages/MatchWizardPage.jsx), [PrototypeGuidedFlow.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/matcher/PrototypeGuidedFlow.jsx), [MultiCriteriaMatchModal.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/MultiCriteriaMatchModal.jsx), and [multiCriteriaMatcher.js](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/lib/multiCriteriaMatcher.js)) in response to Linear issues **RAM-10**, **RAM-11**, and **RAM-12**.

---

## 1. Executive Summary: Quiz vs. Form — Which Is Easier (or Both)?

**Recommendation: Implement a Hybrid "Two-Door" Architecture (Guided Quiz + Direct Spec Form) sharing a single scoring engine.**

- **Why a Quiz wins for First-Time Customers**: Customers who do not know what solar light or panel wattage they need suffer from *attribute paralysis* when shown technical specs (wattage, lumens, beaming angle). UX research from Baymard Institute and e-commerce guided-selling benchmarks shows that a **need-driven quiz** (translating plain-language site conditions into technical specs) reduces cognitive load and prevents "0 results" dead ends ([Baymard Institute — Filtering & Product Lists](https://baymard.com/blog/ecommerce-product-lists); [Total Retail — Guided Selling vs. Faceted Search](https://www.mytotalretail.com/article/guided-selling-vs-faceted-search-which-is-right-for-your-customers/)).
- **Why a Direct Form wins for Contractors & Repeat Buyers**: Panelist feedback in **RAM-12** explicitly criticized slow step-by-step dragging (*"kailangan pang islide-islide... ang tagal yan"*). Contractors and buyers who already know their target wattage, form factor, pole requirement, and bulk quantity want a **single-screen direct input form** with `inputmode="numeric"` fields and quick-tap preset chips.
- **How "Both" works cleanly without duplicating logic**:
  1. **Entry Mode Toggle** on `/match`:
     - **"Help Me Choose" (Guided Quiz — Default for undecided buyers)**: 4–5 plain-language visual questions (Environment/Use Case, Mounting Height & Pole, Sunlight/Placement for Integrated vs. Split, Quantity, Budget).
     - **"I Know My Specs" (Direct Form — Fast Track for contractors)**: Single-screen compact form with direct numeric inputs + preset pills for Wattage, Form Factor, Pole/Mounting, Quantity, and Budget.
  2. **Shared Criteria State**: The Guided Quiz simply *computes and pre-fills* the same criteria object used by the Direct Form (with a visible explanation of how each answer mapped to a spec), and the Results view exposes an inline **"Adjust Specs"** bar so quiz-takers can fine-tune numbers without restarting.

---

## 2. Primary-Source UX & Solar Sizing Findings

### 2.1 Guided Selling Quiz vs. Filter Form (Baymard Institute & Guided-Selling Research)
- **Feature-Driven vs. Need-Driven Mental Models**: Traditional filter forms assume an *attribute-first* mental model (the buyer already knows technical specs like wattage or form factor). Guided selling quizzes use a *need-driven* model, acting like a consultative salesperson that translates real-world problems (*"Where are you installing this?"*, *"Is the installation spot shaded?"*) into technical parameters ([Total Retail](https://www.mytotalretail.com/article/guided-selling-vs-faceted-search-which-is-right-for-your-customers/); [Baymard Institute](https://baymard.com/blog/ecommerce-product-lists)).
- **Forward Funnel vs. Inverse Funnel**: Filtering forces an *inverse funnel* (start with 100+ SKUs, manually narrow down, risk 0-result dead ends). A quiz builds a *forward funnel* (start with intent, route directly to 2–3 ranked matches with fallback alternatives).
- **Visual Cues Over Text Abstractions**: Baymard highlights that shoppers struggle with abstract text filters; pairing options with clear visual/contextual cues (e.g., pole height ranges, integrated vs. split-panel diagrams, wall-mount vs. pole-mount icons) improves comprehension ([Baymard Institute](https://baymard.com/blog/ecommerce-product-lists)).
- **Direct Numeric Inputs Over Sliders (RAM-12)**: Sliders are imprecise on mobile touchscreens and tedious for large ranges (e.g., PHP 1,000 to PHP 50,000+ or 1 to 100 units). Replacing slider-only controls with `<input type="number" inputmode="numeric">` paired with quick-tap preset pills gives both precision and one-tap speed.

### 2.2 Solar Lighting Engineering Criteria (Justifying Recommendations Transparently — RAM-10 & RAM-11)
To address panelist criticism in **RAM-10** (*"why Main Road = 500W, Highway = 300W, Subdivision = 150W?"*), recommendations should be grounded in standard photometric & physical criteria rather than arbitrary static numbers:

| Site / Application | Typical Mounting Height | Recommended Spacing | Target Illumination | Recommended Architectural Fit |
| :--- | :--- | :--- | :--- | :--- |
| **Walkway / Gate / Yard** | 3m – 4m (Wall or short pole) | 12m – 20m | Lower lux (5–10 lux); ~1,500–3,500 lm | **All-in-One (Integrated)** streetlight or **Solar Floodlight** (easy wall/gate mount) |
| **Residential Street / Subdivision** | 4m – 6m pole | 20m – 30m (3H–4H rule) | Moderate lux (10–12 lux); ~3,500–5,500 lm | **All-in-One** (quick install, clean look) or **Split-Type** if shaded by trees/eaves |
| **Main Road / Urban Street / Parking** | 6m – 9m pole | 30m – 40m | High lux (15–20+ lux); ~7,000–11,000+ lm | **Split-Type** or high-capacity **Road/Street Light** with adjustable panel tilt |
| **Highway / Wide Commercial Yard** | 9m – 12m+ mast/pole | 40m – 50m | Maximum lux (30–40 lux); ~14,000–22,000+ lm | **Split-Type** (larger external panel & battery box for all-night high output) or high-watt **Floodlight** |

*Primary solar sizing references: [Clodesun Solar Street Light Spacing & Height Guide](https://www.clodesun.com/), [LightingCalculate Road Lux Standards](https://www.lightingcalculate.com/), [Sunlurio All-In-One vs. Split Solar Street Light Comparison](https://www.sunlurio.com/), [Sigo Streetlight Technical Guide](https://www.sigostreetlight.com/).*

**Key Physical Decision Factors Missing Today (RAM-11):**
1. **Form Factor — All-in-One (Integrated) vs. Split-Type**:
   - *All-in-One*: Panel, battery, and LED in one housing. Fast installation (<30 min), zero external wiring, ideal for unobstructed sun and low-to-medium wattage. Limitation: panel tilt is fixed to the lamp head.
   - *Split-Type*: Separate solar panel on an adjustable bracket + cable to lamp/floodlight. Essential when the light is **under a roof/shade** (panel goes on the roof in full sun, lamp goes under the eaves) or for **high-wattage / multi-day autonomy** projects.
2. **Mounting / Pole Requirement**:
   - *Wall / Existing Post / Gate Mount* (no pole needed — common for floodlights and residential gates).
   - *With Pole / New Pole Package* (needs pole-compatible bracket or pole add-on quote).
3. **Quantity / Bulk Order Scale**:
   - Single unit (homeowner) vs. multi-unit / contractor project (e.g., 10–100+ posts), calculating estimated total investment range (`min_price * qty` to `max_price * qty`) rather than only per-unit price.

---

## 3. Current Codebase & Live Database Audit

### 3.1 What the Current Matcher Does (and Where It Breaks Down)
- **Rigid 4-Preset Entry ([PrototypeGuidedFlow.jsx:17-50](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/matcher/PrototypeGuidedFlow.jsx#L17-L50))**:
  - Step 1 forces selection among 4 fixed cards (`road` = 500W, `street` = 300W, `home` = 150W, `commercial` = 400W) and immediately overwrites `powerNeeds` (`lines 204-208`).
  - `LOCATIONS.bracket` (`Roadway Arm`, `Pole Mount`, `Wall / Gate`, `High Mast`) is decorative text only — it is never passed to `matchSolarProducts`.
- **Slider-Only Controls ([PrototypeGuidedFlow.jsx:299-312, 386-400](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/matcher/PrototypeGuidedFlow.jsx#L299-L312))**:
  - Steps 2 and 3 render `<input type="range">` only. `POWER_PRESETS` (`line 52`) and `BUDGET_PRESETS` (`lines 53-59`) are exported in the file but **not rendered** in the wizard UI.
  - [MultiCriteriaMatchModal.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/MultiCriteriaMatchModal.jsx#L165-L240) renders preset chips, but still relies on sliders with no numeric text inputs.
- **Hidden Scoring Transparency ([PrototypeGuidedFlow.jsx:440-600](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/matcher/PrototypeGuidedFlow.jsx#L440-L600))**:
  - [multiCriteriaMatcher.js:13-16](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/lib/multiCriteriaMatcher.js#L13-L16) computes `compositeScore` using `budget: 0.35, location: 0.35, power: 0.30` and returns `breakdown` + `compromise`, but Step 4 of `PrototypeGuidedFlow.jsx` hides `matchPercentage`, hides `breakdown`, and only shows a small `"Budget Compromise"` badge without explaining *why* a unit matched or how close alternatives compare when budget is below minimum.
- **Chatbot Redirects to `/match` ([solarBotEngine.js:239-257, 337-355](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/lib/solarBotEngine.js#L239-L257))**:
  - `solarBotEngine.js` does not collect matching criteria; it routes product-matching queries to `/match` and accepts a summary dossier back via `handleConsultAssistant` ([MatchWizardPage.jsx:57](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/pages/MatchWizardPage.jsx#L57)).

### 3.2 Live Supabase `public.products` Data Gaps (Critical Finding)
Querying the live Supabase project (`gkrdwzbxpstpqpvqlwbt`, `public.products` where `is_archived = false`) reveals 101 active products with major metadata gaps that directly affect matching accuracy:

1. **Power Source Split**:
   - `51` products have `power_source = 'Solar'`.
   - `50` products have `power_source = 'AC Grid'` (220V floodlights and cobra streetlights, excluded by `isSolarCandidate()` in [multiCriteriaMatcher.js:26-53](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/lib/multiCriteriaMatcher.js#L26-L53)).
2. **Missing Pricing & Location Metadata on Solar Floodlights**:
   - Out of the `51` Solar products, only `23` (mostly Solar Streetlights) have `min_price`, `max_price`, `price_range`, `ideal_location`, and `recommended_usage` populated.
   - The remaining `28` Solar products (including `Solar Floodlight JDL`, `KKSKY Solar Floodlight`, `Solar Flood Light HPC`, `Solar Flood Light UP39`) have `NULL` for `min_price`, `max_price`, `price_range`, `ideal_location`, and `recommended_usage` — causing `scoreBudgetFit()` to assign a flat `0.70` fallback (`multiCriteriaMatcher.js:320-322`) and `place_of_use` to be identical across all floodlights (`"Park, Viaduct, Highway, Community, Square, Country Road, Other Outdoor Sites"`).
   - Meanwhile, all `23` Solar Streetlights have `ideal_location = 'main_road'` (or `'outdoor_general'`), meaning residential/subdivision streetlights are not differentiated in the database column itself.
3. **No Dedicated Form Factor or Pole Columns**:
   - `public.products` has no `form_factor` (`integrated` vs `split`) or `pole_included` / `mounting_type` column. Form factor is currently only inferable from `type`/`name` (e.g., `"Integrated Solar Street Light"` vs `"Solar Floodlight"`).

---

## 4. Recommended Improvements (Actionable Blueprint for RAM-10, RAM-11, RAM-12)

### 4.1 Better Wording & Plain-English Factors (Fixing "Wording Determines the Product")
Replace technical jargon in customer-facing quiz questions with plain-language site conditions, and show the technical translation next to it:

1. **Where will the light be installed?** (Determines beam type & base wattage range)
   - *Gate, Fence, Yard, or Pathway (3m–4m height)* -> Translates to `100W–200W` (Floodlight or compact Streetlight)
   - *Subdivision Street or Barangay Road (4m–6m pole)* -> Translates to `200W–300W` (Streetlight)
   - *Main Road, Highway, or Wide Open Lot (6m–10m+ pole)* -> Translates to `300W–600W+` (High-output Road/Streetlight)
   - *Covered Area / Warehouse / Basketball Court / Signboard* -> Translates to **Split-Type Floodlight** (panel mounted outside in sun, lamp inside/under cover)
2. **Does the mounting spot get direct sunlight all day?** (Determines **Form Factor** — RAM-11)
   - *Yes, open sky above the light* -> **All-in-One (Integrated)** recommended (cleaner look, faster install)
   - *No, under a roof/trees, or I want maximum charging angle* -> **Split-Type** recommended (separate panel with cable)
   - *No preference / Show both*
3. **How will you mount it?** (Determines **Mounting / Pole Option** — RAM-11)
   - *On a wall, gate, or existing post (No pole needed)*
   - *Need a pole / New pole installation* (flags pole/bracket compatibility in inquiry dossier)
4. **How many units do you need?** (Determines **Quantity / Bulk** — RAM-11)
   - Direct numeric input (`inputmode="numeric"`, default `1`) + quick-tap pills (`1`, `5`, `10`, `20+`).
   - Displays **Estimated Total Range** (`min_price * qty` – `max_price * qty`) alongside per-unit pricing.
5. **What is your target wattage or brightness?** (RAM-11 & RAM-12)
   - Pre-filled by the quiz (or directly editable in the Form mode) using a numeric input (`inputmode="numeric"`) + quick-tap pills (`100W`, `200W`, `300W`, `500W`, `Any`), **never** silently overwritten if the user manually edited it.
6. **What is your budget?** (RAM-12)
   - Toggle between **Per Unit** and **Total Project** budget, with a direct numeric input (`inputmode="numeric"`) + quick-tap bracket pills (`Under PHP 2,000`, `PHP 2,000–3,500`, `PHP 3,500+`, `Flexible / Any`).

### 4.2 Transparent Computation & "Why This Matched" (RAM-10)
- **Expose the Scoring Breakdown on Results**: Show the overall match percentage and a compact 4-pill or bar breakdown per card:
  - `Application / Environment` (e.g., *Matches Street / 4m–6m pole*)
  - `Form Factor & Mounting` (e.g., *All-in-One, Pole/Wall compatible*)
  - `Wattage Fit` (e.g., *300W matches your 300W target*)
  - `Budget Fit` (e.g., *PHP 2,500–3,500 fits your PHP 3,500 cap — or "PHP 500 above budget; closest available option"*)
- **Below-Minimum-Budget Handling**: When `budget < lowestCatalogPrice` (e.g., user enters PHP 500 when the cheapest solar unit is PHP 1,000), display an explicit banner explaining the gap and ranking the closest entry-level alternatives by price proximity rather than silently returning low-score cards.

### 4.3 Mapping Factors to Existing `public.products` Columns (Zero Database Changes)
Because the database schema and data will remain as-is, the frontend matcher ([multiCriteriaMatcher.js](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/lib/multiCriteriaMatcher.js)) can infer and surface these customer-facing factors directly from existing columns:

| Customer Factor | Plain-Language Question | Existing `public.products` Columns Used |
| :--- | :--- | :--- |
| **Application & Coverage** | *"Where will the light be installed?"* | `type`, `name`, `watt`, `lumens`, `beaming_angle`, `place_of_use`, `ideal_location` |
| **Sun Exposure / Form Factor** | *"Does the mounting spot get direct sun, or is it under a roof/trees?"* | `type`, `name` (e.g., `"Integrated"` vs. `"Floodlight"` / `"Flood Light"` / `"Road Light"`), `solar_panel` |
| **Mounting / Pole** | *"Mounting on a wall/gate/existing post, or do you need a pole?"* | `type`, `name` (floodlights & wall-mounts vs. streetlights & road lights) |
| **Runtime & Control Mode** | *"All-night steady light, motion-sensor security, or remote/timer?"* | `lighting_time`, `charging_time`, `battery`, `method_control` |
| **Light Tone (Color Temp)** | *"Warm cozy glow (garden/porch) or bright white (street/security)?"* | `color_temperature`, `type` / `name` (e.g., `(Warm White)`) |
| **Weather Durability** | *"Exposed to heavy rain/outdoor weather?"* | `waterproof_grade` (e.g., `IP65`, `IP66`, `IP67`) |
| **Quantity & Budget** | *"How many units do you need, and what is your budget?"* | `min_price`, `max_price`, `price_range`, `stock_quantity` (with `"Price on Inquiry"` fallback when `NULL`) |

---

## 5. Deep-Dive Sources: Solar Selection Factors & UX Best Practices

### 5.1 Primary Sources on What Determines Solar Panel & Solar Light Choices
1. **U.S. Department of Energy (DOE) — Homeowner's Guide to Going Solar** ([energy.gov](https://www.energy.gov/eere/solar/homeowners-guide-going-solar)):
   - Identifies **shading** (trees, roofs, adjacent structures), **orientation & tilt**, **panel efficiency** (how much power per square foot), and **product/performance warranties** as the primary physical and financial factors determining what solar setup works for a site.
2. **National Renewable Energy Laboratory (NREL) — Solar Resource & Tilt/Orientation** ([nrel.gov](https://www.nrel.gov/)):
   - Establishes that panel tilt and azimuth angle directly govern daily energy harvest — explaining *why* **Split-Type** systems (separate adjustable panel) outperform **All-in-One** systems whenever the light fixture must point downward under shade or at a non-optimal angle.
3. **Solar Street Light Sizing & Spacing Guides** ([Clodesun](https://www.clodesun.com/), [LightingCalculate](https://www.lightingcalculate.com/), [Sunlurio](https://www.sunlurio.com/), [Sigo Streetlight](https://www.sigostreetlight.com/)):
   - Standard road lighting uses **mounting height ($H$)** and **pole spacing ($3H$–$4H$)** plus **target lux** to determine required **lumens** and **wattage** — giving JD Solar a defensible engineering basis instead of arbitrary wattage numbers.
4. **Outdoor Solar Lighting Buyer Factors** ([Cebu Home Builders](https://www.cebuhomebuilders.com/), [Intelamp](https://www.intelamp.com/)):
   - Highlights 6 practical factors buyers care about once explained in plain English: **Battery Chemistry** (`LiFePO4` for heat tolerance & 1,000–2,000+ cycles), **IP Rating** (`IP65+` for Philippine rain/dust), **Lumens** (actual brightness vs. marketing wattage), **Autonomy / Runtime** (8–12 hours + cloudy-day reserve), **Motion Sensors (`method_control`)** for extending battery life, and **Color Temperature** (2700K–3000K Warm White for ambiance vs. 5000K–6500K Daylight for security).

### 5.2 Primary Sources on the Best UI/UX for This Scenario
1. **Nielsen Norman Group (NN/g) — Wizards: Definition and Design Recommendations** ([nngroup.com](https://www.nngroup.com/articles/wizards/)):
   - Wizards are ideal for **novices** facing unfamiliar, multi-factor decisions, *provided* the interface also offers a **non-wizard single-page alternative** for expert/repeat users (validating the Quiz + Direct Form hybrid).
2. **Nielsen Norman Group (NN/g) — Progressive Disclosure** ([nngroup.com](https://www.nngroup.com/articles/progressive-disclosure/)):
   - Show only essential choices per step during the quiz, deferring secondary filters (like color temperature or control mode) to optional refinements. **Crucial caveat**: do *not* hide core specs behind toggles on the **Results comparison cards**, because side-by-side comparison requires visible attributes.
3. **Nielsen Norman Group (NN/g) — Slider Controls** ([nngroup.com](https://www.nngroup.com/articles/gui-slider-controls/)):
   - Sliders are suited for rough exploration, **not** precise values (like exact PHP budgets, wattages, or bulk quantities); exact values require direct text/numeric inputs.
4. **Baymard Institute — Filtering, Sliders & Mobile Input UX** ([baymard.com](https://baymard.com/blog/ecommerce-product-lists)):
   - Over **50% of test users** struggle with sliders on mobile touchscreens; Baymard recommends **numeric input fields with numeric mobile keyboards** (`inputmode="numeric"`), **visual cues** on choices, **clear step progress**, **back-navigation without losing entered answers**, and **actionable fallback results** instead of dead-end "0 results" screens.
