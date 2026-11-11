# Multi-Criteria Diagnostic Decision Tree: Visual Architecture & Structural Map

This document explains the **top-down structural overview** and **multi-criteria inference architecture** of the JD Solar Diagnostic Decision Tree as implemented in [`frontend/src/lib/solarDiagnosticEngine.js`](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/lib/solarDiagnosticEngine.js), [`frontend/src/components/FaultDiagnosticModal.jsx`](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/FaultDiagnosticModal.jsx), and visualized in [`docs/interactive_decision_tree.html`](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/docs/interactive_decision_tree.html).

---

## 1. Multi-Criteria Decision Tree Overview (Monochrome Structural Diagram)

Instead of jumping from a symptom directly to a static conclusion in a single click, the engine executes a **3-Stage Multi-Criteria Hardware Audit** across four weighted engineering pillars before firing the **Rule Inference Engine (`EVALUATE_CRITERIA`)**:

```text
======================================================================================================================
                                      LEVEL 0: ROOT EQUIPMENT & CONTEXT TRIAGE
                       (Identifies Form Factor: Integrated AIO vs Split-Type & 24-Mo Warranty)
======================================================================================================================
         |                     |                     |                     |                  |               |
         v                     v                     v                     v                  v               v
   [BRANCH 1]            [BRANCH 2]            [BRANCH 3]            [BRANCH 4]         [BRANCH 5]       [BRANCH 6]
    NO POWER           SHORT RUNTIME          DIM / FLICKER          DAYTIME ON       HOTSPOT/DAMAGE    REMOTE/SENSOR
         |                     |                     |                     |                  |               |
         v                     v                     v                     v                  v               v
+--------------------------------------------------------------------------------------------------------------------+
| STAGE 1 (CRITERION 1 - 30% WEIGHT): ELECTRICAL & CHARGING CONTINUITY AUDIT                                         |
| Evaluates midday charging indicator LED, open/closed loop voltage continuity, LED driver ripple & photocell state  |
| Nodes: SYMPTOM_NO_POWER | SYMPTOM_SHORT_RUNTIME | SYMPTOM_DIM_FLICKER | SYMPTOM_DAYTIME_ON | CRIT_PH_ELECTRICAL    |
+--------------------------------------------------------------------------------------------------------------------+
         |                     |                     |                     |                  |               |
         v                     v                     v                     v                  v               v
+--------------------------------------------------------------------------------------------------------------------+
| STAGE 2 (CRITERION 2 - 25% WEIGHT): PHYSICAL & IP65 ENCLOSURE INTEGRITY AUDIT (WITH PRIORITY ELIMINATION)          |
| Evaluates optical lens moisture/condensation, tempered glass fracture, cell thermal hotspots & aviation plug seal  |
| Nodes: CRIT_NP_PHYSICAL | CRIT_SR_PHYSICAL | CRIT_DF_PHYSICAL | CRIT_DO_PHYSICAL | SYMPTOM_PHYSICAL_HOTSPOT        |
+--------------------------------------------------------------------------------------------------------------------+
         |                     |                     |                     |                  |               |
         v                     v                     v                     v                  v               v
+--------------------------------------------------------------------------------------------------------------------+
| STAGE 3 (CRITERIA 3 & 4 - 45% COMBINED WEIGHT): ENVIRONMENTAL IRRADIANCE (25%) & OPERATIONAL CONTROL/AGE (20%)     |
| Evaluates 72h monsoon/cloud history, road soot/soiling, tree/eave shading, tilt angle, master switch & cell age    |
| Nodes: CRIT_NP_ENV | CRIT_SR_ENV | CRIT_DF_ENV | CRIT_DO_CONTROL | CRIT_PH_ENV | CRIT_SRM_PHYSICAL                 |
+--------------------------------------------------------------------------------------------------------------------+
         |                     |                     |                     |                  |               |
         +---------------------+---------------------+----------+----------+------------------+---------------+
                                                                |
                                                                v
+--------------------------------------------------------------------------------------------------------------------+
| LEVEL 4: MULTI-CRITERIA RULE INFERENCE ENGINE — evaluateDiagnosticCriteria(criteriaState, purchase)                |
| • Computes weighted multi-attribute match across 20 rules (DIAGNOSTIC_RULES)                                       |
| • Applies Priority Elimination Rules (Water Ingress P:100, Glass Fracture P:98, Thermal Hotspot P:96)              |
| • Detects Compound / Secondary Contributing Factors (detectCompoundFactors)                                        |
| • Generates 4-Pillar Pass/Warning/Fail Scorecard & Warranty Qualification Verdict (evaluateWarrantyCriteria)       |
+--------------------------------------------------------------------------------------------------------------------+
         |                     |                     |                     |                  |               |
         v                     v                     v                     v                  v               v
  [BRANCH 1 LEAVES]     [BRANCH 2 LEAVES]     [BRANCH 3 LEAVES]     [BRANCH 4 LEAVES]  [BRANCH 5 LEAVES] [BRANCH 6 LEAVES]
  • FLT-PV-001 [DIY]    • FLT-PV-005 [DIY]    • FLT-IP-009 [CLAIM]  • FLT-SNS-013[DIY] • FLT-PV-015[CLM] • FLT-RMT-018[DIY]
    (Loose Plug/Bus)      (Soiling Loss)        (Moisture Ingress)    (Photocell Blind)  (Cell Hotspot)    (Dead AAA Cells)
  • FLT-BAT-002 [DIY]   • FLT-PV-006 [DIY]    • FLT-SET-010 [INFO]  • FLT-CTL-014[CLM] • FLT-EXT-016[EX] • FLT-RMT-019[DIY]
    (BMS Sleep Cutoff)    (Micro-Shading)       (Radar Eco Standby)   (MOSFET Shorted)   (Glass Fracture)  (IR Sightline)
  • FLT-ENV-003 [INFO]  • FLT-PV-007 [DIY]    • FLT-DRV-011 [CLAIM]                    • FLT-MNT-017[DIY]• FLT-SNS-020[DIY]
    (Monsoon Deficit)     (Flat/North Tilt)     (Driver Ripple)                          (Bracket Slack)   (Radar Masked)
  • FLT-PWR-004 [DIY]   • FLT-BAT-008 [CLAIM] • FLT-LED-012 [CLAIM]
    (Master Switch Off)   (LiFePO4 Aging)       (LED String Open)
```

