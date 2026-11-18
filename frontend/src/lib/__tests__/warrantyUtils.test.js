import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatDate,
  calculateExpiryDate,
  getRemainingDays,
  isWarrantyActive,
  formatRemainingText,
  getClaimStatusMeta,
  isForwardClaimTransition,
  isCompletedClaimStage,
  isClaimTransitionAllowed,
  appendAdminOverrideNote,
} from '../warrantyUtils'

describe('warrantyUtils', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats dates and handles empty values', () => {
    expect(formatDate('')).toBe('N/A')
    expect(formatDate(null)).toBe('N/A')
    expect(formatDate('2026-06-01')).toContain('2026')
  })

  it('calculates expiry date by adding warrantyMonths', () => {
    expect(calculateExpiryDate('2026-01-15', 12)).toBe('2027-01-15')
    expect(calculateExpiryDate('2026-01-15', 24)).toBe('2028-01-15')
  })

  it('computes remaining days and active status accurately', () => {
    expect(getRemainingDays(null)).toBe(0)
    expect(isWarrantyActive('2026-05-01')).toBe(false)
    expect(getRemainingDays('2026-05-01')).toBe(0)

    expect(isWarrantyActive('2026-06-11')).toBe(true)
    expect(getRemainingDays('2026-06-11')).toBeGreaterThanOrEqual(10)
  })

  it('formats remaining warranty text for expired, days, and months', () => {
    expect(formatRemainingText(0)).toBe('Warranty Expired')
    expect(formatRemainingText(1)).toBe('1 day remaining')
    expect(formatRemainingText(14)).toBe('14 days remaining')
    expect(formatRemainingText(30)).toBe('1 month remaining')
    expect(formatRemainingText(70)).toBe('~2 mos 10 days remaining')
    expect(formatRemainingText(60)).toBe('~2 months remaining')
  })

  it('returns claim status metadata and safe fallback for unknown statuses', () => {
    expect(getClaimStatusMeta('checking').label).toBe('For Verification / Checking')
    expect(getClaimStatusMeta('checking').nextAction).toContain('bench test')
    expect(getClaimStatusMeta('approved').label).toBe('Approved for Repair / Replacement')
    expect(getClaimStatusMeta('ready_for_release').label).toBe('Ready for Release / Pickup')
    expect(getClaimStatusMeta('rejected').label).toBe('Declined')
    expect(getClaimStatusMeta('custom_state').label).toBe('custom_state')
    expect(getClaimStatusMeta('').label).toBe('Pending')
  })

  it('enforces forward-only claim transitions and admin-only reversals', () => {
    expect(isForwardClaimTransition('in_review', 'checking')).toBe(true)
    expect(isForwardClaimTransition('checking', 'approved')).toBe(true)
    expect(isForwardClaimTransition('in_review', 'rejected')).toBe(true)
    expect(isForwardClaimTransition('approved', 'rejected')).toBe(false)
    expect(isForwardClaimTransition('approved', 'checking')).toBe(false)
    expect(isForwardClaimTransition('resolved', 'approved')).toBe(false)

    expect(isCompletedClaimStage('approved', 'in_review')).toBe(true)
    expect(isCompletedClaimStage('approved', 'checking')).toBe(true)
    expect(isCompletedClaimStage('approved', 'approved')).toBe(false)

    expect(isClaimTransitionAllowed({ fromStatus: 'approved', toStatus: 'checking', isAdmin: false })).toEqual({
      allowed: false,
      requiresOverride: false,
    })
    expect(isClaimTransitionAllowed({ fromStatus: 'approved', toStatus: 'checking', isAdmin: true })).toEqual({
      allowed: true,
      requiresOverride: true,
    })

    const note = appendAdminOverrideNote('Initial bench test', {
      fromStatus: 'approved',
      toStatus: 'checking',
      reason: 'Need voltage re-test',
    })
    expect(note).toContain('Initial bench test')
    expect(note).toContain('[ADMIN OVERRIDE')
    expect(note).toContain('Approved for Repair / Replacement -> For Verification / Checking: Need voltage re-test')
  })
})
