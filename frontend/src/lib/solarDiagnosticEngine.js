// frontend/src/lib/solarDiagnosticEngine.js
// Multi-Criteria Rule-Based Expert Diagnostic Engine for Off-Grid Solar Luminaires
// Evaluates hardware faults across 4 weighted diagnostic criteria pillars:
//   1. Electrical & Charging Continuity (30%)
//   2. Physical & Enclosure Integrity (25%)
//   3. Environmental & Solar Irradiance (25%)
//   4. Operational Control & Lifecycle Age (20%)
// Strictly text/icon-driven, industrial tone, zero emojis.

export const DIAGNOSTIC_CRITERIA_WEIGHTS = {
  electrical: 0.30,
  physical: 0.25,
  environmental: 0.25,
  control: 0.20,
}

export const CRITERIA_PILLAR_META = [
  {
    key: 'electrical',
    label: 'Electrical Continuity',
    shortLabel: '1. Electrical (30%)',
    weight: 0.30,
    weightLabel: '30%',
    description: 'PV charging indicator state, circuit loop continuity, and LED driver regulation',
  },
  {
    key: 'physical',
    label: 'Physical & IP Seal',
    shortLabel: '2. Physical Seal (25%)',
    weight: 0.25,
    weightLabel: '25%',
    description: 'IP65/IP67 gasket integrity, lens moisture, glass surface, cell hotspots, and mounting',
  },
  {
    key: 'environmental',
    label: 'Environmental Exposure',
    shortLabel: '3. Environment (25%)',
    weight: 0.25,
    weightLabel: '25%',
    description: 'Recent solar irradiance, monsoon cloud cover, surface soiling, shading, and tilt angle',
  },
  {
    key: 'control',
    label: 'Control & Lifecycle',
    shortLabel: '4. Control & Age (20%)',
    weight: 0.20,
    weightLabel: '20%',
    description: 'Master waterproof switch, IR remote/radar induction mode, and service age',
  },
]

export const DIAGNOSTIC_CRITERIA_OPTIONS = {
  symptom: [
    { value: 'NO_POWER', label: 'Light Does NOT Turn On at Night' },
    { value: 'SHORT_RUNTIME', label: 'Shuts Off Prematurely (Only 1–3 Hours)' },
    { value: 'DIM_FLICKER', label: 'Dim Illumination or Flickering LEDs' },
    { value: 'DAYTIME_ON', label: 'Light Stays ON During Bright Daytime' },
    { value: 'PHYSICAL_HOTSPOT', label: 'Panel Heat / Discoloration / Broken Glass' },
    { value: 'SENSOR_REMOTE', label: 'Remote Control / Radar Sensor Not Responding' },
  ],
  electrical: [
    { value: 'LED_BLINKING', label: 'Charging LED Blinks Normally Under Midday Sun', status: 'PASS' },
    { value: 'LED_DARK', label: 'Charging LED Completely Dark in Sun (0V Open Loop)', status: 'FAIL' },
    { value: 'LED_RIPPLE', label: 'Rapid Strobe / Fluctuating Driver Current', status: 'FAIL' },
    { value: 'LED_PARTIAL_DARK', label: 'Half of LED Array Dark / Partial String Out', status: 'FAIL' },
    { value: 'DAY_BLIND_LOW_V', label: 'Panel Shaded / Senses < 5.0V Threshold in Daytime', status: 'WARNING' },
    { value: 'DAY_SUN_SHORT', label: 'Panel Generating > 15V in Sun Yet Lamp Stays On', status: 'FAIL' },
  ],
  physical: [
    { value: 'SEAL_INTACT', label: 'Housing Sealed, Lens Dry & Glass Intact (IP65 Verified)', status: 'PASS' },
    { value: 'PLUG_LOOSE', label: 'Waterproof Aviation Plug or Lead Loose / Unseated', status: 'FAIL' },
    { value: 'WATER_INGRESS', label: 'Condensation or Water Droplets Inside Optical Lens', status: 'FAIL' },
    { value: 'CELL_HOTSPOT', label: 'Localized Brown / Black Burned Marks on Solar Cells', status: 'FAIL' },
    { value: 'GLASS_FRACTURE', label: 'Cracked or Shattered Tempered Glass Surface', status: 'FAIL' },
    { value: 'MOUNT_LOOSE', label: 'Pole Bracket or Stainless Clamp Bolts Loosened', status: 'WARNING' },
  ],
  environmental: [
    { value: 'CLEAR_SUN', label: 'Unobstructed Direct Sun (4–6+ Peak Sun Hours)', status: 'PASS' },
    { value: 'MONSOON_OVERCAST', label: '2–3+ Consecutive Stormy or Heavy Overcast Days', status: 'WARNING' },
    { value: 'HEAVY_SOILING', label: 'Heavy Road Dust, Exhaust Soot, or Bird Droppings on Glass', status: 'WARNING' },
    { value: 'PARTIAL_SHADING', label: 'Tree Branches or Roof Eaves Cast Shadow (10 AM–3 PM)', status: 'WARNING' },
    { value: 'FLAT_NORTH_TILT', label: 'Panel Mounted Flat (0 deg) or Oriented North', status: 'WARNING' },
  ],
  control: [
    { value: 'AUTO_NORMAL', label: 'Master Switch ON • Auto Mode • Under 24 Months In Service', status: 'PASS' },
    { value: 'SWITCH_OFF', label: 'Master Waterproof Push-Switch Disengaged / Not Toggled', status: 'WARNING' },
    { value: 'RADAR_STANDBY', label: 'Radar Eco Mode Active (30% Standby / 100% Motion Surge)', status: 'PASS' },
    { value: 'AGED_CELLS', label: 'Unit in Service 2+ Years (Gradual Discharge Drop)', status: 'FAIL' },
    { value: 'REMOTE_DEAD_BAT', label: 'Remote Handset Indicator Unlit (AAA Cells Depleted)', status: 'WARNING' },
    { value: 'REMOTE_OUT_OF_RANGE', label: 'Remote Blinks but Aimed > 6 Meters or Off-Angle', status: 'WARNING' },
    { value: 'RADAR_DISABLED', label: 'Radar Induction Disabled or Sensor Window Smudged', status: 'WARNING' },
  ],
}

export const SYMPTOM_SEVERITY_PRIORITY = {
  PHYSICAL_HOTSPOT: 1, // Highest severity (Physical damage/fire/broken glass)
  NO_POWER: 2,         // Total electrical blackout / BMS lockout
  SHORT_RUNTIME: 3,    // Battery depletion / undercharging
  DIM_FLICKER: 4,      // Driver regulation / LED array burnout
  DAYTIME_ON: 5,       // Photocell inversion / MOSFET fault
  SENSOR_REMOTE: 6,    // Remote handset / Radar sensor smudging
}

export const DEFAULT_CRITERIA_STATE = {
  symptom: 'NO_POWER',
  symptoms: ['NO_POWER'],
  electrical: 'LED_BLINKING',
  physical: 'SEAL_INTACT',
  environmental: 'CLEAR_SUN',
  control: 'AUTO_NORMAL',
}

/**
 * Inspects registered purchase metadata to extract hardware form factor and warranty context.
 */
export function analyzeProductContext(product) {
  const name = String(product?.product_name || product?.name || 'Solar Lighting Unit')
  const lower = name.toLowerCase()
  const isIntegrated =
    lower.includes('integrated') ||
    lower.includes('all-in-one') ||
    lower.includes('all in one') ||
    lower.includes('aio') ||
    lower.includes('ufo')
  const isWarrantyActive = Boolean(product?.is_warranty_active)
  const isVoided = Boolean(product?.is_voided)
  const daysRemaining = typeof product?.days_remaining === 'number' ? product.days_remaining : null
  const warrantyMonths = product?.warranty_months || 24

  return {
    productName: name,
    watt: product?.watt || null,
    formFactor: isIntegrated ? 'INTEGRATED_AIO' : 'SPLIT_MODULAR',
    formFactorLabel: isIntegrated ? 'All-in-One Integrated Chassis' : 'Split-Type Panel & Luminaire',
    isWarrantyActive,
    isVoided,
    daysRemaining,
    warrantyMonths,
  }
}

/**
 * Formal Rule Base mapping multi-criteria state vectors to diagnostic nodes in DIAGNOSTIC_TREE.
 * Each rule specifies target criteria conditions and priority for elimination rules.
 */
export const DIAGNOSTIC_RULES = [
  // ELIMINATION / CRITICAL PHYSICAL SAFETY RULES (Evaluated with highest priority if physical damage is observed)
  {
    ruleId: 'RULE-IP-009',
    nodeKey: 'DIAG_WATER_INGRESS',
    faultCode: 'FLT-IP-009',
    priority: 100,
    matchCriteria: {
      symptom: ['DIM_FLICKER', 'NO_POWER', 'SHORT_RUNTIME', 'DAYTIME_ON', 'PHYSICAL_HOTSPOT'],
      physical: ['WATER_INGRESS'],
    },
  },
  {
    ruleId: 'RULE-EXT-016',
    nodeKey: 'DIAG_GLASS_FRACTURE',
    faultCode: 'FLT-EXT-016',
    priority: 98,
    matchCriteria: {
      symptom: ['PHYSICAL_HOTSPOT', 'NO_POWER', 'SHORT_RUNTIME', 'DIM_FLICKER'],
      physical: ['GLASS_FRACTURE'],
    },
  },
  {
    ruleId: 'RULE-PV-015',
    nodeKey: 'DIAG_THERMAL_HOTSPOT',
    faultCode: 'FLT-PV-015',
    priority: 96,
    matchCriteria: {
      symptom: ['PHYSICAL_HOTSPOT', 'SHORT_RUNTIME', 'NO_POWER'],
      physical: ['CELL_HOTSPOT'],
    },
  },

  // BRANCH 1: NO POWER RULES
  {
    ruleId: 'RULE-PWR-004',
    nodeKey: 'DIAG_SWITCH_DISENGAGED',
    faultCode: 'FLT-PWR-004',
    priority: 85,
    matchCriteria: {
      symptom: ['NO_POWER'],
      control: ['SWITCH_OFF'],
    },
  },
  {
    ruleId: 'RULE-PV-001',
    nodeKey: 'DIAG_OPEN_CIRCUIT',
    faultCode: 'FLT-PV-001',
    priority: 82,
    matchCriteria: {
      symptom: ['NO_POWER', 'SHORT_RUNTIME'],
      electrical: ['LED_DARK'],
      physical: ['PLUG_LOOSE', 'SEAL_INTACT'],
    },
  },
  {
    ruleId: 'RULE-ENV-003',
    nodeKey: 'DIAG_RAIN_DEPLETION',
    faultCode: 'FLT-ENV-003',
    priority: 80,
    matchCriteria: {
      symptom: ['NO_POWER', 'SHORT_RUNTIME'],
      electrical: ['LED_BLINKING'],
      physical: ['SEAL_INTACT'],
      environmental: ['MONSOON_OVERCAST'],
      control: ['AUTO_NORMAL', 'RADAR_STANDBY'],
    },
  },
  {
    ruleId: 'RULE-BAT-002',
    nodeKey: 'DIAG_BMS_LOCKOUT',
    faultCode: 'FLT-BAT-002',
    priority: 78,
    matchCriteria: {
      symptom: ['NO_POWER'],
      electrical: ['LED_BLINKING'],
      physical: ['SEAL_INTACT'],
      environmental: ['CLEAR_SUN', 'MONSOON_OVERCAST'],
      control: ['AUTO_NORMAL'],
    },
  },

  // BRANCH 2: SHORT RUNTIME RULES
  {
    ruleId: 'RULE-PV-005',
    nodeKey: 'DIAG_SOILING_LOSS',
    faultCode: 'FLT-PV-005',
    priority: 76,
    matchCriteria: {
      symptom: ['SHORT_RUNTIME', 'DIM_FLICKER', 'NO_POWER'],
      electrical: ['LED_BLINKING', 'LED_DARK'],
      physical: ['SEAL_INTACT'],
      environmental: ['HEAVY_SOILING'],
    },
  },
  {
    ruleId: 'RULE-PV-006',
    nodeKey: 'DIAG_SHADING_LOSS',
    faultCode: 'FLT-PV-006',
    priority: 75,
    matchCriteria: {
      symptom: ['SHORT_RUNTIME', 'NO_POWER'],
      electrical: ['LED_BLINKING', 'DAY_BLIND_LOW_V'],
      physical: ['SEAL_INTACT'],
      environmental: ['PARTIAL_SHADING'],
    },
  },
  {
    ruleId: 'RULE-PV-007',
    nodeKey: 'DIAG_TILT_MISALIGNMENT',
    faultCode: 'FLT-PV-007',
    priority: 74,
    matchCriteria: {
      symptom: ['SHORT_RUNTIME'],
      electrical: ['LED_BLINKING'],
      physical: ['SEAL_INTACT'],
      environmental: ['FLAT_NORTH_TILT'],
    },
  },
  {
    ruleId: 'RULE-BAT-008',
    nodeKey: 'DIAG_BATTERY_AGING',
    faultCode: 'FLT-BAT-008',
    priority: 77,
    matchCriteria: {
      symptom: ['SHORT_RUNTIME', 'NO_POWER'],
      electrical: ['LED_BLINKING'],
      physical: ['SEAL_INTACT'],
      environmental: ['CLEAR_SUN'],
      control: ['AGED_CELLS', 'AUTO_NORMAL'],
    },
  },

  // BRANCH 3: DIM OR FLICKERING RULES
  {
    ruleId: 'RULE-SET-010',
    nodeKey: 'DIAG_NORMAL_RADAR',
    faultCode: 'FLT-SET-010',
    priority: 80,
    matchCriteria: {
      symptom: ['DIM_FLICKER', 'SENSOR_REMOTE'],
      electrical: ['LED_BLINKING'],
      physical: ['SEAL_INTACT'],
      control: ['RADAR_STANDBY'],
    },
  },
  {
    ruleId: 'RULE-DRV-011',
    nodeKey: 'DIAG_VOLTAGE_RIPPLE',
    faultCode: 'FLT-DRV-011',
    priority: 79,
    matchCriteria: {
      symptom: ['DIM_FLICKER'],
      electrical: ['LED_RIPPLE'],
      physical: ['SEAL_INTACT'],
    },
  },
  {
    ruleId: 'RULE-LED-012',
    nodeKey: 'DIAG_LED_ARRAY_BURNOUT',
    faultCode: 'FLT-LED-012',
    priority: 81,
    matchCriteria: {
      symptom: ['DIM_FLICKER'],
      electrical: ['LED_PARTIAL_DARK'],
      physical: ['SEAL_INTACT'],
    },
  },

  // BRANCH 4: DAYTIME ON RULES
  {
    ruleId: 'RULE-SNS-013',
    nodeKey: 'DIAG_PHOTOCELL_BLOCKED',
    faultCode: 'FLT-SNS-013',
    priority: 80,
    matchCriteria: {
      symptom: ['DAYTIME_ON'],
      electrical: ['DAY_BLIND_LOW_V'],
      environmental: ['PARTIAL_SHADING', 'HEAVY_SOILING', 'CLEAR_SUN'],
    },
  },
  {
    ruleId: 'RULE-CTL-014',
    nodeKey: 'DIAG_MOSFET_FAULT',
    faultCode: 'FLT-CTL-014',
    priority: 84,
    matchCriteria: {
      symptom: ['DAYTIME_ON'],
      electrical: ['DAY_SUN_SHORT', 'LED_BLINKING'],
      environmental: ['CLEAR_SUN'],
    },
  },

  // BRANCH 5: MECHANICAL MOUNT RULE
  {
    ruleId: 'RULE-MNT-017',
    nodeKey: 'DIAG_HARDWARE_MOUNT',
    faultCode: 'FLT-MNT-017',
    priority: 75,
    matchCriteria: {
      symptom: ['PHYSICAL_HOTSPOT', 'SHORT_RUNTIME'],
      physical: ['MOUNT_LOOSE'],
    },
  },

  // BRANCH 6: REMOTE & SENSOR RULES
  {
    ruleId: 'RULE-RMT-018',
    nodeKey: 'DIAG_REMOTE_BATTERIES',
    faultCode: 'FLT-RMT-018',
    priority: 82,
    matchCriteria: {
      symptom: ['SENSOR_REMOTE'],
      control: ['REMOTE_DEAD_BAT'],
    },
  },
  {
    ruleId: 'RULE-RMT-019',
    nodeKey: 'DIAG_REMOTE_RANGE',
    faultCode: 'FLT-RMT-019',
    priority: 78,
    matchCriteria: {
      symptom: ['SENSOR_REMOTE'],
      control: ['REMOTE_OUT_OF_RANGE'],
    },
  },
  {
    ruleId: 'RULE-SNS-020',
    nodeKey: 'DIAG_RADAR_DIRT',
    faultCode: 'FLT-SNS-020',
    priority: 77,
    matchCriteria: {
      symptom: ['SENSOR_REMOTE', 'DIM_FLICKER'],
      control: ['RADAR_DISABLED'],
    },
  },
]