---

## 2. The 4 Weighted Criteria Pillars (`DIAGNOSTIC_CRITERIA_WEIGHTS`)

Every path through the decision tree—or through the direct **Criteria Matrix Evaluator**—collects and scores four distinct criteria pillars summing to `1.00` (`100%`):

| Pillar Key | Pillar Label | Weight | State Values (`DIAGNOSTIC_CRITERIA_OPTIONS`) | Scorecard Status Mapping |
| :--- | :--- | :--- | :--- | :--- |
| `electrical` | **1. Electrical Continuity** | `0.30` (**30%**) | `LED_BLINKING` (`PASS`), `DAY_BLIND_LOW_V` (`WARNING`), `LED_DARK` (`FAIL`), `LED_RIPPLE` (`FAIL`), `LED_PARTIAL_DARK` (`FAIL`), `DAY_SUN_SHORT` (`FAIL`) | Evaluates PV charging loop, MPPT/PWM switching, and LED driver current stability. |
| `physical` | **2. Physical & IP Seal** | `0.25` (**25%**) | `SEAL_INTACT` (`PASS`), `MOUNT_LOOSE` (`WARNING`), `PLUG_LOOSE` (`FAIL`), `WATER_INGRESS` (`FAIL`), `CELL_HOTSPOT` (`FAIL`), `GLASS_FRACTURE` (`FAIL`) | Evaluates hermetic IP65 gasket integrity, tempered glass, and connectors. Triggers **Priority Elimination Rules** when breached. |
| `environmental` | **3. Environmental Exposure** | `0.25` (**25%**) | `CLEAR_SUN` (`PASS`), `MONSOON_OVERCAST` (`WARNING`), `HEAVY_SOILING` (`WARNING`), `PARTIAL_SHADING` (`WARNING`), `FLAT_NORTH_TILT` (`WARNING`) | Evaluates external solar irradiance bottlenecks (weather, dirt, shadow cones, and tilt angle). |
| `control` | **4. Control & Lifecycle** | `0.20` (**20%**) | `AUTO_NORMAL` (`PASS`), `RADAR_STANDBY` (`PASS`), `SWITCH_OFF` (`WARNING`), `REMOTE_DEAD_BAT` (`WARNING`), `REMOTE_OUT_OF_RANGE` (`WARNING`), `RADAR_DISABLED` (`WARNING`), `AGED_CELLS` (`FAIL`) | Evaluates user control settings, master switch state, and LiFePO4 battery service age (>24 months). |

---

## 3. Multi-Stage Tree Topology & Node Inventory (40 Total Nodes)

The upgraded decision graph in [`solarDiagnosticEngine.js`](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/lib/solarDiagnosticEngine.js) consists of **40 total nodes** organized across 5 structural levels:

