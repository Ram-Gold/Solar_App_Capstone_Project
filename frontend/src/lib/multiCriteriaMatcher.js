// frontend/src/lib/multiCriteriaMatcher.js
// Multi-Criteria Decision Support System (MCDSS) for Solar Lighting Selection
// Evaluates candidate products against user requirements (Budget, Location, Power Needs,
// Form Factor, Mounting, and Quantity) using weighted multi-attribute utility theory.
// Strictly text/icon-driven, industrial tone, no emojis.

import { FALLBACK_PRODUCTS } from './solarBotEngine.js'
import { getStockTier, getAvailableQuantity } from './inventoryUtils.js'

/**
 * Default weights for core 3-criteria evaluation (Sum = 1.0)
 */
export const DEFAULT_CRITERIA_WEIGHTS = {
  budget: 0.35,
  location: 0.35,
  power: 0.30,
}

/**
 * Expanded weights when Form Factor and/or Mounting preferences are active
 */
export const EXTENDED_CRITERIA_WEIGHTS = {
  budget: 0.30,
  location: 0.25,
  power: 0.25,
  formFactor: 0.12,
  mounting: 0.08,
}

export const DEFAULT_MATCH_THRESHOLD = 0.70 // 70% match threshold

/**
 * Determines whether a product candidate is a genuine off-grid solar luminaire.
 * Eliminates AC grid-tied equipment (e.g. 220V streetlights and AC floodlights)
 * from entering the solar matcher pipeline.
 */
export function isSolarCandidate(product) {
  if (!product) return false

  // If power_source column exists, use it as primary discriminator
  if (product.power_source) {
    return product.power_source.toLowerCase().includes('solar')
  }

  // Check explicit non-solar / grid voltage signatures
  const volt = String(product.voltage || '').toUpperCase()
  const name = String(product.name || '').toUpperCase()
  const type = String(product.type || '').toUpperCase()
  const hasSolarSpecs = Boolean(
    product.solar_panel ||
    product.battery ||
    (product.charging_type && String(product.charging_type).toLowerCase().includes('solar'))
  )

  if (name.includes('220V') || type.includes('220V') || name.includes('ELECTRIC') || type.includes('ELECTRIC')) {
    if (!hasSolarSpecs) return false
  }

  if (volt.includes('AC') || volt.includes('220V') || volt.includes('110V')) {
    if (!hasSolarSpecs) return false
  }

  return true
}

/**
 * Infers hardware Form Factor from existing catalog columns without requiring a DB migration.
 * Returns 'integrated' (All-in-One) or 'split' (Split-Type separate panel + luminaire).
 */
export function inferFormFactor(product) {
  if (!product) return 'integrated'
  if (product.form_factor) {
    const explicit = String(product.form_factor).toLowerCase()
    if (explicit.includes('split') || explicit.includes('separate')) return 'split'
    if (explicit.includes('integrated') || explicit.includes('all')) return 'integrated'
  }

  const name = String(product.name || '').toLowerCase()
  const type = String(product.type || '').toLowerCase()
  const panel = String(product.solar_panel || '').toLowerCase()
  const combined = `${type} ${name}`

  if (
    combined.includes('split') ||
    combined.includes('separate') ||
    combined.includes('floodlight') ||
    combined.includes('flood light') ||
    panel.includes('separate') ||
    panel.includes('external')
  ) {
    return 'split'
  }

  if (
    combined.includes('integrated') ||
    combined.includes('all-in-one') ||
    combined.includes('all in one')
  ) {
    return 'integrated'
  }

  return 'integrated'
}

/**
 * Infers supported Mounting / Pole options from existing catalog columns.
 * Returns an array containing 'pole', 'wall', or both.
 */
export function inferMountingOptions(product) {
  if (!product) return ['pole']
  if (product.mounting_type) {
    const explicit = String(product.mounting_type).toLowerCase()
    const options = []
    if (explicit.includes('pole') || explicit.includes('post') || explicit.includes('mast')) options.push('pole')
    if (explicit.includes('wall') || explicit.includes('gate') || explicit.includes('bracket')) options.push('wall')
    if (options.length > 0) return options
  }

  const name = String(product.name || '').toLowerCase()
  const type = String(product.type || '').toLowerCase()
  const combined = `${type} ${name}`
  const watt = Number(product.watt) || 0

  // Floodlights mount on walls, eaves, gates, or poles via U-bracket
  if (combined.includes('floodlight') || combined.includes('flood light')) {
    return ['wall', 'pole']
  }

  // Dedicated wall/gate/garden fixtures
  if (combined.includes('wall') || combined.includes('gate') || combined.includes('garden')) {
    return ['wall']
  }

  // Heavy road / high-mast luminaires require a dedicated pole
  if (combined.includes('road') || combined.includes('high mast') || combined.includes('tower') || watt > 250) {
    return ['pole']
  }

  // Compact streetlights (<= 250W) support pole arms as well as wall/perimeter mounting brackets
  return ['pole', 'wall']
}

/**
 * Normalizes mounting criterion values to canonical 'pole' | 'wall' | 'any'.
 */
