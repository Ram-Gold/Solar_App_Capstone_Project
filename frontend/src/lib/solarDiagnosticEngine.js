// frontend/src/lib/solarDiagnosticEngine.js
// Client-side hardcoded decision-tree diagnostic engine for solar panels & solar street lights

export const DIAGNOSTIC_TREE = {
  ROOT: {
    title: 'Solar Troubleshooting Guide',
    message: (product) => `**Welcome to the JD Solar Troubleshooting Guide!**

I am ready to help identify and resolve issues with your **${product?.product_name || 'Solar Lighting Unit'}** ${product?.watt ? `(${product.watt})`: ''}.

Because solar lighting equipment operates as standalone units without remote IoT connectivity, troubleshooting is guided by the physical symptoms you observe. Select the symptom you are experiencing below:`,
    options: [
      { label: 'Light Does NOT Turn On at Night', next: 'SYMPTOM_NO_POWER' },
      { label: 'Shuts Off Prematurely (Only 1–3 Hours)', next: 'SYMPTOM_SHORT_RUNTIME' },
      { label: 'Dim Illumination or Flickering LEDs', next: 'SYMPTOM_DIM_FLICKER' },
      { label: 'Light Stays ON During Bright Daytime', next: 'SYMPTOM_DAYTIME_ON' },
      { label: 'Panel Heat / Discoloration / Broken Glass', next: 'SYMPTOM_PHYSICAL_HOTSPOT' },
      { label: 'Remote Control / Radar Sensor Not Responding', next: 'SYMPTOM_SENSOR_REMOTE' },
    ],
  },

  // ==========================================
  // BRANCH 1: NO POWER AT NIGHT
  // ==========================================
  SYMPTOM_NO_POWER: {
    title: 'Step 1: Check Indicator Light & Switch',
    message: (product) => `### Triage: Light Does Not Turn On at Night
Let's inspect the charging activity on your **${product?.product_name || 'unit'}**.

During peak sunny hours (11:00 AM – 2:00 PM), what does the small **Charging Indicator LED** (red or green bead on fixture/panel) do?`,
    options: [
      { label: 'Indicator LED is completely dark (No light at all)', next: 'DIAG_OPEN_CIRCUIT' },
      { label: 'Indicator blinks normally in sun, but lamp stays off at dusk', next: 'DIAG_BMS_LOCKOUT' },
      { label: 'We had 2–3 consecutive stormy / cloudy days', next: 'DIAG_RAIN_DEPLETION' },
      { label: 'Not sure if the physical switch is toggled ON', next: 'DIAG_SWITCH_DISENGAGED' },
      { label: 'Back to Diagnostic Menu', next: 'ROOT' },
    ],
  },

  DIAG_OPEN_CIRCUIT: {
    title: 'Diagnosis: Open Circuit or Aviation Plug Disconnection',
    faultCode: 'FLT-PV-001',
    category: 'No Power / Won\'t Turn On',
    severity: 'mild',
    severityLabel: 'Mild • DIY Fixable',
    confidence: '95%',
    telemetry: {
      pvEfficiency: '0% (Open Loop)',
      panelVoltage: '0.0V (No Continuity)',
      batteryVoltage: 'Unknown',
      bmsState: 'Idle / Disconnected',
      ipIntegrity: 'Check Connector Seal'
    },
    message: (product) => `### Fault Detected: PV Open Circuit / Disconnected Aviation Plug

The solar panel is not sending any electrical current to the internal battery pack. Because the charging indicator is completely unlit under sunlight, the circuit is open.

#### Probable Root Causes:
1. **Loose Aviation Waterproof Plug:** The rotary locking screw cap between the solar panel lead and the lamp fixture has loosened due to wind vibration.
2. **Misaligned Alignment Key:** The 2-pin or 3-pin waterproof notch was inserted at an angle, failing to make contact with internal copper terminals.
3. **Cable Pinch / Rodent Chew:** Visible nick in the insulated rubber wiring along the mounting pole.

#### Step-by-Step DIY Remedy:
* **Step 1:** Lower the unit or access the pole junction. Unscrew the black waterproof aviation collar.
* **Step 2:** Check for dust or water inside the pins. Align the interior groove (keyway) and press firmly until fully seated.
* **Step 3:** Hand-tighten the waterproof screw collar clockwise until completely sealed.
* **Step 4:** Place the panel under sun—the indicator should begin blinking within 10 seconds.`,
    remedySteps: [
      'Inspect the black waterproof aviation plug connecting panel to lamp.',
      'Align the internal guide groove and push pins all the way together.',
      'Tighten the screw collar firmly to seal against rain.',
      'Verify that the charging indicator LED starts blinking under sunlight.'
    ],
    claimRecommendation: false,
    options: [
      { label: 'I Fixed the Connection (Solved)', next: 'RESOLVED_DIY' },
      { label: 'Cable Damaged: File Warranty Claim', next: 'TRANSFER_TO_CLAIM', category: 'No Power / Won\'t Turn On' },
      { label: 'Run Diagnostic on Another Symptom', next: 'ROOT' },
    ],
  },

  DIAG_BMS_LOCKOUT: {
    title: 'Diagnosis: LiFePO4 BMS Low-Voltage Cutoff Protection',
    faultCode: 'FLT-BAT-002',
    category: 'Battery / Rapid Discharge',
    severity: 'moderate',
    severityLabel: 'Moderate • Requires 48H Sun-Soak Awakening',
    confidence: '92%',
    telemetry: {
      pvEfficiency: '100% Active Harvesting',
      panelVoltage: '18.2V (Normal Voc)',
      batteryVoltage: '2.48V / cell (Cutoff Tripped < 2.8V)',
      bmsState: 'Low-Voltage Sleep Lockout',
      ipIntegrity: 'Passed'
    },
    message: (product) => `### Diagnostic Verdict: Battery BMS Sleep Mode Tripped

Good news: Your solar panel is generating normal voltage (charging light blinks), but the **Battery Management System (BMS)** has engaged its automatic safety cutoff!

When a Lithium Iron Phosphate (LiFePO4) battery pack is drained below its safety threshold, the BMS disconnects the LED output to prevent irreversible cell damage.

#### Why Did This Happen?
* High-intensity lighting ran during multiple overcast days with insufficient solar recharge.
* In sleep mode, normal nighttime sensors will not trigger the LED until the battery pack recovers above **3.1V per cell**.

#### Recommended Recovery Procedure (48-Hour Sun Soak):
1. **Turn OFF the Lamp via Remote:** Aim remote at the fixture and press "OFF" (or press the push-button switch until lamp blinks twice).
2. **Leave in Direct Sunlight for 2 Full Days:** Keep the lamp switched OFF while the panel charges undisturbed for 48 hours. This allows slow trickle charging to wake the sleeping BMS.
3. **Re-engage AUTO Mode:** After 2 sunny days, press the **"AUTO"** button on the remote at dusk.`,
    remedySteps: [
      'Turn the fixture OFF using the remote or physical push button.',
      'Allow the solar panel to charge in full sun for 48 hours without turning on the lamp.',
      'Press "AUTO" on the remote to re-engage dusk-to-dawn operation.',
      'If lamp remains dead after 48h sun soak, battery cell bank requires replacement.'
    ],
    claimRecommendation: true,
    options: [
      { label: 'Will Try 48-Hour Sun-Soak at Home', next: 'RESOLVED_DIY' },
      { label: 'BMS Remains Dead: File Warranty Claim', next: 'TRANSFER_TO_CLAIM', category: 'Battery / Rapid Discharge' },
      { label: 'Main Diagnostic Menu', next: 'ROOT' },
    ],
  },

  DIAG_RAIN_DEPLETION: {
    title: 'Diagnosis: Weather-Induced Solar Deficit (Zero Defect)',
    faultCode: 'FLT-ENV-003',
    category: 'Battery / Rapid Discharge',
    severity: 'mild',
    severityLabel: 'Mild • Normal Weather Event',
    confidence: '98%',
    telemetry: {
      pvEfficiency: '15% (Cloud Attenuation)',
      panelVoltage: '9.4V (Low Diffuse Irradiance)',
      batteryVoltage: '2.95V (Low Reserve)',
      bmsState: 'Reserve Mode Active',
      ipIntegrity: 'Normal'
    },
    message: (product) => `### Diagnostic Verdict: Normal Monsoonal Solar Depletion

Your **${product?.product_name || 'solar light'}** is physically healthy! Solar street lights require **4 to 6 peak sun hours (>800 W/m²)** of direct sunlight to reach 100% state of charge.

During heavy cloud cover or continuous monsoon rains, solar irradiance drops by up to **85%**, meaning the battery only received a fraction of its normal daily top-up.

#### Pro-Tip for Rainy Season in the Philippines:
* Use your remote control to switch from **100% Constant Brightness** to **"RADAR" (Microwave Induction Mode)**.
* In Radar mode, the light rests at **30% power** and only jumps to 100% when vehicles or pedestrians pass, extending your battery reserve up to **3 consecutive rainy nights**!`,
    remedySteps: [
      'Switch remote setting to "RADAR / SENSOR" mode for energy conservation.',
      'Allow 1-2 days of sunny Philippine weather for full recharge.',
      'No hardware service or repair required.'
    ],
    claimRecommendation: false,
    options: [
      { label: 'Understood! Switched to Radar Eco Mode', next: 'RESOLVED_DIY' },
      { label: 'Test Another Symptom', next: 'ROOT' },
    ],
  },

  DIAG_SWITCH_DISENGAGED: {
    title: 'Diagnosis: Physical Master Switch Disengaged',
    faultCode: 'FLT-PWR-004',
    category: 'No Power / Won\'t Turn On',
    severity: 'mild',
    severityLabel: 'Mild • 10-Second Fix',
    confidence: '90%',
    telemetry: {
      pvEfficiency: 'Standby',
      panelVoltage: '18.0V',
      batteryVoltage: 'Full Charge Ready',
      bmsState: 'Master Circuit Open',
      ipIntegrity: 'Intact'
    },
    message: (product) => `### Diagnostic Verdict: Master Waterproof Switch in OFF Position

All JD Solar units are shipped with the master mechanical push-switch disengaged to prevent battery discharge during transit.

If the button was bumped or was not activated during installation:
* Locate the waterproof silicone rubber button on the fixture chassis (usually near the motion sensor lens or bottom bracket).
* Press and hold firmly for **3 to 5 seconds** until the LED array blinks once or twice.
* Cover the solar panel with a piece of dark cloth or cardboard to verify that the light turns on immediately in darkness.`,
    remedySteps: [
      'Press and hold the master rubber button on the fixture for 3-5 seconds.',
      'Wait for the flash confirmation.',
      'Cover the solar panel to test night activation.'
    ],
    claimRecommendation: false,
    options: [
      { label: 'Master Switch Pressed & Light Works!', next: 'RESOLVED_DIY' },
      { label: 'Still Not Turning On: Continue Triage', next: 'SYMPTOM_NO_POWER' },
    ],
  },

  // ==========================================
  // BRANCH 2: SHORT RUNTIME (1-3 HOURS)
  // ==========================================
  SYMPTOM_SHORT_RUNTIME: {
    title: 'Step 1: Inspect Physical Placement & Soiling',
    message: (product) => `### Triage: Light Shuts Off Prematurely
Your **${product?.product_name || 'solar unit'}** powers on at dusk, but dies after only 1 to 3 hours instead of running 10–12 hours until dawn.

Which of the following best describes the panel setup and condition?`,
    options: [
      { label: 'Heavy dust, soot, or bird droppings on glass surface', next: 'DIAG_SOILING_LOSS' },
      { label: 'Nearby tree branches or building roof cast shade midday', next: 'DIAG_SHADING_LOSS' },
      { label: 'Panel mounted completely flat (0°) or facing North', next: 'DIAG_TILT_MISALIGNMENT' },
      { label: 'Surface is clean & sunny, but unit is 2+ years old', next: 'DIAG_BATTERY_AGING' },
      { label: 'Back to Diagnostic Menu', next: 'ROOT' },
    ],
  },

  DIAG_SOILING_LOSS: {
    title: 'Diagnosis: Photovoltaic Soiling & Optical Attenuation',
    faultCode: 'FLT-PV-005',
    category: 'Dim Lighting / Low Lux',
    severity: 'mild',
    severityLabel: 'Mild • 15-Minute DIY Cleaning',
    confidence: '96%',
    telemetry: {
      pvEfficiency: '52% (-48% Soiling Loss)',
      panelVoltage: '13.8V (Heavily Attenuated)',
      batteryVoltage: '3.08V (Undercharged ~40%)',
      bmsState: 'Early Low-Volt Cutoff at 10 PM',
      ipIntegrity: 'Normal'
    },
    message: (product) => `### Diagnostic Verdict: Severe Photovoltaic Soiling Loss

A layer of road dust, exhaust soot, or bird droppings is blocking solar irradiance from reaching the monocrystalline silicon wafers!

#### The Science:
Even a thin, translucent film of dirt in tropical urban areas (like Metro Manila or Cavite roads) attenuates sunlight absorption by **30% to 50%**. As a result, 8 hours of daylight only charges your battery to 40% capacity, causing it to die by 9:00 PM or 10:00 PM.

#### Cleaning Guidelines:
1. **Best Time:** Early morning (before 8:00 AM) or dusk when the glass is cool. Spraying cold water on midday hot glass (>70°C) can cause thermal fracture.
2. **Tools:** Use a soft microfiber mop or sponge with clean water and mild dish soap.
3. **Do NOT:** Use wire brushes, steel wool, or abrasive detergents that strip the anti-reflective glass coating.`,
    remedySteps: [
      'Clean the tempered glass surface early in the morning with water and a soft cloth.',
      'Remove all bird droppings and hardened mud caked on the corners.',
      'Allow one sunny day to recharge to 100% capacity.'
    ],
    claimRecommendation: false,
    options: [
      { label: 'Cleaned the Panel & Runtime Restored', next: 'RESOLVED_DIY' },
      { label: 'Still Having Issues: File Claim', next: 'TRANSFER_TO_CLAIM', category: 'Battery / Rapid Discharge' },
      { label: 'Main Diagnostic Menu', next: 'ROOT' },
    ],
  },

  DIAG_SHADING_LOSS: {
    title: 'Diagnosis: Micro-Shading & Bypass Diode Choke',
    faultCode: 'FLT-PV-006',
    category: 'Battery / Rapid Discharge',
    severity: 'moderate',
    severityLabel: 'Moderate • Requires Branch Trimming / Relocation',
    confidence: '94%',
    telemetry: {
      pvEfficiency: '38% (Series Resistance Spike)',
      panelVoltage: '11.5V (Bypass Diode Clamped)',
      batteryVoltage: '3.02V (Undercharged)',
      bmsState: 'Active',
      ipIntegrity: 'Normal'
    },
    message: (product) => `### Diagnostic Verdict: Partial Tree / Structure Shading

Solar cells in a photovoltaic panel are connected in series like links in a chain. 

**Critical Rule:** If even **10% of a solar panel** is shadowed by a tree limb or wall between 10:00 AM and 3:00 PM, the shaded cells act as a bottleneck resistor, cutting total panel power output by **up to 75%**!

#### Action Plan:
* Trim foliage or tree branches blocking the sun path between 9:30 AM and 3:30 PM.
* If mounted on a pole or wall with a roof overhang, consider extending the mounting arm 0.5m forward to clear the eaves.`,
    remedySteps: [
      'Identify shadows cast on the panel between 10:00 AM and 3:00 PM.',
      'Trim overhanging tree branches or adjust pole mounting position.',
      'Ensure completely unobstructed sunlight during peak solar window.'
    ],
    claimRecommendation: false,
    options: [
      { label: 'Cleared Obstruction (Resolved)', next: 'RESOLVED_DIY' },
      { label: 'Cannot Relocate: Request Store Technician Advice', next: 'TRANSFER_TO_CLAIM', category: 'Battery / Rapid Discharge' },
      { label: 'Back to Menu', next: 'ROOT' },
    ],
  },

  DIAG_TILT_MISALIGNMENT: {
    title: 'Diagnosis: Sub-Optimal Azimuth & Tilt Angle',
    faultCode: 'FLT-PV-007',
    category: 'Battery / Rapid Discharge',
    severity: 'moderate',
    severityLabel: 'Moderate • Simple Re-Angle Adjustment',
    confidence: '91%',
    telemetry: {
      pvEfficiency: '65% (-35% Angle Loss + Dirt Pooling)',
      panelVoltage: '14.8V',
      batteryVoltage: '3.14V',
      bmsState: 'Active',
      ipIntegrity: 'Normal'
    },
    message: (product) => `### Diagnostic Verdict: Incorrect Solar Tilt / Orientation

In the Philippines (approx. 14° North Latitude), solar panels installed completely horizontal (flat 0°) or facing North suffer from two severe problems:
1. **Rain Pooling:** Dirt and rainwater cannot drain, creating dried muddy rings along the lower frame.
2. **Angle of Incidence Loss:** The sun passes primarily to the south for most of the year, reducing irradiance harvest by 25%–35%.

#### Optimal Orientation for the Philippines:
* **Azimuth:** Face the panel directly towards **TRUE SOUTH**.
* **Tilt Angle:** Angle the panel at **12° to 15°** above the horizontal.
* This allows rainwater to naturally wash away dust and captures optimal solar zenith hours.`,
    remedySteps: [
      'Loosen the pole bracket clamp screws.',
      'Rotate the solar panel face towards True South.',
      'Adjust the tilt angle to 12°–15° to promote self-cleaning rainwater runoff.',
      'Re-tighten bracket clamp bolts securely.'
    ],
    claimRecommendation: false,
    options: [
      { label: 'Adjusted Angle to 15° South (Resolved)', next: 'RESOLVED_DIY' },
      { label: 'Back to Menu', next: 'ROOT' },
    ],
  },

  DIAG_BATTERY_AGING: {
    title: 'Diagnosis: LiFePO4 Cell Capacity Degradation',
    faultCode: 'FLT-BAT-008',
    category: 'Battery / Rapid Discharge',
    severity: 'critical',
    severityLabel: 'Critical • Battery Module Replacement Required',
    confidence: '89%',
    telemetry: {
      pvEfficiency: '95% (Panel Healthy)',
      panelVoltage: '18.4V (Full Voc Output)',
      batteryVoltage: '3.32V at dusk -> 2.6V in 90 mins',
      bmsState: 'High Internal Resistance / SOH 35%',
      ipIntegrity: 'Passed'
    },
    message: (product) => `### Diagnostic Verdict: Lithium Iron Phosphate Cell Fatigue

Your solar panel is producing full rated power, but the internal **LiFePO4 battery pack has experienced internal resistance growth or capacity loss**.

#### Symptoms:
* The battery charges to full voltage quickly, but drops steeply within 60–90 minutes under LED load.
* If your unit was purchased within **1 Year**, this is covered under the **JD Solar Official Replacement Warranty**!

We recommend filing a warranty claim or bringing the unit to our **Quiapo or Cavite branch** for a battery pack refresh.`,
    remedySteps: [
      'File an official warranty claim using your registered purchase record.',
      'Branch technicians will swap the internal LiFePO4 battery pack.',
      'Zero cost if within your active warranty coverage period.'
    ],
    claimRecommendation: true,
    options: [
      { label: 'File Official Warranty Replacement Claim', next: 'TRANSFER_TO_CLAIM', category: 'Battery / Rapid Discharge' },
      { label: 'Visit Cavite or Quiapo Branch for Service', next: 'BRANCH_INFO' },
      { label: 'Back to Diagnostic Menu', next: 'ROOT' },
    ],
  },

  // ==========================================
  // BRANCH 3: DIM OR FLICKERING LIGHT
  // ==========================================
  SYMPTOM_DIM_FLICKER: {
    title: 'Step 1: Inspect Optical Lens & Flickering Pattern',
    message: (product) => `### Triage: Dim Light Output or Flickering
Let's analyze the lighting performance of your **${product?.product_name || 'unit'}**.

What specific behavior do you notice with the LED chips?`,
    options: [
      { label: 'Water droplets / condensation visible inside the lens', next: 'DIAG_WATER_INGRESS' },
      { label: 'Light is dim (30%), but turns 100% bright when someone walks near', next: 'DIAG_NORMAL_RADAR' },
      { label: 'Rapid strobe-like flickering when turned on', next: 'DIAG_VOLTAGE_RIPPLE' },
      { label: 'Half of the LED panel is dark while the other half lights', next: 'DIAG_LED_ARRAY_BURNOUT' },
      { label: 'Back to Diagnostic Menu', next: 'ROOT' },
    ],
  },

  DIAG_WATER_INGRESS: {
    title: 'Diagnosis: IP Seal Compromise & Moisture Ingress',
    faultCode: 'FLT-IP-009',
    category: 'Physical / Water Ingress',
    severity: 'critical',
    severityLabel: 'Critical • Hazardous • Do Not Power On',
    confidence: '97%',
    telemetry: {
      pvEfficiency: 'Compromised',
      panelVoltage: 'Fluctuating',
      batteryVoltage: 'Moisture Bridge Risk',
      bmsState: 'Ground Fault Alert',
      ipIntegrity: 'FAILED (Seal Breached)'
    },
    message: (product) => `### Urgent: IP65/IP67 Seal Breached (Moisture Ingress)

Visible condensation or liquid pooling inside the optical lens indicates that the silicone waterproof perimeter seal or cable entry gland was damaged during typhoon winds or physical stress.

#### High Priority Warning:
* **Turn OFF immediately:** Moisture will bridge the constant-current LED driver pins and battery terminals, risking permanent PCB corrosion or lithium short-circuit.
* **Do NOT attempt to operate** until dried and resealed by a technician.
* This is covered under JD Solar replacement warranty for manufacturing defects or seal failures.`,
    remedySteps: [
      'Power OFF the unit immediately via remote or master switch.',
      'Take photos of the moisture droplets inside the lens for evidence.',
      'Submit a warranty replacement claim immediately.'
    ],
    claimRecommendation: true,
    options: [
      { label: 'Submit Warranty Claim for Water Ingress', next: 'TRANSFER_TO_CLAIM', category: 'Physical / Water Ingress' },
      { label: 'Visit Branch for Immediate Exchange', next: 'BRANCH_INFO' },
      { label: 'Back to Menu', next: 'ROOT' },
    ],
  },

  DIAG_NORMAL_RADAR: {
    title: 'Diagnosis: Intelligent Radar Energy-Saving Mode (Normal Operation)',
    faultCode: 'FLT-SET-010',
    category: 'Sensor / Dusk-Dawn Failure',
    severity: 'mild',
    severityLabel: 'Healthy • Normal Smart Feature',
    confidence: '99%',
    telemetry: {
      pvEfficiency: '100% Optimal',
      panelVoltage: '18.2V',
      batteryVoltage: '3.28V (Full Health)',
      bmsState: 'Radar 30/100 Dynamic Duty Cycle',
      ipIntegrity: 'Passed'
    },
    message: (product) => `### Great News: Your Light is Operating in Smart Radar Mode!

This is not a defect! JD Solar streetlights are programmed with **Microwave Radar Intelligence**:
* **Standby Mode (30% Brightness):** When no people or cars are nearby, the light dims to 30% to conserve battery power.
* **Motion Detection (100% Brightness):** When movement is detected within 6–10 meters, it instantly surges to full 100% illumination for 30 seconds.

#### Prefer Continuous 100% Brightness All Night?
* Take your remote control and press the **"ALWAYS"**, **"2H+RADAR"**, or **"4H"** button.
* Note: Constant 100% brightness will consume battery faster during rainy weeks.`,
    remedySteps: [
      'Use remote to choose between Radar Motion Mode or Constant 100% Illumination.',
      'No repair required—system is 100% operational.'
    ],
    claimRecommendation: false,
    options: [
      { label: 'Awesome! Tested & Understand Remote Modes', next: 'RESOLVED_DIY' },
      { label: 'Back to Menu', next: 'ROOT' },
    ],
  },

  DIAG_VOLTAGE_RIPPLE: {
    title: 'Diagnosis: Constant-Current LED Driver Fluctuation',
    faultCode: 'FLT-DRV-011',
    category: 'Dim Lighting / Low Lux',
    severity: 'moderate',
    severityLabel: 'Moderate • Driver Voltage Anomaly',
    confidence: '90%',
    telemetry: {
      pvEfficiency: '88%',
      panelVoltage: '17.5V',
      batteryVoltage: '2.82V (Near Cutoff Ripple)',
      bmsState: 'Current Limiting Oscillation',
      ipIntegrity: 'Passed'
    },
    message: (product) => `### Diagnostic Verdict: LED Driver Current Ripple

Strobe-like flickering usually occurs when the battery voltage is right on the boundary of the low-voltage cutoff limit, causing the driver circuit to turn on and cut off repeatedly.

#### Troubleshooting:
1. Cover the panel and let the lamp run for 5 minutes. If flickering stops after charging next day, it was low-voltage ripple.
2. If flickering persists after a full 8-hour charge, the constant-current LED step-down driver has degraded capacitor filtering and should be serviced under warranty.`,
    remedySteps: [
      'Allow full day of sun charging.',
      'If strobe persists on full battery, driver replacement is required under warranty.'
    ],
    claimRecommendation: true,
    options: [
      { label: 'File Claim for Flickering Driver', next: 'TRANSFER_TO_CLAIM', category: 'Dim Lighting / Low Lux' },
      { label: 'Back to Menu', next: 'ROOT' },
    ],
  },

  DIAG_LED_ARRAY_BURNOUT: {
    title: 'Diagnosis: LED String Burnout / PCB Trace Open',
    faultCode: 'FLT-LED-012',
    category: 'Dim Lighting / Low Lux',
    severity: 'critical',
    severityLabel: 'Critical • Luminaire Module Replacement',
    confidence: '95%',
    telemetry: {
      pvEfficiency: '92%',
      panelVoltage: '18.0V',
      batteryVoltage: '3.25V',
      bmsState: 'Normal',
      ipIntegrity: 'Partial LED String Open'
    },
    message: (product) => `### Diagnostic Verdict: Partial LED Module Circuit Burnout

JD Solar light heads feature high-density SMD LED matrices divided into parallel strings. If one quadrant or strip is completely dark while others are lit:
* A single surface-mount diode in that series string has burned out or suffered solder joint failure.
* This is a covered manufacturing defect under your **1-Year JD Solar Warranty**.`,
    remedySteps: [
      'Take a photo showing the dark LED cluster.',
      'Submit a warranty replacement claim for a luminaire swap.'
    ],
    claimRecommendation: true,
    options: [
      { label: 'File Claim for LED Array Burnout', next: 'TRANSFER_TO_CLAIM', category: 'Dim Lighting / Low Lux' },
      { label: 'Back to Menu', next: 'ROOT' },
    ],
  },

  // ==========================================
  // BRANCH 4: DAYTIME ON
  // ==========================================
  SYMPTOM_DAYTIME_ON: {
    title: 'Step 1: Check Daylight Detection & Placement',
    message: (product) => `### Triage: Light Stays ON During Bright Daytime
Solar lights automatically turn OFF and enter charging mode when the solar panel generates above **5.0 Volts** from morning sun.

If your light continues glowing during the middle of the day:`,
    options: [
      { label: 'Solar panel is covered by thick mud, cloth, or under dense awning', next: 'DIAG_PHOTOCELL_BLOCKED' },
      { label: 'Panel is in direct full sun, but lamp continues blasting light', next: 'DIAG_MOSFET_FAULT' },
      { label: 'Back to Diagnostic Menu', next: 'ROOT' },
    ],
  },

  DIAG_PHOTOCELL_BLOCKED: {
    title: 'Diagnosis: Photocell Threshold Blindness',
    faultCode: 'FLT-SNS-013',
    category: 'Sensor / Dusk-Dawn Failure',
    severity: 'mild',
    severityLabel: 'Mild • Simple Obstruction Removal',
    confidence: '95%',
    telemetry: {
      pvEfficiency: '0% Sensed Irradiance',
      panelVoltage: '1.2V (< 5V Daylight Threshold)',
      batteryVoltage: '3.20V',
      bmsState: 'Night Mode Triggered False Positive',
      ipIntegrity: 'Normal'
    },
    message: (product) => `### Diagnostic Verdict: Panel Blind to Daytime Ambient Light

Because the solar panel itself acts as the dusk-to-dawn photocell sensor, the light only turns OFF when the panel voltage rises above **5 Volts**.

If the panel is installed beneath a porch, deep overhang, or thick tree canopy, it cannot register that morning has arrived!

#### Fix:
* Clear any physical covers or tarpaulins.
* Ensure the panel receives open sky exposure so morning dawn can trigger the daytime charging shutoff.`,
    remedySteps: [
      'Expose solar panel to ambient daylight.',
      'Verify lamp turns OFF within 30 seconds of daylight exposure.'
    ],
    claimRecommendation: false,
    options: [
      { label: 'Exposed to Sky & Lamp Turned Off (Solved)', next: 'RESOLVED_DIY' },
      { label: 'Back to Menu', next: 'ROOT' },
    ],
  },

  DIAG_MOSFET_FAULT: {
    title: 'Diagnosis: Controller Load-Switching MOSFET Shorted',
    faultCode: 'FLT-CTL-014',
    category: 'No Power / Won\'t Turn On',
    severity: 'critical',
    severityLabel: 'Critical • Controller Board Replacement',
    confidence: '93%',
    telemetry: {
      pvEfficiency: '100% Generating',
      panelVoltage: '18.4V (Daytime Verified)',
      batteryVoltage: '3.20V',
      bmsState: 'MOSFET Gate Shorted (Always On)',
      ipIntegrity: 'Passed'
    },
    message: (product) => `### Diagnostic Verdict: Controller Switching Circuit Failure

If the solar panel is in blazing noon sun (>15V output) and the lamp still stays illuminated, the internal solid-state MOSFET switch on the controller board has short-circuited in the closed position.

This drains the battery simultaneously while charging, causing severe cell wear.

**Action Required:** This controller board needs to be exchanged at our branch under warranty.`,
    remedySteps: [
      'Turn off using remote if possible to protect battery.',
      'Submit warranty claim for controller board replacement.'
    ],
    claimRecommendation: true,
    options: [
      { label: 'File Warranty Claim for Controller Failure', next: 'TRANSFER_TO_CLAIM', category: 'No Power / Won\'t Turn On' },
      { label: 'Back to Menu', next: 'ROOT' },
    ],
  },

  // ==========================================
  // BRANCH 5: PHYSICAL DAMAGE & HOTSPOTS
  // ==========================================
  SYMPTOM_PHYSICAL_HOTSPOT: {
    title: 'Step 1: Check Physical Surface Conditions',
    message: (product) => `### Triage: Panel Scorching or Physical Damage
Physical abnormalities can pose fire hazards or cause catastrophic cell degradation.

What physical damage is visible on the solar panel or casing?`,
    options: [
      { label: 'Brown / black burned spots on individual solar cells (Hotspot)', next: 'DIAG_THERMAL_HOTSPOT' },
      { label: 'Spiderweb glass fracture from rock / debris impact', next: 'DIAG_GLASS_FRACTURE' },
      { label: 'Bracket / screw mount loosened after storm', next: 'DIAG_HARDWARE_MOUNT' },
      { label: 'Back to Menu', next: 'ROOT' },
    ],
  },

  DIAG_THERMAL_HOTSPOT: {
    title: 'Diagnosis: Thermal Hotspot & Bypass Diode Breakdown',
    faultCode: 'FLT-PV-015',
    category: 'Physical / Water Ingress',
    severity: 'critical',
    severityLabel: 'Critical • Fire Hazard Prevention',
    confidence: '96%',
    telemetry: {
      pvEfficiency: '40% Severe Degradation',
      panelVoltage: '12.1V',
      batteryVoltage: 'Unknown',
      bmsState: 'Thermal Warning',
      ipIntegrity: 'Substrate Delaminated'
    },
    message: (product) => `### Diagnostic Verdict: Severe Photovoltaic Thermal Hotspot

Dark localized burn marks or discolored rings on the solar cells indicate a **thermal hotspot**. 

#### What Happened?
When an internal silicon wafer develops a micro-crack or persistent leaf shadow, current from surrounding healthy cells is forced through the damaged spot, dissipating intense heat (>120°C) and melting EVA plastic laminate.

#### Safety Recommendation:
* Disconnect the panel immediately. Hotspots permanently degrade output and can singe backing material.
* Eligible for warranty replacement under JD Solar quality coverage.`,
    remedySteps: [
      'Safely disconnect the solar panel wiring.',
      'Photograph the burned marks for warranty evidence.',
      'Submit warranty replacement claim.'
    ],
    claimRecommendation: true,
    options: [
      { label: 'Submit Warranty Claim for Hotspot', next: 'TRANSFER_TO_CLAIM', category: 'Physical / Water Ingress' },
      { label: 'Back to Menu', next: 'ROOT' },
    ],
  },

  DIAG_GLASS_FRACTURE: {
    title: 'Diagnosis: Tempered Glass Fracture',
    faultCode: 'FLT-EXT-016',
    category: 'Physical / Water Ingress',
    severity: 'critical',
    severityLabel: 'Critical • Water Seal Broken',
    confidence: '100%',
    telemetry: {
      pvEfficiency: '50% (Refraction Lost)',
      panelVoltage: '14.0V',
      batteryVoltage: '3.1V',
      bmsState: 'Active',
      ipIntegrity: 'FAILED (Glass Broken)'
    },
    message: (product) => `### Diagnostic Verdict: Shattered Tempered Glass

Even if the light still temporarily operates with cracked glass, rain will penetrate the silicon layers within days, corroding silver grid lines and ruining the battery.

Our branch stocks replacement aviation aluminum frame glass modules. Submit a ticket for quote or warranty evaluation.`,
    remedySteps: [
      'Take photos of the glass fracture.',
      'Submit claim for replacement panel glass module.'
    ],
    claimRecommendation: true,
    options: [
      { label: 'Request Replacement Panel Glass Module', next: 'TRANSFER_TO_CLAIM', category: 'Physical / Water Ingress' },
      { label: 'Back to Menu', next: 'ROOT' },
    ],
  },

  DIAG_HARDWARE_MOUNT: {
    title: 'Diagnosis: Mounting Hardware Loose',
    faultCode: 'FLT-MNT-017',
    category: 'Physical / Water Ingress',
    severity: 'mild',
    severityLabel: 'Mild • DIY Tightening',
    confidence: '95%',
    telemetry: {
      pvEfficiency: '100% Intact',
      panelVoltage: '18.2V',
      batteryVoltage: '3.28V',
      bmsState: 'Normal',
      ipIntegrity: 'Passed'
    },
    message: (product) => `### Diagnostic Verdict: Mechanical Pole Bracket Slack

High wind buffeting can loosen expansion bolts or pole u-clamps. 

#### Remedy:
* Use a 10mm or 14mm socket wrench to tighten all stainless steel clamp bolts.
* Apply thread locker or spring lock washers to prevent future wind vibration looseness.`,
    remedySteps: [
      'Tighten all bracket mounting bolts with socket wrench.',
      'Ensure solar panel angle is firmly fixed.'
    ],
    claimRecommendation: false,
    options: [
      { label: 'Bracket Tightened & Secure (Solved)', next: 'RESOLVED_DIY' },
      { label: 'Back to Menu', next: 'ROOT' },
    ],
  },

  // ==========================================
  // BRANCH 6: SENSOR & REMOTE CONTROL
  // ==========================================
  SYMPTOM_SENSOR_REMOTE: {
    title: 'Step 1: Check Remote Handset & Sensor Lens',
    message: (product) => `### Triage: Remote Control or Radar Sensor
Let's troubleshoot control responsiveness on your **${product?.product_name || 'unit'}**.

What issue are you experiencing?`,
    options: [
      { label: 'Remote red indicator does not light up when buttons pressed', next: 'DIAG_REMOTE_BATTERIES' },
      { label: 'Remote blinks, but light does not respond or beep', next: 'DIAG_REMOTE_RANGE' },
      { label: 'Motion sensor does not trigger when people walk underneath', next: 'DIAG_RADAR_DIRT' },
      { label: 'Back to Menu', next: 'ROOT' },
    ],
  },

  DIAG_REMOTE_BATTERIES: {
    title: 'Diagnosis: Remote Control AAA Batteries Depleted',
    faultCode: 'FLT-RMT-018',
    category: 'Remote Control Failure',
    severity: 'mild',
    severityLabel: 'Mild • 1-Minute Fix',
    confidence: '99%',
    telemetry: {
      pvEfficiency: '100%',
      panelVoltage: '18.2V',
      batteryVoltage: '3.25V',
      bmsState: 'Awaiting IR Signal',
      ipIntegrity: 'Passed'
    },
    message: (product) => `### Diagnostic Verdict: Remote Handset Batteries Depleted

The infrared LED on the tip of the remote requires 3.0V DC. Slide off the back battery cover of the remote and install **2 new AAA 1.5V Alkaline batteries**. Verify the red indicator LED illuminates firmly when you press any key.`,
    remedySteps: [
      'Slide open battery compartment on remote.',
      'Replace with 2 fresh AAA batteries.',
      'Test operation pointing at solar lamp.'
    ],
    claimRecommendation: false,
    options: [
      { label: 'Replaced AAA Batteries & Remote Works!', next: 'RESOLVED_DIY' },
      { label: 'Still Not Working: Try Range Triage', next: 'DIAG_REMOTE_RANGE' },
    ],
  },

  DIAG_REMOTE_RANGE: {
    title: 'Diagnosis: Infrared Angle or Range Obstruction',
    faultCode: 'FLT-RMT-019',
    category: 'Remote Control Failure',
    severity: 'mild',
    severityLabel: 'Mild • Technique Adjustment',
    confidence: '92%',
    telemetry: {
      pvEfficiency: '100%',
      panelVoltage: '18.2V',
      batteryVoltage: '3.25V',
      bmsState: 'Ready',
      ipIntegrity: 'Passed'
    },
    message: (product) => `### Diagnostic Verdict: Infrared Line-of-Sight & Range Issue

The remote uses an infrared optical transmitter with an optimal range of **5 to 8 meters**.

#### Proper Aiming Technique:
* Stand within **6 meters** directly beneath or in front of the fixture.
* Aim the remote tip straight at the translucent sensor bubble on the lamp head.
* Press and hold the **"AUTO"** button firmly for 2 seconds until the lamp flashes to confirm reception.`,
    remedySteps: [
      'Stand within 5-6 meters of the light pole.',
      'Aim directly at the front optical receiver.',
      'Press "AUTO" or "ON" firmly.'
    ],
    claimRecommendation: false,
    options: [
      { label: 'Aimed Closer & Light Responded! (Solved)', next: 'RESOLVED_DIY' },
      { label: 'Remote Completely Dead: File Warranty Claim', next: 'TRANSFER_TO_CLAIM', category: 'Remote Control Failure' },
    ],
  },

  DIAG_RADAR_DIRT: {
    title: 'Diagnosis: Microwave Radar Sensitivity Obscured',
    faultCode: 'FLT-SNS-020',
    category: 'Sensor / Dusk-Dawn Failure',
    severity: 'mild',
    severityLabel: 'Mild • Simple Reset',
    confidence: '91%',
    telemetry: {
      pvEfficiency: '100%',
      panelVoltage: '18.2V',
      batteryVoltage: '3.25V',
      bmsState: 'Sensor Ready',
      ipIntegrity: 'Passed'
    },
    message: (product) => `### Diagnostic Verdict: Radar Mode Disabled / Fresnel Window Smudged

If the motion sensor doesn't surge to 100% brightness when someone passes:
1. The remote may currently be in **"ALWAYS / Constant"** mode which bypasses radar.
2. Press the **"RADAR"** or **"AUTO"** button on the remote control. The lamp will blink twice to confirm radar induction is re-enabled.
3. Wipe the small rounded plastic sensor dome on the lamp head with a clean cloth.`,
    remedySteps: [
      'Press the "RADAR" button on your remote control.',
      'Observe the lamp blink twice.',
      'Walk 5 meters away, wait 20 seconds for dimming, then approach to test.'
    ],
    claimRecommendation: false,
    options: [
      { label: 'Radar Motion Sensitivity Restored (Solved)', next: 'RESOLVED_DIY' },
      { label: 'Sensor Still Broken: File Claim', next: 'TRANSFER_TO_CLAIM', category: 'Sensor / Dusk-Dawn Failure' },
    ],
  },

  // ==========================================
  // RESOLVED NODE
  // ==========================================
  RESOLVED_DIY: {
    title: 'Diagnostic Issue Resolved',
    message: (product) => `### Problem Successfully Resolved!

Congratulations! Your **${product?.product_name || 'solar panel system'}** has been diagnosed and restored to optimal operation through our guided self-help steps.

* **Electricity Saved:** ₱0.00 grid cost maintained!
* **Next Routine Check:** Clean panel glass in 90 days for peak performance.
* **Support Available:** Quiapo & Cavite branches remain at your service.`,
    options: [
      { label: 'Run Diagnostic on Another Product', next: 'ROOT' },
      { label: 'Return to Customer Dashboard', action: 'CLOSE' },
    ],
  },

  // ==========================================
  // STORE INFO
  // ==========================================
  BRANCH_INFO: {
    title: 'JD Solar Service Centers',
    message: () => `### JD Solar Branch Locations & Hotline

Our branch technicians can inspect, bench-test, or replace components on site:

#### 1. Cavite Hub (LGU & Service Center)
* **Address:** General Trias, Cavite
* **Hours:** Mon–Sat: 8:00 AM – 5:00 PM
* **Phone / Viber:** 0917-XXX-XXXX

#### 2. Quiapo Showroom (Manila)
* **Address:** Evangelista St., Quiapo Commercial Center, Manila
* **Hours:** Mon–Sat: 8:30 AM – 5:30 PM
* **Phone / Viber:** 0918-XXX-XXXX`,
    options: [
      { label: 'File Official Claim First', next: 'TRANSFER_TO_CLAIM', category: 'No Power / Won\'t Turn On' },
      { label: 'Diagnostic Main Menu', next: 'ROOT' },
    ],
  },
}