### Level 0: Equipment & Context Root (`ROOT`)
- Inspects the registered product via `analyzeProductContext(product)` to classify the hardware as either an **All-in-One Integrated Chassis (`INTEGRATED_AIO`)** or **Split-Type Panel & Luminaire (`SPLIT_MODULAR`)**, and checks active 24-month warranty status.

### Level 1: Criterion 1 Triage Nodes (6 Primary Symptom Entry Nodes)
1. **`SYMPTOM_NO_POWER`**: Evaluates daytime charging LED and master switch state (`30%` Electrical weight).
2. **`SYMPTOM_SHORT_RUNTIME`**: Evaluates daytime harvest indicator and service age (`30%` Electrical weight).
3. **`SYMPTOM_DIM_FLICKER`**: Evaluates LED matrix uniformity, radar standby dimming, and strobe ripple (`30%` Electrical weight).
4. **`SYMPTOM_DAYTIME_ON`**: Evaluates `< 5.0V` photocell shading blindness vs `> 15V` direct-sun MOSFET short (`30%` Electrical weight).
5. **`SYMPTOM_PHYSICAL_HOTSPOT`**: Classifies cell scorching, glass fracture, bracket slack, or lens moisture (`25%` Physical weight).
6. **`SYMPTOM_SENSOR_REMOTE`**: Evaluates IR remote transmitter indicator and microwave motion response (`20%` Control weight).

### Level 2: Criterion 2 Triage Nodes (6 Physical & Enclosure Verification Nodes)
- **`CRIT_NP_PHYSICAL`**, **`CRIT_SR_PHYSICAL`**, **`CRIT_DF_PHYSICAL`**, **`CRIT_DO_PHYSICAL`**, **`CRIT_PH_ELECTRICAL`**, **`CRIT_SRM_ELECTRICAL`**
- Verifies physical seal integrity, aviation plug seating, lens condensation, and glass condition so that physical hazards are never overlooked during electrical or battery troubleshooting.

### Level 3: Criterion 3 & 4 Triage Nodes (6 Environmental & Lifecycle Context Nodes)
- **`CRIT_NP_ENV`**, **`CRIT_SR_ENV`**, **`CRIT_DF_ENV`**, **`CRIT_DO_CONTROL`**, **`CRIT_PH_ENV`**, **`CRIT_SRM_PHYSICAL`**
- Captures 72-hour weather history, surface soiling, shading obstructions, mounting tilt, and equipment age before invoking `EVALUATE_CRITERIA`.

### Level 4: Leaf Verdict Nodes (20 Standardized Fault Verdicts + 2 Utility Nodes)
Every leaf verdict outputs a **4-Pillar Criteria Scorecard**, **Compound Contributing Factors**, **Inferred Telemetry**, and **Warranty Qualification Verdict**:
- **11 DIY / Field Maintenance Verdicts**: `FLT-PV-001`, `FLT-BAT-002`, `FLT-PWR-004`, `FLT-PV-005`, `FLT-PV-006`, `FLT-PV-007`, `FLT-SNS-013`, `FLT-MNT-017`, `FLT-RMT-018`, `FLT-RMT-019`, `FLT-SNS-020`.
- **6 Warranty Eligible Hardware Defect Verdicts**: `FLT-BAT-008`, `FLT-IP-009`, `FLT-DRV-011`, `FLT-LED-012`, `FLT-CTL-014`, `FLT-PV-015`.
- **1 Warranty Exclusion (External Impact) Verdict**: `FLT-EXT-016` (Shattered Tempered Glass — eligible for paid shop module replacement).
- **2 Zero-Defect Informational Verdicts**: `FLT-ENV-003` (Monsoonal Solar Deficit), `FLT-SET-010` (Normal Radar 30%/100% Eco Mode).
- **2 Utility Nodes**: `RESOLVED_DIY`, `BRANCH_INFO`.

---

## 5. Multi-Symptom Composite Scoring & Priority Branching Architecture

When multiple concurrent symptoms are observed on off-grid solar equipment (e.g. *Dim Lighting* along with *Remote Sensor Unresponsive*), the engine executes **Priority-Weighted Automatic Branching** and **Multi-Symptom Composite Scoring**:

### A. Symptom Severity & Safety Priority Hierarchy (`SYMPTOM_SEVERITY_PRIORITY`)
To protect against safety hazards, Level 0 triage ranks all active symptoms. The highest-severity symptom automatically dictates the 3-stage question sequence, while all other selected symptoms are preserved as contributing compound factors:

