// frontend/src/lib/multiCriteriaMatcher.js
// Multi-Criteria Decision Support System (MCDSS) for Solar Lighting Selection
// Evaluates candidate products against user requirements (Budget, Location, Power Needs)
// using weighted multi-attribute utility theory and threshold filtering.
// Strictly text/icon-driven, industrial tone, no emojis.

import { FALLBACK_PRODUCTS } from './solarBotEngine.js'
import { getStockQuantity, getStockTier } from './inventoryUtils.js'

/**
 * Default weights for criteria evaluation (Sum = 1.0)
 */
export const DEFAULT_CRITERIA_WEIGHTS = {
  budget: 0.35,
  location: 0.35,
  power: 0.30,
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
      const numMax = product.max_price !== undefined && product.max_price !== null && product.max_price !== '' && !isNaN(Number(product.max_price))
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
 * Automatically aligns sliders and indicators to the biggest database values.
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

  // Align wattage bounds to step boundary (step = 50W) so sliders reach maxWatt exactly.
  // e.g. minWatt=20 → alignedMin=0, maxWatt=1000 → alignedMax=1000
  const WATT_STEP = 50
  const alignedMinWatt = Math.floor(minWatt / WATT_STEP) * WATT_STEP
  const alignedMaxWatt = Math.ceil(maxWatt / WATT_STEP) * WATT_STEP

  // Clean rounding
  const cleanMaxPrice = Math.max(minPrice, Math.ceil(maxPrice / 500) * 500)
  const cleanMinPrice = Math.max(500, Math.floor(minPrice / 500) * 500)

  // Dynamically generated power presets up to alignedMaxWatt
  const candidateWatts = [100, 200, 300, 400, 500, 600, 800, alignedMaxWatt]
  const powerPresets = Array.from(
    new Set(candidateWatts.filter((w) => w >= alignedMinWatt && w <= alignedMaxWatt))
  ).sort((a, b) => a - b)

  // Dynamically generated budget presets up to cleanMaxPrice
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
    powerPresets,
    budgetPresets,
  }
}

/**
 * Location Compatibility Scorer (Range: 0.0 to 1.0)
 * Evaluates physical mounting height, beam angle optics, and location attributes.
 */
export function scoreLocationFit(product, targetLocation) {
  if (!targetLocation) return 1.0

  const loc = targetLocation.toLowerCase()
  const name = (product.name || '').toLowerCase()
  const type = (product.type || '').toLowerCase()
  const placeOfUse = (product.place_of_use || '').toLowerCase()
  const watt = Number(product.watt) || 0
  const beamingAngle = (product.beaming_angle || '').toLowerCase()

  if (loc.includes('road') || loc === 'highway') {
    // Roadways require 6m–9m mounting height, high-lumen optical lenses, and batwing or >120 deg spread
    let score = 0.5
    if (type.includes('road') || name.includes('road')) score = 1.0
    else if (placeOfUse.includes('highway') || placeOfUse.includes('road') || placeOfUse.includes('viaduct')) score = 0.95
    else if ((type.includes('street') || name.includes('street')) && watt >= 300) score = 0.88
    else if (watt >= 400) score = 0.82
    else if (watt < 150) return 0.20 // Severely underpowered for 6m–9m highway poles

    // Optical beam boost
    if (beamingAngle.includes('120') || beamingAngle.includes('140') || beamingAngle.includes('batwing')) {
      score = Math.min(1.0, score + 0.05)
    }
    return score
  }

  if (loc.includes('street') || loc.includes('subdivision') || loc.includes('alley')) {
    // Subdivision streets: 4m–6m mounting height, 100W–400W streetlights & perimeter floodlights
    let score = 0.5
    if (type.includes('street') || name.includes('street')) score = 1.0
    else if (placeOfUse.includes('community') || placeOfUse.includes('square') || placeOfUse.includes('street')) score = 0.95
    else if ((type.includes('road') || name.includes('road')) && watt <= 400) score = 0.90
    else if (watt >= 100 && watt <= 400) score = 0.85
    else if (watt > 600) score = 0.60 // Glare risk for quiet alleys

    return score
  }

  if (loc.includes('home') || loc.includes('residential') || loc.includes('gate') || loc.includes('garden')) {
    // Residential: 3m–4m mounting height, 50W–250W is sweet spot
    if (watt >= 50 && watt <= 200) return 1.0
    if (watt > 200 && watt <= 350) return 0.85
    if (placeOfUse.includes('park') || placeOfUse.includes('community') || placeOfUse.includes('courtyard')) return 0.90
    if (type.includes('road') || name.includes('road')) return 0.35 // Heavy road luminaires awkward on 3m gates
    if (watt > 400) return 0.30 // Blinding glare on low residential gates
    return 0.70
  }

  if (loc.includes('commercial') || loc.includes('parking') || loc.includes('warehouse')) {
    // Commercial yards & logistics: durable 200W–1000W fixtures, high-mast flood or wide spread
    if (watt >= 300 && watt <= 1000) return 1.0
    if (placeOfUse.includes('viaduct') || placeOfUse.includes('square') || placeOfUse.includes('warehouse') || placeOfUse.includes('parking')) return 0.95
    if (watt >= 200 && watt < 300) return 0.80
    if (watt < 150) return 0.25 // Inadequate for commercial logistics yards
    return 0.65
  }

  return 0.80 // Neutral match
}

