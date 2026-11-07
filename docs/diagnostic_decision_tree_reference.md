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

## 4. The Interactive Monochrome HTML Visualizer (`docs/interactive_decision_tree.html`)

The standalone visualizer in [`docs/interactive_decision_tree.html`](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/docs/interactive_decision_tree.html) mirrors the exact multi-criteria architecture in a **strictly monochrome, high-contrast industrial specification layout**:

1. **Multi-Stage Architecture Map & Protocol Filters**: Displays the Root node, the 6 symptom columns with their 3-Stage Criteria Audit progression (`Stage 1 -> Stage 2 -> Stage 3 -> Verdict`), and all 20 fault codes with instant monochrome filters (`ALL`, `DIY FIX`, `WARRANTY CLAIM`, `ZERO DEFECT`, `ELIMINATION RULES`).
2. **Live 4-Pillar Criteria Status Strip**: Displays the real-time state (`PASS`, `WARNING`, `FAIL`, `PENDING`) and weight (`30%`, `25%`, `25%`, `20%`) of all four criteria pillars as you step through the audit.
3. **Dual-Mode Interactive Engine**:
   - **Guided 3-Stage Audit Mode**: Walk step-by-step through Symptom -> Criterion 1 (Electrical) -> Criterion 2 (Physical Seal) -> Criterion 3 (Environment & Control) -> Multi-Criteria Verdict.
   - **Direct Criteria Matrix Mode**: Toggle any combination of the 5 criteria vectors directly and watch the inference engine compute the matched fault rule, confidence percentage, 4-pillar scorecard, compound contributing factors, and warranty qualification in real time.
