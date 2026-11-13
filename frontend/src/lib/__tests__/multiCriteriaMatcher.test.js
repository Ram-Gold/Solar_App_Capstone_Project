import { describe, it, expect } from 'vitest'
import {
  getCatalogBounds,
  parseProductPrice,
  scorePowerFit,
  scoreBudgetFit,
  matchSolarProducts,
} from '../multiCriteriaMatcher'

describe('Dynamic Catalog Bounds & Max-Value Sliders (MCDSS)', () => {
  const mockProducts = [
    {
      id: 1,
      name: 'Entry Solar Street Light 100W',
      type: 'Solar Streetlight',
      watt: 100,
      price_range: '1000-2000',
      waterproof_grade: 'IP65',
      solar_panel: 'Solar silicon',
      battery: '15000mAh',
      charging_type: 'Solar charging',
      in_stock: true,
      stock_quantity: 10,
    },
    {
      id: 2,
      name: 'Mid Solar Street Light 300W',
      type: 'Solar Streetlight',
      watt: 300,
      price_range: '2500-3500',
      waterproof_grade: 'IP65',
      solar_panel: 'Solar silicon',
      battery: '30000mAh',
      charging_type: 'Solar charging',
      in_stock: true,
      stock_quantity: 10,
    },
    {
      id: 3,
      name: 'High Mast Solar Light 800W',
      type: 'Solar Streetlight',
      watt: 800,
      price_range: '4000+',
      waterproof_grade: 'IP67',
      solar_panel: 'Monocrystaline silicon',
      battery: '72000mAh',
      charging_type: 'Solar charging',
      in_stock: true,
      stock_quantity: 8,
    },
    {
      id: 4,
      name: 'Industrial Mega Solar Floodlight 1000W',
      type: 'Solar Floodlight',
      watt: 1000,
      price_range: '5000-7500',
      waterproof_grade: 'IP67',
      solar_panel: 'Monocrystaline silicon',
      battery: '90000mAh',
      charging_type: 'Solar charging',
      in_stock: true,
      stock_quantity: 5,
    },
  ]

  it('calculates dynamic catalog bounds automatically from Supabase database products', () => {
    const bounds = getCatalogBounds(mockProducts)
    expect(bounds.minWatt).toBe(100)
    expect(bounds.maxWatt).toBe(1000)
    expect(bounds.minPrice).toBe(1000)
    expect(bounds.maxPrice).toBeGreaterThanOrEqual(7500)
    expect(bounds.powerPresets).toContain(1000)
    expect(bounds.budgetPresets[bounds.budgetPresets.length - 1].value).toBe('any')
  })

  it('parses diverse product price representations correctly', () => {
    expect(parseProductPrice({ price_range: '1500-2500' })).toEqual({
      min: 1500,
      max: 2500,
      avg: 2000,
      hasPrice: true,
    })
    expect(parseProductPrice({ price_range: '5,000 - 8,000' })).toEqual({
      min: 5000,
      max: 8000,
      avg: 6500,
      hasPrice: true,
    })
    expect(parseProductPrice({ price_range: '3000+' })).toMatchObject({
      min: 3000,
      hasPrice: true,
    })
    expect(parseProductPrice({ price_range: null })).toEqual({
      min: null,
      max: null,
      avg: null,
      hasPrice: false,
    })
    // Test structured numeric bounds support
    expect(parseProductPrice({ min_price: 1800, max_price: 3200 })).toEqual({
      min: 1800,
      max: 3200,
      avg: 2500,
      hasPrice: true,
    })
    expect(parseProductPrice({ min_price: 2500, max_price: null })).toEqual({
      min: 2500,
      max: 2500,
      avg: 2500,
      hasPrice: true,
    })
  })

  it('automatically awards 100% (1.0) power score to biggest wattage products when slider is sinagad (maxed out)', () => {
    const bounds = getCatalogBounds(mockProducts)
    expect(bounds.maxWatt).toBe(1000)

    // Pulling slider to maximum (1000W)
    const product1000 = mockProducts[3]
    const product800 = mockProducts[2]
    const product100 = mockProducts[0]

    const score1000 = scorePowerFit(product1000, 1000, bounds.maxWatt)
    const score800 = scorePowerFit(product800, 1000, bounds.maxWatt)
    const score100 = scorePowerFit(product100, 1000, bounds.maxWatt)

    // The biggest wattage product receives full 1.0 compatibility
    expect(score1000).toBe(1.0)
    // Lower wattages receive strictly lower scores
    expect(score800).toBeLessThan(1.0)
    expect(score800).toBeGreaterThan(score100)
  })

  it('automatically sets 100% budget fit when price slider is sinagad (at or above catalog max price)', () => {
    const bounds = getCatalogBounds(mockProducts)
    const product = mockProducts[1] // price 2500-3500

    // Sinagad budget slider
    const maxBudgetScore = scoreBudgetFit(product, bounds.maxPrice, bounds.maxPrice)
    expect(maxBudgetScore).toBe(1.0)

    // Unconstrained budget
    const anyBudgetScore = scoreBudgetFit(product, 'any', bounds.maxPrice)
    expect(anyBudgetScore).toBe(1.0)
  })

  it('does not penalize cheaper products within the user budget ceiling', () => {
    const cheapProduct = mockProducts[0] // price 1000-2000
    const score = scoreBudgetFit(cheapProduct, 5000, 8000)
    expect(score).toBe(1.0)
  })

  it('ranks 1000W luminaires as top matches when wattage slider is sinagad in matchSolarProducts', () => {
    const bounds = getCatalogBounds(mockProducts)
    const result = matchSolarProducts(
      mockProducts,
      {
        location: 'commercial',
        powerNeeds: bounds.maxWatt, // Sinagad
        budget: 'any',
      },
      {
        threshold: 0.50,
        catalogBounds: bounds,
      }
    )

    expect(result.matches.length).toBeGreaterThan(0)
    const topMatch = result.matches[0]
    expect(topMatch.product.watt).toBe(1000)
    expect(topMatch.breakdown.powerScore).toBe(100)
    expect(result.catalogBounds.maxWatt).toBe(1000)
  })

  it('detects a Budget Compromise and applies discordance penalty when budget is strictly below product minimum price', () => {
    const bounds = getCatalogBounds(mockProducts)
    const expensiveProduct = mockProducts[3] // 1000W, price 5000-7500

    const result = matchSolarProducts(
      [expensiveProduct],
      {
        location: 'commercial',
        powerNeeds: 1000,
        budget: 2000, // strictly below 5000
      },
      {
        threshold: 0.20,
        catalogBounds: bounds,
      }
    )

    const evaluated = result.matches[0]
    expect(evaluated.compromise.hasCompromise).toBe(true)
    expect(evaluated.compromise.type).toBe('budget')
    expect(evaluated.compromise.label).toBe('Budget Compromise')
    expect(evaluated.compromise.overAmount).toBe(3000)
    expect(evaluated.compromise.summary).toContain('Exceeds target budget by ₱3,000')
  })

  it('does not flag Budget Compromise when target budget falls within the product price range', () => {
    const bounds = getCatalogBounds(mockProducts)
    const midProduct = mockProducts[1] // 300W, price 2500-3500

    const result = matchSolarProducts(
      [midProduct],
      {
        location: 'street',
        powerNeeds: 300,
        budget: 3000, // within 2500 - 3500
      },
      {
        threshold: 0.50,
        catalogBounds: bounds,
      }
    )

    const evaluated = result.matches[0]
    expect(evaluated.compromise.hasCompromise).toBe(false)
  })

  it('detects a Wattage Compromise when an under-powered luminaire is evaluated for a high-mast roadway', () => {
    const bounds = getCatalogBounds(mockProducts)
    const weakProduct = mockProducts[0] // 100W luminaire

    const result = matchSolarProducts(
      [weakProduct],
      {
        location: 'highway', // requires high pole and >300W
        powerNeeds: 800,
        budget: 5000,
      },
      {
        threshold: 0.20,
        catalogBounds: bounds,
      }
    )

    const evaluated = result.matches[0]
    expect(evaluated.compromise.hasCompromise).toBe(true)
    expect(evaluated.compromise.type).toBe('wattage')
    expect(evaluated.compromise.label).toBe('Wattage Compromise')
    expect(evaluated.compromise.summary).toContain('Below recommended illumination')
  })

  it('tolerates over-wattage without flagging any compromise', () => {
    const bounds = getCatalogBounds(mockProducts)
    const strongProduct = mockProducts[2] // 800W luminaire

    const result = matchSolarProducts(
      [strongProduct],
      {
        location: 'commercial',
        powerNeeds: 300, // user requested 300W, product is 800W
        budget: 'any',
      },
      {
        threshold: 0.20,
        catalogBounds: bounds,
      }
    )

    const evaluated = result.matches[0]
    // Over-wattage should not trigger a wattage compromise
    expect(evaluated.compromise.type).not.toBe('wattage')
  })

  it('assigns 70% neutral budget fit and marks isUnlisted for products without a price', () => {
    const unlistedProduct = {
      id: 99,
      name: 'Custom High-Mast Solar Tower',
      type: 'Solar Tower',
      watt: 600,
      price_range: null,
      waterproof_grade: 'IP67',
      solar_panel: 'Monocrystalline',
      charging_type: 'Solar charging',
      in_stock: true,
      stock_quantity: 4,
    }

    const bounds = getCatalogBounds([unlistedProduct])
    const result = matchSolarProducts(
      [unlistedProduct],
      {
        location: 'commercial',
        powerNeeds: 600,
        budget: 3000,
      },
      {
        threshold: 0.30,
        catalogBounds: bounds,
      }
    )

    const evaluated = result.matches[0]
    expect(evaluated.breakdown.budgetScore).toBe(70)
    expect(evaluated.priceInfo.isUnlisted).toBe(true)
    expect(evaluated.explanation).toContain('Price confirmed at store branch via inquiry')
  })
})