/**
 * Power Needs Scorer (Range: 0.0 to 1.0)
 * Evaluates illumination adequacy against user's wattage target or power tier.
 * When the slider is sinagad (maxed out to maxWatt or above), it automatically prioritizes
 * and assigns 100% (1.0) compatibility to the biggest wattage luminaires in the Supabase database.
 */
export function scorePowerFit(product, powerNeeds, maxWatt = null) {
  if (!powerNeeds && powerNeeds !== 0) return 1.0
  const productWatt = Number(product.watt) || 100

  // If powerNeeds is a numeric target wattage (e.g., 300, 500, or maxed out)
  if (typeof powerNeeds === 'number' || !isNaN(Number(powerNeeds))) {
    const target = Number(powerNeeds)
    if (target <= 0) return 1.0

    // Automatic adjustment when slider is pulled to the maximum (sinagad):
    // Prioritize the biggest wattage models in the catalog
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

  // If powerNeeds is a string tier
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
 * Evaluates financial affordability against user's budget ceiling or budget bracket.
 * If user pulls the slider to maxPrice or selects 'any', all catalog products are considered within budget.
 * In-budget products receive a full 1.0 score without penalty for being cheaper than the ceiling.
 * If price is unlisted (pending store owner determination), returns a cautious neutral score (0.75).
 */
export function scoreBudgetFit(product, userBudget, maxPrice = null) {
  if (!userBudget && userBudget !== 0) return 1.0
  if (userBudget === 'any') return 1.0

  const { min: prodMin, max: prodMax, avg: prodAvg, hasPrice } = parseProductPrice(product)

  // Unlisted pricing: final price decided by owner and store branch upon inquiry
  if (!hasPrice) {
    return 0.70
  }

  // If userBudget is a numeric ceiling (e.g., 2500 or maxed out)
  if (typeof userBudget === 'number' || !isNaN(Number(userBudget))) {
    const budgetCeiling = Number(userBudget)
    if (budgetCeiling <= 0) return 1.0

    // Automatic adjustment when budget slider is sinagad (at or above max catalog price)
    if (maxPrice && budgetCeiling >= maxPrice) {
      return 1.0
    }

    // Entire price range is strictly within budget - full affordability utility
    if (prodMax <= budgetCeiling) {
      return 1.0
    }

    // Minimum price is within budget, but upper bracket slightly crosses
    if (prodMin <= budgetCeiling) {
      return 0.85
    }

    // Over budget: apply distance penalty
    const overAmount = prodMin - budgetCeiling
    const overPercent = overAmount / budgetCeiling

    if (overPercent <= 0.15) return 0.65 // Within 15% stretch budget
    if (overPercent <= 0.30) return 0.40 // Within 30% stretch
    return 0.10 // Above budget
  }

  // If userBudget is a bracket string
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

  const locationScore = scoreLocationFit(product, criteria.location)
  const powerScore = scorePowerFit(
    product,
    criteria.powerNeeds ?? criteria.watt ?? criteria.minWatt,
    context.maxWatt
  )
  const budgetScore = scoreBudgetFit(product, criteria.budget, context.maxPrice)

  // Normalize weights
  const totalWeight = weights.budget + weights.location + weights.power
  const wBudget = weights.budget / totalWeight
  const wLocation = weights.location / totalWeight
  const wPower = weights.power / totalWeight

  let compositeScore = (budgetScore * wBudget) + (locationScore * wLocation) + (powerScore * wPower)

  // Stock consideration: In-stock priority
  const stockTier = getStockTier(product)
  const stockQty = getStockQuantity(product)
  if (stockTier === 'out') {
    // Demote out-of-stock items so in-stock inventory wins
    compositeScore *= 0.50
  }

  // Compromise and Discordance Detection
  let compromise = null
  const budgetCeiling = Number(criteria.budget)

  // 1. Budget Compromise: user budget is strictly below product minimum price
  if (!isPriceUnlisted && criteria.budget && criteria.budget !== 'any' && !isNaN(budgetCeiling) && budgetCeiling > 0) {
    if (priceInfo.min && priceInfo.min > budgetCeiling) {
      const overAmount = priceInfo.min - budgetCeiling
      const overPercent = overAmount / budgetCeiling

      compromise = {
        hasCompromise: true,
        type: 'budget',
        label: 'Budget Compromise',
        severity: overPercent > 0.30 ? 'high' : 'moderate',
        overAmount,
        summary: `Exceeds target budget by ₱${overAmount.toLocaleString()} to deliver ${product.watt ? `${product.watt}W` : 'required'} output.`,
      }

      // Discordance penalty: reduce score when budget ceiling is exceeded by >20%
      // This prevents high location/power scores from masking budget failures
      if (overPercent > 0.20) {
        compositeScore *= 0.85
      }
    }
  }

  // 2. Wattage Compromise: luminaire is under-powered for mounting height/location
  if (!compromise) {
    const prodWatt = Number(product.watt) || 0
    const loc = String(criteria.location || '').toLowerCase()
    const targetWatt = criteria.powerNeeds && criteria.powerNeeds !== 'any' ? Number(criteria.powerNeeds) : 0
    const isHighwayOrRoad = loc.includes('road') || loc.includes('highway')
    const isCommercial = loc.includes('commercial') || loc.includes('parking') || loc.includes('warehouse')

    if (
      (isHighwayOrRoad && prodWatt < 200) ||
      (isCommercial && prodWatt < 150) ||
      (targetWatt >= 300 && (targetWatt - prodWatt) >= 200)
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

  // Generate clear reason explanation
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
        criteria.budget === 'any' ||
        (context.maxPrice && Number(criteria.budget) >= context.maxPrice)
      ) {
        reasons.push('Within maximum budget capacity')
      } else {
        reasons.push('Well within your budget')
      }
    } else if (budgetScore >= 0.65) {
      reasons.push('Close to target price')
    }

    if (locationScore >= 0.85) reasons.push('Ideal optics for this location')

    if (powerScore >= 0.85) {
      if (
        context.maxWatt &&
        Number(criteria.powerNeeds) >= context.maxWatt &&
        Number(product.watt) >= context.maxWatt
      ) {
        reasons.push(`Top-tier ${product.watt}W maximum output`)
      } else {
        reasons.push(`Optimal ${product.watt || ''}W illumination`)
      }
    }
  }

  const explanation = reasons.length > 0 ? reasons.join(' · ') : 'Compatible solar model'

  return {
    product,
    compositeScore: Number(compositeScore.toFixed(3)),
    matchPercentage,
    breakdown: {
      budgetScore: Math.round(budgetScore * 100),
      locationScore: Math.round(locationScore * 100),
      powerScore: Math.round(powerScore * 100),
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
    explanation,
  }
}

/**
 * Main Multi-Criteria Product Matching Engine
 * Filters catalog products against a threshold, sorted by match percentage descending.
 *
 * @param {Array} products - Catalog product list
 * @param {Object} criteria - { budget, location, powerNeeds }
 * @param {Object} options - { threshold, weights, limit, requireInStock, catalogBounds }
 * @returns {Object} { matches, thresholdUsed, totalEvaluated, criteriaApplied, catalogBounds }
 */
export function matchSolarProducts(products = [], criteria = {}, options = {}) {
  const catalog = products && products.length > 0 ? products : FALLBACK_PRODUCTS
  const bounds = options.catalogBounds || getCatalogBounds(catalog)
  const threshold = typeof options.threshold === 'number' ? options.threshold : DEFAULT_MATCH_THRESHOLD
  const weights = options.weights || DEFAULT_CRITERIA_WEIGHTS
  const limit = options.limit || 4
  // For public/guest matcher, out-of-stock items are strictly filtered out by default
  const requireInStock = options.requireInStock !== false

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
    evaluateProductMatch(p, criteria, weights, {
      maxWatt: bounds.maxWatt,
      maxPrice: bounds.maxPrice,
    })
  )

  // 5. Sort by composite score descending
  evaluated.sort((a, b) => b.compositeScore - a.compositeScore)

  // 6. Filter by threshold
  let passedThreshold = evaluated.filter((item) => item.compositeScore >= threshold)

  let thresholdRelaxed = false
  if (passedThreshold.length === 0) {
    thresholdRelaxed = true
    passedThreshold = evaluated.slice(0, Math.min(3, evaluated.length))
  } else {
    passedThreshold = passedThreshold.slice(0, limit)
  }

  return {
    matches: passedThreshold,
    thresholdUsed: threshold,
    thresholdRelaxed,
    totalEvaluated: validCandidates.length,
    criteriaApplied: criteria,
    catalogBounds: bounds,
  }
}