/**
 * Helper to look up human-readable label and status for a criterion value.
 */
function getCriterionMeta(pillarKey, value) {
  const list = DIAGNOSTIC_CRITERIA_OPTIONS[pillarKey] || []
  const found = list.find((item) => item.value === value)
  if (found) return found
  return { value, label: value || 'Evaluated', status: 'PASS' }
}

/**
 * Builds the 4-Pillar Diagnostic Criteria Scorecard for a given criteria state vector.
 */
export function buildCriteriaScorecard(criteriaState = DEFAULT_CRITERIA_STATE) {
  const merged = { ...DEFAULT_CRITERIA_STATE, ...criteriaState }

  return CRITERIA_PILLAR_META.map((pillar) => {
    const val = merged[pillar.key]
    const meta = getCriterionMeta(pillar.key, val)
    const numericScore = meta.status === 'PASS' ? 100 : meta.status === 'WARNING' ? 60 : 20

    return {
      key: pillar.key,
      criterion: pillar.label,
      weightLabel: pillar.weightLabel,
      weight: pillar.weight,
      value: val,
      observation: meta.label,
      status: meta.status, // 'PASS' | 'WARNING' | 'FAIL'
      score: numericScore,
    }
  })
}

/**
 * Detects compound / secondary contributing factors when multiple adverse criteria are present simultaneously.
 */
export function detectCompoundFactors(criteriaState, primaryNodeKey) {
  const factors = []
  const c = { ...DEFAULT_CRITERIA_STATE, ...criteriaState }

  if (c.physical === 'WATER_INGRESS' && primaryNodeKey !== 'DIAG_WATER_INGRESS') {
    factors.push({
      code: 'FLT-IP-009',
      title: 'Secondary Enclosure Moisture Risk',
      detail: 'Visible lens condensation requires immediate power-off and gasket resealing to prevent PCB corrosion.',
    })
  }
  if (c.physical === 'GLASS_FRACTURE' && primaryNodeKey !== 'DIAG_GLASS_FRACTURE') {
    factors.push({
      code: 'FLT-EXT-016',
      title: 'Tempered Glass Integrity Breach',
      detail: 'Fractured panel glass compromises IP65 weatherproofing and disqualifies free warranty replacement.',
    })
  }
  if (c.physical === 'PLUG_LOOSE' && primaryNodeKey !== 'DIAG_OPEN_CIRCUIT') {
    factors.push({
      code: 'FLT-PV-001',
      title: 'Loose Waterproof Aviation Connector',
      detail: 'Unseated rotary connector collar introduces contact resistance and intermittent charging dropout.',
    })
  }
  if (c.environmental === 'MONSOON_OVERCAST' && primaryNodeKey !== 'DIAG_RAIN_DEPLETION') {
    factors.push({
      code: 'FLT-ENV-003',
      title: 'Concurrent Monsoon Irradiance Deficit',
      detail: 'Recent overcast weather reduced daily harvest by up to 80%. Switch remote to Radar Eco Mode during recovery.',
    })
  }
  if (c.environmental === 'HEAVY_SOILING' && primaryNodeKey !== 'DIAG_SOILING_LOSS') {
    factors.push({
      code: 'FLT-PV-005',
      title: 'Surface Soiling Attenuation (-35% to -50% Harvest)',
      detail: 'Accumulated road soot or bird droppings on the tempered glass is compounding battery undercharge.',
    })
  }
  if (c.environmental === 'PARTIAL_SHADING' && primaryNodeKey !== 'DIAG_SHADING_LOSS') {
    factors.push({
      code: 'FLT-PV-006',
      title: 'Midday Micro-Shading Bottleneck',
      detail: 'Partial shadow between 10:00 AM and 3:00 PM chokes series string current via bypass diode clamping.',
    })
  }
  if (c.environmental === 'FLAT_NORTH_TILT' && primaryNodeKey !== 'DIAG_TILT_MISALIGNMENT') {
    factors.push({
      code: 'FLT-PV-007',
      title: 'Sub-Optimal Panel Tilt / Azimuth',
      detail: 'Flat (0 deg) or North-facing orientation causes rainwater mud pooling and 25–35% incidence loss.',
    })
  }
  if (c.control === 'SWITCH_OFF' && primaryNodeKey !== 'DIAG_SWITCH_DISENGAGED') {
    factors.push({
      code: 'FLT-PWR-004',
      title: 'Master Push-Switch Disengaged',
      detail: 'Ensure the physical waterproof button on the luminaire body is toggled ON before testing night activation.',
    })
  }
  if (c.control === 'AGED_CELLS' && primaryNodeKey !== 'DIAG_BATTERY_AGING') {
    factors.push({
      code: 'FLT-BAT-008',
      title: 'LiFePO4 Cycle Aging (>24 Months)',
      detail: 'Elevated internal cell resistance after 2+ years of service reduces nocturnal reserve capacity.',
    })
  }

  // Multi-symptom secondary contributing factor extraction
  const activeSymptoms = Array.isArray(c.symptoms) && c.symptoms.length > 0 ? c.symptoms : [c.symptom]
  const primarySymptom = c.symptom || activeSymptoms[0]

  const SECONDARY_SYMPTOM_FACTORS = {
    SENSOR_REMOTE: {
      code: 'FLT-RAD-010',
      title: 'Secondary Remote/Radar Receiver Abnormality',
      detail: 'Handheld infrared controller or radar microwave induction receiver circuit failure compounding primary issue.',
    },
    DIM_FLICKER: {
      code: 'FLT-LED-004',
      title: 'Secondary LED Array / Driver Voltage Fluctuation',
      detail: 'Observed strobing or sub-nominal luminous output indicates concurrent buck driver or LED chip degradation.',
    },
    SHORT_RUNTIME: {
      code: 'FLT-BAT-002',
      title: 'Secondary Battery Capacity Depletion',
      detail: 'Accelerated nocturnal battery discharge compounding primary issue, requiring 48-hour sun-soak or cell test.',
    },
    NO_POWER: {
      code: 'FLT-PWR-001',
      title: 'Secondary Circuit Open-Loop Condition',
      detail: 'Intermittent or complete electrical circuit dropout detected in conjunction with other symptoms.',
    },
    DAYTIME_ON: {
      code: 'FLT-SNS-013',
      title: 'Secondary Photocell Sensor Inversion',
      detail: 'Fixture fails to sense daytime solar voltage threshold, operating daytime load continuously.',
    },
    PHYSICAL_HOTSPOT: {
      code: 'FLT-PV-008',
      title: 'Secondary PV Module Hotspot / Heat Abnormality',
      detail: 'Localized solar cell discoloration or localized heat marks threaten long-term panel continuity.',
    },
  }

  activeSymptoms.forEach((sym) => {
    if (sym !== primarySymptom && SECONDARY_SYMPTOM_FACTORS[sym]) {
      factors.push(SECONDARY_SYMPTOM_FACTORS[sym])
    }
  })

  return factors
}

/**
 * Evaluates warranty eligibility criteria based on diagnosed fault node, physical criteria, and purchase coverage.
 */
export function evaluateWarrantyCriteria(diagnosisNode, criteriaState, product) {
  const ctx = analyzeProductContext(product)
  const faultCode = diagnosisNode?.faultCode || ''

  // 1. Disqualification Criterion: Shattered Glass / External Physical Impact
  if (faultCode === 'FLT-EXT-016' || criteriaState?.physical === 'GLASS_FRACTURE') {
    return {
      eligible: false,
      status: 'DISQUALIFIED_IMPACT',
      verdictLabel: 'Warranty Void • External Physical Impact',
      policyReason:
        'Shattered tempered glass or physical impact damage is classified as external trauma and is excluded from free replacement. Paid module servicing is available at Quiapo and Cavite branches.',
    }
  }

  // 2. Zero-Defect / DIY Maintenance Criterion (No hardware failure)
  if (!diagnosisNode?.claimRecommendation) {
    return {
      eligible: false,
      status: 'DIY_MAINTENANCE',
      verdictLabel: 'Zero-Defect / Field Maintenance Resolution',
      policyReason:
        'Multi-criteria evaluation indicates an environmental, control, or installation condition rather than an internal factory defect. Resolvable on-site without warranty claim.',
    }
  }

  // 3. Previously Voided Warranty
  if (ctx.isVoided) {
    return {
      eligible: false,
      status: 'VOIDED_RECORD',
      verdictLabel: 'Warranty Voided on Record • Shop Repair Only',
      policyReason:
        'This serial unit has a voided warranty status. Non-warranty bench repair and replacement components remain available at standard shop rates.',
    }
  }

  // 4. Expired Warranty Period (>24 Months)
  if (!ctx.isWarrantyActive) {
    return {
      eligible: false,
      status: 'EXPIRED_PERIOD',
      verdictLabel: 'Out-of-Warranty • Paid Bench Service Eligible',
      policyReason: `The ${ctx.warrantyMonths}-month coverage window has expired. You may submit a service ticket for paid battery or driver refurbishment at Quiapo or Cavite.`,
    }
  }

  // 5. Qualified for Official 24-Month Warranty Intake
  return {
    eligible: true,
    status: 'QUALIFIED_WARRANTY',
    verdictLabel: 'Meets 24-Month Warranty Intake Criteria',
    policyReason: `Internal hardware fault (${faultCode}) verified with intact external glass within active coverage (${
      ctx.daysRemaining !== null ? `${ctx.daysRemaining} days remaining` : 'Active'
    }). Eligible for bench verification and 1-time replacement entitlement.`,
  }
}

/**
 * Multi-Criteria Rule Inference Engine:
 * Evaluates a 5-attribute criteria state vector { symptom, electrical, physical, environmental, control }
 * against DIAGNOSTIC_RULES using weighted multi-attribute matching and priority elimination rules.
 */
