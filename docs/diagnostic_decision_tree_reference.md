# Diagnostic Decision Tree: Visual Architecture & Structural Map

This document explains the **top-down structural overview** of the entire JD Solar Diagnostic Decision Tree as visualized in [`docs/interactive_decision_tree.html`](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/docs/interactive_decision_tree.html).

---

## 1. Minimal Black-and-White Tree Overview

Below is the complete text-diagram overview of the decision tree structure, from the Root entry down to each physical leaf node:

```text
======================================================================================================================
                                          LEVEL 0: ROOT EQUIPMENT TRIAGE
                                    (Standalone Off-Grid Luminaire Diagnostic)
======================================================================================================================
         |                     |                     |                     |                  |               |
         v                     v                     v                     v                  v               v
   [BRANCH 1]            [BRANCH 2]            [BRANCH 3]            [BRANCH 4]         [BRANCH 5]       [BRANCH 6]
    NO POWER          SHORT RUNTIME          DIM / FLICKER          DAYTIME ON           HOTSPOT/DAMAGE   REMOTE/SENSOR
(Charging LED/Switch) (Soiling/Shade/Tilt)   (Moisture/Ripple)     (Photocell/MOSFET)   (Wafer/Glass)    (IR / Radar)
         |                     |                     |                     |                  |               |
         +--> FLT-PV-001       +--> FLT-PV-005       +--> FLT-IP-009       +--> FLT-SNS-013   +--> FLT-PV-015 +--> FLT-RMT-018
         |    (Loose Plug)     |    (Dirty Glass)    |    (Moisture Leak)  |    (Blocked)     |    (Hotspot)  |    (Dead AAA)
         |    [DIY Fix]        |    [DIY Clean]      |    [WARRANTY CLAIM] |    [DIY Clear]   |    [CLAIM]    |    [DIY Fix]
         |                     |                     |                     |                  |               |
         +--> FLT-BAT-002      +--> FLT-PV-006       +--> FLT-SET-010      +--> FLT-CTL-014   +--> FLT-EXT-016+--> FLT-RMT-019
         |    (BMS Cutoff)     |    (Tree Shadow)    |    (Radar Standby)  |    (Short)       |    (Glass)    |    (Line-of-Sight)
         |    [DIY Sun-Soak]   |    [DIY Prune]      |    [NORMAL INFO]    |    [CLAIM]       |    [CLAIM]    |    [DIY Position]
         |                     |                     |                                        |               |
         +--> FLT-ENV-003      +--> FLT-PV-007       +--> FLT-DRV-011                         +--> FLT-MNT-017+--> FLT-SNS-020
         |    (Storm Deficit)  |    (Tilt / North)   |    (Driver Ripple)                         (Slack Bolts)   (Radar Grime)
         |    [NORMAL INFO]    |    [DIY Re-angle]   |    [SHOP REPAIR]                           [DIY Torque]    [DIY Clean]
         |                     |                     |
         +--> FLT-PWR-004      +--> FLT-BAT-008      +--> FLT-LED-012
              (Master Switch)       (Old Battery)         (Half Array Dark)
              [DIY Toggle]          [SHOP REPLACEMENT]    [WARRANTY CLAIM]
```

---

## 2. Tree Topology & Hierarchy

The system consists of **28 total nodes** organized into strict structural depths:

### Level 0: The Root Node (`ROOT`)
- **Role**: Entry point for any product diagnosed from the Customer Portal.
- **Function**: Establishes the product context (Name, Wattage, Physical form factor) and displays the primary symptom bus.

### Level 1: Symptom Classifier Nodes (6 Primary Branches)
1. **`SYMPTOM_NO_POWER`**: Fixture produces zero light output after dusk.
2. **`SYMPTOM_SHORT_RUNTIME`**: Fixture illuminates normally at dusk but dies within 1 to 3 hours.
3. **`SYMPTOM_DIM_FLICKER`**: Fixture emits sub-nominal lumens, flashes rapidly, or only illuminates partially.
4. **`SYMPTOM_DAYTIME_ON`**: LEDs remain powered during bright daylight hours.
5. **`SYMPTOM_PHYSICAL_HOTSPOT`**: Hardware presents visible surface scorching, shattered glass, or mechanical loosening.
6. **`SYMPTOM_SENSOR_REMOTE`**: Infrared handheld controller or radar microwave motion detector fails to respond.

### Level 2: Physical Triage Step Nodes
Each symptom branch presents a single targeted diagnostic physical observation (e.g., inspecting the small charging LED under midday sun, looking for condensation inside the optical lens cavity, or checking the panel tilt angle).

### Level 3: Leaf Verdict Nodes (20 Standardized Faults)
The endpoints of the tree categorize the equipment state into three actionable protocols:
1. **DIY / Self-Service (11 Nodes)**: User resolves the issue at home without dismounting or paying for transport (e.g., aligning loose waterproof aviation plugs, wiping soot off glass, tightening bracket bolts, 48-hour sun-soak).
2. **Warranty Claim / Shop Service (7 Nodes)**: Irreversible hardware failures requiring bench repair or unit replacement at Quiapo or Cavite service centers (e.g., water ingress `FLT-IP-009`, controller MOSFET short `FLT-CTL-014`, thermal hotspots `FLT-PV-015`).
3. **Informational / Zero Defect (2 Nodes)**: Equipment is working as designed (e.g., radar motion 30% eco-dimming `FLT-SET-010` or monsoon rain deficit `FLT-ENV-003`).

---

## 3. The Minimalist Black-and-White HTML Visualizer

The file [`docs/interactive_decision_tree.html`](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/docs/interactive_decision_tree.html) was rebuilt from scratch to be **strictly black and white, minimal, and typography-focused**:

- **Strict Monochrome**: Pure `#000000` text, borders, and lines on clean `#ffffff` background. No gradients, shadows, colors, or emojis.
- **Visual Tree Layout**: Shows the entire tree topology all at once in a multi-column bus-line layout.
- **Interactive Node Inspector**: Clicking any box in the tree reveals its exact engineering code, physical failure mechanism, and resolution protocol in an inspection drawer at the bottom.
- **View Filters**: Instant monochrome filters to highlight only DIY fixes, only Warranty Claims, or only Informational nodes.