| Priority Rank | Symptom Key | Category Label | Engineering Safety Rationale |
| :---: | :--- | :--- | :--- |
| **1 (Highest)** | `PHYSICAL_HOTSPOT` | Panel Heat / Discoloration / Broken Glass | Critical thermal run-away or structural hermetic breach. Requires immediate physical audit. |
| **2** | `NO_POWER` | Light Does NOT Turn On at Night | Complete open loop, severed cable collar, or BMS hard low-voltage lockout. |
| **3** | `SHORT_RUNTIME` | Shuts Off Prematurely (1–3 Hours) | Deep LiFePO4 cell capacity degradation or acute monsoonal harvest deficit. |
| **4** | `DIM_FLICKER` | Dim Illumination or Flickering LEDs | LED driver current regulation ripple or partial array string open. |
| **5** | `DAYTIME_ON` | Light Stays ON During Bright Daytime | Photocell circuit blinding or MOSFET switching gate short. |
| **6 (Lowest)** | `SENSOR_REMOTE` | Remote Control / Radar Not Responding | Handset AAA battery depletion or microwave radar lens smudging. |

### B. Mathematical Multi-Symptom Inference Model
In `evaluateDiagnosticCriteria(criteriaInput, product)`:

$$\text{Final Rule Score} = \frac{\sum_{p \in \text{Pillars}} w_p \times \text{Match}_p}{\sum w_p} + \text{Priority Bonus} + \text{Compound Correlation Bonus}$$

1. **Active Symptoms Set**:
   $$\mathcal{S}_{\text{active}} = \text{Array.isArray}(c.\text{symptoms}) \land c.\text{symptoms.length} > 0 \;?\; c.\text{symptoms} : [c.\text{symptom}]$$
2. **Rule Compatibility Check**:
   A diagnostic rule is eligible if:
   $$m.\text{symptom} \cap \mathcal{S}_{\text{active}} \neq \emptyset \quad \lor \quad m.\text{symptom is agnostic}$$
3. **Compound Correlation Bonus**:
   $$\text{Bonus}_{\text{compound}} = \begin{cases} 0.08 & \text{if } |\mathcal{S}_{\text{active}}| > 1 \text{ and rule addresses highest-severity symptom} \\ 0 & \text{otherwise} \end{cases}$$

### C. Secondary Contributing Hardware Factor Extraction (`detectCompoundFactors`)
For every secondary symptom in $\mathcal{S}_{\text{active}}$ that is not the primary diagnosed fault, the engine automatically attaches a dedicated secondary hardware factor card with its technical fault code:

| Secondary Symptom | Factor Code | Contributing Title | Technical Hardware Context |
| :--- | :--- | :--- | :--- |
| `SENSOR_REMOTE` | **`FLT-RAD-010`** | Secondary Remote/Radar Receiver Abnormality | Handheld IR controller or radar receiver circuit failure compounding primary issue. |
| `DIM_FLICKER` | **`FLT-LED-004`** | Secondary LED String / Driver Fluctuation | Observed strobing or sub-nominal lux indicates concurrent buck driver or LED chip wear. |
| `SHORT_RUNTIME` | **`FLT-BAT-002`** | Secondary Battery Capacity Depletion | Accelerated nocturnal battery discharge compounding primary issue, requiring sun-soak or cell test. |
| `NO_POWER` | **`FLT-PWR-001`** | Secondary Circuit Open-Loop Condition | Intermittent or complete electrical circuit dropout detected in conjunction with other symptoms. |
| `DAYTIME_ON` | **`FLT-SNS-013`** | Secondary Photocell Sensor Inversion | Fixture fails to sense daytime solar voltage threshold, operating daytime load continuously. |
| `PHYSICAL_HOTSPOT` | **`FLT-PV-008`** | Secondary PV Module Hotspot / Heat Abnormality | Localized solar cell discoloration or heat marks threaten long-term panel continuity. |

### D. Safe Database Transmission & Admin Visibility
- **`issue_category`**: Multi-selected categories are formatted as a comma-separated list (e.g. `No Power / Won't Turn On, Remote Control Issue`) sanitized to 100 characters.
- **`description`**: Contains a structured `[MULTI-CRITERIA DIAGNOSTIC TRIAGE REPORT]` detailing:
  - All selected primary and secondary symptoms.
  - The 4-Pillar Scorecard.
  - Complete list of primary and compound hardware factors.
  - Inferred telemetry benchmarks.
  - Official warranty intake assessment.
- **Triage Desk**: Staff and Admin at Quiapo and Cavite reviewing [`WarrantyClaimsScreen.jsx`](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/admin/WarrantyClaimsScreen.jsx) immediately see the multi-symptom breakdown in the Diagnostic Fault Report card without any database schema changes required.

