/**
 * Utility functions for warranty calculation, formatting, and claim status display.
 */

export function formatDate(dateString) {
  if (!dateString) return 'N/A'
  try {
    const d = new Date(dateString)
    return d.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return dateString
  }
}

export function calculateExpiryDate(purchaseDateStr, warrantyMonths = 12) {
  const purchase = purchaseDateStr ? new Date(purchaseDateStr) : new Date()
  const expiry = new Date(purchase)
  expiry.setMonth(expiry.getMonth() + Number(warrantyMonths))
  return expiry.toISOString().split('T')[0]
}

export function getRemainingDays(expiryDateStr) {
  if (!expiryDateStr) return 0
  const expiry = new Date(expiryDateStr)
  const now = new Date()
  // Reset hours to start of day
  expiry.setHours(23, 59, 59, 999)
  now.setHours(0, 0, 0, 0)
  const diffTime = expiry.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 0
}

export function isWarrantyActive(expiryDateStr) {
  return getRemainingDays(expiryDateStr) > 0
}

export function formatRemainingText(daysRemaining) {
  if (daysRemaining <= 0) return 'Warranty Expired'
  if (daysRemaining === 1) return '1 day remaining'
  if (daysRemaining < 30) return `${daysRemaining} days remaining`
  const months = Math.floor(daysRemaining / 30)
  const remainderDays = daysRemaining % 30
  if (months === 1 && remainderDays === 0) return '1 month remaining'
  if (months > 0 && remainderDays > 5) return `~${months} mos ${remainderDays} days remaining`
  return `~${months} month${months > 1 ? 's' : ''} remaining`
}

export const CLAIM_STATUSES = {
  in_review: {
    label: 'Diagnostic Intake',
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    description: 'Claim received; initial intake triage and warranty coverage check.',
    nextAction: 'Review customer fault description and photos, verify warranty coverage, and move to For Verification / Checking.'
  },
  pending: {
    label: 'Diagnostic Intake',
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    description: 'Claim received; initial intake triage and warranty coverage check.',
    nextAction: 'Review customer fault description and photos, verify warranty coverage, and move to For Verification / Checking.'
  },
  checking: {
    label: 'For Verification / Checking',
    color: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
    description: 'Unit under physical bench testing and technical verification.',
    nextAction: 'Perform physical bench test / diagnostics on the unit, log findings in Technician Notes, and either Approve or Decline.'
  },
  approved: {
    label: 'Approved for Repair / Replacement',
    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    description: 'Claim approved; replacement allocation or bench repair authorized.',
    nextAction: 'Allocate replacement unit or complete bench repair, then move to Ready for Release / Pickup.'
  },
  ready_for_release: {
    label: 'Ready for Release / Pickup',
    color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    description: 'Unit repaired or replacement staged at branch counter for customer pickup.',
    nextAction: 'Notify customer that the unit is ready at the branch counter and verify ID upon pickup.'
  },
  resolved: {
    label: 'Handover Complete',
    color: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
    description: 'Replacement unit handed over or serviced; claim concluded.',
    nextAction: 'Unit handed over and case closed. Archive ticket when no longer needed on the active board.'
  },
  rejected: {
    label: 'Declined',
    color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    description: 'Declined due to expired coverage or physical void terms.',
    nextAction: 'Ensure rejection reason is documented in Technician Notes so the customer sees why coverage was denied.'
  },
  archived: {
    label: 'Archived / Concluded',
    color: 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20',
    description: 'Concluded and archived by store administration.',
    nextAction: 'Ticket is archived. Restore to an active stage if follow-up service is required.'
  }
}

export function getClaimStatusMeta(status) {
  return CLAIM_STATUSES[status] || {
    label: status || 'Pending',
    color: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    description: '',
    nextAction: ''
  }
}

export const CLAIM_STAGE_ORDER = {
  in_review: 0,
  pending: 0,
  checking: 1,
  approved: 2,
  ready_for_release: 3,
  resolved: 4,
}

export function normalizeClaimStatus(status) {
  if (!status || status === 'pending') return 'in_review'
  return status
}

/**
 * Returns true if moving from `fromStatus` to `toStatus` is a valid forward transition.
 */
export function isForwardClaimTransition(fromStatus, toStatus) {
  const from = normalizeClaimStatus(fromStatus)
  const to = normalizeClaimStatus(toStatus)
  if (from === to) return false
  if (from === 'resolved' || from === 'rejected' || from === 'archived') return false
  if (to === 'rejected') return from === 'in_review' || from === 'checking'
  const fromOrder = CLAIM_STAGE_ORDER[from]
  const toOrder = CLAIM_STAGE_ORDER[to]
  if (fromOrder === undefined || toOrder === undefined) return false
  return toOrder > fromOrder
}

/**
 * Returns true when `candidateStage` is a completed prior step relative to `currentStatus`.
 */
export function isCompletedClaimStage(currentStatus, candidateStage) {
  const curr = normalizeClaimStatus(currentStatus)
  const cand = normalizeClaimStatus(candidateStage)
  if (curr === 'rejected' || curr === 'archived') return false
  const currOrder = CLAIM_STAGE_ORDER[curr]
  const candOrder = CLAIM_STAGE_ORDER[cand]
  if (currOrder === undefined || candOrder === undefined) return false
  return candOrder < currOrder
}

/**
 * Evaluates whether a status transition is permitted for the given role.
 */
export function isClaimTransitionAllowed({ fromStatus, toStatus, isAdmin = false }) {
  const from = normalizeClaimStatus(fromStatus)
  const to = normalizeClaimStatus(toStatus)
  if (from === to) return { allowed: false, requiresOverride: false }
  if (isForwardClaimTransition(from, to)) return { allowed: true, requiresOverride: false }
  if (isAdmin) return { allowed: true, requiresOverride: true }
  return { allowed: false, requiresOverride: false }
}

/**
 * Appends a timestamped admin override audit line to staff_notes.
 */
export function appendAdminOverrideNote(existingNotes, { fromStatus, toStatus, reason }) {
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const fromLabel = getClaimStatusMeta(normalizeClaimStatus(fromStatus)).label
  const toLabel = getClaimStatusMeta(normalizeClaimStatus(toStatus)).label
  const entry = `[ADMIN OVERRIDE ${stamp}] ${fromLabel} -> ${toLabel}: ${String(reason || '').trim()}`
  const base = String(existingNotes || '').trim()
  return base ? `${base}\n${entry}` : entry
}
