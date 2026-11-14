import { describe, it, expect } from 'vitest'
import {
  FALLBACK_PRODUCTS,
  stripEmojis,
  matchUserQuery,
  splitIntoSentenceSegments,
} from '../solarBotEngine'

describe('solarBotEngine', () => {
  it('strips emojis cleanly for strict text-only assistant responses', () => {
    expect(stripEmojis('Solar Light ⚡ Ready ☀️')).toBe('Solar Light  Ready')
  })

  it('responds to greetings and core 5-pillar queries without emojis', () => {
    const greeting = matchUserQuery('hello', FALLBACK_PRODUCTS)
    expect(greeting.message).toContain('JD Solar Technical Assistant')
    expect(greeting.options.length).toBeGreaterThan(0)

    const pricing = matchUserQuery('How much is the price and budget?', FALLBACK_PRODUCTS)
    expect(pricing.message.toLowerCase()).toContain('pricing')

    const stock = matchUserQuery('Do you have stock available in Quiapo?', FALLBACK_PRODUCTS)
    expect(stock.message).toContain('Quiapo')

    const warranty = matchUserQuery('What is the warranty coverage?', FALLBACK_PRODUCTS)
    expect(warranty.message.toLowerCase()).toContain('warranty')
  })

  it('matches specific products by name and returns technical overview', () => {
    const targetName = FALLBACK_PRODUCTS[0].name
    const res = matchUserQuery(`Tell me more about ${targetName}`, FALLBACK_PRODUCTS)
    expect(res.message).toContain(targetName)
    expect(res.message).toContain('Technical Overview')
  })

  it('splits responses into readable streaming segments while preserving markdown blocks', () => {
    const input = 'First sentence here. Second sentence here!\n\n- Bullet item one\n- Bullet item two'
    const segments = splitIntoSentenceSegments(input)
    expect(segments.length).toBeGreaterThanOrEqual(2)
    expect(segments.join('')).toContain('First sentence here.')
    expect(segments.join('')).toContain('- Bullet item one')
  })
})
