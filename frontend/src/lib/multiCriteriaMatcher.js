// frontend/src/lib/multiCriteriaMatcher.js
// Multi-Criteria Decision Support System (MCDSS) for Solar Lighting Selection
// Evaluates candidate products against user requirements (Budget, Location, Power Needs)
// using weighted multi-attribute utility theory and threshold filtering.

import { FALLBACK_PRODUCTS } from './solarBotEngine'

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
 * Extracts numeric pricing information from price_range string
 * Examples: "1500-2500" -> { min: 1500, max: 2500, avg: 2000 }
 *           "3000+"     -> { min: 3000, max: 4500, avg: 3500 }
 */
export function parseProductPrice(product) {
  if (!product?.price_range) return { min: 1500, max: 2500, avg: 2000 }
  
  const raw = String(product.price_range)
  const numbers = raw.split('-').map((s) => parseInt(s.replace(/[^0-9]/g, ''), 10)).filter((n) => !isNaN(n))

  if (numbers.length >= 2) {
    return {
      min: Math.min(numbers[0], numbers[1]),
      max: Math.max(numbers[0], numbers[1]),
      avg: Math.round((numbers[0] + numbers[1]) / 2),
    }
  }

  if (numbers.length === 1) {
    const val = numbers[0]
    if (raw.includes('+')) {
      return { min: val, max: val * 1.4, avg: Math.round(val * 1.2) }
    }
    return { min: val, max: val, avg: val }
  }

  return { min: 1500, max: 2500, avg: 2000 }
}

/**
 * Location Compatibility Scorer (Range: 0.0 to 1.0)
 * Evaluates how suitable a product's form factor, optical lens, and beam angle
 * are for the requested installation environment.
 */
export function scoreLocationFit(product, targetLocation) {
  if (!targetLocation) return 1.0

  const loc = targetLocation.toLowerCase()
  const name = (product.name || '').toLowerCase()
  const type = (product.type || '').toLowerCase()
  const watt = product.watt || 0

  if (loc.includes('road') || loc === 'highway') {
    // Road lights require high beam spread and aviation aluminum
    if (name.includes('road') || type.includes('road')) return 1.0
    if (name.includes('street') && watt >= 300) return 0.85
    if (watt >= 400) return 0.8
    if (watt < 200) return 0.25 // Too dim for main roads
    return 0.5
  }

  if (loc.includes('street') || loc.includes('subdivision') || loc.includes('alley')) {
    // Subdivision streets: 100W-400W streetlights are ideal
    if (name.includes('street') || type.includes('street')) return 1.0
    if (name.includes('road') && watt <= 400) return 0.9
    if (watt >= 100 && watt <= 400) return 0.85
    if (watt > 600) return 0.65 // Overkill for quiet alleys
    return 0.5
  }

  if (loc.includes('home') || loc.includes('residential') || loc.includes('gate') || loc.includes('garden')) {
    // Residential: 50W-250W is sweet spot
    if (watt >= 50 && watt <= 200) return 1.0
    if (watt > 200 && watt <= 350) return 0.85
    if (name.includes('road')) return 0.4 // Heavy road lights are awkward for gates
    if (watt > 400) return 0.35 // Excessively bright/large for home gates
    return 0.7
  }

  if (loc.includes('commercial') || loc.includes('parking') || loc.includes('warehouse')) {
    // Commercial spaces: durable 200W-800W fixtures
    if (watt >= 300 && watt <= 800) return 1.0
    if (watt >= 200 && watt < 300) return 0.8
    if (watt < 150) return 0.3 // Insufficient for commercial lots
    return 0.6
  }

  return 0.8 // Neutral match
}

/**
 * Power Needs Scorer (Range: 0.0 to 1.0)
 * Evaluates illumination adequacy against user's wattage target or power tier.
 */
export function scorePowerFit(product, powerNeeds) {
  if (!powerNeeds && powerNeeds !== 0) return 1.0
  const productWatt = product.watt || 100

  // If powerNeeds is a numeric target wattage (e.g., 300, 500)
  if (typeof powerNeeds === 'number' || !isNaN(Number(powerNeeds))) {
    const target = Number(powerNeeds)
    if (target <= 0) return 1.0

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
    if (productWatt === 200) return 0.8
    return 0.3
  }
  if (tier.includes('med') || tier.includes('mid') || tier.includes('standard')) {
    if (productWatt >= 200 && productWatt <= 350) return 1.0
    if (productWatt === 150 || productWatt === 400) return 0.8
    return 0.4
  }
  if (tier.includes('high') || tier.includes('heavy') || tier.includes('industrial')) {
    if (productWatt >= 400) return 1.0
    if (productWatt === 300) return 0.75
    return 0.3
  }

  return 0.8
}

