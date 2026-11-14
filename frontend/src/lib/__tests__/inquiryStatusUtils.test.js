import { describe, it, expect } from 'vitest'
import {
  INQUIRY_STATUSES,
  normalizeInquiryStatus,
  getInquiryStatusConfig,
  getInquiryEffectiveDate,
  isEligibleForAutoPurge,
  getInactiveInquiriesSummary,
} from '../inquiryStatusUtils'

describe('inquiryStatusUtils', () => {
  it('normalizes canonical and legacy Visited statuses', () => {
    expect(INQUIRY_STATUSES).toEqual(['Pending', 'Confirmed', 'Completed', 'Cancelled'])
    expect(normalizeInquiryStatus('Visited')).toBe('Completed')
    expect(normalizeInquiryStatus(' Confirmed ')).toBe('Confirmed')
    expect(normalizeInquiryStatus('unknown_status')).toBe('Pending')
    expect(normalizeInquiryStatus(null)).toBe('Pending')
  })

  it('returns badge and calendar configs for every status', () => {
    expect(getInquiryStatusConfig('Confirmed').label).toBe('Confirmed')
    expect(getInquiryStatusConfig('Visited').label).toBe('Completed')
    expect(getInquiryStatusConfig('Cancelled').label).toBe('Cancelled')
    expect(getInquiryStatusConfig('').label).toBe('Pending Review')
  })

  it('resolves effective date in visit_date -> created_at -> updated_at priority', () => {
    expect(getInquiryEffectiveDate(null)).toBeNull()
    expect(
      getInquiryEffectiveDate({
        visit_date: '2026-10-01',
        created_at: '2026-09-01',
      })?.toISOString()
    ).toContain('2026-10-01')

    expect(
      getInquiryEffectiveDate({
        visit_date: 'invalid-date',
        created_at: '2026-09-01T00:00:00Z',
      })?.toISOString()
    ).toContain('2026-09-01')
  })

  it('evaluates auto-purge eligibility based on 7-day and 14-day retention rules', () => {
    const ref = new Date('2026-11-15T12:00:00Z')

    expect(isEligibleForAutoPurge({ status: 'Completed', visit_date: '2026-11-07' }, ref)).toBe(true)
    expect(isEligibleForAutoPurge({ status: 'Cancelled', visit_date: '2026-11-12' }, ref)).toBe(false)
    expect(isEligibleForAutoPurge({ status: 'Pending', visit_date: '2026-10-30' }, ref)).toBe(true)
    expect(isEligibleForAutoPurge({ status: 'Pending', visit_date: '2026-11-10' }, ref)).toBe(false)
    expect(isEligibleForAutoPurge({ status: 'Confirmed', visit_date: '2026-01-01' }, ref)).toBe(false)
  })

  it('summarizes eligible inactive inquiries accurately', () => {
    const ref = new Date('2026-11-15T12:00:00Z')
    const inquiries = [
      { id: 1, status: 'Completed', visit_date: '2026-11-01' },
      { id: 2, status: 'Cancelled', visit_date: '2026-11-01' },
      { id: 3, status: 'Pending', visit_date: '2026-10-20' },
      { id: 4, status: 'Confirmed', visit_date: '2026-10-01' },
    ]

    const summary = getInactiveInquiriesSummary(inquiries, ref)
    expect(summary.count).toBe(3)
    expect(summary.completedCount).toBe(1)
    expect(summary.cancelledCount).toBe(1)
    expect(summary.pendingCount).toBe(1)
  })
})