export function normalizeMountingCriterion(targetMounting) {
  if (!targetMounting) return 'any'
  const val = String(targetMounting).toLowerCase().trim()
  if (val === 'any' || val === 'all' || val === '') return 'any'
  if (val.includes('wall') || val.includes('without') || val.includes('no_pole') || val.includes('gate')) {
    return 'wall'
  }
  if (val.includes('pole') || val.includes('post') || val.includes('mast')) {
    return 'pole'
  }
  return 'any'
}

/**
 * Normalizes form factor criterion values to canonical 'integrated' | 'split' | 'any'.
 */
export function normalizeFormFactorCriterion(targetFormFactor) {
  if (!targetFormFactor) return 'any'
  const val = String(targetFormFactor).toLowerCase().trim()
  if (val === 'any' || val === 'all' || val === '') return 'any'
  if (val.includes('split') || val.includes('separate')) return 'split'
  if (val.includes('integrated') || val.includes('all-in-one') || val.includes('all_in_one')) {
    return 'integrated'
  }
  return 'any'
}

/**
 * Scores Form Factor compatibility (Range: 0.0 to 1.0)
 */
export function scoreFormFactorFit(product, targetFormFactor) {
  const normalized = normalizeFormFactorCriterion(targetFormFactor)
  if (normalized === 'any') return 1.0
  const inferred = inferFormFactor(product)
  return inferred === normalized ? 1.0 : 0.25
}

/**
 * Scores Mounting / Pole compatibility (Range: 0.0 to 1.0)
 */
export function scoreMountingFit(product, targetMounting) {
  const normalized = normalizeMountingCriterion(targetMounting)
  if (normalized === 'any') return 1.0
  const supported = inferMountingOptions(product)
  if (supported.includes(normalized)) {
    // Give full 1.0 for exact primary match; slight distinction if dual-purpose
    return 1.0
  }
  return 0.30
}

/**
 * Extracts numeric pricing information from product price_range or price column.
 * Examples: "1500-2500" -> { min: 1500, max: 2500, avg: 2000, hasPrice: true }
 *           "3000+"     -> { min: 3000, max: 4500, avg: 3750, hasPrice: true }
 *           "5,000 - 8,000" -> { min: 5000, max: 8000, avg: 6500, hasPrice: true }
 * If missing, returns { min: null, max: null, avg: null, hasPrice: false } without ghost pricing.
 */
export function parseProductPrice(product) {
  if (!product) {
    return { min: null, max: null, avg: null, hasPrice: false }
  }

  // Prefer structured numeric columns if available
  if (product.min_price !== undefined && product.min_price !== null && product.min_price !== '') {
    const numMin = Number(product.min_price)
    if (!isNaN(numMin) && numMin > 0) {
      const numMax =
        product.max_price !== undefined &&
        product.max_price !== null &&
        product.max_price !== '' &&
        !isNaN(Number(product.max_price))
          ? Number(product.max_price)
          : numMin
      return {
        min: numMin,
        max: numMax,
        avg: Math.round((numMin + numMax) / 2),
        hasPrice: true,
      }
    }
  }

  const rawVal = product.price_range ?? product.price ?? product.unit_price
  if (rawVal === undefined || rawVal === null || rawVal === '') {
    return { min: null, max: null, avg: null, hasPrice: false }
  }

  const raw = String(rawVal).trim()
  const numbers = raw
    .split('-')
    .map((s) => parseInt(s.replace(/[^0-9]/g, ''), 10))
    .filter((n) => !isNaN(n))

  if (numbers.length >= 2) {
    return {
      min: Math.min(numbers[0], numbers[1]),
      max: Math.max(numbers[0], numbers[1]),
      avg: Math.round((numbers[0] + numbers[1]) / 2),
      hasPrice: true,
    }
  }

  if (numbers.length === 1) {
    const val = numbers[0]
    if (raw.includes('+')) {
      return { min: val, max: Math.round(val * 1.5), avg: Math.round(val * 1.25), hasPrice: true }
    }
    return { min: val, max: val, avg: val, hasPrice: true }
  }

  return { min: null, max: null, avg: null, hasPrice: false }
}

/**
 * Derives dynamic catalog bounds (min/max wattages and min/max prices) directly
 * from the live database products list.
 */
