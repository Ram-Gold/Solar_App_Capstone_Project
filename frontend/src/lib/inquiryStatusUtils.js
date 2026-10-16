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
