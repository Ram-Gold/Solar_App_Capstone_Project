import { describe, it, expect } from 'vitest'
import {
  OPERATING_TIME_SLOTS,
  OPERATING_HOUR_OPTIONS,
  getOperatingMinuteOptions,
  isBranchOpenNow,
  getTimeSlotOptions,
  BRANCH_OPERATING_HOURS,
} from '../branchHours'

describe('branchHours', () => {
  it('exposes 30-minute operating slots from 08:00 to 17:30 only', () => {
    expect(OPERATING_TIME_SLOTS[0]).toEqual({ value: '08:00', label: '8:00 AM' })
    expect(OPERATING_TIME_SLOTS[OPERATING_TIME_SLOTS.length - 1]).toEqual({
      value: '17:30',
      label: '5:30 PM',
    })
    expect(OPERATING_TIME_SLOTS).toHaveLength(20)
    expect(OPERATING_TIME_SLOTS.some((s) => s.value === '23:00')).toBe(false)
    expect(OPERATING_TIME_SLOTS.some((s) => s.value === '07:30')).toBe(false)
    expect(OPERATING_TIME_SLOTS.some((s) => s.value === '18:00')).toBe(false)
    expect(BRANCH_OPERATING_HOURS.summary).toBe('Mon – Sat, 8:00 AM – 5:30 PM · Closed Sun')
  })

  it('computes Open / Closed status in Asia/Manila timezone', () => {
    // Monday 2026-11-16 10:00 AM PHT (02:00 UTC)
    expect(isBranchOpenNow(new Date('2026-11-16T02:00:00Z'))).toBe(true)
    // Saturday 2026-11-21 5:30 PM PHT (09:30 UTC)
    expect(isBranchOpenNow(new Date('2026-11-21T09:30:00Z'))).toBe(true)
    // Monday 2026-11-16 7:59 AM PHT (2026-11-15 23:59 UTC)
    expect(isBranchOpenNow(new Date('2026-11-15T23:59:00Z'))).toBe(false)
    // Monday 2026-11-16 5:31 PM PHT (09:31 UTC)
    expect(isBranchOpenNow(new Date('2026-11-16T09:31:00Z'))).toBe(false)
    // Sunday 2026-11-22 10:00 AM PHT (02:00 UTC)
    expect(isBranchOpenNow(new Date('2026-11-22T02:00:00Z'))).toBe(false)
  })

  it('includes a legacy fallback option only when given an off-grid time value', () => {
    expect(getTimeSlotOptions('10:00')).toHaveLength(20)
    const withLegacy = getTimeSlotOptions('10:15')
    expect(withLegacy).toHaveLength(21)
    expect(withLegacy[0]).toEqual({
      value: '10:15',
      label: '10:15 AM (Legacy)',
      isLegacy: true,
    })
  })

  it('provides operating hour options (08-17) and 5-minute options clamped at 17:30', () => {
    expect(OPERATING_HOUR_OPTIONS[0]).toEqual({ value: '08', label: '8 AM' })
    expect(OPERATING_HOUR_OPTIONS[OPERATING_HOUR_OPTIONS.length - 1]).toEqual({
      value: '17',
      label: '5 PM',
    })
    expect(OPERATING_HOUR_OPTIONS).toHaveLength(10)
    expect(OPERATING_HOUR_OPTIONS.some((h) => h.value === '23' || h.value === '18' || h.value === '07')).toBe(false)

    const regularMins = getOperatingMinuteOptions('10')
    expect(regularMins).toHaveLength(12)
    expect(regularMins[0]).toEqual({ value: '00', label: ':00' })
    expect(regularMins[regularMins.length - 1]).toEqual({ value: '55', label: ':55' })

    const closingMins = getOperatingMinuteOptions('17')
    expect(closingMins).toHaveLength(7)
    expect(closingMins[closingMins.length - 1]).toEqual({ value: '30', label: ':30' })
    expect(closingMins.some((m) => m.value === '35')).toBe(false)
  })
})