export function getCatalogBounds(products = []) {
  const catalog = Array.isArray(products) && products.length > 0 ? products : FALLBACK_PRODUCTS

  let minWatt = 50
  let maxWatt = 1000
  let minPrice = 1000
  let maxPrice = 5000

  const validWatts = catalog
    .map((p) => Number(p?.watt))
    .filter((w) => !isNaN(w) && w > 0)

  if (validWatts.length > 0) {
    minWatt = Math.min(...validWatts)
    maxWatt = Math.max(...validWatts)
  }

  const validPrices = catalog
    .map((p) => parseProductPrice(p))
    .filter((p) => p.hasPrice && p.max !== null)

  if (validPrices.length > 0) {
    const mins = validPrices.map((p) => p.min).filter((n) => n !== null && n > 0)
    const maxes = validPrices.map((p) => p.max).filter((n) => n !== null && n > 0)
    if (mins.length > 0) minPrice = Math.min(...mins)
    if (maxes.length > 0) maxPrice = Math.max(...maxes)
  }

  const WATT_STEP = 50
  const alignedMinWatt = Math.floor(minWatt / WATT_STEP) * WATT_STEP
  const alignedMaxWatt = Math.ceil(maxWatt / WATT_STEP) * WATT_STEP

  const cleanMaxPrice = Math.max(minPrice, Math.ceil(maxPrice / 500) * 500)
  const cleanMinPrice = Math.max(500, Math.floor(minPrice / 500) * 500)

  const candidateWatts = [100, 150, 200, 300, 400, 500, 600, 800, alignedMaxWatt]
  const powerPresets = Array.from(
    new Set(candidateWatts.filter((w) => w >= alignedMinWatt && w <= alignedMaxWatt))
  ).sort((a, b) => a - b)

  const step = cleanMaxPrice > 6000 ? 1500 : 1000
  const presetValues = []
  for (let val = Math.max(1500, cleanMinPrice); val < cleanMaxPrice; val += step) {
    presetValues.push(val)
  }
  if (!presetValues.includes(cleanMaxPrice)) {
    presetValues.push(cleanMaxPrice)
  }

  const budgetPresets = [
    ...presetValues.map((v) => ({ label: `₱${v.toLocaleString()}`, value: v })),
    { label: 'Any', value: 'any' },
  ]

  return {
    minWatt: alignedMinWatt,
    maxWatt: alignedMaxWatt,
    minPrice: cleanMinPrice,
    maxPrice: cleanMaxPrice,
    lowestCatalogPrice: validPrices.length > 0 ? minPrice : cleanMinPrice,
    powerPresets,
    budgetPresets,
  }
}

/**
 * Location Compatibility Scorer (Range: 0.0 to 1.0)
 * Evaluates physical mounting height, beam angle optics, and location attributes.
 */
export function scoreLocationFit(product, targetLocation) {
  if (!targetLocation || targetLocation === 'any') return 1.0

  const loc = targetLocation.toLowerCase()
  const name = (product.name || '').toLowerCase()
  const type = (product.type || '').toLowerCase()
  const placeOfUse = (product.place_of_use || '').toLowerCase()
  const watt = Number(product.watt) || 0
  const beamingAngle = (product.beaming_angle || '').toLowerCase()

  if (loc.includes('road') || loc === 'highway') {
    let score = 0.5
    if (type.includes('road') || name.includes('road')) score = 1.0
    else if (placeOfUse.includes('highway') || placeOfUse.includes('road') || placeOfUse.includes('viaduct')) score = 0.95
    else if ((type.includes('street') || name.includes('street')) && watt >= 300) score = 0.88
    else if (watt >= 400) score = 0.82
    else if (watt < 150) return 0.20

    if (beamingAngle.includes('120') || beamingAngle.includes('140') || beamingAngle.includes('batwing')) {
      score = Math.min(1.0, score + 0.05)
    }
    return score
  }

  if (loc.includes('street') || loc.includes('subdivision') || loc.includes('alley')) {
    let score = 0.5
    if (type.includes('street') || name.includes('street')) score = 1.0
    else if (placeOfUse.includes('community') || placeOfUse.includes('square') || placeOfUse.includes('street')) score = 0.95
    else if ((type.includes('road') || name.includes('road')) && watt <= 400) score = 0.90
    else if (watt >= 100 && watt <= 400) score = 0.85
    else if (watt > 600) score = 0.60

    return score
  }

  if (loc.includes('home') || loc.includes('residential') || loc.includes('gate') || loc.includes('garden')) {
    if (watt >= 50 && watt <= 200) return 1.0
    if (watt > 200 && watt <= 350) return 0.85
    if (placeOfUse.includes('park') || placeOfUse.includes('community') || placeOfUse.includes('courtyard')) return 0.90
    if (type.includes('road') || name.includes('road')) return 0.35
    if (watt > 400) return 0.30
    return 0.70
  }

  if (loc.includes('commercial') || loc.includes('parking') || loc.includes('warehouse')) {
    if (watt >= 300 && watt <= 1000) return 1.0
    if (placeOfUse.includes('viaduct') || placeOfUse.includes('square') || placeOfUse.includes('warehouse') || placeOfUse.includes('parking')) return 0.95
    if (watt >= 200 && watt < 300) return 0.80
    if (watt < 150) return 0.25
    return 0.65
  }

  return 0.80
}

/**
 * Power Needs Scorer (Range: 0.0 to 1.0)
 * Evaluates illumination adequacy against user's wattage target or power tier.
 */
