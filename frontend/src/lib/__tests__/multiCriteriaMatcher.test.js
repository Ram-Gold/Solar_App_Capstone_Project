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

  describe('Comprehensive Multi-Criteria Budget Boundary Tests (MCDSS Affordability Ceiling)', () => {
    const catalog = [
      {
        id: 101,
        name: 'Entry Solar Streetlight 100W',
        watt: 100,
        min_price: 1000,
        max_price: 2000,
        price_range: '1000-2000',
        in_stock: true,
        type: 'Solar Streetlight',
        waterproof_grade: 'IP65',
        solar_panel: 'Silicon',
        charging_type: 'Solar',
      },
      {
        id: 102,
        name: 'Mid Solar Streetlight 300W',
        watt: 300,
        min_price: 2500,
        max_price: 3500,
        price_range: '2500-3500',
        in_stock: true,
        type: 'Solar Streetlight',
        waterproof_grade: 'IP65',
        solar_panel: 'Silicon',
        charging_type: 'Solar',
      },
      {
        id: 103,
        name: 'Industrial High Mast 800W',
        watt: 800,
        min_price: 5000,
        max_price: 7500,
        price_range: '5000-7500',
        in_stock: true,
        type: 'Solar Streetlight',
        waterproof_grade: 'IP67',
        solar_panel: 'Silicon',
        charging_type: 'Solar',
      },
      {
        id: 104,
        name: 'Custom Consultative Luminaire 600W',
        watt: 600,
        min_price: null,
        max_price: null,
        price_range: null,
        in_stock: true,
        type: 'Solar Streetlight',
        waterproof_grade: 'IP67',
        solar_panel: 'Silicon',
        charging_type: 'Solar',
      },
    ]

    const bounds = getCatalogBounds(catalog)

    it('evaluates budget at 1000 pesos boundary without false rejection', () => {
      const p100W = catalog[0] // 1000 - 2000
      // At budget 1000, min_price (1000) <= 1000, so entry price fits: score is 0.85
      const score = scoreBudgetFit(p100W, 1000, bounds.maxPrice)
      expect(score).toBe(0.85)

      // Expensive products exceed 1000 and trigger Budget Compromise
      const match = matchSolarProducts(catalog, { location: 'street', powerNeeds: 100, budget: 1000 }, { threshold: 0.1, catalogBounds: bounds })
      const topPick = match.matches.find((m) => m.product.id === 101)
      expect(topPick).toBeDefined()
      expect(topPick.compromise.hasCompromise).toBe(false)
    })

    it('evaluates budget at 1500 pesos boundary where 1000-2000 is comfortably accessible', () => {
      const p100W = catalog[0] // 1000 - 2000
      const score = scoreBudgetFit(p100W, 1500, bounds.maxPrice)
      expect(score).toBe(0.85)

      const match = matchSolarProducts(catalog, { location: 'street', powerNeeds: 100, budget: 1500 }, { threshold: 0.5, catalogBounds: bounds })
      const p100Match = match.matches.find((m) => m.product.id === 101)
      expect(p100Match.breakdown.budgetScore).toBe(85)
      expect(p100Match.compromise.hasCompromise).toBe(false)
    })

    it('evaluates budget at 2000 pesos boundary awarding 100% affordability to 1000-2000 product', () => {
      const p100W = catalog[0] // 1000 - 2000
      // Max price is 2000 <= budget 2000 -> full 1.00 affordability
      const score = scoreBudgetFit(p100W, 2000, bounds.maxPrice)
      expect(score).toBe(1.0)

      // 2500 - 3500 exceeds 2000 by 500 (25% over) -> triggers Budget Compromise
      const p300W = catalog[1]
      const score300 = scoreBudgetFit(p300W, 2000, bounds.maxPrice)
      expect(score300).toBe(0.40)
    })

    it('evaluates budget at 3000 pesos boundary and proves lack of upscale bias', () => {
      // 1000-2000 luminaire is completely affordable (100% budget fit)
      const p100Score = scoreBudgetFit(catalog[0], 3000, bounds.maxPrice)
      expect(p100Score).toBe(1.0)

      // 2500-3500 luminaire starting price fits (85% budget fit)
      const p300Score = scoreBudgetFit(catalog[1], 3000, bounds.maxPrice)
      expect(p300Score).toBe(0.85)

      // Run full MCDSS matching: cheaper luminaire is not penalized for costing less
      const match = matchSolarProducts(catalog, { location: 'street', powerNeeds: 100, budget: 3000 }, { threshold: 0.5, catalogBounds: bounds })
      const p100Match = match.matches.find((m) => m.product.id === 101)
      expect(p100Match.breakdown.budgetScore).toBe(100)
    })

    it('evaluates sinagad / unconstrained Any Budget mode awarding 100% budget fit to all items', () => {
      catalog.forEach((p) => {
        // 'any' sets 100% for all products including unpriced
        const scoreAny = scoreBudgetFit(p, 'any', bounds.maxPrice)
        expect(scoreAny).toBe(1.0)

        // Numeric slider pulled to maxPrice awards 100% to all priced products, while unlisted retains 70% neutral
        const scoreMax = scoreBudgetFit(p, bounds.maxPrice, bounds.maxPrice)
        if (p.min_price !== null) {
          expect(scoreMax).toBe(1.0)
        } else {
          expect(scoreMax).toBe(0.70)
        }
      })
    })

    it('handles NULL consultative pricing neutrally (70%) without ghost calculations', () => {
      const pConsultative = catalog[3]
      const score = scoreBudgetFit(pConsultative, 3000, bounds.maxPrice)
      expect(score).toBe(0.70)

      const match = matchSolarProducts(catalog, { location: 'street', powerNeeds: 600, budget: 3000 }, { threshold: 0.5, catalogBounds: bounds })
      const consultMatch = match.matches.find((m) => m.product.id === 104)
      expect(consultMatch.breakdown.budgetScore).toBe(70)
      expect(consultMatch.priceInfo.isUnlisted).toBe(true)
      expect(consultMatch.explanation).toContain('Price confirmed at store branch via inquiry')
    })
  })
})