export function evaluateDiagnosticCriteria(criteriaInput = {}, product = null) {
  const c = { ...DEFAULT_CRITERIA_STATE, ...criteriaInput }
  const activeSymptoms = Array.isArray(c.symptoms) && c.symptoms.length > 0 ? c.symptoms : [c.symptom]

  // Sort active symptoms by safety & severity priority (Physical > Blackout > Short Run > Dim > Daytime > Sensor)
  const sortedSymptoms = [...activeSymptoms].sort((a, b) => {
    const pA = SYMPTOM_SEVERITY_PRIORITY[a] || 99
    const pB = SYMPTOM_SEVERITY_PRIORITY[b] || 99
    return pA - pB
  })
  const highestSeveritySymptom = sortedSymptoms[0] || c.symptom
  c.symptom = highestSeveritySymptom
  c.symptoms = sortedSymptoms

  let bestRule = null
  let bestWeightedScore = -1

  for (const rule of DIAGNOSTIC_RULES) {
    const m = rule.matchCriteria
    let weightedMatch = 0
    let totalApplicableWeight = 0

    // Symptom match check: rule matches if any active symptom matches or rule is symptom-agnostic
    const matchingSymptoms = (m.symptom || []).filter((s) => sortedSymptoms.includes(s))
    const symptomMatches = !m.symptom || matchingSymptoms.length > 0
    if (!symptomMatches && rule.priority < 96) {
      continue
    }

    // Evaluate 4 weighted criteria pillars
    for (const pillar of CRITERIA_PILLAR_META) {
      const key = pillar.key
      const weight = pillar.weight
      totalApplicableWeight += weight

      if (m[key]) {
        if (m[key].includes(c[key])) {
          weightedMatch += weight
        } else {
          // Partial compatibility if user left criterion on default PASS state
          const meta = getCriterionMeta(key, c[key])
          if (meta.status === 'PASS') {
            weightedMatch += weight * 0.35
          }
        }
      } else {
        // Rule is agnostic to this pillar: award neutral-high match if pillar is PASS, slightly less if anomaly
        const meta = getCriterionMeta(key, c[key])
        weightedMatch += meta.status === 'PASS' ? weight * 0.85 : weight * 0.65
      }
    }

    // Priority bonus for critical elimination rules (e.g. Water Ingress, Glass Fracture, Hotspot)
    let priorityBonus = 0
    if (rule.priority >= 95 && m.physical && m.physical.includes(c.physical)) {
      priorityBonus = 0.45
    } else if (symptomMatches) {
      priorityBonus = (rule.priority / 100) * 0.12
    }

    // Compound correlation bonus: awarded when multiple symptoms are reported and rule matches highest severity
    let compoundBonus = 0
    if (sortedSymptoms.length > 1 && m.symptom && m.symptom.includes(highestSeveritySymptom)) {
      compoundBonus = 0.08
    }

    const finalScore = weightedMatch / (totalApplicableWeight || 1) + priorityBonus + compoundBonus

    if (finalScore > bestWeightedScore) {
      bestWeightedScore = finalScore
      bestRule = rule
    }
  }

  const targetNodeKey = bestRule?.nodeKey || 'DIAG_BMS_LOCKOUT'
  const baseNode = DIAGNOSTIC_TREE[targetNodeKey] || DIAGNOSTIC_TREE.DIAG_BMS_LOCKOUT

  // Calculate bounded confidence percentage (86% - 99%)
  const normalizedConfidence = Math.min(99, Math.max(86, Math.round(Math.min(1, bestWeightedScore) * 96)))
  const scorecard = buildCriteriaScorecard(c)
  const compoundFactors = detectCompoundFactors(c, targetNodeKey)
  const warrantyEvaluation = evaluateWarrantyCriteria(baseNode, c, product)
  const productContext = analyzeProductContext(product)

  return {
    ...baseNode,
    nodeKey: targetNodeKey,
    ruleId: bestRule?.ruleId || 'RULE-DEFAULT',
    confidence: `${normalizedConfidence}%`,
    evaluatedCriteria: c,
    criteriaScorecard: scorecard,
    compoundFactors,
    warrantyEvaluation,
    productContext,
  }
}

/**
 * Enriches any leaf DIAG_* node in DIAGNOSTIC_TREE with its canonical criteria state,
 * scorecard, compound factors, and warranty evaluation when accessed directly.
 */
export function enrichDiagnosisNode(nodeKey, node, product = null, customCriteria = null) {
  if (!node || !node.faultCode) return node
  const c = customCriteria || node.defaultCriteria || DEFAULT_CRITERIA_STATE
  const scorecard = buildCriteriaScorecard(c)
  const compoundFactors = detectCompoundFactors(c, nodeKey)
  const warrantyEvaluation = evaluateWarrantyCriteria(node, c, product)
  const productContext = analyzeProductContext(product)

  return {
    ...node,
    nodeKey,
    evaluatedCriteria: c,
    criteriaScorecard: scorecard,
    compoundFactors,
    warrantyEvaluation,
    productContext,
  }
}

// ============================================================================
// MULTI-STAGE DIAGNOSTIC DECISION GRAPH & LEAF VERDICT NODES
// ============================================================================