export function scorePowerFit(product, powerNeeds, maxWatt = null) {
  if ((!powerNeeds && powerNeeds !== 0) || powerNeeds === 'any') return 1.0
  const productWatt = Number(product.watt) || 100

  if (typeof powerNeeds === 'number' || !isNaN(Number(powerNeeds))) {
    const target = Number(powerNeeds)
    if (target <= 0) return 0.0

    if (maxWatt && target >= maxWatt) {
      if (productWatt >= maxWatt) return 1.0
      const ratio = productWatt / maxWatt
      return Math.max(0.40, Number((0.60 + ratio * 0.40).toFixed(2)))
    }

    const diff = Math.abs(productWatt - target)
    if (diff === 0) return 1.0
    if (diff <= 50) return 0.95
    if (diff <= 100) return 0.85
    if (diff <= 200) return 0.70
    if (diff <= 300) return 0.50
    return Math.max(0.2, 1 - diff / target)
  }

  const tier = String(powerNeeds).toLowerCase()
  if (tier.includes('low') || tier.includes('50') || tier.includes('entry')) {
    if (productWatt >= 50 && productWatt <= 150) return 1.0
    if (productWatt === 200) return 0.80
    return 0.30
  }
  if (tier.includes('med') || tier.includes('mid') || tier.includes('standard')) {
    if (productWatt >= 200 && productWatt <= 350) return 1.0
    if (productWatt === 150 || productWatt === 400) return 0.80
    return 0.40
  }
  if (tier.includes('high') || tier.includes('heavy') || tier.includes('industrial') || tier.includes('max')) {
    if (productWatt >= (maxWatt || 400)) return 1.0
    if (productWatt >= 400) return 0.90
    if (productWatt >= 300) return 0.75
    return 0.30
  }

  return 0.80
}

/**
 * Budget Scorer (Range: 0.0 to 1.0)
 * Evaluates financial affordability against user's per-unit budget ceiling or bracket.
 */
export function scoreBudgetFit(product, userBudget, maxPrice = null) {
  if (!userBudget && userBudget !== 0) return 1.0
  if (userBudget === 'any') return 1.0

  const { min: prodMin, max: prodMax, avg: prodAvg, hasPrice } = parseProductPrice(product)

  if (!hasPrice) {
    return 0.70
  }

  if (typeof userBudget === 'number' || !isNaN(Number(userBudget))) {
    const budgetCeiling = Number(userBudget)
    if (budgetCeiling <= 0) return 0.0

    if (maxPrice && budgetCeiling >= maxPrice) {
      return 1.0
    }

    if (prodMax <= budgetCeiling) {
      return 1.0
    }

    if (prodMin <= budgetCeiling) {
      return 0.85
    }

    const overAmount = prodMin - budgetCeiling
    const overPercent = overAmount / budgetCeiling

    if (overPercent <= 0.15) return 0.65
    if (overPercent <= 0.30) return 0.40
    return 0.10
  }

  const bracket = String(userBudget)
  if (product.price_range?.includes(bracket)) return 1.0

  if (bracket.includes('1000-2000')) {
    if (prodAvg <= 2000) return 1.0
    if (prodAvg <= 2500) return 0.70
    return 0.20
  }

  if (bracket.includes('2500-3500') || bracket.includes('2000-3500')) {
    if (prodAvg >= 1800 && prodAvg <= 3500) return 1.0
    if (prodAvg < 1800) return 0.85
    return 0.50
  }

  if (bracket.includes('3000+') || bracket.includes('3500+')) {
    if (prodAvg >= 3000) return 1.0
    return 0.75
  }

  return 0.80
}

/**
 * Resolves effective per-unit budget given budget value, budgetMode ('unit' | 'total'), and quantity.
 */
export function resolveEffectiveUnitBudget(criteria = {}) {
  const rawBudget = criteria.budget
  if (rawBudget === undefined || rawBudget === null || rawBudget === '' || rawBudget === 'any') {
    return 'any'
  }
  const numericBudget = Number(rawBudget)
  if (isNaN(numericBudget)) {
    return rawBudget
  }
  if (numericBudget <= 0) {
    return numericBudget
  }
  const quantity = Math.max(1, Math.floor(Number(criteria.quantity) || 1))
  if (criteria.budgetMode === 'total' && quantity > 1) {
    return Math.max(1, Math.round(numericBudget / quantity))
  }
  return numericBudget
}

function buildLocationReason(locationScore, targetLocation, product) {
  if (!targetLocation || targetLocation === 'any') {
    return 'Works in most outdoor spots'
  }
  const loc = String(targetLocation).toLowerCase()
  const labelMap = {
    road: 'a main road or highway',
    highway: 'a main road or highway',
    street: 'a street or subdivision',
    home: 'a home, gate, or yard',
    commercial: 'a parking lot or open yard',
  }
  const locName = labelMap[loc] || targetLocation
  if (locationScore >= 0.85) {
    return `Good fit for ${locName}`
  }
  if (locationScore >= 0.60) {
    return `Can work for ${locName}`
  }
  return `Not the usual choice for ${locName} (${product.watt || 0}W)`
}

function buildFormAndMountReason(inferredFormFactor, inferredMounting, targetFormFactor, targetMounting) {
  const formLabel = inferredFormFactor === 'split' ? 'Split-Type' : 'All-in-One'
  const mountLabel =
    inferredMounting.includes('wall') && inferredMounting.includes('pole')
      ? 'fits a pole or wall'
      : inferredMounting.includes('wall')
      ? 'mounts on a wall or gate'
      : 'mounts on a pole'

  const parts = []
  if (targetFormFactor !== 'any') {
    parts.push(
      inferredFormFactor === targetFormFactor
        ? `${formLabel} as requested`
        : `${formLabel} (you picked ${targetFormFactor === 'split' ? 'Split-Type' : 'All-in-One'})`
    )
  } else {
    parts.push(formLabel)
  }

  if (targetMounting !== 'any') {
    const requestedLabel = targetMounting === 'wall' ? 'wall or gate' : 'pole'
    parts.push(
      inferredMounting.includes(targetMounting)
        ? `fits a ${requestedLabel}`
        : `${mountLabel}`
    )
  } else {
    parts.push(mountLabel)
  }

  return parts.join(', ')
}