/**
 * Keyword-based intent parser for natural free-text input
 */
export function matchDiagnosticFreeText(query, product) {
  const q = (query || '').toLowerCase().trim()

  if (['turn on', 'wont turn', 'no power', 'dead', 'dark', 'hindi bumubukas', 'patay', 'wont start'].some(k => q.includes(k))) {
    return DIAGNOSTIC_TREE.SYMPTOM_NO_POWER
  }

  if (['shut off', 'dies', 'hour', '1 hour', '2 hours', '3 hours', 'drain', 'mabilis maubos', 'battery low', 'short'].some(k => q.includes(k))) {
    return DIAGNOSTIC_TREE.SYMPTOM_SHORT_RUNTIME
  }

  if (['dim', 'flicker', 'kurap', 'strobe', 'mahina', 'weak', 'low light', 'dull'].some(k => q.includes(k))) {
    return DIAGNOSTIC_TREE.SYMPTOM_DIM_FLICKER
  }

  if (['daytime', 'araw', 'wont turn off', 'butil', 'sunlight', 'always on', 'hindi namamatay'].some(k => q.includes(k))) {
    return DIAGNOSTIC_TREE.SYMPTOM_DAYTIME_ON
  }

  if (['hot', 'burned', 'sunog', 'crack', 'basag', 'glass', 'init', 'smell', 'shatter'].some(k => q.includes(k))) {
    return DIAGNOSTIC_TREE.SYMPTOM_PHYSICAL_HOTSPOT
  }

  if (['remote', 'sensor', 'radar', 'motion', 'pindot', 'batteries', 'unresponsive'].some(k => q.includes(k))) {
    return DIAGNOSTIC_TREE.SYMPTOM_SENSOR_REMOTE
  }

  if (['check', 'diagnose', 'troubleshoot', 'test', 'status', 'health', 'help', 'guide'].some(k => q.includes(k))) {
    return DIAGNOSTIC_TREE.ROOT
  }

  if (['emoji', 'emojis', 'emoticon', 'emoticons'].some(k => q.includes(k))) {
    return {
      title: 'Solar Troubleshooting Guide',
      message: (product) => `The Solar Troubleshooting Guide operates in a clean, text-only mode without emojis. Please select an observed symptom below to begin hardware triage on your **${product?.product_name || 'unit'}**:`,
      options: DIAGNOSTIC_TREE.ROOT.options
    }
  }

  // Default fallback to main menu
  return DIAGNOSTIC_TREE.ROOT
}