export const DIAGNOSTIC_TREE = {
  ROOT: {
    title: 'Multi-Criteria Solar Diagnostic System',
    stepStage: 0,
    message: (product) => {
      const ctx = analyzeProductContext(product)
      return `**JD Solar Multi-Criteria Hardware Diagnostic Engine**

Target Equipment: **${ctx.productName}** ${ctx.watt ? `(${ctx.watt}W)` : ''} • Form Factor: **${ctx.formFactorLabel}**

Because off-grid solar luminaires operate as standalone systems without remote telemetry, accurate fault isolation requires evaluating **four hardware criteria pillars**:
1. **Electrical Continuity (30%)** — Charging indicator & circuit state
2. **Physical & IP65 Integrity (25%)** — Lens seal, glass & connector state
3. **Environmental Exposure (25%)** — Irradiance, shading, soiling & tilt
4. **Operational Control & Age (20%)** — Switch state, radar mode & cell lifecycle

Select the primary symptom observed on your unit to begin the 3-step criteria audit, or switch to the **Criteria Matrix** above to configure all parameters directly:`
    },
    options: [
      {
        label: 'Light Does NOT Turn On at Night',
        next: 'SYMPTOM_NO_POWER',
        criteriaPatch: { symptom: 'NO_POWER' },
      },
      {
        label: 'Shuts Off Prematurely (Only 1–3 Hours)',
        next: 'SYMPTOM_SHORT_RUNTIME',
        criteriaPatch: { symptom: 'SHORT_RUNTIME' },
      },
      {
        label: 'Dim Illumination or Flickering LEDs',
        next: 'SYMPTOM_DIM_FLICKER',
        criteriaPatch: { symptom: 'DIM_FLICKER' },
      },
      {
        label: 'Light Stays ON During Bright Daytime',
        next: 'SYMPTOM_DAYTIME_ON',
        criteriaPatch: { symptom: 'DAYTIME_ON' },
      },
      {
        label: 'Panel Heat / Discoloration / Broken Glass',
        next: 'SYMPTOM_PHYSICAL_HOTSPOT',
        criteriaPatch: { symptom: 'PHYSICAL_HOTSPOT' },
      },
      {
        label: 'Remote Control / Radar Sensor Not Responding',
        next: 'SYMPTOM_SENSOR_REMOTE',
        criteriaPatch: { symptom: 'SENSOR_REMOTE' },
      },
    ],
  },

  // ==========================================================================
  // BRANCH 1: NO POWER AT NIGHT (3-STAGE MULTI-CRITERIA AUDIT)
  // ==========================================================================
  SYMPTOM_NO_POWER: {
    title: 'Criterion 1 of 3: Electrical & Switch Continuity (30% Weight)',
    stepStage: 1,
    activePillar: 'electrical',
    message: (product) => `### Criterion 1/3: Electrical & Charging Continuity
Symptom Logged: **Light Does Not Turn On at Night** on **${product?.product_name || 'unit'}**.

First, let us evaluate **Electrical Continuity (30% weight)**. During peak daylight hours (11:00 AM – 2:00 PM), what is the status of the **Charging Indicator LED** and the **Master Push-Switch**?`,
    options: [
      {
        label: 'Charging LED is completely dark (0V Open Circuit)',
        next: 'CRIT_NP_PHYSICAL',
        criteriaPatch: { symptom: 'NO_POWER', electrical: 'LED_DARK', control: 'AUTO_NORMAL' },
      },
      {
        label: 'Charging LED blinks normally in sun, but lamp stays off at night',
        next: 'CRIT_NP_PHYSICAL',
        criteriaPatch: { symptom: 'NO_POWER', electrical: 'LED_BLINKING', control: 'AUTO_NORMAL' },
      },
      {
        label: 'Not sure if the physical waterproof push-switch is toggled ON',
        next: 'CRIT_NP_PHYSICAL',
        criteriaPatch: { symptom: 'NO_POWER', electrical: 'LED_BLINKING', control: 'SWITCH_OFF' },
      },
      {
        label: 'Back to Symptom Selection',
        next: 'ROOT',
      },
    ],
  },

  CRIT_NP_PHYSICAL: {
    title: 'Criterion 2 of 3: Physical & Enclosure Integrity (25% Weight)',
    stepStage: 2,
    activePillar: 'physical',
    message: (product) => {
      const ctx = analyzeProductContext(product)
      return `### Criterion 2/3: Physical & IP65 Enclosure Inspection
Next, let us verify **Physical & Enclosure Integrity (25% weight)** on your **${ctx.formFactorLabel}**.

Inspect the optical lens cavity, tempered solar glass, and ${
        ctx.formFactor === 'INTEGRATED_AIO' ? 'chassis seal' : 'waterproof aviation cable plug'
      }. Which condition matches your unit?`
    },
    options: [
      {
        label: 'Housing & lens are sealed, dry, and intact (No visible damage)',
        next: 'CRIT_NP_ENV',
        criteriaPatch: { physical: 'SEAL_INTACT' },
      },
      {
        label: 'Aviation cable plug / lead appears loose, unseated, or nicked',
        next: 'CRIT_NP_ENV',
        criteriaPatch: { physical: 'PLUG_LOOSE' },
      },
      {
        label: 'Water droplets or fogging visible inside the optical lens',
        next: 'CRIT_NP_ENV',
        criteriaPatch: { physical: 'WATER_INGRESS' },
      },
      {
        label: 'Tempered solar glass is cracked or shattered from impact',
        next: 'CRIT_NP_ENV',
        criteriaPatch: { physical: 'GLASS_FRACTURE' },
      },
      {
        label: 'Restart Diagnostic Audit',
        next: 'ROOT',
      },
    ],
  },

  CRIT_NP_ENV: {
    title: 'Criterion 3 of 3: Environmental & Lifecycle Context (45% Weight)',
    stepStage: 3,
    activePillar: 'environmental',
    message: () => `### Criterion 3/3: Environmental Irradiance & Service History
Finally, let us evaluate **Environmental Exposure (25%)** and **Service Lifecycle (20%)** to complete the multi-criteria matrix.

What were the sunlight conditions over the past 72 hours, and how long has this unit been in service?`,
    options: [
      {
        label: 'Clear direct sunlight (4–6+ hrs/day) • Unit under 2 years old',
        next: 'EVALUATE_CRITERIA',
        criteriaPatch: { environmental: 'CLEAR_SUN' },
      },
      {
        label: '2–3+ consecutive stormy, rainy, or heavy overcast days',
        next: 'EVALUATE_CRITERIA',
        criteriaPatch: { environmental: 'MONSOON_OVERCAST' },
      },
      {
        label: 'Panel has heavy dust/soot or midday tree/roof shadow',
        next: 'EVALUATE_CRITERIA',
        criteriaPatch: { environmental: 'HEAVY_SOILING' },
      },
      {
        label: 'Clear sunlight, but unit has been in service for 2+ years',
        next: 'EVALUATE_CRITERIA',
        criteriaPatch: { environmental: 'CLEAR_SUN', control: 'AGED_CELLS' },
      },
    ],
  },

  // ==========================================================================
  // BRANCH 2: SHORT RUNTIME (3-STAGE MULTI-CRITERIA AUDIT)
  // ==========================================================================
  SYMPTOM_SHORT_RUNTIME: {
    title: 'Criterion 1 of 3: Daytime Harvest & Indicator State (30% Weight)',
    stepStage: 1,
    activePillar: 'electrical',
    message: (product) => `### Criterion 1/3: Daytime Charging Continuity
Symptom Logged: **Premature Shutoff (1–3 Hours Runtime)** on **${product?.product_name || 'unit'}**.

First, let us check **Electrical Continuity (30% weight)**. Does the green/red charging indicator blink steadily during midday sun, and what lighting mode is active?`,
    options: [
      {
        label: 'Charging LED blinks normally in sun • Standard Auto/Constant Mode',
        next: 'CRIT_SR_PHYSICAL',
        criteriaPatch: { symptom: 'SHORT_RUNTIME', electrical: 'LED_BLINKING', control: 'AUTO_NORMAL' },
      },
      {
        label: 'Charging LED blinks in sun • Unit is over 2+ years old',
        next: 'CRIT_SR_PHYSICAL',
        criteriaPatch: { symptom: 'SHORT_RUNTIME', electrical: 'LED_BLINKING', control: 'AGED_CELLS' },
      },
      {
        label: 'Charging LED is weak or dark even during bright midday sun',
        next: 'CRIT_SR_PHYSICAL',
        criteriaPatch: { symptom: 'SHORT_RUNTIME', electrical: 'LED_DARK', control: 'AUTO_NORMAL' },
      },
      {
        label: 'Back to Symptom Selection',
        next: 'ROOT',
      },
    ],
  },

  CRIT_SR_PHYSICAL: {
    title: 'Criterion 2 of 3: Physical Surface & Seal Inspection (25% Weight)',
    stepStage: 2,
    activePillar: 'physical',
    message: () => `### Criterion 2/3: Physical Panel & Enclosure Condition
Next, let us evaluate **Physical Integrity (25% weight)**.

Inspect the solar panel glass, cells, and luminaire lens. Are there any physical anomalies reducing charge retention?`,
    options: [
      {
        label: 'Glass, cells, and waterproof seal are completely intact and dry',
        next: 'CRIT_SR_ENV',
        criteriaPatch: { physical: 'SEAL_INTACT' },
      },
      {
        label: 'Brown/black burned discolorations visible on solar cells (Hotspot)',
        next: 'CRIT_SR_ENV',
        criteriaPatch: { physical: 'CELL_HOTSPOT' },
      },
      {
        label: 'Condensation or moisture droplets visible inside the lens',
        next: 'CRIT_SR_ENV',
        criteriaPatch: { physical: 'WATER_INGRESS' },
      },
      {
        label: 'Aviation connector or mounting bracket is loose',
        next: 'CRIT_SR_ENV',
        criteriaPatch: { physical: 'PLUG_LOOSE' },
      },
    ],
  },

  CRIT_SR_ENV: {
    title: 'Criterion 3 of 3: Irradiance, Soiling & Tilt Audit (25% Weight)',
    stepStage: 3,
    activePillar: 'environmental',
    message: () => `### Criterion 3/3: Environmental Irradiance & Placement Criteria
Finally, let us evaluate **Environmental Exposure (25% weight)**.

Which of the following describes the solar panel's outdoor exposure between 9:30 AM and 3:30 PM?`,
    options: [
      {
        label: 'Thick layer of road dust, exhaust soot, or bird droppings on glass',
        next: 'EVALUATE_CRITERIA',
        criteriaPatch: { environmental: 'HEAVY_SOILING' },
      },
      {
        label: 'Tree branches, utility wires, or roof eaves cast partial shadow',
        next: 'EVALUATE_CRITERIA',
        criteriaPatch: { environmental: 'PARTIAL_SHADING' },
      },
      {
        label: 'Panel mounted completely flat (0 deg) or facing North',
        next: 'EVALUATE_CRITERIA',
        criteriaPatch: { environmental: 'FLAT_NORTH_TILT' },
      },
      {
        label: '2–3+ consecutive rainy / overcast monsoon days',
        next: 'EVALUATE_CRITERIA',
        criteriaPatch: { environmental: 'MONSOON_OVERCAST' },
      },
      {
        label: 'Clean glass, 15 deg South tilt, and full unobstructed sun',
        next: 'EVALUATE_CRITERIA',
        criteriaPatch: { environmental: 'CLEAR_SUN' },
      },
    ],
  },

  // ==========================================================================
  // BRANCH 3: DIM OR FLICKERING LEDS (3-STAGE MULTI-CRITERIA AUDIT)
  // ==========================================================================
  SYMPTOM_DIM_FLICKER: {
    title: 'Criterion 1 of 3: LED Array & Driver Behavior (30% Weight)',
    stepStage: 1,
    activePillar: 'electrical',
    message: (product) => `### Criterion 1/3: Optical Output & Driver Regulation
Symptom Logged: **Dim Illumination or Flickering LEDs** on **${product?.product_name || 'unit'}**.

First, let us evaluate **Electrical & Optical Continuity (30% weight)**. What specific illumination pattern do you observe on the LED matrix?`,
    options: [
      {
        label: 'Rests at ~30% dim standby, but surges to 100% when motion passes',
        next: 'CRIT_DF_PHYSICAL',
        criteriaPatch: { symptom: 'DIM_FLICKER', electrical: 'LED_BLINKING', control: 'RADAR_STANDBY' },
      },
      {
        label: 'Rapid strobe-like flickering or pulsing across the LED array',
        next: 'CRIT_DF_PHYSICAL',
        criteriaPatch: { symptom: 'DIM_FLICKER', electrical: 'LED_RIPPLE', control: 'AUTO_NORMAL' },
      },
      {
        label: 'One section or half of the LED board is dark while the rest lights up',
        next: 'CRIT_DF_PHYSICAL',
        criteriaPatch: { symptom: 'DIM_FLICKER', electrical: 'LED_PARTIAL_DARK', control: 'AUTO_NORMAL' },
      },
      {
        label: 'Uniformly dim output all night without motion surge',
        next: 'CRIT_DF_PHYSICAL',
        criteriaPatch: { symptom: 'DIM_FLICKER', electrical: 'LED_BLINKING', control: 'AUTO_NORMAL' },
      },
      {
        label: 'Back to Symptom Selection',
        next: 'ROOT',
      },
    ],
  },

  CRIT_DF_PHYSICAL: {
    title: 'Criterion 2 of 3: Optical Cavity & IP65 Seal Check (25% Weight)',
    stepStage: 2,
    activePillar: 'physical',
    message: () => `### Criterion 2/3: Physical Lens & Gasket Inspection
Next, let us evaluate **Physical & IP65 Seal Integrity (25% weight)**.

Inspect the polycarbonate optical lens cover closely. Is there any internal moisture or surface damage?`,
    options: [
      {
        label: 'Optical lens is completely dry and gasket seal is intact',
        next: 'CRIT_DF_ENV',
        criteriaPatch: { physical: 'SEAL_INTACT' },
      },
      {
        label: 'Water droplets, fogging, or moisture pooling inside the lens',
        next: 'CRIT_DF_ENV',
        criteriaPatch: { physical: 'WATER_INGRESS' },
      },
      {
        label: 'Tempered glass on solar panel is cracked or shattered',
        next: 'CRIT_DF_ENV',
        criteriaPatch: { physical: 'GLASS_FRACTURE' },
      },
    ],
  },

  CRIT_DF_ENV: {
    title: 'Criterion 3 of 3: Environmental Charging Context (25% Weight)',
    stepStage: 3,
    activePillar: 'environmental',
    message: () => `### Criterion 3/3: Recent Solar Harvest & Environment
Finally, let us verify **Environmental Irradiance (25% weight)** prior to the dim/flickering event:`,
    options: [
      {
        label: 'Normal sunny weather and clean panel surface',
        next: 'EVALUATE_CRITERIA',
        criteriaPatch: { environmental: 'CLEAR_SUN' },
      },
      {
        label: 'Heavy overcast / rainy weather over the past 2–3 days',
        next: 'EVALUATE_CRITERIA',
        criteriaPatch: { environmental: 'MONSOON_OVERCAST' },
      },
      {
        label: 'Heavy dust or soot coating the solar panel glass',
        next: 'EVALUATE_CRITERIA',
        criteriaPatch: { environmental: 'HEAVY_SOILING' },
      },
    ],
  },

  // ==========================================================================
  // BRANCH 4: LIGHT STAYS ON DURING DAYTIME (3-STAGE MULTI-CRITERIA AUDIT)
  // ==========================================================================
  SYMPTOM_DAYTIME_ON: {
    title: 'Criterion 1 of 3: Daylight Photocell Voltage Check (30% Weight)',
    stepStage: 1,
    activePillar: 'electrical',
    message: () => `### Criterion 1/3: Photocell Threshold & Switching Circuit
Symptom Logged: **Light Stays ON During Bright Daytime**.

Solar luminaires use the photovoltaic panel as a dusk-to-dawn sensor, shutting off the LED load when morning irradiance drives panel voltage above **5.0V DC**.

What is the solar panel's exposure when the lamp remains lit during daytime?`,
    options: [
      {
        label: 'Panel is under a deep awning, heavy canopy, or covered (< 5V sensed)',
        next: 'CRIT_DO_PHYSICAL',
        criteriaPatch: { symptom: 'DAYTIME_ON', electrical: 'DAY_BLIND_LOW_V', environmental: 'PARTIAL_SHADING' },
      },
      {
        label: 'Panel is in blazing direct sun (>15V), yet LEDs stay continuously lit',
        next: 'CRIT_DO_PHYSICAL',
        criteriaPatch: { symptom: 'DAYTIME_ON', electrical: 'DAY_SUN_SHORT', environmental: 'CLEAR_SUN' },
      },
      {
        label: 'Back to Symptom Selection',
        next: 'ROOT',
      },
    ],
  },

  CRIT_DO_PHYSICAL: {
    title: 'Criterion 2 of 3: Enclosure & Wiring Inspection (25% Weight)',
    stepStage: 2,
    activePillar: 'physical',
    message: () => `### Criterion 2/3: Physical Seal & Wiring Check
Next, let us verify **Physical Integrity (25% weight)** to rule out water bridge shorts or cable issues:`,
    options: [
      {
        label: 'Enclosure is dry, sealed, and connectors are properly seated',
        next: 'CRIT_DO_CONTROL',
        criteriaPatch: { physical: 'SEAL_INTACT' },
      },
      {
        label: 'Moisture or water droplets visible inside the lens cavity',
        next: 'CRIT_DO_CONTROL',
        criteriaPatch: { physical: 'WATER_INGRESS' },
      },
      {
        label: 'Aviation plug between panel and lamp is loose or disconnected',
        next: 'CRIT_DO_CONTROL',
        criteriaPatch: { physical: 'PLUG_LOOSE', electrical: 'LED_DARK' },
      },
    ],
  },

  CRIT_DO_CONTROL: {
    title: 'Criterion 3 of 3: Control Response Verification (20% Weight)',
    stepStage: 3,
    activePillar: 'control',
    message: () => `### Criterion 3/3: Controller & Remote Override Check
Does the lamp turn off if you press **OFF** or **AUTO** on the infrared remote control?`,
    options: [
      {
        label: 'Unresponsive to remote OFF command (Locked on in sunlight)',
        next: 'EVALUATE_CRITERIA',
        criteriaPatch: { control: 'AUTO_NORMAL' },
      },
      {
        label: 'Responds to remote after clearing shade/obstruction from panel',
        next: 'EVALUATE_CRITERIA',
        criteriaPatch: { control: 'AUTO_NORMAL' },
      },
    ],
  },

  // ==========================================================================
  // BRANCH 5: PHYSICAL DAMAGE & HOTSPOTS (3-STAGE MULTI-CRITERIA AUDIT)
  // ==========================================================================
  SYMPTOM_PHYSICAL_HOTSPOT: {
    title: 'Criterion 1 of 3: Physical Surface & Structural Audit (25% Weight)',
    stepStage: 1,
    activePillar: 'physical',
    message: () => `### Criterion 1/3: Physical Surface & Structural Classification
Symptom Logged: **Panel Scorching, Glass Fracture, or Mechanical Damage**.

Which specific physical condition is present on the solar panel or luminaire chassis?`,
    options: [
      {
        label: 'Brown / black burned spots or melted rings on solar cells (Hotspot)',
        next: 'CRIT_PH_ELECTRICAL',
        criteriaPatch: { symptom: 'PHYSICAL_HOTSPOT', physical: 'CELL_HOTSPOT' },
      },
      {
        label: 'Spiderweb glass fracture from rock, hail, or drop impact',
        next: 'CRIT_PH_ELECTRICAL',
        criteriaPatch: { symptom: 'PHYSICAL_HOTSPOT', physical: 'GLASS_FRACTURE' },
      },
      {
        label: 'Pole bracket or stainless clamp bolts loosened by wind',
        next: 'CRIT_PH_ELECTRICAL',
        criteriaPatch: { symptom: 'PHYSICAL_HOTSPOT', physical: 'MOUNT_LOOSE' },
      },
      {
        label: 'Condensation or water pooling inside optical lens',
        next: 'CRIT_PH_ELECTRICAL',
        criteriaPatch: { symptom: 'PHYSICAL_HOTSPOT', physical: 'WATER_INGRESS' },
      },
      {
        label: 'Back to Symptom Selection',
        next: 'ROOT',
      },
    ],
  },

  CRIT_PH_ELECTRICAL: {
    title: 'Criterion 2 of 3: Electrical Continuity Status (30% Weight)',
    stepStage: 2,
    activePillar: 'electrical',
    message: () => `### Criterion 2/3: Electrical & Charging Activity
How is the unit currently behaving electrically under this physical condition?`,
    options: [
      {
        label: 'Charging LED still blinks and unit powers on at night',
        next: 'CRIT_PH_ENV',
        criteriaPatch: { electrical: 'LED_BLINKING' },
      },
      {
        label: 'Charging LED is completely dark / unit no longer turns on',
        next: 'CRIT_PH_ENV',
        criteriaPatch: { electrical: 'LED_DARK' },
      },
      {
        label: 'LED array flickers or shuts off within 1–2 hours',
        next: 'CRIT_PH_ENV',
        criteriaPatch: { electrical: 'LED_RIPPLE' },
      },
    ],
  },

  CRIT_PH_ENV: {
    title: 'Criterion 3 of 3: Environmental Exposure Context (25% Weight)',
    stepStage: 3,
    activePillar: 'environmental',
    message: () => `### Criterion 3/3: Environmental & Site Exposure
What environmental conditions surround the installation site?`,
    options: [
      {
        label: 'Direct open sunlight exposure',
        next: 'EVALUATE_CRITERIA',
        criteriaPatch: { environmental: 'CLEAR_SUN', control: 'AUTO_NORMAL' },
      },
      {
        label: 'Partial tree leaf shading or heavy road dust on panel',
        next: 'EVALUATE_CRITERIA',
        criteriaPatch: { environmental: 'PARTIAL_SHADING', control: 'AUTO_NORMAL' },
      },
      {
        label: 'Recent severe storm / high wind buffeting',
        next: 'EVALUATE_CRITERIA',
        criteriaPatch: { environmental: 'MONSOON_OVERCAST', control: 'AUTO_NORMAL' },
      },
    ],
  },

  // ==========================================================================
  // BRANCH 6: SENSOR & REMOTE CONTROL (3-STAGE MULTI-CRITERIA AUDIT)
  // ==========================================================================
  SYMPTOM_SENSOR_REMOTE: {
    title: 'Criterion 1 of 3: Control & Sensor Behavior (20% Weight)',
    stepStage: 1,
    activePillar: 'control',
    message: (product) => `### Criterion 1/3: Infrared Remote & Radar Induction Audit
Symptom Logged: **Remote Control or Motion Sensor Unresponsive** on **${product?.product_name || 'unit'}**.

Which control behavior are you observing?`,
    options: [
      {
        label: 'Remote handset indicator LED does not light when buttons are pressed',
        next: 'CRIT_SRM_ELECTRICAL',
        criteriaPatch: { symptom: 'SENSOR_REMOTE', control: 'REMOTE_DEAD_BAT' },
      },
      {
        label: 'Remote LED blinks, but lamp does not flash to confirm reception',
        next: 'CRIT_SRM_ELECTRICAL',
        criteriaPatch: { symptom: 'SENSOR_REMOTE', control: 'REMOTE_OUT_OF_RANGE' },
      },
      {
        label: 'Microwave motion sensor does not boost brightness when walking past',
        next: 'CRIT_SRM_ELECTRICAL',
        criteriaPatch: { symptom: 'SENSOR_REMOTE', control: 'RADAR_DISABLED' },
      },
      {
        label: 'Back to Symptom Selection',
        next: 'ROOT',
      },
    ],
  },

  CRIT_SRM_ELECTRICAL: {
    title: 'Criterion 2 of 3: Luminaire Power & Indicator Check (30% Weight)',
    stepStage: 2,
    activePillar: 'electrical',
    message: () => `### Criterion 2/3: Main Luminaire Power Verification
Does the main solar luminaire illuminate at dusk and blink its charging LED during the day?`,
    options: [
      {
        label: 'Yes, lamp turns on at night and charges normally in daytime',
        next: 'CRIT_SRM_PHYSICAL',
        criteriaPatch: { electrical: 'LED_BLINKING' },
      },
      {
        label: 'No, the main lamp is completely dark at night as well',
        next: 'CRIT_SRM_PHYSICAL',
        criteriaPatch: { electrical: 'LED_DARK' },
      },
    ],
  },

  CRIT_SRM_PHYSICAL: {
    title: 'Criterion 3 of 3: Optical Receiver & Enclosure Check (25% Weight)',
    stepStage: 3,
    activePillar: 'physical',
    message: () => `### Criterion 3/3: Sensor Dome & Enclosure Inspection
Inspect the small rounded sensor dome and optical lens on the luminaire body:`,
    options: [
      {
        label: 'Sensor window is clean, dry, and standing within 5–6 meters',
        next: 'EVALUATE_CRITERIA',
        criteriaPatch: { physical: 'SEAL_INTACT', environmental: 'CLEAR_SUN' },
      },
      {
        label: 'Water condensation or moisture droplets visible inside the lens',
        next: 'EVALUATE_CRITERIA',
        criteriaPatch: { physical: 'WATER_INGRESS', environmental: 'MONSOON_OVERCAST' },
      },
    ],
  },

  // ==========================================================================
  // 20 LEAF DIAGNOSTIC VERDICT NODES (WITH DEFAULT CRITERIA VECTORS)
  // ==========================================================================
  DIAG_OPEN_CIRCUIT: {
    title: 'Diagnosis: Open Circuit or Aviation Plug Disconnection',
    faultCode: 'FLT-PV-001',
    category: 'No Power / Won\'t Turn On',
    severity: 'mild',
    severityLabel: 'Mild • DIY Fixable',
    confidence: '95%',
    defaultCriteria: {
      symptom: 'NO_POWER',
      electrical: 'LED_DARK',
      physical: 'PLUG_LOOSE',
      environmental: 'CLEAR_SUN',
      control: 'AUTO_NORMAL',
    },
    telemetry: {
      pvEfficiency: '0% (Open Loop)',
      panelVoltage: '0.0V (No Continuity)',
      batteryVoltage: 'Isolated / Uncharged',
      bmsState: 'Idle / Disconnected',
      ipIntegrity: 'Inspect Connector Collar',
    },
    message: (product) => {
      const ctx = analyzeProductContext(product)
      if (ctx.formFactor === 'INTEGRATED_AIO') {
        return `### Diagnostic Verdict: Internal PV Bus Open Circuit (${ctx.formFactorLabel})

Multi-criteria evaluation confirms that no charging current is reaching the internal battery management board (**0V continuity** under daylight). Because your **${ctx.productName}** utilizes an **All-in-One Integrated Chassis**, the solar laminate connects directly to the internal MPPT/PWM board without an external cable.

#### Probable Root Causes:
1. **Master Switch Disengaged:** Verify the external waterproof push-button has been held for 3–5 seconds to close the main circuit.
2. **Internal Bus Ribbon Disconnection:** High-vibration transit or thermal expansion loosened the internal JST/soldered terminal.

#### Recommended Action:
* Test the master push-button firmly first.
* If the charging LED remains completely dark under midday sunlight, submit a warranty claim below for internal terminal inspection at Quiapo or Cavite.`
      }

      return `### Diagnostic Verdict: PV Open Circuit / Disconnected Aviation Plug

Multi-criteria evaluation confirms that the solar panel is not delivering current to the battery pack. Because the charging indicator remains unlit under sunlight while the enclosure is intact, the primary circuit loop is open.

#### Probable Root Causes:
1. **Loose Aviation Waterproof Plug:** The rotary locking collar between the solar panel lead and luminaire head has loosened from wind vibration.
2. **Misaligned Alignment Keyway:** The 2-pin waterproof notch was inserted at an angle, preventing copper pin contact.
3. **Cable Pinch or Abrasion:** Damaged insulation along the pole mounting bracket.

#### Step-by-Step Field Remedy:
* **Step 1:** Access the pole junction and unscrew the black waterproof aviation collar.
* **Step 2:** Inspect pins for dust or oxidation. Align the internal guide groove (keyway) and press firmly until fully seated.
* **Step 3:** Hand-tighten the waterproof screw collar clockwise until sealed.
* **Step 4:** Expose the panel to direct sunlight and confirm the charging indicator begins blinking within 10 seconds.`
    },
    remedySteps: [
      'Inspect the waterproof aviation plug or master circuit switch.',
      'Align the internal guide keyway and press connector pins firmly together.',
      'Tighten the locking collar clockwise to restore IP65 weather sealing.',
      'Verify that the charging indicator LED blinks steadily under daylight.',
    ],
    claimRecommendation: false,
    options: [
      { label: 'Connection Restored & Indicator Blinking (Resolved)', next: 'RESOLVED_DIY' },
      { label: 'Cable Damaged or Still Dark: File Warranty Claim', next: 'TRANSFER_TO_CLAIM', category: 'No Power / Won\'t Turn On' },
      { label: 'Run New Multi-Criteria Audit', next: 'ROOT' },
    ],
  },

  DIAG_BMS_LOCKOUT: {
    title: 'Diagnosis: LiFePO4 BMS Low-Voltage Cutoff Protection',
    faultCode: 'FLT-BAT-002',
    category: 'Battery / Rapid Discharge',
    severity: 'moderate',
    severityLabel: 'Moderate • Requires 48H Sun-Soak Recovery',
    confidence: '93%',
    defaultCriteria: {
      symptom: 'NO_POWER',
      electrical: 'LED_BLINKING',
      physical: 'SEAL_INTACT',
      environmental: 'CLEAR_SUN',
      control: 'AUTO_NORMAL',
    },
    telemetry: {
      pvEfficiency: '100% Active Harvesting',
      panelVoltage: '18.2V (Nominal Voc)',
      batteryVoltage: '2.48V / cell (Cutoff Tripped < 2.80V)',
      bmsState: 'Low-Voltage Sleep Protection',
      ipIntegrity: 'Passed (IP65 Intact)',
    },
    message: () => `### Diagnostic Verdict: Battery BMS Sleep Protection Tripped

Multi-criteria evaluation confirms that your photovoltaic panel is generating normal charging voltage (charging LED blinks), and the physical enclosure is intact, but the **Battery Management System (BMS)** has engaged its low-voltage safety lockout.

When a Lithium Iron Phosphate (LiFePO4) pack discharges below **2.50V–2.80V per cell**, the BMS disconnects the LED load to prevent irreversible anode plating.

#### Why This Criterion Triggered:
* Deep discharge occurred across prior nights without sufficient daytime recovery.
* While locked in sleep protection, dusk sensors will not ignite the LED array until cell voltage recovers above **3.10V per cell**.

#### Standardized Recovery Protocol (48-Hour Sun-Soak):
1. **Switch OFF via Remote:** Aim the remote at the fixture and press **OFF** (or toggle the physical push-button) so the lamp does not attempt to fire at dusk.
2. **Undisturbed 48-Hour Solar Charge:** Allow the panel to harvest two full days of direct sunlight without load drain. Trickle current will reset the BMS protection latch.
3. **Re-engage AUTO Mode:** On the second evening, press **AUTO** or **RADAR** on the remote.`,
    remedySteps: [
      'Switch the luminaire OFF via remote control or physical button.',
      'Allow 48 hours (2 full sunny days) of undisturbed solar charging.',
      'Press AUTO on the remote at dusk to re-engage normal operation.',
      'If unit fails to wake after 48h sun-soak, file a warranty claim for cell bank testing.',
    ],
    claimRecommendation: true,
    options: [
      { label: 'Will Perform 48-Hour Sun-Soak Recovery', next: 'RESOLVED_DIY' },
      { label: 'BMS Remains Locked After 48H: File Claim', next: 'TRANSFER_TO_CLAIM', category: 'Battery / Rapid Discharge' },
      { label: 'Run New Multi-Criteria Audit', next: 'ROOT' },
    ],
  },

  DIAG_RAIN_DEPLETION: {
    title: 'Diagnosis: Weather-Induced Solar Deficit (Zero Defect)',
    faultCode: 'FLT-ENV-003',
    category: 'Battery / Rapid Discharge',
    severity: 'mild',
    severityLabel: 'Zero Defect • Monsoon Irradiance Deficit',
    confidence: '98%',
    defaultCriteria: {
      symptom: 'NO_POWER',
      electrical: 'LED_BLINKING',
      physical: 'SEAL_INTACT',
      environmental: 'MONSOON_OVERCAST',
      control: 'AUTO_NORMAL',
    },
    telemetry: {
      pvEfficiency: '15% (Heavy Cloud Attenuation)',
      panelVoltage: '9.4V (Diffuse Irradiance Only)',
      batteryVoltage: '2.95V (Depleted Reserve)',
      bmsState: 'Energy Reserve Protection',
      ipIntegrity: 'Passed (IP65 Intact)',
    },
    message: (product) => `### Diagnostic Verdict: Monsoonal Solar Energy Deficit (Zero Defect)

Multi-criteria evaluation confirms that your **${product?.product_name || 'solar luminaire'}** has passed electrical continuity and physical enclosure checks. The outage is caused by **Environmental Irradiance Deficit** rather than hardware failure.

Off-grid solar streetlights require **4 to 6 peak sun hours (>800 W/m²)** to reach 100% state of charge. Under consecutive monsoon rain or dense overcast skies, solar irradiance drops by up to **85%**, supplying less energy during the day than the LED array consumes at night.

#### Operational Protocol for Rainy Weeks:
* Use your remote control to switch from **Constant 100% Brightness** to **RADAR (Microwave Induction Mode)**.
* In Radar mode, the luminaire idles at **30% power** and surges to **100%** only when vehicles or pedestrians pass, extending battery autonomy up to **3 consecutive overcast nights**.`,
    remedySteps: [
      'Switch remote control setting to RADAR / ECO induction mode.',
      'Allow 1–2 clear sunny days for the LiFePO4 battery to replenish to 100% SoC.',
      'No hardware repair or warranty claim is required.',
    ],
    claimRecommendation: false,
    options: [
      { label: 'Switched to Radar Eco Mode (Resolved)', next: 'RESOLVED_DIY' },
      { label: 'Run New Multi-Criteria Audit', next: 'ROOT' },
    ],
  },

  DIAG_SWITCH_DISENGAGED: {
    title: 'Diagnosis: Physical Master Switch Disengaged',
    faultCode: 'FLT-PWR-004',
    category: 'No Power / Won\'t Turn On',
    severity: 'mild',
    severityLabel: 'Mild • Immediate Field Activation',
    confidence: '94%',
    defaultCriteria: {
      symptom: 'NO_POWER',
      electrical: 'LED_BLINKING',
      physical: 'SEAL_INTACT',
      environmental: 'CLEAR_SUN',
      control: 'SWITCH_OFF',
    },
    telemetry: {
      pvEfficiency: 'Standby Ready',
      panelVoltage: '18.0V (Open Terminal)',
      batteryVoltage: '3.28V (Storage Charge Intact)',
      bmsState: 'Master Circuit Open',
      ipIntegrity: 'Passed (IP65 Intact)',
    },
    message: () => `### Diagnostic Verdict: Master Waterproof Push-Switch in OFF Position

All JD Solar luminaires ship from the factory with the physical master circuit switch disengaged to prevent parasitic battery drain during warehouse storage and transit.

#### Field Activation Procedure:
1. Locate the waterproof silicone rubber push-button on the luminaire chassis (positioned beside the sensor window or lower mounting collar).
2. Press and hold firmly for **3 to 5 seconds** until the LED array flashes to confirm circuit engagement.
3. Cover the solar panel face with dark cardboard or test after dusk to confirm automatic night ignition.`,
    remedySteps: [
      'Locate the waterproof rubber push-button on the luminaire housing.',
      'Press and hold for 3–5 seconds until the LED array flashes.',
      'Cover the solar panel to verify dusk-to-dawn activation.',
    ],
    claimRecommendation: false,
    options: [
      { label: 'Master Switch Engaged & Lamp Works (Resolved)', next: 'RESOLVED_DIY' },
      { label: 'Switch Pressed But Still Dark: Re-Evaluate', next: 'SYMPTOM_NO_POWER' },
    ],
  },

  DIAG_SOILING_LOSS: {
    title: 'Diagnosis: Photovoltaic Soiling & Optical Attenuation',
    faultCode: 'FLT-PV-005',
    category: 'Dim Lighting / Low Lux',
    severity: 'mild',
    severityLabel: 'Mild • 15-Minute Preventive Cleaning',
    confidence: '96%',
    defaultCriteria: {
      symptom: 'SHORT_RUNTIME',
      electrical: 'LED_BLINKING',
      physical: 'SEAL_INTACT',
      environmental: 'HEAVY_SOILING',
      control: 'AUTO_NORMAL',
    },
    telemetry: {
      pvEfficiency: '52% (-48% Soiling Attenuation)',
      panelVoltage: '13.8V (Current Choked)',
      batteryVoltage: '3.08V (Max Daily SoC ~40%)',
      bmsState: 'Early Cutoff After 2–3 Hours',
      ipIntegrity: 'Passed (IP65 Intact)',
    },
    message: () => `### Diagnostic Verdict: Severe Photovoltaic Soiling Loss

Multi-criteria evaluation indicates that your electrical circuit and battery enclosure are intact, but **Environmental Surface Soiling** is blocking solar irradiance from reaching the monocrystalline silicon cells.

#### Engineering Impact:
In urban roadside deployments (such as Metro Manila or Cavite corridors), diesel soot, road dust, and bird droppings reduce photon transmission by **30% to 50%**. Eight hours of daylight only charges the battery to ~40% capacity, causing the BMS to cut off output after 1 to 3 hours of night operation.

#### Safe Cleaning Protocol:
1. **Thermal Timing:** Clean early in the morning (before 8:30 AM) or at dusk when the glass is cool. Never spray cold water onto hot midday glass (>65°C) to avoid thermal shock.
2. **Method:** Rinse with clean water and wipe using a soft microfiber cloth and mild soap.
3. **Prohibited Tools:** Never use abrasive pads, wire brushes, or solvent cleaners that scratch the anti-reflective glass coating.`,
    remedySteps: [
      'Wash the tempered solar glass early in the morning using water and a soft cloth.',
      'Remove all caked mud rings and bird droppings along the lower frame edge.',
      'Allow one full sunny day to restore 100% battery state of charge.',
    ],
    claimRecommendation: false,
    options: [
      { label: 'Cleaned Solar Glass & Runtime Restored (Resolved)', next: 'RESOLVED_DIY' },
      { label: 'Runtime Still Short After Cleaning: File Claim', next: 'TRANSFER_TO_CLAIM', category: 'Battery / Rapid Discharge' },
      { label: 'Run New Multi-Criteria Audit', next: 'ROOT' },
    ],
  },

  DIAG_SHADING_LOSS: {
    title: 'Diagnosis: Micro-Shading & Bypass Diode Choke',
    faultCode: 'FLT-PV-006',
    category: 'Battery / Rapid Discharge',
    severity: 'moderate',
    severityLabel: 'Moderate • Requires Sightline Clearance',
    confidence: '94%',
    defaultCriteria: {
      symptom: 'SHORT_RUNTIME',
      electrical: 'LED_BLINKING',
      physical: 'SEAL_INTACT',
      environmental: 'PARTIAL_SHADING',
      control: 'AUTO_NORMAL',
    },
    telemetry: {
      pvEfficiency: '38% (Series String Bottleneck)',
      panelVoltage: '11.5V (Bypass Diode Clamped)',
      batteryVoltage: '3.02V (Chronic Undercharge)',
      bmsState: 'Normal Cutoff',
      ipIntegrity: 'Passed (IP65 Intact)',
    },
    message: () => `### Diagnostic Verdict: Midday Partial Shading Bottleneck

Photovoltaic cells in a solar module are wired in series strings.

**Series Bottleneck Rule:** If even **10% to 15% of the panel surface** is shadowed by a tree branch, utility cable, or roof overhang between **10:00 AM and 3:00 PM**, the shaded cells act as high-resistance loads, choking total panel current output by **up to 70%**.

#### Corrective Action Plan:
* Prune overhanging tree foliage casting shadows across the panel during peak solar zenith hours (9:30 AM – 3:30 PM).
* If mounted beneath a building eave, extend the mounting bracket arm outward so the entire solar glass surface has an unobstructed sky view.`,
    remedySteps: [
      'Inspect the solar panel between 10:00 AM and 3:00 PM for any partial shadows.',
      'Trim overhanging branches or relocate the mounting bracket clear of eaves.',
      'Verify full unobstructed sunlight across 100% of the panel face.',
    ],
    claimRecommendation: false,
    options: [
      { label: 'Cleared Shading Obstruction (Resolved)', next: 'RESOLVED_DIY' },
      { label: 'Request Technician Mounting Advice', next: 'TRANSFER_TO_CLAIM', category: 'Battery / Rapid Discharge' },
      { label: 'Run New Multi-Criteria Audit', next: 'ROOT' },
    ],
  },

  DIAG_TILT_MISALIGNMENT: {
    title: 'Diagnosis: Sub-Optimal Azimuth & Tilt Angle',
    faultCode: 'FLT-PV-007',
    category: 'Battery / Rapid Discharge',
    severity: 'moderate',
    severityLabel: 'Moderate • Bracket Angle Adjustment',
    confidence: '91%',
    defaultCriteria: {
      symptom: 'SHORT_RUNTIME',
      electrical: 'LED_BLINKING',
      physical: 'SEAL_INTACT',
      environmental: 'FLAT_NORTH_TILT',
      control: 'AUTO_NORMAL',
    },
    telemetry: {
      pvEfficiency: '65% (-35% Cosine & Pooling Loss)',
      panelVoltage: '14.8V (Sub-Nominal)',
      batteryVoltage: '3.14V (Partial Charge)',
      bmsState: 'Active',
      ipIntegrity: 'Passed (IP65 Intact)',
    },
    message: () => `### Diagnostic Verdict: Sub-Optimal Solar Tilt & Azimuth Orientation

In the Philippines (approximately **14° North Latitude**), mounting a solar panel completely flat (**0° horizontal**) or facing **North** introduces two compound efficiency losses:
1. **Rainwater & Silt Pooling:** Flat glass cannot self-drain rainwater, leaving mud rings along the bottom cell row that trigger partial shading losses.
2. **Cosine Angle-of-Incidence Loss:** Because the sun tracks across the southern sky for most of the year, North-facing or flat panels lose **25% to 35%** of available daily irradiance.

#### Standard Philippine Mounting Specification:
* **Azimuth:** Orient the solar panel face toward **True South**.
* **Tilt Angle:** Set bracket inclination to **12° to 15°** above horizontal to maximize harvest and natural rain self-cleaning.`,
    remedySteps: [
      'Loosen the adjustable knuckle or U-bracket bolts on the pole mount.',
      'Rotate the solar panel azimuth to face True South.',
      'Set the tilt angle to 12–15 degrees and torque bolts securely.',
    ],
    claimRecommendation: false,
    options: [
      { label: 'Adjusted Panel to 15 Deg South (Resolved)', next: 'RESOLVED_DIY' },
      { label: 'Run New Multi-Criteria Audit', next: 'ROOT' },
    ],
  },

  DIAG_BATTERY_AGING: {
    title: 'Diagnosis: LiFePO4 Cell Capacity Degradation',
    faultCode: 'FLT-BAT-008',
    category: 'Battery / Rapid Discharge',
    severity: 'critical',
    severityLabel: 'Critical • Battery Module Replacement Required',
    confidence: '92%',
    defaultCriteria: {
      symptom: 'SHORT_RUNTIME',
      electrical: 'LED_BLINKING',
      physical: 'SEAL_INTACT',
      environmental: 'CLEAR_SUN',
      control: 'AGED_CELLS',
    },
    telemetry: {
      pvEfficiency: '96% (PV Array Healthy)',
      panelVoltage: '18.4V (Full Voc Output)',
      batteryVoltage: '3.32V at Dusk -> <2.60V in 90 Mins',
      bmsState: 'Elevated Internal Resistance (SOH < 40%)',
      ipIntegrity: 'Passed (IP65 Intact)',
    },
    message: (product) => {
      const ctx = analyzeProductContext(product)
      return `### Diagnostic Verdict: LiFePO4 Battery Cell Capacity Fatigue

Multi-criteria evaluation confirms that your solar panel is receiving full sunlight and generating normal charging voltage, and the enclosure seal is intact. By eliminating electrical open circuits and environmental deficits, the engine isolates the fault to **LiFePO4 Battery Cell Capacity Degradation**.

#### Technical Mechanism:
* Aged or fatigued cells exhibit high internal impedance: terminal voltage rises rapidly to full threshold under daytime charging, but sags below the BMS cutoff within 60–120 minutes under nocturnal LED load.
* **Warranty Assessment:** ${
        ctx.isWarrantyActive
          ? `Your unit is within its **${ctx.warrantyMonths}-Month Active Warranty** (${ctx.daysRemaining ?? 'Active'} days left) and qualifies for official bench evaluation and 1-time replacement.`
          : 'If your unit is beyond its 24-month warranty window, replacement LiFePO4 battery packs can be installed at our Quiapo or Cavite service centers at standard component rates.'
      }`
    },
    remedySteps: [
      'File a warranty or service claim using the pre-populated multi-criteria report below.',
      'Present the unit at our Quiapo or Cavite branch for bench load testing.',
      'Eligible for 1-time warranty replacement if within active 24-month coverage.',
    ],
    claimRecommendation: true,
    options: [
      { label: 'File Official Warranty / Service Claim', next: 'TRANSFER_TO_CLAIM', category: 'Battery / Rapid Discharge' },
      { label: 'View Quiapo & Cavite Service Branches', next: 'BRANCH_INFO' },
      { label: 'Run New Multi-Criteria Audit', next: 'ROOT' },
    ],
  },

  DIAG_WATER_INGRESS: {
    title: 'Diagnosis: IP65 Seal Compromise & Moisture Ingress',
    faultCode: 'FLT-IP-009',
    category: 'Physical / Water Ingress',
    severity: 'critical',
    severityLabel: 'Critical • Hazardous • Power Off Immediately',
    confidence: '98%',
    defaultCriteria: {
      symptom: 'DIM_FLICKER',
      electrical: 'LED_RIPPLE',
      physical: 'WATER_INGRESS',
      environmental: 'MONSOON_OVERCAST',
      control: 'AUTO_NORMAL',
    },
    telemetry: {
      pvEfficiency: 'Compromised',
      panelVoltage: 'Fluctuating / Ground Leakage',
      batteryVoltage: 'Short-Circuit Risk',
      bmsState: 'Moisture Bridge Hazard',
      ipIntegrity: 'FAILED (Optical Gasket Breached)',
    },
    message: () => `### Critical Verdict: IP65/IP67 Enclosure Seal Breach (Moisture Ingress)

**Elimination Criterion Triggered:** Visible condensation or water pooling inside the optical cavity overrides standard operational triage. The perimeter silicone gasket or cable entry gland has been breached.

#### Immediate Safety Protocol:
* **Switch OFF Immediately:** Moisture bridges constant-current LED driver traces and lithium battery terminals, causing rapid galvanic PCB corrosion or short-circuiting.
* **Do Not Operate:** Keep the unit powered down and photograph the internal water droplets inside the lens while visible.
* **Warranty Qualification:** Internal seal failure without external glass impact qualifies for bench inspection under the JD Solar 24-Month Warranty.`,
    remedySteps: [
      'Turn OFF the luminaire immediately via remote control or master push-switch.',
      'Take clear photographs showing condensation or water droplets inside the lens.',
      'Submit an official warranty claim for unit replacement or gasket refurbishment.',
    ],
    claimRecommendation: true,
    options: [
      { label: 'Submit Warranty Claim for Water Ingress', next: 'TRANSFER_TO_CLAIM', category: 'Physical / Water Ingress' },
      { label: 'View Branch Service Locations', next: 'BRANCH_INFO' },
      { label: 'Run New Multi-Criteria Audit', next: 'ROOT' },
    ],
  },

  DIAG_NORMAL_RADAR: {
    title: 'Diagnosis: Intelligent Radar Energy-Saving Mode (Normal Operation)',
    faultCode: 'FLT-SET-010',
    category: 'Sensor / Dusk-Dawn Failure',
    severity: 'mild',
    severityLabel: 'Healthy • Normal Radar Eco Profile',
    confidence: '99%',
    defaultCriteria: {
      symptom: 'DIM_FLICKER',
      electrical: 'LED_BLINKING',
      physical: 'SEAL_INTACT',
      environmental: 'CLEAR_SUN',
      control: 'RADAR_STANDBY',
    },
    telemetry: {
      pvEfficiency: '100% Optimal',
      panelVoltage: '18.2V (Nominal)',
      batteryVoltage: '3.28V (Healthy Reserve)',
      bmsState: 'Radar 30% / 100% Dynamic Duty Cycle',
      ipIntegrity: 'Passed (IP65 Intact)',
    },
    message: () => `### Diagnostic Verdict: Normal Microwave Radar Energy-Saving Operation

Multi-criteria evaluation confirms **zero hardware faults**. Your luminaire is operating in its factory-programmed **Microwave Radar Induction Profile**:
* **Standby Preservation (30% Output):** When no motion is detected within the 6–10 meter radar zone, the driver steps down to 30% lumen output to conserve LiFePO4 battery reserve.
* **Active Boost (100% Output):** Upon detecting pedestrian or vehicular movement, the luminaire immediately ramps to 100% full illumination for 30 seconds.

#### Prefer Constant Brightness?
* Point your remote control at the fixture and press **ALWAYS**, **2H+RADAR**, or **4H** to lock constant 100% output during peak evening hours.`,
    remedySteps: [
      'Use the IR remote control to select between RADAR mode or Constant 100% timing.',
      'No repair or warranty claim required—all 4 criteria pillars passed.',
    ],
    claimRecommendation: false,
    options: [
      { label: 'Confirmed Radar Mode Operation (Resolved)', next: 'RESOLVED_DIY' },
      { label: 'Run New Multi-Criteria Audit', next: 'ROOT' },
    ],
  },

  DIAG_VOLTAGE_RIPPLE: {
    title: 'Diagnosis: Constant-Current LED Driver Fluctuation',
    faultCode: 'FLT-DRV-011',
    category: 'Dim Lighting / Low Lux',
    severity: 'moderate',
    severityLabel: 'Moderate • Driver Current Ripple',
    confidence: '91%',
    defaultCriteria: {
      symptom: 'DIM_FLICKER',
      electrical: 'LED_RIPPLE',
      physical: 'SEAL_INTACT',
      environmental: 'CLEAR_SUN',
      control: 'AUTO_NORMAL',
    },
    telemetry: {
      pvEfficiency: '90% Normal',
      panelVoltage: '17.6V',
      batteryVoltage: '2.82V (Cutoff Threshold Oscillation)',
      bmsState: 'PWM Driver Ripple / Capacitor Wear',
      ipIntegrity: 'Passed (IP65 Intact)',
    },
    message: () => `### Diagnostic Verdict: Constant-Current LED Driver Ripple

Rapid strobe-like flickering with an intact dry lens indicates **LED driver current oscillation**.

#### Two Primary Scenarios Evaluated:
1. **Boundary Voltage Oscillation:** If preceded by overcast weather, battery voltage sits right at the 2.80V cutoff boundary—when load drops, voltage rebounds and re-triggers the LED in a strobe loop.
2. **Driver Capacitor / Inductor Fault:** If flickering persists even after a full sunny day of charging, the constant-current buck/boost driver board has degraded filtering components and requires bench replacement.`,
    remedySteps: [
      'Switch the unit OFF for one full sunny day to charge the battery to 100%.',
      'If strobe flickering persists on a full charge, submit a warranty claim for driver replacement.',
    ],
    claimRecommendation: true,
    options: [
      { label: 'File Warranty Claim for Flickering Driver', next: 'TRANSFER_TO_CLAIM', category: 'Dim Lighting / Low Lux' },
      { label: 'Run New Multi-Criteria Audit', next: 'ROOT' },
    ],
  },

  DIAG_LED_ARRAY_BURNOUT: {
    title: 'Diagnosis: LED String Burnout / PCB Trace Open',
    faultCode: 'FLT-LED-012',
    category: 'Dim Lighting / Low Lux',
    severity: 'critical',
    severityLabel: 'Critical • LED Matrix Module Replacement',
    confidence: '96%',
    defaultCriteria: {
      symptom: 'DIM_FLICKER',
      electrical: 'LED_PARTIAL_DARK',
      physical: 'SEAL_INTACT',
      environmental: 'CLEAR_SUN',
      control: 'AUTO_NORMAL',
    },
    telemetry: {
      pvEfficiency: '95% Normal',
      panelVoltage: '18.0V',
      batteryVoltage: '3.25V (Healthy)',
      bmsState: 'Parallel String Imbalance',
      ipIntegrity: 'Partial SMD String Open Circuit',
    },
    message: () => `### Diagnostic Verdict: Partial SMD LED Matrix Circuit Open

JD Solar luminaire heads divide high-lumen SMD LED chips into parallel-series strings across an aluminum MCPCB heat-sink. When one section or half of the array is completely dark while adjacent strings illuminate:
* An individual SMD diode or solder pad in that series branch has failed open-circuit.
* Because the external housing is intact and dry, this qualifies as an internal manufacturing defect under your **24-Month JD Solar Warranty**.`,
    remedySteps: [
      'Photograph the illuminated lamp head clearly showing the dark LED section.',
      'Submit an official warranty claim for luminaire PCB module replacement.',
    ],
    claimRecommendation: true,
    options: [
      { label: 'File Warranty Claim for LED Array Burnout', next: 'TRANSFER_TO_CLAIM', category: 'Dim Lighting / Low Lux' },
      { label: 'Run New Multi-Criteria Audit', next: 'ROOT' },
    ],
  },

  DIAG_PHOTOCELL_BLOCKED: {
    title: 'Diagnosis: Photocell Threshold Blindness',
    faultCode: 'FLT-SNS-013',
    category: 'Sensor / Dusk-Dawn Failure',
    severity: 'mild',
    severityLabel: 'Mild • Sightline / Exposure Fix',
    confidence: '95%',
    defaultCriteria: {
      symptom: 'DAYTIME_ON',
      electrical: 'DAY_BLIND_LOW_V',
      physical: 'SEAL_INTACT',
      environmental: 'PARTIAL_SHADING',
      control: 'AUTO_NORMAL',
    },
    telemetry: {
      pvEfficiency: '< 10% Ambient Sensed',
      panelVoltage: '1.4V (< 5.0V Daylight Cutoff Threshold)',
      batteryVoltage: '3.18V (Draining in Daytime)',
      bmsState: 'False Night-Mode Trigger',
      ipIntegrity: 'Passed (IP65 Intact)',
    },
    message: () => `### Diagnostic Verdict: Solar Photocell Daylight Threshold Not Reached

Because the solar panel acts as the dusk-to-dawn optical trigger, the controller only switches OFF the LED array when panel open-circuit voltage rises above **5.0V DC**.

If the panel is mounted beneath a deep porch overhang, covered by debris, or heavily shaded during daytime, voltage remains below 5.0V—causing the controller to assume it is still night.

#### Corrective Action:
* Remove any covers, leaves, or obstructions from the solar glass.
* Relocate the panel into open daylight exposure and confirm the LED array shuts off within 15–30 seconds.`,
    remedySteps: [
      'Clear all obstructions or deep awning shade from the solar panel.',
      'Expose the panel to direct ambient daylight (>5V threshold).',
      'Confirm the luminaire automatically shuts off and begins charging.',
    ],
    claimRecommendation: false,
    options: [
      { label: 'Panel Exposed & Lamp Shut Off in Daylight (Resolved)', next: 'RESOLVED_DIY' },
      { label: 'Run New Multi-Criteria Audit', next: 'ROOT' },
    ],
  },

  DIAG_MOSFET_FAULT: {
    title: 'Diagnosis: Controller Load-Switching MOSFET Shorted',
    faultCode: 'FLT-CTL-014',
    category: 'No Power / Won\'t Turn On',
    severity: 'critical',
    severityLabel: 'Critical • Controller PCB Replacement',
    confidence: '94%',
    defaultCriteria: {
      symptom: 'DAYTIME_ON',
      electrical: 'DAY_SUN_SHORT',
      physical: 'SEAL_INTACT',
      environmental: 'CLEAR_SUN',
      control: 'AUTO_NORMAL',
    },
    telemetry: {
      pvEfficiency: '100% Generating',
      panelVoltage: '18.4V (Daylight Verified)',
      batteryVoltage: '3.15V (Simultaneous Charge/Drain)',
      bmsState: 'Load MOSFET Shorted Closed',
      ipIntegrity: 'Passed (IP65 Intact)',
    },
    message: () => `### Diagnostic Verdict: Controller Solid-State MOSFET Switch Shorted

Multi-criteria evaluation confirms that the solar panel is exposed to full midday sunlight (>15V output), yet the LED array remains continuously energized.

This indicates that the solid-state **N-Channel Load MOSFET** on the internal controller board has failed short-circuit in the closed state, bypassing dusk-to-dawn control and continuously draining the battery.

#### Action Required:
* Submit a warranty claim below so our Quiapo or Cavite technicians can replace the internal controller board.`,
    remedySteps: [
      'Attempt to power off via master push-button if accessible.',
      'Submit an official warranty claim for controller board replacement.',
    ],
    claimRecommendation: true,
    options: [
      { label: 'File Warranty Claim for Controller Failure', next: 'TRANSFER_TO_CLAIM', category: 'No Power / Won\'t Turn On' },
      { label: 'Run New Multi-Criteria Audit', next: 'ROOT' },
    ],
  },

  DIAG_THERMAL_HOTSPOT: {
    title: 'Diagnosis: Thermal Hotspot & Bypass Diode Breakdown',
    faultCode: 'FLT-PV-015',
    category: 'Physical / Water Ingress',
    severity: 'critical',
    severityLabel: 'Critical • Thermal Hazard Prevention',
    confidence: '96%',
    defaultCriteria: {
      symptom: 'PHYSICAL_HOTSPOT',
      electrical: 'LED_DARK',
      physical: 'CELL_HOTSPOT',
      environmental: 'PARTIAL_SHADING',
      control: 'AUTO_NORMAL',
    },
    telemetry: {
      pvEfficiency: '35% Severe Cell Degradation',
      panelVoltage: '11.8V (String Drop)',
      batteryVoltage: 'Undercharged',
      bmsState: 'Thermal Cell Imbalance',
      ipIntegrity: 'EVA Laminate Scorched',
    },
    message: () => `### Diagnostic Verdict: Photovoltaic Cell Thermal Hotspot

Localized brown or black burn marks on individual monocrystalline cells indicate a **Photovoltaic Thermal Hotspot**.

#### Failure Mechanism:
When a single silicon cell suffers a micro-crack or persistent localized fouling while surrounding cells generate full current, the compromised cell becomes reverse-biased and dissipates concentrated heat (>110°C), browning the EVA encapsulation film.

#### Recommended Action:
* Disconnect the panel plug to prevent further thermal degradation.
* Photograph the cell discoloration and file a warranty claim for solar module replacement.`,
    remedySteps: [
      'Disconnect the solar panel aviation plug if accessible.',
      'Take clear close-up photographs of the burned cell spots.',
      'Submit a warranty replacement claim for the photovoltaic module.',
    ],
    claimRecommendation: true,
    options: [
      { label: 'Submit Warranty Claim for Cell Hotspot', next: 'TRANSFER_TO_CLAIM', category: 'Physical / Water Ingress' },
      { label: 'Run New Multi-Criteria Audit', next: 'ROOT' },
    ],
  },

  DIAG_GLASS_FRACTURE: {
    title: 'Diagnosis: Tempered Glass Impact Fracture',
    faultCode: 'FLT-EXT-016',
    category: 'Physical / Water Ingress',
    severity: 'critical',
    severityLabel: 'Critical • Warranty Excluded (Impact Damage)',
    confidence: '99%',
    defaultCriteria: {
      symptom: 'PHYSICAL_HOTSPOT',
      electrical: 'LED_BLINKING',
      physical: 'GLASS_FRACTURE',
      environmental: 'CLEAR_SUN',
      control: 'AUTO_NORMAL',
    },
    telemetry: {
      pvEfficiency: '45% (Optical Refraction Loss)',
      panelVoltage: '13.5V (Degrading)',
      batteryVoltage: 'Moisture Intrusion Imminent',
      bmsState: 'Active',
      ipIntegrity: 'FAILED (Tempered Glass Shattered)',
    },
    message: () => `### Diagnostic Verdict: Shattered Tempered Solar Glass (Warranty Exclusion Criterion)

**Warranty Exclusion Criterion Triggered:** Even if the panel temporarily generates voltage with cracked glass, rainwater will penetrate the fractured laminate within days, corroding the silver busbars and shorting the battery.

#### Policy & Servicing Assessment:
* Under JD Solar warranty criteria, shattered tempered glass or dented frames resulting from drops, falling debris, or external impact are classified as **external trauma / customer carelessness** and are disqualified from free replacement.
* However, our **Quiapo and Cavite branches** stock replacement solar panel modules and glass assemblies at standard shop component rates.`,
    remedySteps: [
      'Power off the luminaire to prevent rainwater short-circuits through the cracked glass.',
      'Photograph the fractured glass panel.',
      'Request a paid replacement solar panel module via our branch service desk.',
    ],
    claimRecommendation: true,
    options: [
      { label: 'Request Paid Replacement Panel Module', next: 'TRANSFER_TO_CLAIM', category: 'Physical / Water Ingress' },
      { label: 'View Quiapo & Cavite Branch Details', next: 'BRANCH_INFO' },
      { label: 'Run New Multi-Criteria Audit', next: 'ROOT' },
    ],
  },

  DIAG_HARDWARE_MOUNT: {
    title: 'Diagnosis: Mechanical Pole Bracket Slack',
    faultCode: 'FLT-MNT-017',
    category: 'Physical / Water Ingress',
    severity: 'mild',
    severityLabel: 'Mild • Mechanical Bolt Torque Fix',
    confidence: '95%',
    defaultCriteria: {
      symptom: 'PHYSICAL_HOTSPOT',
      electrical: 'LED_BLINKING',
      physical: 'MOUNT_LOOSE',
      environmental: 'MONSOON_OVERCAST',
      control: 'AUTO_NORMAL',
    },
    telemetry: {
      pvEfficiency: '100% Intact',
      panelVoltage: '18.2V',
      batteryVoltage: '3.28V',
      bmsState: 'Normal Operation',
      ipIntegrity: 'Passed (IP65 Intact)',
    },
    message: () => `### Diagnostic Verdict: Mechanical Mounting Bracket Slack

Sustained wind buffeting can loosen pole U-clamps or knuckle adjustment bolts, causing the solar panel or lamp head to tilt out of alignment.

#### Field Remedy:
* Use a **10mm or 14mm socket wrench** to re-torque all stainless steel mounting bolts.
* Ensure spring lock washers are seated beneath each hex nut to prevent wind vibration loosening.`,
    remedySteps: [
      'Re-align the solar panel toward True South at a 12–15 degree tilt.',
      'Torque all stainless steel bracket bolts firmly with a socket wrench.',
    ],
    claimRecommendation: false,
    options: [
      { label: 'Bracket Bolts Torqued & Secure (Resolved)', next: 'RESOLVED_DIY' },
      { label: 'Run New Multi-Criteria Audit', next: 'ROOT' },
    ],
  },

  DIAG_REMOTE_BATTERIES: {
    title: 'Diagnosis: Remote Control AAA Batteries Depleted',
    faultCode: 'FLT-RMT-018',
    category: 'Remote Control Failure',
    severity: 'mild',
    severityLabel: 'Mild • 1-Minute Battery Swap',
    confidence: '99%',
    defaultCriteria: {
      symptom: 'SENSOR_REMOTE',
      electrical: 'LED_BLINKING',
      physical: 'SEAL_INTACT',
      environmental: 'CLEAR_SUN',
      control: 'REMOTE_DEAD_BAT',
    },
    telemetry: {
      pvEfficiency: '100% Optimal',
      panelVoltage: '18.2V',
      batteryVoltage: '3.25V',
      bmsState: 'IR Receiver Standby',
      ipIntegrity: 'Passed (IP65 Intact)',
    },
    message: () => `### Diagnostic Verdict: Remote Handset AAA Batteries Depleted

The infrared transmitter diode in the handheld remote requires **3.0V DC**.

* Slide open the rear battery compartment of the remote control and install **two fresh 1.5V AAA alkaline batteries**, observing ` + '`+`' + ` and ` + '`-`' + ` polarity.
* Confirm the small red transmitter indicator illuminates when pressing any button.`,
    remedySteps: [
      'Open the rear battery cover on the handheld remote control.',
      'Install 2 fresh AAA 1.5V batteries.',
      'Test command reception while standing within 5 meters of the luminaire.',
    ],
    claimRecommendation: false,
    options: [
      { label: 'Replaced AAA Batteries & Remote Works (Resolved)', next: 'RESOLVED_DIY' },
      { label: 'Remote Blinks But Lamp Unresponsive: Check Range', next: 'DIAG_REMOTE_RANGE' },
    ],
  },

  DIAG_REMOTE_RANGE: {
    title: 'Diagnosis: Infrared Angle or Range Obstruction',
    faultCode: 'FLT-RMT-019',
    category: 'Remote Control Failure',
    severity: 'mild',
    severityLabel: 'Mild • Line-of-Sight Technique',
    confidence: '92%',
    defaultCriteria: {
      symptom: 'SENSOR_REMOTE',
      electrical: 'LED_BLINKING',
      physical: 'SEAL_INTACT',
      environmental: 'CLEAR_SUN',
      control: 'REMOTE_OUT_OF_RANGE',
    },
    telemetry: {
      pvEfficiency: '100% Optimal',
      panelVoltage: '18.2V',
      batteryVoltage: '3.25V',
      bmsState: 'IR Receiver Active',
      ipIntegrity: 'Passed (IP65 Intact)',
    },
    message: () => `### Diagnostic Verdict: Infrared Line-of-Sight or Range Attenuation

The handheld remote uses a directional **940nm Infrared (IR) optical beam** with an effective reception cone of **5 to 8 meters**. Bright midday glare can also saturate the IR photodiode if aimed from a wide angle.

#### Optimal Command Procedure:
1. Stand within **4 to 6 meters** directly beneath the luminaire head.
2. Aim the front IR emitter tip straight at the translucent sensor dome on the lamp face.
3. Press **AUTO** or **ON** firmly; the LED array will flash once to acknowledge the command.`,
    remedySteps: [
      'Stand within 4–6 meters directly beneath the luminaire.',
      'Aim the remote emitter straight at the receiver dome on the lamp head.',
      'If receiver remains unresponsive at close range at dusk, file a claim for IR receiver service.',
    ],
    claimRecommendation: false,
    options: [
      { label: 'Aimed Closer & Luminaire Responded (Resolved)', next: 'RESOLVED_DIY' },
      { label: 'IR Receiver Unresponsive at Close Range: File Claim', next: 'TRANSFER_TO_CLAIM', category: 'Remote Control Failure' },
    ],
  },

  DIAG_RADAR_DIRT: {
    title: 'Diagnosis: Microwave Radar Mode Disabled or Sensor Obscured',
    faultCode: 'FLT-SNS-020',
    category: 'Sensor / Dusk-Dawn Failure',
    severity: 'mild',
    severityLabel: 'Mild • Mode Reset & Sensor Wipe',
    confidence: '92%',
    defaultCriteria: {
      symptom: 'SENSOR_REMOTE',
      electrical: 'LED_BLINKING',
      physical: 'SEAL_INTACT',
      environmental: 'CLEAR_SUN',
      control: 'RADAR_DISABLED',
    },
    telemetry: {
      pvEfficiency: '100% Optimal',
      panelVoltage: '18.2V',
      batteryVoltage: '3.25V',
      bmsState: 'Constant Override / Sensor Masked',
      ipIntegrity: 'Passed (IP65 Intact)',
    },
    message: () => `### Diagnostic Verdict: Radar Motion Mode Disabled or Dome Fouled

If the luminaire does not surge from 30% standby to 100% brightness when pedestrians approach:
1. **Constant Mode Override:** The remote may currently be set to **ALWAYS / Constant** mode, which bypasses motion induction. Press the **RADAR** or **AUTO** button on the remote; the lamp will flash twice to confirm radar mode is active.
2. **Sensor Dome Fouling:** Wipe dust or cobwebs off the rounded plastic sensor window on the lamp bezel.`,
    remedySteps: [
      'Press the RADAR or AUTO button on the remote control and observe two confirmation flashes.',
      'Wipe the rounded sensor window clean with a damp cloth.',
      'Step 6 meters away for 20 seconds, then walk toward the pole to verify 100% brightness surge.',
    ],
    claimRecommendation: false,
    options: [
      { label: 'Radar Motion Surge Restored (Resolved)', next: 'RESOLVED_DIY' },
      { label: 'Sensor Still Unresponsive: File Warranty Claim', next: 'TRANSFER_TO_CLAIM', category: 'Sensor / Dusk-Dawn Failure' },
    ],
  },

  // ==========================================================================
  // RESOLVED & STORE BRANCH NODES
  // ==========================================================================
  RESOLVED_DIY: {
    title: 'Multi-Criteria Diagnostic Resolved',
    stepStage: 4,
    message: (product) => `### Equipment Restored to Nominal Operation

Your **${product?.product_name || 'solar lighting system'}** has been verified and restored through our multi-criteria diagnostic protocol.

* **Grid Electricity Cost:** PHP 0.00 off-grid operation maintained.
* **Preventive Schedule:** Inspect and wipe the tempered solar glass every 90 days to prevent soiling attenuation.
* **Service Support:** Our Quiapo Showroom and Cavite Hub remain available for future technical assistance.`,
    options: [
      { label: 'Run Diagnostic on Another Symptom', next: 'ROOT' },
      { label: 'Return to Customer Dashboard', action: 'CLOSE' },
    ],
  },

  BRANCH_INFO: {
    title: 'JD Solar Service & Diagnostic Centers',
    stepStage: 4,
    message: () => `### JD Solar Branch Service Centers

Our technical staff perform bench load testing, LiFePO4 battery swaps, and warranty replacements on-site:

#### 1. Cavite Distribution & Service Hub
* **Location:** General Trias, Cavite
* **Operating Hours:** Monday – Saturday, 8:00 AM – 5:00 PM

#### 2. Quiapo Showroom & Service Desk (Manila)
* **Location:** Evangelista St., Quiapo Commercial Center, Manila
* **Operating Hours:** Monday – Saturday, 8:30 AM – 5:30 PM`,
    options: [
      { label: 'File Official Claim Ticket Online First', next: 'TRANSFER_TO_CLAIM', category: 'No Power / Won\'t Turn On' },
      { label: 'Back to Diagnostic Main Menu', next: 'ROOT' },
    ],
  },
}