/**
 * Budget Scorer (Range: 0.0 to 1.0)
 * Evaluates financial affordability against user's budget ceiling or budget bracket.
 */
export function scoreBudgetFit(product, userBudget) {
  if (!userBudget && userBudget !== 0) return 1.0
  if (userBudget === 'any') return 1.0

  const { min: prodMin, max: prodMax, avg: prodAvg } = parseProductPrice(product)

  // If userBudget is a numeric ceiling (e.g., 2500)
  if (typeof userBudget === 'number' || !isNaN(Number(userBudget))) {
    const budgetCeiling = Number(userBudget)
    if (budgetCeiling <= 0) return 1.0

    // Entire price range is strictly within budget
    if (prodMax <= budgetCeiling) {
      // Award high score, slightly rewarding getting maximum quality for budget
      const ratio = prodAvg / budgetCeiling
      return Math.min(1.0, 0.9 + ratio * 0.1)
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
    return 0.1 // Too far above budget
  }

  // If userBudget is a bracket string (e.g., "1000-2000", "2500-3500", "3000+")
  const bracket = String(userBudget)
  if (product.price_range?.includes(bracket)) return 1.0

  if (bracket.includes('1000-2000')) {
    if (prodAvg <= 2000) return 1.0
    if (prodAvg <= 2500) return 0.7
    return 0.2
  }

  if (bracket.includes('2500-3500') || bracket.includes('2000-3500')) {
    if (prodAvg >= 1800 && prodAvg <= 3500) return 1.0
    if (prodAvg < 1800) return 0.85 // Affordable alternative
    return 0.5
  }

  if (bracket.includes('3000+') || bracket.includes('3500+')) {
    if (prodAvg >= 3000) return 1.0
    return 0.75
  }

  return 0.8
}

/**
 * Evaluates a single product candidate and returns detailed sub-scores and justification
 */
export function evaluateProductMatch(product, criteria = {}, weights = DEFAULT_CRITERIA_WEIGHTS) {
  const locationScore = scoreLocationFit(product, criteria.location)
  const powerScore = scorePowerFit(product, criteria.powerNeeds ?? criteria.watt ?? criteria.minWatt)
  const budgetScore = scoreBudgetFit(product, criteria.budget)

  // Normalize weights
  const totalWeight = weights.budget + weights.location + weights.power
  const wBudget = weights.budget / totalWeight
  const wLocation = weights.location / totalWeight
  const wPower = weights.power / totalWeight

  const compositeScore = (budgetScore * wBudget) + (locationScore * wLocation) + (powerScore * wPower)
  const matchPercentage = Math.round(compositeScore * 100)

  // Generate clear reason explanation
  const reasons = []
  if (budgetScore >= 0.85) reasons.push('Well within your budget')
  else if (budgetScore >= 0.65) reasons.push('Close to your target price')

  if (locationScore >= 0.85) reasons.push('Ideal optics for this location')
  if (powerScore >= 0.85) reasons.push(`Optimal ${product.watt || ''}W illumination`)

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
    explanation,
  }
}

/**
 * Main Multi-Criteria Product Matching Engine
 * Filters catalog products against a threshold, sorted by match percentage descending.
 *
 * @param {Array} products - Catalog product list
 * @param {Object} criteria - { budget, location, powerNeeds }
 * @param {Object} options - { threshold, weights, limit }
 * @returns {Object} { matches, thresholdUsed, totalEvaluated, summaryText }
 */
export function matchSolarProducts(products = [], criteria = {}, options = {}) {
  const catalog = products && products.length > 0 ? products : FALLBACK_PRODUCTS
  const threshold = typeof options.threshold === 'number' ? options.threshold : DEFAULT_MATCH_THRESHOLD
  const weights = options.weights || DEFAULT_CRITERIA_WEIGHTS
  const limit = options.limit || 4

  // 1. Evaluate all candidates
  const evaluated = catalog.map((p) => evaluateProductMatch(p, criteria, weights))

  // 2. Sort by composite score descending
  evaluated.sort((a, b) => b.compositeScore - a.compositeScore)

  // 3. Filter by threshold
  let passedThreshold = evaluated.filter((item) => item.compositeScore >= threshold)

  let thresholdRelaxed = false
  // 4. Fallback if no products met the strict threshold
  if (passedThreshold.length === 0) {
    thresholdRelaxed = true
    // Take top matching candidates even if below strict cutoff
    passedThreshold = evaluated.slice(0, Math.min(3, evaluated.length))
  } else {
    passedThreshold = passedThreshold.slice(0, limit)
  }

  return {
    matches: passedThreshold,
    thresholdUsed: threshold,
    thresholdRelaxed,
    totalEvaluated: catalog.length,
    criteriaApplied: criteria,
  }
}