function buildPowerReason(powerScore, targetPower, product, maxWatt) {
  const prodWatt = Number(product.watt) || 0
  if (targetPower === undefined || targetPower === null || targetPower === '' || targetPower === 'any') {
    return `${prodWatt}W brightness`
  }
  const target = Number(targetPower)
  if (!isNaN(target)) {
    if (target <= 0) {
      return `${Math.max(0, target)}W is below this light's ${prodWatt}W rating`
    }
    if (maxWatt && target >= maxWatt && prodWatt >= maxWatt) {
      return `${prodWatt}W is our brightest option`
    }
    const diff = prodWatt - target
    if (diff === 0) return `Exact match at ${prodWatt}W`
    if (Math.abs(diff) <= 50) return `${prodWatt}W is very close to ${target}W`
    if (diff > 0) return `${prodWatt}W is brighter than ${target}W`
    return `${prodWatt}W is lower than ${target}W`
  }
  return powerScore >= 0.85 ? `Good brightness at ${prodWatt}W` : `${prodWatt}W light`
}

function buildBudgetReason(budgetScore, effectiveUnitBudget, priceInfo, quantity, budgetMode) {
  if (priceInfo.isUnlisted || !priceInfo.hasPrice) {
    return 'Ask our branch for the price'
  }
  if (effectiveUnitBudget === 'any') {
    return quantity > 1
      ? `₱${(priceInfo.min * quantity).toLocaleString()} to ₱${(priceInfo.max * quantity).toLocaleString()} for ${quantity} units`
      : `₱${priceInfo.min.toLocaleString()} to ₱${priceInfo.max.toLocaleString()} each`
  }
  const ceiling = Number(effectiveUnitBudget)
  if (!isNaN(ceiling)) {
    if (ceiling <= 0) {
      return `₱${Math.max(0, ceiling).toLocaleString()} budget is below this light's ₱${priceInfo.min.toLocaleString()} price`
    }
    if (priceInfo.max <= ceiling) {
      return budgetMode === 'total' && quantity > 1
        ? `Fits your ₱${(ceiling * quantity).toLocaleString()} total budget`
        : `Within your ₱${ceiling.toLocaleString()} budget`
    }
    if (priceInfo.min <= ceiling) {
      return `Starts at ₱${priceInfo.min.toLocaleString()}, within your budget`
    }
    const over = priceInfo.min - ceiling
    return `₱${over.toLocaleString()} over your ₱${ceiling.toLocaleString()} budget`
  }
  return budgetScore >= 0.85 ? 'Fits your budget' : 'Close to your budget'
}

/**
 * Evaluates a single product candidate and returns detailed sub-scores and justification
 */