/**
 * Multi-criteria natural free-text parser:
 * Extracts symptom, electrical, physical, environmental, and control clues from user text.
 * If multiple specific clues are provided in a single sentence (e.g. "water inside lens and flickering"
 * or "died after 2 hours during 3 rainy days"), immediately runs the Multi-Criteria Inference Engine!
 * Otherwise, routes to the appropriate multi-criteria stage with extracted criteria pre-populated.
 */
export function matchDiagnosticFreeText(query, product) {
  const q = (query || '').toLowerCase().trim()

  if (['emoji', 'emojis', 'emoticon', 'emoticons'].some((k) => q.includes(k))) {
    return {
      title: 'Multi-Criteria Solar Diagnostic System',
      message: (prod) =>
        `The JD Solar Diagnostic Engine operates strictly in clean technical text without emojis. Select an observed symptom below or open the Criteria Matrix to evaluate your **${
          prod?.product_name || 'unit'
        }**:`,
      options: DIAGNOSTIC_TREE.ROOT.options,
    }
  }

  const extracted = {}
  let clueCount = 0

  // 1. Detect Symptom
  if (['turn on', 'wont turn', 'no power', 'dead', 'dark', 'hindi bumubukas', 'patay', 'wont start'].some((k) => q.includes(k))) {
    extracted.symptom = 'NO_POWER'
    clueCount++
  } else if (['shut off', 'dies', '1 hour', '2 hours', '3 hours', 'drain', 'mabilis maubos', 'battery low', 'short'].some((k) => q.includes(k))) {
    extracted.symptom = 'SHORT_RUNTIME'
    clueCount++
  } else if (['dim', 'flicker', 'kurap', 'strobe', 'mahina', 'weak', 'low light', 'half dark'].some((k) => q.includes(k))) {
    extracted.symptom = 'DIM_FLICKER'
    clueCount++
  } else if (['daytime', 'araw', 'wont turn off', 'sunlight', 'always on', 'hindi namamatay'].some((k) => q.includes(k))) {
    extracted.symptom = 'DAYTIME_ON'
    clueCount++
  } else if (['hot', 'burned', 'sunog', 'crack', 'basag', 'glass', 'shatter', 'loose bracket'].some((k) => q.includes(k))) {
    extracted.symptom = 'PHYSICAL_HOTSPOT'
    clueCount++
  } else if (['remote', 'sensor', 'radar', 'motion', 'pindot', 'unresponsive'].some((k) => q.includes(k))) {
    extracted.symptom = 'SENSOR_REMOTE'
    clueCount++
  }

  // 2. Detect Physical Integrity Criteria
  if (['water', 'moisture', 'condensation', 'droplet', 'tubig', 'fog', 'wet'].some((k) => q.includes(k))) {
    extracted.physical = 'WATER_INGRESS'
    clueCount += 2
  } else if (['crack', 'shatter', 'broken glass', 'basag'].some((k) => q.includes(k))) {
    extracted.physical = 'GLASS_FRACTURE'
    clueCount += 2
  } else if (['hotspot', 'burn', 'brown spot', 'melted', 'sunog'].some((k) => q.includes(k))) {
    extracted.physical = 'CELL_HOTSPOT'
    clueCount += 2
  } else if (['loose plug', 'unplugged', 'cable', 'wire', 'aviation'].some((k) => q.includes(k))) {
    extracted.physical = 'PLUG_LOOSE'
    clueCount += 2
  } else if (['bracket', 'bolt', 'mount loose'].some((k) => q.includes(k))) {
    extracted.physical = 'MOUNT_LOOSE'
    clueCount += 2
  }

  // 3. Detect Environmental Criteria
  if (['rain', 'storm', 'cloudy', 'overcast', 'ulan', 'bagyo', 'monsoon'].some((k) => q.includes(k))) {
    extracted.environmental = 'MONSOON_OVERCAST'
    clueCount++
  } else if (['dust', 'dirt', 'mud', 'soot', 'droppings', 'marumi', 'alikabok'].some((k) => q.includes(k))) {
    extracted.environmental = 'HEAVY_SOILING'
    clueCount++
  } else if (['shade', 'shadow', 'tree', 'roof', 'lilim', 'puno'].some((k) => q.includes(k))) {
    extracted.environmental = 'PARTIAL_SHADING'
    clueCount++
  } else if (['flat', 'north', 'tilt', 'angle'].some((k) => q.includes(k))) {
    extracted.environmental = 'FLAT_NORTH_TILT'
    clueCount++
  }

  // 4. Detect Electrical & Control Criteria
  if (['no indicator', 'indicator dark', 'not charging'].some((k) => q.includes(k))) {
    extracted.electrical = 'LED_DARK'
    clueCount++
  } else if (['strobe', 'pulsing', 'ripple', 'kurap'].some((k) => q.includes(k))) {
    extracted.electrical = 'LED_RIPPLE'
    clueCount++
  } else if (['half', 'one side dark', 'burnout'].some((k) => q.includes(k))) {
    extracted.electrical = 'LED_PARTIAL_DARK'
    clueCount++
  }

  if (['switch off', 'button', 'master switch'].some((k) => q.includes(k))) {
    extracted.control = 'SWITCH_OFF'
    clueCount++
  } else if (['2 years', '3 years', 'old battery', 'aged', 'luma'].some((k) => q.includes(k))) {
    extracted.control = 'AGED_CELLS'
    clueCount++
  } else if (['aaa', 'remote battery', 'remote dead'].some((k) => q.includes(k))) {
    extracted.control = 'REMOTE_DEAD_BAT'
    clueCount++
  }

  // If user provided 2+ distinct criteria clues (or a critical physical failure), run full multi-criteria evaluation!
  if (clueCount >= 2) {
    return evaluateDiagnosticCriteria(extracted, product)
  }

  // Otherwise route to the appropriate Stage 1 symptom audit node with extracted criteria patch
  if (extracted.symptom === 'NO_POWER') return { ...DIAGNOSTIC_TREE.SYMPTOM_NO_POWER, criteriaPatch: extracted }
  if (extracted.symptom === 'SHORT_RUNTIME') return { ...DIAGNOSTIC_TREE.SYMPTOM_SHORT_RUNTIME, criteriaPatch: extracted }
  if (extracted.symptom === 'DIM_FLICKER') return { ...DIAGNOSTIC_TREE.SYMPTOM_DIM_FLICKER, criteriaPatch: extracted }
  if (extracted.symptom === 'DAYTIME_ON') return { ...DIAGNOSTIC_TREE.SYMPTOM_DAYTIME_ON, criteriaPatch: extracted }
  if (extracted.symptom === 'PHYSICAL_HOTSPOT') return { ...DIAGNOSTIC_TREE.SYMPTOM_PHYSICAL_HOTSPOT, criteriaPatch: extracted }
  if (extracted.symptom === 'SENSOR_REMOTE') return { ...DIAGNOSTIC_TREE.SYMPTOM_SENSOR_REMOTE, criteriaPatch: extracted }

  return DIAGNOSTIC_TREE.ROOT
}
