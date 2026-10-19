# Technical Audit: Solar Product Matcher Issues & Database Scaling Vulnerabilities

**Target Components:**
- Primary Engine: [`multiCriteriaMatcher.js`](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/lib/multiCriteriaMatcher.js)
- Matcher Route: [`MatchWizardPage.jsx`](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/pages/MatchWizardPage.jsx)
- Guided UI: [`PrototypeGuidedFlow.jsx`](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/matcher/PrototypeGuidedFlow.jsx)
- Decision Tree Engine: [`solarBotEngine.js`](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/lib/solarBotEngine.js)
- Database Ingestion: [`import_solar_products.sql`](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/import_solar_products.sql)
- Stock Management: [`stock_quantity_migration.sql`](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/stock_quantity_migration.sql)

---

## 1. Database & Catalog Data Integrity Issues

### 1.1 AC Grid-Tied / Non-Solar Equipment Infiltration
* **Observed Defect:** The database expansion (`import_solar_products.sql`) ingested conventional AC grid-powered fixtures into `public.products`, including:
  * `Electric Streetlight Cobra 100W – 250W` (AC powered)
  * `Electric Streetlight 100W – 200W` (AC powered)
  * `JDSTAR 220V LED Flood Light 20W – 800W` (220V grid powered)
* **Code Mechanism:** In [`multiCriteriaMatcher.js`](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/lib/multiCriteriaMatcher.js), there is no pre-qualification filter validating power source (`charging_type = 'Solar Charging'` or `solar_panel IS NOT NULL`).
* **Empirical Impact:**
  * In simulated runs for a 200W subdivision street light, `Electric Streetlight Cobra 200W` ranked #5 with a **99% match compatibility**.
  * In a commercial 800W query, `JDSTAR 220V LED Flood Light 800W` ranked **#1 with 98% compatibility**, outscoring true standalone solar luminaires.

---

### 1.2 Silent Price Fallback (Ghost ₱2,000 Pricing for Ingested SKUs)
* **Observed Defect:** When products 24 to 101 were inserted in `import_solar_products.sql`, the `price_range` column was completely omitted.
* **Code Mechanism:** Line 25 of [`multiCriteriaMatcher.js`](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/lib/multiCriteriaMatcher.js#L25) implements a hardcoded fallback:
  ```javascript
  if (!product?.price_range) return { min: 1500, max: 2500, avg: 2000 }
  ```
* **Empirical Impact:**
  * Any newly inserted high-power industrial luminaire without a populated `price_range` is assigned an artificial ₱1,500 – ₱2,500 baseline.
  * A 1000W Eco COB Flood Light (actual commercial value ₱12,000+) is treated as a ₱2,000 fixture. When an entry-level buyer enters a ₱2,500 budget, the 1000W unit receives a **98% Budget Score**, artificially displacing legitimately affordable models.

---

## 2. Algorithmic & Evaluation Blindspots

### 2.1 Complete Inventory and Stock Status Blindness
* **Observed Defect:** The matcher does not consider inventory levels when scoring or ordering recommendations.
* **Code Mechanism:** Database migration `stock_quantity_migration.sql` established `stock_quantity` and `in_stock`, and [`inventoryUtils.js`](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/lib/inventoryUtils.js) provides stock calculation utilities. However, [`multiCriteriaMatcher.js`](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/lib/multiCriteriaMatcher.js) contains zero references to these fields.
* **Empirical Impact:** Out-of-stock, discontinued, or zero-stock products can win the prominent "Top Recommended Model" showcase card in [`PrototypeGuidedFlow.jsx`](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/matcher/PrototypeGuidedFlow.jsx), producing dead customer inquiries that sales operations cannot fulfill.

---

### 2.2 Title Keyword Dominance vs Metadata Sparsity
* **Observed Defect:** Location scoring disproportionately favors legacy products while penalizing newer models.
* **Code Mechanism:** In [`scoreLocationFit`](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/lib/multiCriteriaMatcher.js#L54-L103):
  ```javascript
  if (name.includes('road') || type.includes('road')) return 1.0
  if (name.includes('street') || type.includes('street')) return 1.0
  ```
* **Empirical Impact:**
  * Legacy products (IDs 1–23) carry titles like `"Aviation Aluminum Solar Road Light"`, guaranteeing maximum `1.0` scores.
  * Newer products (IDs 24–101) have generic brand titles like `"Eco COB Flood Light"`, relying entirely on an unparsed or null `place_of_use` string. If the string lacks specific keywords, the model falls back to a mediocre `0.50` – `0.80` score.

---

## 3. Engineering & Domain Model Limitations

### 3.1 Missing Physical & Photometric Solar Criteria
The current matcher evaluates only three parameters: Location keyword, Nominal Wattage, and Budget. For industrial and consultative procurement, this creates substantial engineering gaps:

1. **Mounting / Pole Height Disconnect:**
   * A 300W fixture mounted at 3m on a residential gate creates severe glare and light pollution.
   * At 7m on a roadway arm, that same fixture provides standard lux distribution.
   * Mounting height dictates required optical distribution (Type II/Type III batwing vs Type V flood), but is currently unmodeled.
2. **Nominal Wattage vs Luminous Efficacy ($\text{lm/W}$):**
   * Nominal wattage measures power consumption, not illumination output.
   * A modern 150 lm/W chip at 150W delivers 22,500 lumens, outperforming an older 90 lm/W chip at 200W (18,000 lumens). The matcher currently rates the 200W unit higher on high-power queries.
3. **Autonomy & Rainy Day Battery Storage:**
   * Philippine installations face prolonged monsoon cloud cover and typhoons.
   * Sizing requires evaluating battery storage ($\text{mAh}$) against luminaire power draw to ensure 2–3 days of dusk-to-dawn runtime. This metric is absent from the matching equation.

---

### 3.2 Unbounded Client-Side In-Memory Evaluation
* **Observed Defect:** In [`ChatContext.jsx`](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/context/ChatContext.jsx#L74), the entire catalog is fetched via `select('*')` into client memory and scored synchronously.
* **Empirical Impact:**
  * Latency is negligible at 23–101 SKUs (~1.5ms).
  * As the database scales to 500+ or 2,000+ products with extensive specification strings, re-running the utility calculation on every touch of the wattage and budget sliders will produce frame drops and input lag on mobile devices.