export function evaluateProductMatch(
  product,
  criteria = {},
  weights = DEFAULT_CRITERIA_WEIGHTS,
  context = {}
) {
  const priceInfo = parseProductPrice(product)
  const isPriceUnlisted = !priceInfo.hasPrice

  const quantity = Math.max(1, Math.floor(Number(criteria.quantity) || 1))
  const budgetMode = criteria.budgetMode === 'total' ? 'total' : 'unit'
  const effectiveUnitBudget = resolveEffectiveUnitBudget({ ...criteria, quantity, budgetMode })

  const targetFormFactor = normalizeFormFactorCriterion(criteria.formFactor)
  const targetMounting = normalizeMountingCriterion(criteria.mounting)
  const inferredFormFactor = inferFormFactor(product)
  const inferredMounting = inferMountingOptions(product)

  const locationScore = scoreLocationFit(product, criteria.location)
  const powerTarget = criteria.powerNeeds ?? criteria.watt ?? criteria.minWatt
  const powerScore = scorePowerFit(product, powerTarget, context.maxWatt)
  const budgetScore = scoreBudgetFit(product, effectiveUnitBudget, context.maxPrice)
  const formFactorScore = scoreFormFactorFit(product, targetFormFactor)
  const mountingScore = scoreMountingFit(product, targetMounting)

  const hasFormFilter = targetFormFactor !== 'any'
  const hasMountFilter = targetMounting !== 'any'
  const usesExtended = hasFormFilter || hasMountFilter

  const baseWeights = usesExtended
    ? {
        budget: weights.budget ?? EXTENDED_CRITERIA_WEIGHTS.budget,
        location: weights.location ?? EXTENDED_CRITERIA_WEIGHTS.location,
        power: weights.power ?? EXTENDED_CRITERIA_WEIGHTS.power,
        formFactor: hasFormFilter ? (weights.formFactor ?? EXTENDED_CRITERIA_WEIGHTS.formFactor) : 0,
        mounting: hasMountFilter ? (weights.mounting ?? EXTENDED_CRITERIA_WEIGHTS.mounting) : 0,
      }
    : {
        budget: weights.budget ?? DEFAULT_CRITERIA_WEIGHTS.budget,
        location: weights.location ?? DEFAULT_CRITERIA_WEIGHTS.location,
        power: weights.power ?? DEFAULT_CRITERIA_WEIGHTS.power,
        formFactor: 0,
        mounting: 0,
      }

  const totalWeight =
    baseWeights.budget +
    baseWeights.location +
    baseWeights.power +
    baseWeights.formFactor +
    baseWeights.mounting

  let compositeScore =
    (budgetScore * (baseWeights.budget / totalWeight)) +
    (locationScore * (baseWeights.location / totalWeight)) +
    (powerScore * (baseWeights.power / totalWeight)) +
    (formFactorScore * (baseWeights.formFactor / totalWeight)) +
    (mountingScore * (baseWeights.mounting / totalWeight))

  // Technical-only score (useful for ranking unlisted-price candidates cleanly)
  const techWeightSum =
    baseWeights.location + baseWeights.power + baseWeights.formFactor + baseWeights.mounting
  const technicalScore =
    techWeightSum > 0
      ? (locationScore * baseWeights.location +
          powerScore * baseWeights.power +
          formFactorScore * baseWeights.formFactor +
          mountingScore * baseWeights.mounting) /
        techWeightSum
      : compositeScore

  // Stock consideration: In-stock priority (uses available = stock_quantity - reserved_quantity)
  const stockTier = getStockTier(product)
  const stockQty = getAvailableQuantity(product)
  if (stockTier === 'out') {
    compositeScore *= 0.50
  }

  // Compromise and Discordance Detection
  let compromise = null
  const budgetCeiling = effectiveUnitBudget === 'any' ? NaN : Number(effectiveUnitBudget)

  // 1. Budget Compromise: user per-unit budget is strictly below product minimum price
  if (!isPriceUnlisted && effectiveUnitBudget !== 'any' && !isNaN(budgetCeiling)) {
    if (priceInfo.min && priceInfo.min > budgetCeiling) {
      const clampedCeiling = Math.max(0, budgetCeiling)
      const overAmount = priceInfo.min - clampedCeiling
      const overPercent = budgetCeiling > 0 ? overAmount / budgetCeiling : Infinity

      compromise = {
        hasCompromise: true,
        type: 'budget',
        label: 'Budget Compromise',
        severity: overPercent > 0.30 ? 'high' : 'moderate',
        overAmount,
        summary: `Exceeds target budget by ₱${overAmount.toLocaleString()} to deliver ${product.watt ? `${product.watt}W` : 'required'} output.`,
      }

      if (overPercent > 0.20) {
        compositeScore *= 0.85
      }
    }
  }

  // 2. Form Factor Compromise: explicit mismatch on All-in-One vs Split-Type
  if (!compromise && hasFormFilter && inferredFormFactor !== targetFormFactor) {
    compromise = {
      hasCompromise: true,
      type: 'formFactor',
      label: 'Form Factor Note',
      severity: 'moderate',
      summary: `This unit is ${inferredFormFactor === 'split' ? 'Split-Type' : 'All-in-One (Integrated)'}, while you requested ${targetFormFactor === 'split' ? 'Split-Type' : 'All-in-One'}.`,
    }
  }

  // 3. Wattage Compromise: luminaire is under-powered for mounting height/location
  if (!compromise) {
    const prodWatt = Number(product.watt) || 0
    const loc = String(criteria.location || '').toLowerCase()
    const targetWatt = powerTarget && powerTarget !== 'any' ? Number(powerTarget) : 0
    const isHighwayOrRoad = loc.includes('road') || loc.includes('highway')
    const isCommercial = loc.includes('commercial') || loc.includes('parking') || loc.includes('warehouse')

    if (
      (isHighwayOrRoad && prodWatt < 200) ||
      (isCommercial && prodWatt < 150) ||
      (targetWatt >= 300 && targetWatt - prodWatt >= 200)
    ) {
      compromise = {
        hasCompromise: true,
        type: 'wattage',
        label: 'Wattage Compromise',
        severity: 'moderate',
        summary: 'Below recommended illumination for this pole height and location.',
      }
      compositeScore *= 0.90
    }
  }

  if (!compromise) {
    compromise = {
      hasCompromise: false,
      type: null,
      label: null,
      severity: null,
      summary: null,
    }
  }

  const matchPercentage = Math.round(compositeScore * 100)

  const formAndMountCombined =
    hasFormFilter && hasMountFilter
      ? (formFactorScore + mountingScore) / 2
      : hasFormFilter
      ? formFactorScore
      : hasMountFilter
      ? mountingScore
      : 1.0

  const isLocationAny = !criteria.location || criteria.location === 'any'
  const isPowerAny =
    powerTarget === undefined || powerTarget === null || powerTarget === '' || powerTarget === 'any'
  const isBudgetAny = !isPriceUnlisted && effectiveUnitBudget === 'any'

  // Structured breakdown reasons for Match Breakdown popover (RAM-10)
  const breakdownDetails = [
    {
      key: 'location',
      label: 'Location',
      score: Math.round(locationScore * 100),
      isAny: isLocationAny,
      detail: buildLocationReason(locationScore, criteria.location, product),
    },
    {
      key: 'formAndMount',
      label: 'Style & mount',
      score: Math.round(formAndMountCombined * 100),
      isAny: !hasFormFilter && !hasMountFilter,
      detail: buildFormAndMountReason(inferredFormFactor, inferredMounting, targetFormFactor, targetMounting),
    },
    {
      key: 'power',
      label: 'Wattage',
      score: Math.round(powerScore * 100),
      isAny: isPowerAny,
      detail: buildPowerReason(powerScore, powerTarget, product, context.maxWatt),
    },
    {
      key: 'budget',
      label: 'Budget',
      score: Math.round(budgetScore * 100),
      isAny: isBudgetAny,
      isUnlisted: isPriceUnlisted,
      detail: buildBudgetReason(
        budgetScore,
        effectiveUnitBudget,
        { ...priceInfo, isUnlisted: isPriceUnlisted },
        quantity,
        budgetMode
      ),
    },
  ]

  // Generate clear summary explanation
  const reasons = []
  if (stockTier === 'out') {
    reasons.push('Out of stock at branch')
  } else {
    if (compromise.hasCompromise) {
      reasons.push(compromise.summary)
    } else if (isPriceUnlisted) {
      reasons.push('Price confirmed at store branch via inquiry')
    } else if (budgetScore >= 0.85) {
      if (
        effectiveUnitBudget === 'any' ||
        (context.maxPrice && Number(effectiveUnitBudget) >= context.maxPrice)
      ) {
        reasons.push('Within maximum budget capacity')
      } else {
        reasons.push('Well within your budget')
      }
    } else if (budgetScore >= 0.65) {
      reasons.push('Close to target price')
    }

    if (locationScore >= 0.85) reasons.push('Ideal optics for this location')

    if (hasFormFilter && formFactorScore >= 0.9) {
      reasons.push(inferredFormFactor === 'split' ? 'Split-Type separate panel design' : 'All-in-One integrated build')
    }

    if (powerScore >= 0.85) {
      if (
        context.maxWatt &&
        Number(powerTarget) >= context.maxWatt &&
        Number(product.watt) >= context.maxWatt
      ) {
        reasons.push(`Top-tier ${product.watt}W maximum output`)
      } else {
        reasons.push(`Optimal ${product.watt || ''}W illumination`)
      }
    }
  }

  const explanation = reasons.length > 0 ? reasons.join(' · ') : 'Compatible solar model'

  const totalPriceInfo = priceInfo.hasPrice
    ? {
        min: priceInfo.min * quantity,
        max: priceInfo.max * quantity,
        avg: priceInfo.avg * quantity,
        quantity,
        hasPrice: true,
      }
    : {
        min: null,
        max: null,
        avg: null,
        quantity,
        hasPrice: false,
      }

  return {
    product,
    compositeScore: Number(compositeScore.toFixed(3)),
    technicalScore: Number(technicalScore.toFixed(3)),
    matchPercentage,
    breakdown: {
      budgetScore: Math.round(budgetScore * 100),
      locationScore: Math.round(locationScore * 100),
      powerScore: Math.round(powerScore * 100),
      formFactorScore: Math.round(formFactorScore * 100),
      mountingScore: Math.round(mountingScore * 100),
      formAndMountScore: Math.round(formAndMountCombined * 100),
    },
    breakdownDetails,
    inferredSpecs: {
      formFactor: inferredFormFactor,
      formFactorLabel: inferredFormFactor === 'split' ? 'Split-Type' : 'All-in-One',
      mountingOptions: inferredMounting,
      mountingLabel:
        inferredMounting.includes('wall') && inferredMounting.includes('pole')
          ? 'Pole / Wall Mount'
          : inferredMounting.includes('wall')
          ? 'Wall / Gate Mount'
          : 'Pole Mount',
    },
    stock: {
      tier: stockTier,
      quantity: stockQty,
      inStock: stockTier !== 'out',
    },
    compromise,
    priceInfo: {
      ...priceInfo,
      isUnlisted: isPriceUnlisted,
    },
    totalPriceInfo,
    explanation,
  }
}

