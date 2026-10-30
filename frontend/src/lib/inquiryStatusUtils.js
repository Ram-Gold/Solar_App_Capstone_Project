/**
 * JD Solar Platform - Inquiry & Showroom Visit Status Utilities
 * Standardizes statuses: Pending (stitched gray), Confirmed (green), Completed (system style), Cancelled (neutral).
 * Strictly zero emojis.
 */

export const INQUIRY_STATUSES = ['Pending', 'Confirmed', 'Completed', 'Cancelled']

/**
 * Normalizes legacy or non-standard statuses into one of the 4 canonical states.
 * Merges 'Visited' into 'Completed'.
 */
export function normalizeInquiryStatus(rawStatus) {
  if (!rawStatus) return 'Pending'
  const trimmed = String(rawStatus).trim()
  if (trimmed === 'Visited') return 'Completed'
  if (INQUIRY_STATUSES.includes(trimmed)) return trimmed
  return 'Pending'
}

/**
 * Returns UI style tokens and badge configurations for a given inquiry/visit status.
 */
export function getInquiryStatusConfig(rawStatus) {
  const status = normalizeInquiryStatus(rawStatus)

  switch (status) {
    case 'Confirmed':
      return {
        status: 'Confirmed',
        label: 'Confirmed',
        description: 'Showroom appointment / reservation verified by staff',
        badgeClass:
          'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700',
        calendarClass:
          'border-solid border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200 shadow-sm',
        calendarIconClass: 'text-emerald-700 dark:text-emerald-400',
        calendarHeaderClass: 'bg-emerald-600 text-white',
        dotClass: 'bg-emerald-500',
      }

    case 'Completed':
      return {
        status: 'Completed',
        label: 'Completed',
        description: 'Customer visit fulfilled and concluded',
        badgeClass:
          'bg-jds-surface-container text-jds-on-surface border-jds-outline-variant font-semibold',
        calendarClass:
          'border-solid border-jds-outline-variant bg-jds-surface-container/60 text-jds-on-surface',
        calendarIconClass: 'text-jds-primary',
        calendarHeaderClass: 'bg-jds-surface-container-high text-jds-on-surface',
        dotClass: 'bg-jds-primary',
      }

    case 'Cancelled':
      return {
        status: 'Cancelled',
        label: 'Cancelled',
        description: 'Inquiry or reservation cancelled',
        badgeClass:
          'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
        calendarClass:
          'border-solid border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 opacity-75',
        calendarIconClass: 'text-zinc-400',
        calendarHeaderClass: 'bg-zinc-300 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300',
        dotClass: 'bg-zinc-400',
      }

    case 'Pending':
    default:
      return {
        status: 'Pending',
        label: 'Pending Review',
        description: 'Awaiting showroom staff confirmation',
        badgeClass:
          'bg-slate-100 text-slate-700 border-dashed border-slate-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-600',
        calendarClass:
          'border-dashed border-slate-300 bg-slate-100/90 text-slate-800 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-200',
        calendarIconClass: 'text-slate-600 dark:text-zinc-400',
        calendarHeaderClass: 'bg-slate-300 text-slate-700 dark:bg-zinc-700 dark:text-zinc-300',
        dotClass: 'bg-slate-400 animate-pulse',
      }
  }
}

export const PURGE_RETENTION_RULES = {
  COMPLETED_OR_CANCELLED_DAYS: 7,
  STALE_PENDING_DAYS: 14
}

/**
 * Parses the effective reference date of an inquiry (visit_date fallback to created_at or updated_at).
 */
export function getInquiryEffectiveDate(inquiry) {
  if (!inquiry) return null
  if (inquiry.visit_date) {
    const parsed = new Date(inquiry.visit_date)
    if (!isNaN(parsed.getTime())) return parsed
  }
  if (inquiry.created_at) {
    const parsed = new Date(inquiry.created_at)
    if (!isNaN(parsed.getTime())) return parsed
  }
  if (inquiry.updated_at) {
    const parsed = new Date(inquiry.updated_at)
    if (!isNaN(parsed.getTime())) return parsed
  }
  return null
}

/**
 * Determines whether an inquiry is eligible for automated purging based on retention rules:
 * - Completed or Cancelled older than 7 days
 * - Pending older than 14 days past scheduled visit / creation date
 */
export function isEligibleForAutoPurge(inquiry, referenceDate = new Date()) {
  if (!inquiry) return false
  const status = normalizeInquiryStatus(inquiry.status)
  const effDate = getInquiryEffectiveDate(inquiry)
  if (!effDate) return false

  const diffMs = referenceDate.getTime() - effDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if ((status === 'Completed' || status === 'Cancelled') && diffDays >= PURGE_RETENTION_RULES.COMPLETED_OR_CANCELLED_DAYS) {
    return true
  }

  if (status === 'Pending' && diffDays >= PURGE_RETENTION_RULES.STALE_PENDING_DAYS) {
    return true
  }

  return false
}

/**
 * Partitions inquiries and returns summary breakdown of inactive records eligible for purge.
 */
export function getInactiveInquiriesSummary(inquiries = [], referenceDate = new Date()) {
  const eligible = []
  let completedCount = 0
  let cancelledCount = 0
  let pendingCount = 0

  for (const item of inquiries) {
    if (isEligibleForAutoPurge(item, referenceDate)) {
      eligible.push(item)
      const st = normalizeInquiryStatus(item.status)
      if (st === 'Completed') completedCount++
      else if (st === 'Cancelled') cancelledCount++
      else if (st === 'Pending') pendingCount++
    }
  }

  return {
    eligible,
    count: eligible.length,
    completedCount,
    cancelledCount,
    pendingCount
  }
}