/**
 * Main Multi-Criteria Product Matching Engine
 * Filters catalog products against a threshold, sorted by match percentage descending.
 *
 * @param {Array} products - Catalog product list
 * @param {Object} criteria - { budget, budgetMode, quantity, location, powerNeeds, formFactor, mounting }
 * @param {Object} options - { threshold, weights, limit, unlistedLimit, requireInStock, separateUnlisted, catalogBounds }
 * @returns {Object} { matches, unlistedMatches, budgetFeedback, thresholdUsed, thresholdRelaxed, totalEvaluated, criteriaApplied, catalogBounds }
 */
export function matchSolarProducts(products = [], criteria = {}, options = {}) {
  const catalog = products && products.length > 0 ? products : FALLBACK_PRODUCTS
  const bounds = options.catalogBounds || getCatalogBounds(catalog)
  const threshold = typeof options.threshold === 'number' ? options.threshold : DEFAULT_MATCH_THRESHOLD
  const weights = options.weights || DEFAULT_CRITERIA_WEIGHTS
  const limit = options.limit || 4
  const unlistedLimit = options.unlistedLimit || 4
  const requireInStock = options.requireInStock !== false
  const separateUnlisted = Boolean(options.separateUnlisted)

  const quantity = Math.max(1, Math.floor(Number(criteria.quantity) || 1))
  const budgetMode = criteria.budgetMode === 'total' ? 'total' : 'unit'
  const effectiveUnitBudget = resolveEffectiveUnitBudget({ ...criteria, quantity, budgetMode })

  // 1. Pre-qualify: strictly include solar candidates
  let validCandidates = catalog.filter(isSolarCandidate)

  // 2. Public view constraint: hide out-of-stock products for guests
  if (requireInStock) {
    validCandidates = validCandidates.filter((p) => {
      const tier = getStockTier(p)
      return tier !== 'out'
    })
  }

  // 3. Fallback if no solar items found
  if (validCandidates.length === 0) {
    validCandidates = catalog.filter(isSolarCandidate)
  }

  // 4. Evaluate all candidates with dynamic catalog bounds context
  const evaluated = validCandidates.map((p) =>
    evaluateProductMatch(p, { ...criteria, quantity, budgetMode }, weights, {
      maxWatt: bounds.maxWatt,
      maxPrice: bounds.maxPrice,
    })
  )

  // 5. Partition priced vs. unlisted-price products
  const pricedEvaluated = evaluated.filter((item) => !item.priceInfo.isUnlisted)
  const unlistedEvaluated = evaluated.filter((item) => item.priceInfo.isUnlisted)

  // Determine lowest priced solar candidate for below-minimum-budget feedback (RAM-10)
  const pricedMins = pricedEvaluated
    .map((item) => item.priceInfo.min)
    .filter((v) => typeof v === 'number' && v > 0)
  const lowestUnitPrice = pricedMins.length > 0 ? Math.min(...pricedMins) : null
  const isNumericBudget =
    effectiveUnitBudget !== 'any' &&
    effectiveUnitBudget !== '' &&
    effectiveUnitBudget !== null &&
    effectiveUnitBudget !== undefined &&
    !isNaN(Number(effectiveUnitBudget))
  const numericEffectiveBudget = isNumericBudget ? Math.max(0, Number(effectiveUnitBudget)) : null
  const belowMinimumBudget = Boolean(
    numericEffectiveBudget !== null && lowestUnitPrice !== null && numericEffectiveBudget < lowestUnitPrice
  )

  const budgetFeedback = {
    belowMinimumBudget,
    lowestUnitPrice,
    lowestTotalPrice: lowestUnitPrice !== null ? lowestUnitPrice * quantity : null,
    effectiveUnitBudget: numericEffectiveBudget,
    gapPerUnit: belowMinimumBudget ? lowestUnitPrice - numericEffectiveBudget : 0,
    gapTotal: belowMinimumBudget ? (lowestUnitPrice - numericEffectiveBudget) * quantity : 0,
    quantity,
    budgetMode,
  }

  // Sort unlisted candidates by technical fit descending (since price is confirmed on inquiry)
  unlistedEvaluated.sort(
    (a, b) => b.technicalScore - a.technicalScore || b.compositeScore - a.compositeScore
  )
  const unlistedMatches = unlistedEvaluated.slice(0, unlistedLimit)

  let matches
  let thresholdRelaxed = false

  if (separateUnlisted && pricedEvaluated.length > 0) {
    if (belowMinimumBudget) {
      // Rank closest entry-level priced alternatives by price proximity first, then technical fit
      pricedEvaluated.sort(
        (a, b) =>
          (a.priceInfo.min ?? Infinity) - (b.priceInfo.min ?? Infinity) ||
          b.technicalScore - a.technicalScore
      )
      thresholdRelaxed = true
      matches = pricedEvaluated.slice(0, limit)
    } else {
      pricedEvaluated.sort((a, b) => b.compositeScore - a.compositeScore)
      const passed = pricedEvaluated.filter((item) => item.compositeScore >= threshold)
      if (passed.length === 0) {
        thresholdRelaxed = true
        matches = pricedEvaluated.slice(0, Math.min(3, pricedEvaluated.length))
      } else {
        matches = passed.slice(0, limit)
      }
    }
  } else if (separateUnlisted && pricedEvaluated.length === 0) {
    // Catalog only has unlisted items
    matches = []
    thresholdRelaxed = true
  } else {
    // Legacy combined pool (priced + unlisted together) for backward compatibility
    if (belowMinimumBudget && pricedEvaluated.length > 0) {
      evaluated.sort((a, b) => {
        if (a.priceInfo.isUnlisted !== b.priceInfo.isUnlisted) {
          return a.priceInfo.isUnlisted ? 1 : -1
        }
        return (a.priceInfo.min ?? Infinity) - (b.priceInfo.min ?? Infinity) || b.compositeScore - a.compositeScore
      })
      thresholdRelaxed = true
      matches = evaluated.slice(0, limit)
    } else {
      evaluated.sort((a, b) => b.compositeScore - a.compositeScore)
      const passedThreshold = evaluated.filter((item) => item.compositeScore >= threshold)
      if (passedThreshold.length === 0) {
        thresholdRelaxed = true
        matches = evaluated.slice(0, Math.min(3, evaluated.length))
      } else {
        matches = passedThreshold.slice(0, limit)
      }
    }
  }

  return {
    matches,
    unlistedMatches,
    budgetFeedback,
    thresholdUsed: threshold,
    thresholdRelaxed,
    totalEvaluated: validCandidates.length,
    criteriaApplied: { ...criteria, quantity, budgetMode },
    catalogBounds: bounds,
  }
}
